"""
LangChain 기반 SQL 생성 노드
하이브리드 RAG + Rerank로 스키마 검색 후 SQL 생성
"""
import logging
import os
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser
from langchain.schema import Document

load_dotenv()
logger = logging.getLogger(__name__)


class SQLOutput(BaseModel):
    """SQL 생성 결과"""
    sql: str = Field(description="생성된 SQL 쿼리 (실행 가능한 완전한 SQL)")
    analysis: str = Field(description="쿼리 분석 (어떤 데이터를 어떻게 조회하는지)")
    explanation: str = Field(description="사용자를 위한 설명 (비기술적 언어)")
    confidence: float = Field(description="SQL 정확도 신뢰도 (0.0~1.0)", ge=0.0, le=1.0)


class TableSelection(BaseModel):
    """GPT Reranker 결과"""
    selected_tables: List[str] = Field(description="선택된 테이블명 리스트 (최대 5개)", max_length=5)
    reasoning: str = Field(description="선택 이유")


class SQLGenerationNode:
    """
    SQL 생성 노드

    동작 흐름:
    1. 하이브리드 RAG로 관련 스키마 검색 (Semantic + BM25)
    2. Rerank로 Top 3 스키마 선택
    3. LangChain으로 SQL 생성 (구조화된 출력)
    """

    def __init__(self):
        """초기화"""
        # LLM
        self.llm = ChatOpenAI(
            model=os.getenv("GPT_MODEL", "gpt-4o-mini"),
            temperature=0.0  # SQL 생성은 일관성 중요
        )

        # 하이브리드 RAG: Semantic + BM25 + Reranker
        from sql_pipeline.retrievers.schema_retriever import HybridRetriever
        from sql_pipeline.retrievers.schema_reranker import Reranker

        # 1. Hybrid Retriever (Semantic + BM25)
        self.hybrid_retriever = HybridRetriever(
            collection_name="database_schema",
            k=5,  # 각 retriever가 5개씩 검색 (총 ~8-10개 후보, 중복 제거 후)
            semantic_weight=0.7,  # Semantic 20% (의미 검색)
            keyword_weight=0.3   # BM25 80% (키워드 검색)
        )

        # 2. Reranker (Cross-Encoder로 Top-5 선택)
        self.reranker = Reranker(
            model_name="cross-encoder/ms-marco-MiniLM-L-6-v2",
            top_n=5,  # 최종 5개 테이블 선택
            hybrid_weight=0.3,  # 하이브리드 검색 점수 30%
            rerank_weight=0.7   # Rerank 점수 70%
        )

        # 프롬프트 템플릿
        prompt_path = os.path.join(
            os.path.dirname(__file__),
            "..", "prompts", "sql_generation.txt"
        )

        with open(prompt_path, "r", encoding="utf-8") as f:
            prompt_text = f.read()

        self.parser = PydanticOutputParser(pydantic_object=SQLOutput)
        self.prompt = ChatPromptTemplate.from_template(prompt_text)

    def generate_sql(
        self,
        user_input: str,
        context_hints: List[str] = None,
        max_retries: int = 2
    ) -> Dict[str, Any]:
        """
        SQL 생성 (재시도 로직 포함)

        Args:
            user_input: 사용자 질문
            context_hints: 추가 힌트 (옵션)
            max_retries: 재시도 횟수 (기본 2회)

        Returns:
            SQL 생성 결과 딕셔너리
        """
        logger.info(f"SQL generation: {user_input[:50]}...")

        # Validator 초기화
        from sql_pipeline.nodes.schema_validator import get_validator
        validator = get_validator()

        # 1. 하이브리드 검색 (1회만 실행)
        try:
            hybrid_docs = self.hybrid_retriever.ensemble.invoke(user_input)
            logger.info(f"Hybrid search: {len(hybrid_docs)} docs")

            # 필터링: table_name이 있는 문서만 사용 (business_context 제외)
            filtered_docs = [
                doc for doc in hybrid_docs
                if doc.metadata.get("table_name") is not None
            ]
            logger.info(f"Filtered: {len(filtered_docs)} tables")

            # 2. Reranker로 Top-5 선택 (Cross-Encoder)
            reranked_docs = self.reranker.rerank_documents(user_input, filtered_docs)
            logger.info(f"Reranked: {len(reranked_docs)} tables selected")

            # 3. 스키마 정보 포맷팅 (1회만)
            schema_info = self._format_schema_info(reranked_docs)

        except Exception as e:
            logger.error(f"RAG 검색 실패: {e}")
            return {
                "sql": "-- RAG 검색 실패",
                "analysis": f"스키마 검색 오류: {str(e)}",
                "explanation": "데이터베이스 스키마를 찾을 수 없습니다.",
                "confidence": 0.0,
                "error": str(e)
            }

        # 피드백 초기화
        validation_feedback = None

        # 재시도 루프 (같은 스키마로 피드백만 추가)
        for attempt in range(max_retries + 1):  # 0, 1, 2 (총 3회)
            try:
                logger.info(f"Attempt {attempt + 1}/{max_retries + 1}")

                # 2. 피드백 (재시도 시)
                feedback = validation_feedback if attempt > 0 else None
                if feedback:
                    logger.info(f"Feedback: {feedback[:100]}")

                # 3. SQL 생성 (같은 스키마로 재생성)
                result = self._execute_chain(user_input, schema_info, feedback)
                logger.info(f"SQL generated (confidence: {result.confidence:.2f})")

                # 4. 스키마 검증
                validation_result = validator.validate(result.sql)

                if validation_result["valid"]:
                    logger.info("Validation passed")
                    # 5. 결과 반환 (성공)
                    return {
                        "sql": result.sql,
                        "analysis": result.analysis,
                        "explanation": result.explanation,
                        "confidence": result.confidence,
                        "schema_context": {
                            "tables": [doc.metadata.get("table_name", "unknown") for doc in reranked_docs],
                            "sources": [doc.metadata.get("source", "unknown") for doc in reranked_docs]
                        },
                        "attempts": attempt + 1,
                        "validation": validation_result
                    }
                else:
                    # 검증 실패
                    logger.warning(f"Validation failed: {', '.join(validation_result['errors'][:2])}")

                    # 마지막 시도였다면 실패 반환
                    if attempt == max_retries:
                        logger.error(f"Max retries reached")
                        return {
                            "sql": result.sql,  # 마지막 시도의 SQL
                            "analysis": result.analysis,
                            "explanation": result.explanation,
                            "confidence": 0.0,  # 검증 실패로 신뢰도 0
                            "schema_context": {
                                "tables": [doc.metadata.get("table_name", "unknown") for doc in reranked_docs],
                                "sources": [doc.metadata.get("source", "unknown") for doc in reranked_docs]
                            },
                            "attempts": attempt + 1,
                            "validation": validation_result,
                            "error": f"검증 실패: {', '.join(validation_result['errors'])}"
                        }

                    # 다음 시도를 위한 피드백 저장
                    validation_feedback = validation_result["feedback"]
                    logger.info("Retry with feedback")

            except Exception as e:
                logger.error(f"SQL generation error (attempt {attempt + 1}): {e}")

                # 마지막 시도였다면 에러 반환
                if attempt == max_retries:
                    return {
                        "sql": "-- SQL 생성 실패",
                        "analysis": f"오류 발생: {str(e)}",
                        "explanation": "SQL을 생성할 수 없습니다. 질문을 다시 확인해주세요.",
                        "confidence": 0.0,
                        "error": str(e),
                        "attempts": attempt + 1
                    }

                # 재시도
                validation_feedback = f"이전 시도에서 예외 발생: {str(e)}"
                continue

        # 여기까지 도달하지 않아야 하지만, 안전장치
        return {
            "sql": "-- SQL 생성 실패",
            "analysis": "알 수 없는 오류",
            "explanation": "SQL을 생성할 수 없습니다.",
            "confidence": 0.0,
            "error": "최대 재시도 횟수 초과"
        }

    def _gpt_rerank(self, user_question: str, documents: List[Document]) -> List[Document]:
        """
        GPT를 사용한 Reranker (한국어 이해 능력 우수)

        Args:
            user_question: 사용자 질문
            documents: 초기 검색된 문서 리스트

        Returns:
            GPT가 선택한 Top 5 문서 리스트
        """
        try:
            # 1. 문서 정보를 간략하게 요약
            doc_summaries = []
            for i, doc in enumerate(documents, 1):
                table_name = doc.metadata.get("table_name", "unknown")
                content_preview = doc.page_content[:200]  # 처음 200자만

                doc_summaries.append(f"[{i}] {table_name}\n{content_preview}\n")

            documents_text = "\n".join(doc_summaries)

            # 2. GPT Reranker 프롬프트
            rerank_prompt = f"""다음은 하나원큐리빙 데이터베이스 테이블 스키마입니다.

**비즈니스 도메인 이해:**
- "오피스텔" = buildings (건물) 또는 units (유닛)
- "수익률" = (수익 - 비용) / 비용 계산 → payments, expenses 테이블 필요
- "임대료/월세" = payments 또는 rent_payment_records
- "REIT 상품" = reit_products, reit_dividends (투자 상품, 오피스텔과 별개!)

사용자 질문: "{user_question}"

검색된 테이블들:
{documents_text}

**작업**: 위 질문에 답하기 위해 **가장 관련있는 테이블 5개**를 선택하세요.

**중요**:
- 비즈니스 도메인을 정확히 이해하세요 (오피스텔 ≠ REIT 상품!)
- 테이블명을 정확히 분석하세요 (예: "rent_auto_payments"는 "자동납부"와 관련)
- 실제 SQL 작성에 필요한 테이블을 선택하세요
- JOIN이 필요한 경우 관련 테이블을 모두 선택하세요

선택된 테이블명만 리스트로 반환하세요."""

            # 3. GPT 호출 (구조화된 출력)
            parser = PydanticOutputParser(pydantic_object=TableSelection)

            prompt = ChatPromptTemplate.from_template(
                "{prompt}\n\n{format_instructions}"
            )

            chain = prompt | self.llm | parser

            result = chain.invoke({
                "prompt": rerank_prompt,
                "format_instructions": parser.get_format_instructions()
            })

            logger.info(f"GPT selected tables: {result.selected_tables}")

            # 4. 선택된 테이블에 해당하는 Document 찾기
            selected_docs = []
            for table_name in result.selected_tables:
                for doc in documents:
                    if doc.metadata.get("table_name") == table_name:
                        selected_docs.append(doc)
                        break

            # 5. 최소 3개는 보장 (GPT가 적게 선택한 경우)
            if len(selected_docs) < 3:
                logger.warning(f"GPT selected only {len(selected_docs)}, filling from original")
                for doc in documents:
                    if doc not in selected_docs:
                        selected_docs.append(doc)
                        if len(selected_docs) >= 5:
                            break

            return selected_docs[:5]

        except Exception as e:
            logger.error(f"GPT rerank failed: {e}")
            # 실패 시 Semantic Search 점수로 정렬
            return sorted(
                documents,
                key=lambda doc: doc.metadata.get("similarity", 0),
                reverse=True
            )[:5]

    def _format_schema_info(self, documents: List[Document]) -> str:
        """
        스키마 정보를 프롬프트 형식으로 포맷팅 (데이터 타입 강조)

        Args:
            documents: Reranked 스키마 문서 리스트

        Returns:
            포맷팅된 스키마 정보 문자열
        """
        if not documents:
            return "=== 스키마 정보 없음 ===\n스키마 정보를 찾을 수 없습니다."

        schema_parts = ["=== 관련 스키마 정보 ===\n"]

        for i, doc in enumerate(documents, 1):
            metadata = doc.metadata
            content = doc.page_content

            schema_parts.append(f"\n[ 스키마 {i} ]")
            schema_parts.append(content)

            # 각 컬럼에 이미 data_type이 명시되어 있음 (예: due_date (VARCHAR2))
            # 추가 강조 불필요

            schema_parts.append("")

        return "\n".join(schema_parts)

    def _execute_chain(self, user_input: str, schema_info: str, feedback: str = None) -> SQLOutput:
        """
        LangChain Chain 실행

        Args:
            user_input: 사용자 질문
            schema_info: 스키마 정보
            feedback: 이전 시도의 검증 피드백 (재시도 시)

        Returns:
            SQLOutput 객체
        """
        try:
            # Chain: Prompt → LLM → Parser
            chain = self.prompt | self.llm | self.parser

            # 피드백이 있으면 프롬프트에 추가
            enhanced_user_input = user_input
            if feedback:
                enhanced_user_input = f"{user_input}\n\n{feedback}"

            result = chain.invoke({
                "user_question": enhanced_user_input,
                "schema_info": schema_info,
                "format_instructions": self.parser.get_format_instructions()
            })

            return result

        except Exception as e:
            logger.error(f"Chain 실행 실패: {e}")

            # 실패 시 기본값
            return SQLOutput(
                sql="-- Chain 실행 실패",
                analysis=f"오류: {str(e)}",
                explanation="SQL을 생성할 수 없습니다.",
                confidence=0.0
            )


# 편의 함수
def generate_sql(user_input: str, context_hints: List[str] = None) -> Dict[str, Any]:
    """
    SQL 생성 (헬퍼 함수)

    Args:
        user_input: 사용자 질문
        context_hints: 추가 힌트

    Returns:
        SQL 생성 결과
    """
    node = SQLGenerationNode()
    return node.generate_sql(user_input, context_hints)
