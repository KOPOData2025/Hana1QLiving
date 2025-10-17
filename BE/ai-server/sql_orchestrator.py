"""
순수 LangChain 기반 SQL Orchestration
LangGraph 제거, 라우팅 제거, 번역 제거
"""
import logging
import time
from typing import Dict, Any
from sqlalchemy.orm import Session

from models import AskRequest, AskResponse, Mode, Safety, Metrics
from sql_pipeline.nodes.sql_generator import SQLGenerationNode
from sql_pipeline.nodes.sql_safety_checker import SafetyNode
from sql_pipeline.nodes.sql_executor import ExecuteNode
from sql_pipeline.nodes.result_summarizer import SummarizeNode

logger = logging.getLogger(__name__)


class SimpleSQLOrchestration:
    """
    단순화된 SQL Orchestration (LangChain 기반)

    워크플로우:
    1. SQL 생성 (RAG + GPT)
    2. 보안 검사
    3. SQL 실행
    4. 결과 요약

    재시도:
    - 실행 실패 시 Oracle 에러를 피드백으로 SQL 재생성 (최대 3회)
    """

    def __init__(self):
        """초기화"""
        # 노드 인스턴스
        self.sql_node = SQLGenerationNode()
        self.safety_node = SafetyNode()
        self.execute_node = ExecuteNode()
        self.summarize_node = SummarizeNode()

        logger.info("SimpleSQLOrchestration initialized")

    def run(
        self,
        db_session: Session,
        request: AskRequest,
        auth_context: Dict[str, Any] = None
    ) -> AskResponse:
        """
        SQL Orchestration 실행

        Args:
            db_session: DB 세션 (현재 미사용, 호환성 유지)
            request: 사용자 요청
            auth_context: 인증 컨텍스트 (현재 미사용, 호환성 유지)

        Returns:
            AskResponse 객체
        """
        start_time = time.time()
        user_input = request.userInput

        logger.info(f"Start SQL orchestration: {user_input[:50]}...")

        MAX_RETRIES = 3

        for attempt in range(MAX_RETRIES):
            try:
                if attempt > 0:
                    logger.info(f"Retry attempt {attempt}")

                # 1. SQL 생성 (RAG 포함)
                sql_result = self.sql_node.generate_sql(
                    user_input,
                    context_hints=request.contextHints,
                    max_retries=2
                )

                if sql_result.get("error"):
                    logger.error(f"SQL generation failed: {sql_result['error']}")
                    if attempt < MAX_RETRIES - 1:
                        user_input = f"{request.userInput}\n\n[이전 SQL 생성 오류]\n{sql_result['error']}"
                        continue
                    else:
                        return self._create_error_response(
                            f"SQL 생성 실패: {sql_result['error']}",
                            start_time,
                            request
                        )

                sql = sql_result["sql"]
                logger.info(f"SQL generated: {sql[:100]}...")

                # 2. 보안 검사
                safety_check = self.safety_node.check_sql_safety(sql)

                if not safety_check["allowed"]:
                    logger.warning(f"Safety check failed: {safety_check['reason']}")
                    return self._create_error_response(
                        f"보안 검사 실패: {safety_check['reason']}",
                        start_time,
                        request,
                        safety=Safety(
                            allowed=False,
                            reason=safety_check["reason"]
                        )
                    )

                # 3. SQL 실행
                from db.session import SessionLocal
                db = SessionLocal()

                try:
                    execution_result = self.execute_node.execute_sql(db, sql)

                    if not execution_result.get("success"):
                        error_msg = execution_result.get("error", "알 수 없는 실행 오류")
                        logger.error(f"SQL execution failed (attempt {attempt+1}/{MAX_RETRIES}): {error_msg[:200]}")

                        if attempt < MAX_RETRIES - 1:
                            user_input = f"{request.userInput}\n\n[이전 SQL 실행 오류]\n{error_msg}\n\n위 오류를 수정하여 올바른 SQL을 생성해주세요."
                            continue
                        else:
                            return self._create_error_response(
                                f"SQL 실행 실패 (최대 재시도 초과): {error_msg}",
                                start_time,
                                request
                            )

                    data = execution_result.get("data", [])
                    logger.info(f"SQL executed: {len(data)} rows")

                finally:
                    db.close()

                # 4. 결과 요약
                summary_result = self.summarize_node.summarize_results(
                    user_input=request.userInput,
                    sql=sql,
                    data=data
                )

                # 5. 최종 응답 생성
                latency_ms = (time.time() - start_time) * 1000

                # 결과 텍스트 조합
                text_parts = [
                    f"**실행된 SQL:**\n```sql\n{sql}\n```\n\n**실행 결과:** {len(data)}건"
                ]

                # 데이터 전체 추가 (UI에서 테이블로 표시 가능하도록)
                if data:
                    # 컬럼명 추출
                    if isinstance(data[0], dict):
                        columns = list(data[0].keys())

                        # 테이블 헤더
                        text_parts.append("| " + " | ".join(columns) + " |")
                        text_parts.append("| " + " | ".join(["---"] * len(columns)) + " |")

                        # 데이터 행 (전체 표시)
                        for row in data:
                            row_values = [str(row.get(col, "")) for col in columns]
                            text_parts.append("| " + " | ".join(row_values) + " |")
                    else:
                        # dict가 아닌 경우 (fallback)
                        for i, row in enumerate(data, 1):
                            text_parts.append(f"{i}. {row}")
                else:
                    text_parts.append("조회된 데이터가 없습니다.")

                text_parts.append("")

                # 요약 추가
                if summary_result.get("summary"):
                    text_parts.append("**결과 분석:**")
                    text_parts.append(summary_result["summary"])

                final_text = "\n".join(text_parts)

                response = AskResponse(
                    route=Mode.DATA,
                    text=final_text,
                    citations=[],
                    followUps=[],
                    safety=Safety(
                        allowed=True,
                        reason="SQL 실행 완료"
                    ),
                    metrics=Metrics(
                        latencyMs=round(latency_ms, 2),
                        tokens={
                            "in": len(request.userInput),
                            "out": len(final_text)
                        }
                    )
                )

                logger.info(f"Orchestration completed: {latency_ms:.2f}ms, {attempt+1} attempts")

                return response

            except Exception as e:
                logger.error(f"Exception during processing (attempt {attempt+1}/{MAX_RETRIES}): {e}")

                if attempt < MAX_RETRIES - 1:
                    user_input = f"{request.userInput}\n\n[이전 처리 오류]\n{str(e)}"
                    continue
                else:
                    return self._create_error_response(
                        f"처리 중 오류 발생: {str(e)}",
                        start_time,
                        request
                    )

        # 여기까지 도달하지 않아야 함 (안전장치)
        return self._create_error_response(
            "알 수 없는 오류 (최대 재시도 초과)",
            start_time,
            request
        )

    def _create_error_response(
        self,
        error_message: str,
        start_time: float,
        request: AskRequest,
        safety: Safety = None
    ) -> AskResponse:
        """에러 응답 생성"""
        latency_ms = (time.time() - start_time) * 1000

        if safety is None:
            safety = Safety(
                allowed=False,
                reason=f"오류 발생: {error_message}"
            )

        return AskResponse(
            route=Mode.DATA,
            text=f"처리 중 오류가 발생했습니다:\n\n{error_message}",
            citations=[],
            followUps=[],
            safety=safety,
            metrics=Metrics(
                latencyMs=round(latency_ms, 2),
                tokens={
                    "in": len(request.userInput),
                    "out": len(error_message)
                }
            )
        )
