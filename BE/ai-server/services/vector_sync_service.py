import logging
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio
import os
import requests
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect

from sql_pipeline.nodes.vector_db_manager import RAGSearchNode
from settings import settings
from db.session import SessionLocal, engine

logger = logging.getLogger(__name__)

class VectorDBSyncService:
    """벡터DB 동기화 서비스"""

    def __init__(self):
        self.rag_node = RAGSearchNode()
        self._all_tables = None  # 캐시된 테이블 목록
        self.use_batch_processing = True  # 배치 처리 사용 여부
        self.batch_size = 5  # 배치 크기 (한 번에 처리할 테이블 수)

    async def sync_all_tables(self) -> Dict[str, Any]:
        """모든 테이블의 벡터DB 동기화"""
        logger.info("벡터DB 동기화 시작")

        overall_start_time = datetime.now()

        sync_results = {
            "sync_time": overall_start_time.isoformat(),
            "tables": {},
            "business_context": {},
            "total_success": 0,
            "total_failed": 0,
            "errors": [],
            "performance": {
                "total_api_calls": 0,
                "total_tokens_used": 0,
                "total_api_time_seconds": 0,
                "total_sync_time_seconds": 0
            }
        }

        # 1. 벡터DB 전체 초기화 (기존 데이터 모두 삭제)
        try:
            clear_result = await self._clear_vector_db()
            sync_results["clear_vector_db"] = clear_result
            if clear_result["success"]:
                logger.info("벡터DB 초기화 완료")
            else:
                logger.warning(f"벡터DB 초기화 실패: {clear_result.get('error', 'Unknown error')}")
        except Exception as e:
            logger.error(f"벡터DB 초기화 중 오류: {e}")
            sync_results["clear_vector_db"] = {"success": False, "error": str(e)}

        # 2. 비즈니스 컨텍스트 등록
        try:
            business_result = await self._sync_business_context()
            sync_results["business_context"] = business_result
            if business_result["success"]:
                logger.info("비즈니스 컨텍스트 등록 완료")
            else:
                logger.warning(f"비즈니스 컨텍스트 등록 실패: {business_result.get('error', 'Unknown error')}")
        except Exception as e:
            logger.error(f"비즈니스 컨텍스트 등록 중 오류: {e}")
            sync_results["business_context"] = {"success": False, "error": str(e)}

        # 동기화할 테이블 목록 (DB에서 동적 조회)
        tables_to_sync = self._get_all_tables()

        if self.use_batch_processing:
            logger.info(f"배치 처리 모드: {len(tables_to_sync)}개 테이블을 {self.batch_size}개씩 처리")

            # 배치 단위로 테이블 그룹화
            for i in range(0, len(tables_to_sync), self.batch_size):
                batch_tables = tables_to_sync[i:i + self.batch_size]
                batch_num = (i // self.batch_size) + 1
                total_batches = (len(tables_to_sync) + self.batch_size - 1) // self.batch_size

                logger.info(f"배치 {batch_num}/{total_batches} 처리 중: {batch_tables}")

                # 배치 내 모든 테이블의 스키마 수집
                batch_schemas = {}
                for table_name in batch_tables:
                    schema_info = self._get_table_schema_info(table_name)
                    if schema_info:
                        batch_schemas[table_name] = schema_info

                # 배치로 GPT 호출 (한 번에 여러 테이블 처리)
                batch_gpt_results = await self._generate_batch_descriptions_with_gpt(batch_schemas)

                # 각 테이블별로 결과 처리 및 저장
                for table_name in batch_tables:
                    try:
                        logger.info(f"테이블 {table_name} 동기화 시작")

                        if table_name not in batch_schemas:
                            sync_results["tables"][table_name] = {
                                "success": False,
                                "error": "스키마 정보 조회 실패",
                                "updated_count": 0
                            }
                            sync_results["total_failed"] += 1
                            continue

                        schema_info = batch_schemas[table_name]
                        gpt_result = batch_gpt_results.get(table_name, {})

                        # GPT 결과 적용
                        if gpt_result:
                            if gpt_result.get("table_description"):
                                schema_info["description"] = gpt_result["table_description"]
                            if gpt_result.get("table_keywords"):
                                schema_info["table_keywords"] = gpt_result["table_keywords"]
                            if gpt_result.get("columns"):
                                existing_columns = schema_info.get("columns", {})
                                for col_name, gpt_description in gpt_result["columns"].items():
                                    if col_name in existing_columns and isinstance(existing_columns[col_name], dict):
                                        existing_columns[col_name]["description"] = gpt_description

                        # 벡터 문서 생성 및 저장
                        vector_doc = self._create_schema_vector_document(table_name, schema_info)
                        doc_id = f"schema_{table_name}"
                        success = self.rag_node.add_document(
                            text=vector_doc["text"],
                            metadata=vector_doc["metadata"],
                            doc_id=doc_id
                        )

                        if success:
                            sync_results["tables"][table_name] = {
                                "success": True,
                                "updated_count": 1,
                                "schema_columns": len(schema_info.get("columns", {}))
                            }
                            sync_results["total_success"] += 1
                            logger.info(f"{table_name} 동기화 완료")
                        else:
                            sync_results["tables"][table_name] = {
                                "success": False,
                                "error": "ChromaDB 저장 실패",
                                "updated_count": 0
                            }
                            sync_results["total_failed"] += 1

                    except Exception as e:
                        logger.error(f"테이블 {table_name} 동기화 실패: {e}")
                        sync_results["tables"][table_name] = {
                            "success": False,
                            "error": str(e),
                            "updated_count": 0
                        }
                        sync_results["total_failed"] += 1

                # 배치 성능 통계 집계
                batch_perf = batch_gpt_results.get("_batch_performance", {})
                if batch_perf:
                    sync_results["performance"]["total_api_calls"] += batch_perf.get("api_calls", 0)
                    sync_results["performance"]["total_tokens_used"] += batch_perf.get("tokens_used", 0)
                    sync_results["performance"]["total_api_time_seconds"] += batch_perf.get("api_time_seconds", 0)

        else:
            # 기존 순차 처리 방식
            logger.info(f"순차 처리 모드: {len(tables_to_sync)}개 테이블을 하나씩 처리")

            for table_name in tables_to_sync:
                try:
                    logger.info(f"테이블 {table_name} 동기화 시작")
                    result = await self._sync_table(table_name)
                    sync_results["tables"][table_name] = result

                    if result["success"]:
                        sync_results["total_success"] += 1
                    else:
                        sync_results["total_failed"] += 1
                        sync_results["errors"].append(f"{table_name}: {result.get('error', 'Unknown error')}")

                    # 성능 통계 집계
                    if result.get("performance"):
                        perf = result["performance"]
                        if perf.get("api_calls"):
                            sync_results["performance"]["total_api_calls"] += perf["api_calls"]
                        if perf.get("tokens_used"):
                            sync_results["performance"]["total_tokens_used"] += perf["tokens_used"]
                        if perf.get("api_time_seconds"):
                            sync_results["performance"]["total_api_time_seconds"] += perf["api_time_seconds"]

                except Exception as e:
                    logger.error(f"테이블 {table_name} 동기화 실패: {e}")
                    sync_results["tables"][table_name] = {
                        "success": False,
                        "error": str(e),
                        "updated_count": 0
                    }
                    sync_results["total_failed"] += 1
                    sync_results["errors"].append(f"{table_name}: {str(e)}")

        overall_end_time = datetime.now()
        sync_results["performance"]["total_sync_time_seconds"] = (overall_end_time - overall_start_time).total_seconds()

        logger.info(f"벡터DB 동기화 완료 - 성공: {sync_results['total_success']}개, 실패: {sync_results['total_failed']}개, 소요시간: {sync_results['performance']['total_sync_time_seconds']:.2f}초")

        return sync_results

    async def _clear_vector_db(self) -> Dict[str, Any]:
        try:
            all_docs = self.rag_node.get_all_documents()
            logger.info(f"벡터DB 초기화 시작: {len(all_docs)}개 문서")

            if self.rag_node.clear_all_documents():
                logger.info(f"벡터DB 초기화 완료: {len(all_docs)}개 문서 삭제")
                return {
                    "success": True,
                    "deleted_count": len(all_docs),
                    "message": "벡터DB 완전 초기화 성공"
                }
            else:
                return {
                    "success": False,
                    "error": "벡터DB 문서 삭제 실패"
                }

        except Exception as e:
            logger.error(f"벡터DB 초기화 실패: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _sync_business_context(self) -> Dict[str, Any]:
        """비즈니스 컨텍스트를 벡터DB에 등록"""
        try:
            # 비즈니스 컨텍스트 파일 로드
            business_context_path = os.path.join(os.path.dirname(__file__), '..', 'business_context.json')

            if not os.path.exists(business_context_path):
                return {
                    "success": False,
                    "error": "business_context.json 파일이 없습니다"
                }

            with open(business_context_path, 'r', encoding='utf-8') as f:
                business_data = json.load(f)

            # 비즈니스 컨텍스트를 벡터 문서로 변환
            vector_doc = self._create_business_context_document(business_data)

            # ChromaDB에 비즈니스 컨텍스트 추가 (새로 생성)
            doc_id = "business_context"
            success = self.rag_node.add_document(
                text=vector_doc["text"],
                metadata=vector_doc["metadata"],
                doc_id=doc_id
            )

            if success:
                logger.info("비즈니스 컨텍스트 벡터DB 등록 완료")
                return {
                    "success": True,
                    "domain": business_data.get("domain", ""),
                    "patterns_count": len(business_data.get("entity_patterns", {})),
                    "rules_count": len(business_data.get("business_rules", []))
                }
            else:
                return {
                    "success": False,
                    "error": "ChromaDB 등록 실패"
                }

        except Exception as e:
            logger.error(f"비즈니스 컨텍스트 동기화 실패: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def _create_business_context_document(self, business_data: Dict) -> Dict[str, Any]:
        """비즈니스 컨텍스트를 벡터 문서로 변환"""

        text_parts = [
            f"비즈니스 도메인: {business_data.get('domain', '')}",
            f"시스템 설명: {business_data.get('description', '')}",
            f"시스템 목적: {business_data.get('system_purpose', '')}"
        ]

        # 엔티티 패턴 정보
        entity_patterns = business_data.get("entity_patterns", {})
        if entity_patterns:
            text_parts.append("엔티티 패턴:")
            for pattern, meaning in entity_patterns.items():
                text_parts.append(f"- {pattern}: {meaning}")

        # 비즈니스 룰
        business_rules = business_data.get("business_rules", [])
        if business_rules:
            text_parts.append("비즈니스 규칙:")
            for rule in business_rules:
                text_parts.append(f"- {rule}")

        # 쿼리 컨텍스트
        query_context = business_data.get("query_context", {})
        if query_context:
            text_parts.append("쿼리 해석 가이드:")
            for keyword, interpretation in query_context.items():
                text_parts.append(f"- '{keyword}': {interpretation}")

        text = "\n".join(text_parts)

        # 메타데이터
        metadata = {
            "type": "business_context",
            "domain": business_data.get("domain", ""),
            "last_updated": datetime.now().isoformat(),
            "patterns_count": len(entity_patterns),
            "rules_count": len(business_rules),
            "searchable_text": f"{business_data.get('domain', '')} {' '.join(entity_patterns.values())} {' '.join(business_rules)}"
        }

        return {
            "text": text,
            "metadata": metadata
        }

    async def _sync_table(self, table_name: str) -> Dict[str, Any]:
        try:
            logger.info(f"{table_name} 테이블 동기화 시작")
            schema_info = self._get_table_schema_info(table_name)
            if not schema_info:
                logger.error(f"{table_name} 스키마 정보 조회 실패")
                return {
                    "success": False,
                    "error": "스키마 정보 조회 실패",
                    "updated_count": 0,
                    "performance": {
                        "api_calls": 0,
                        "tokens_used": 0,
                        "api_time_seconds": 0
                    }
                }

            column_count = len(schema_info.get("columns", {}))
            logger.info(f"{table_name} 스키마 조회 완료: {column_count}개 컬럼")

            gpt_start_time = datetime.now()
            gpt_result = self._generate_table_descriptions_with_gpt(
                table_name,
                schema_info.get("columns", {})
            )
            gpt_end_time = datetime.now()
            gpt_elapsed = (gpt_end_time - gpt_start_time).total_seconds()

            if gpt_result:
                if gpt_result.get("table_description"):
                    schema_info["description"] = gpt_result["table_description"]
                if gpt_result.get("table_keywords"):
                    schema_info["table_keywords"] = gpt_result["table_keywords"]
                if gpt_result.get("columns"):
                        existing_columns = schema_info.get("columns", {})
                    gpt_columns = gpt_result["columns"]

                    for col_name, gpt_description in gpt_columns.items():
                        if col_name in existing_columns and isinstance(existing_columns[col_name], dict):
                            existing_columns[col_name]["description"] = gpt_description
                        elif col_name in existing_columns:
                            existing_columns[col_name] = {
                                "description": gpt_description,
                                "data_type": "VARCHAR2",
                                "sample_values": []
                            }

            vector_doc = self._create_schema_vector_document(table_name, schema_info)
            doc_id = f"schema_{table_name}"
            success = self.rag_node.add_document(
                text=vector_doc["text"],
                metadata=vector_doc["metadata"],
                doc_id=doc_id
            )

            if success:
                api_calls = 1 if gpt_result else 0
                tokens_used = gpt_result.get("tokens_used", 0) if gpt_result else 0

                logger.info(f"{table_name} 동기화 완료 - 컬럼: {len(schema_info.get('columns', {}))}개, GPT 시간: {gpt_elapsed:.2f}초")
                return {
                    "success": True,
                    "updated_count": 1,
                    "schema_columns": len(schema_info.get("columns", {})),
                    "performance": {
                        "api_calls": api_calls,
                        "tokens_used": tokens_used,
                        "api_time_seconds": gpt_elapsed
                    }
                }
            else:
                api_calls = 1 if gpt_result else 0
                tokens_used = gpt_result.get("tokens_used", 0) if gpt_result else 0

                logger.error(f"{table_name} ChromaDB 저장 실패")
                return {
                    "success": False,
                    "error": "ChromaDB 업데이트 실패",
                    "updated_count": 0,
                    "performance": {
                        "api_calls": api_calls,
                        "tokens_used": tokens_used,
                        "api_time_seconds": gpt_elapsed if 'gpt_elapsed' in locals() else 0
                    }
                }

        except Exception as e:
            logger.error(f"테이블 {table_name} 스키마 동기화 오류: {e}")
            return {
                "success": False,
                "error": str(e),
                "updated_count": 0,
                "performance": {
                    "api_calls": 0,
                    "tokens_used": 0,
                    "api_time_seconds": 0
                }
            }

    def _get_all_tables(self) -> List[str]:
        """DB에서 모든 테이블 목록 조회"""
        if self._all_tables is not None:
            return self._all_tables

        try:
            with SessionLocal() as db:
                # Oracle DB에서 현재 스키마의 모든 테이블 조회
                result = db.execute(text("""
                    SELECT table_name
                    FROM user_tables
                    ORDER BY table_name
                """))

                # SQLAlchemy 2.x 방식으로 데이터 접근 (컬럼명 대소문자 안전 처리)
                rows = result.fetchall()
                tables = []
                for row in rows:
                    # Oracle에서 컬럼명이 대소문자로 반환될 수 있으므로 안전하게 처리
                    table_name = None
                    for key in row._mapping.keys():
                        if key.upper() == 'TABLE_NAME':
                            table_name = row._mapping[key].lower()
                            break
                    if table_name:
                        tables.append(table_name)

                # 시스템 테이블 제외
                excluded_tables = ['dual', 'sys_', 'dba_', 'all_', 'user_']
                tables = [table for table in tables
                         if not any(table.startswith(prefix) for prefix in excluded_tables)]

                self._all_tables = tables
                logger.info(f"DB에서 {len(tables)}개 테이블 발견: {tables}")
                return tables

        except Exception as e:
            logger.error(f"테이블 목록 조회 실패: {e}")
            return []


    def _get_table_schema_info(self, table_name: str) -> Dict:
        """DB에서 테이블 스키마 정보 및 샘플 데이터 동적 조회"""
        try:
            with SessionLocal() as db:
                # Oracle DB에서 테이블 코멘트 조회
                table_comment_query = text("""
                    SELECT comments
                    FROM user_tab_comments
                    WHERE table_name = UPPER(:table_name)
                """)
                table_comment_result = db.execute(table_comment_query, {"table_name": table_name})
                table_comment = table_comment_result.fetchone()

                # 컬럼 정보 및 코멘트 조회
                columns_query = text("""
                    SELECT
                        utc.column_name,
                        utc.data_type,
                        utc.data_length,
                        utc.nullable,
                        ucc.comments
                    FROM user_tab_columns utc
                    LEFT JOIN user_col_comments ucc ON utc.table_name = ucc.table_name
                                                    AND utc.column_name = ucc.column_name
                    WHERE utc.table_name = UPPER(:table_name)
                    ORDER BY utc.column_id
                """)
                columns_result = db.execute(columns_query, {"table_name": table_name})

                columns_info = {}
                for row in columns_result.fetchall():
                    # SQLAlchemy 2.x 방식으로 데이터 접근 (컬럼명 대소문자 안전 처리)
                    mapping = row._mapping

                    # 컬럼명들을 안전하게 찾기
                    column_name = None
                    data_type = None
                    data_length = None
                    nullable = None
                    comment = None

                    for key in mapping.keys():
                        key_upper = key.upper()
                        if key_upper == 'COLUMN_NAME':
                            column_name = mapping[key].lower()
                        elif key_upper == 'DATA_TYPE':
                            data_type = mapping[key]
                        elif key_upper == 'DATA_LENGTH':
                            data_length = mapping[key]
                        elif key_upper == 'NULLABLE':
                            nullable = mapping[key]
                        elif key_upper == 'COMMENTS':
                            comment = mapping[key]

                    if column_name:
                        final_comment = comment if comment else self._generate_column_description_fallback(column_name, data_type)

                        # 컬럼별 샘플 데이터 수집
                        sample_values = self._get_column_sample_values(db, table_name, column_name, data_type)

                        columns_info[column_name] = {
                            "description": final_comment,
                            "data_type": data_type,
                            "sample_values": sample_values
                        }

                # 테이블 코멘트 처리 (대소문자 안전)
                table_desc = f"{table_name} 테이블"
                if table_comment:
                    try:
                        if hasattr(table_comment, '_mapping'):
                            # 컬럼명을 안전하게 찾기
                            for key in table_comment._mapping.keys():
                                if key.upper() == 'COMMENTS':
                                    comment_value = table_comment._mapping[key]
                                    table_desc = comment_value if comment_value else f"{table_name} 테이블"
                                    break
                        else:
                            comment_value = table_comment[0]
                            table_desc = comment_value if comment_value else f"{table_name} 테이블"
                    except (KeyError, IndexError, AttributeError):
                        table_desc = f"{table_name} 테이블"

                schema_info = {
                    "description": table_desc,
                    "columns": columns_info
                }

                return schema_info

        except Exception as e:
            logger.warning(f"테이블 {table_name} 스키마 조회 실패: {e}")
            return {
                "description": f"{table_name} 테이블",
                "columns": {}
            }

    def _get_column_sample_values(self, db: Session, table_name: str, column_name: str, data_type: str) -> List[str]:
        """특정 컬럼의 샘플 데이터 조회 (상위 10개 distinct 값)"""
        try:
            # 텍스트/문자열 타입의 컬럼만 샘플링 (enum 값 찾기 위함)
            if data_type not in ['VARCHAR2', 'CHAR', 'NVARCHAR2', 'NCHAR']:
                return []

            sample_query = text(f"""
                SELECT DISTINCT {column_name} as sample_value, COUNT(*) as cnt
                FROM {table_name}
                WHERE {column_name} IS NOT NULL
                  AND LENGTH({column_name}) <= 50
                GROUP BY {column_name}
                ORDER BY cnt DESC, {column_name}
                FETCH FIRST 10 ROWS ONLY
            """)

            result = db.execute(sample_query)
            sample_values = []

            for row in result.fetchall():
                mapping = row._mapping
                # 샘플 값 추출
                for key in mapping.keys():
                    if key.upper() == 'SAMPLE_VALUE':
                        value = mapping[key]
                        if value and str(value).strip():
                            sample_values.append(str(value).strip())
                        break

            return sample_values

        except Exception as e:
            return []

    async def _generate_batch_descriptions_with_gpt(self, batch_schemas: Dict[str, Dict]) -> Dict[str, Any]:
        """배치로 여러 테이블의 설명 생성 (한 번의 GPT 호출)"""
        try:
            start_time = datetime.now()

            # 비즈니스 컨텍스트 로드
            business_context = ""
            context_path = os.path.join(
                os.path.dirname(__file__),
                "..", ".taskmaster", "docs", "business_context.md"
            )

            if os.path.exists(context_path):
                with open(context_path, "r", encoding="utf-8") as f:
                    business_context = f.read()

            # 배치 내 모든 테이블 정보를 프롬프트로 구성
            tables_info = []
            for table_name, schema_info in batch_schemas.items():
                columns_info = schema_info.get("columns", {})
                columns_text = []
                for col_name, col_data in columns_info.items():
                    data_type = col_data.get("data_type", "VARCHAR2")
                    sample_values = col_data.get("sample_values", [])
                    column_line = f"- {col_name} ({data_type})"
                    if sample_values:
                        sample_str = ", ".join(sample_values[:5])
                        column_line += f" - 실제값 예시: [{sample_str}]"
                    columns_text.append(column_line)

                table_info = f"""
**Table**: {table_name}
**Columns**:
{chr(10).join(columns_text)}
"""
                tables_info.append(table_info)

            prompt = f"""
=== Business Context ===
{business_context}

=== Batch Table Analysis Task ===
You are analyzing {len(batch_schemas)} Oracle DB tables for HanaOneQLiving (premium officetel rental platform).

{chr(10).join(tables_info)}

Generate rich metadata for ALL tables above **IN ENGLISH** in the following JSON format:

{{
  "table_name_1": {{
    "table_description": "Detailed English description (100-200 chars)",
    "table_keywords": "keyword1, keyword2, ... (30+ English keywords including ALL status values)",
    "columns": {{
      "column_name": "English description (max 15 chars)",
      ...
    }}
  }},
  "table_name_2": {{
    ...
  }}
}}
"""

            # OpenAI API key 가져오기
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                logger.warning("OPENAI_API_KEY가 설정되지 않음, 기본 패턴 사용")
                return self._fallback_batch_pattern_matching(batch_schemas)

            headers = {
                "Authorization": f"Bearer {openai_api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 4000  # 배치 처리를 위해 증가
            }

            logger.info(f"배치 GPT API 호출 시작")

            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )

            elapsed = (datetime.now() - start_time).total_seconds()

            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]

                usage = result.get("usage", {})
                tokens_used = usage.get("total_tokens", 0)

                # JSON 파싱
                try:
                    if content.startswith("```json"):
                        content = content.replace("```json", "").replace("```", "").strip()
                    elif content.startswith("```"):
                        content = content.replace("```", "").strip()

                    batch_results = json.loads(content)

                    # 성능 정보 추가
                    batch_results["_batch_performance"] = {
                        "api_calls": 1,
                        "tokens_used": tokens_used,
                        "api_time_seconds": elapsed
                    }

                    logger.info(f"배치 결과 파싱 완료: {len(batch_results) - 1}개 테이블")
                    return batch_results

                except json.JSONDecodeError as e:
                    logger.warning(f"배치 GPT 응답 JSON 파싱 실패: {e}")
                    return self._fallback_batch_pattern_matching(batch_schemas)
            else:
                logger.warning(f"배치 API 호출 실패: {response.status_code}")
                return self._fallback_batch_pattern_matching(batch_schemas)

        except Exception as e:
            logger.warning(f"배치 GPT 분석 실패: {e}")
            return self._fallback_batch_pattern_matching(batch_schemas)

    def _fallback_batch_pattern_matching(self, batch_schemas: Dict[str, Dict]) -> Dict[str, Any]:
        """배치 처리 실패 시 기본 패턴 매칭"""
        results = {}
        for table_name, schema_info in batch_schemas.items():
            columns_info = schema_info.get("columns", {})
            descriptions = {}
            for col_name, col_data in columns_info.items():
                if isinstance(col_data, dict):
                    data_type = col_data.get("data_type", "VARCHAR2")
                else:
                    data_type = "VARCHAR2"
                descriptions[col_name] = self._generate_column_description_fallback(col_name, data_type)

            results[table_name] = {
                "table_description": f"{table_name} 테이블",
                "table_keywords": "",
                "columns": descriptions
            }

        results["_batch_performance"] = {
            "api_calls": 0,
            "tokens_used": 0,
            "api_time_seconds": 0
        }
        return results

    def _generate_table_descriptions_with_gpt(self, table_name: str, columns_info: Dict[str, Dict]) -> Dict[str, Any]:
        """GPT에게 테이블 전체 컬럼 분석 요청 (비즈니스 컨텍스트 + 샘플 데이터 포함)"""
        try:
            business_context = ""
            context_path = os.path.join(
                os.path.dirname(__file__),
                "..", ".taskmaster", "docs", "business_context.md"
            )

            if os.path.exists(context_path):
                with open(context_path, "r", encoding="utf-8") as f:
                    business_context = f.read()

            columns_text = []

            for column_name, column_data in columns_info.items():
                data_type = column_data.get("data_type", "VARCHAR2")
                sample_values = column_data.get("sample_values", [])

                column_line = f"- {column_name} ({data_type})"
                if sample_values:
                    sample_str = ", ".join(sample_values[:5])
                    column_line += f" - 실제값 예시: [{sample_str}]"

                columns_text.append(column_line)

            prompt = f"""
=== Business Context ===
{business_context}

=== Table Analysis Task ===
You are analyzing the Oracle DB schema for HanaOneQLiving (premium officetel rental platform).

**Table**: {table_name}
**Columns**:
{chr(10).join(columns_text)}

Generate rich metadata for semantic search **IN ENGLISH** in the following JSON format:

1. **table_description** (100-200 English characters):
   - What does this table store?
   - When/how is it used?
   - What business problem does it solve?

2. **table_keywords** (comma-separated English keywords, minimum 30):
   - **CRITICAL**: Include ALL English synonyms for table concept
   - **MANDATORY for status/state/type/category columns**: Include ALL possible enum values
     * Even if sample data only shows 'COMPLETED', add: FAILED, PENDING, CANCELLED, IN_PROGRESS, OVERDUE, SUCCESS, ERROR, UNPAID, DELINQUENT, ACTIVE, INACTIVE
     * Include verb forms: fail/failed/failing, complete/completed/completing, pay/paid/paying
   - Add keywords for question types this table can answer
   - Example for "payments": "payment, pay, paid, rent, fee, charge, billing, invoice, transaction, transfer, automatic, auto-payment, completed, failed, pending, overdue, unpaid, delinquent, success, error, monthly, deposit, withdrawal"

3. **use_cases** (5 natural English questions this table answers):
   - **MANDATORY**: If status column exists, include questions for EACH status (success/failure/pending/overdue)
   - Example for "payments": ["users who completed rent payment", "customers with failed payments", "unpaid invoices", "successful automatic transfers", "pending payment contracts"]
   - Example for "linked_bank_accounts": ["users who registered bank accounts", "active automatic payment accounts", "linked banking information"]

4. **columns** (English description for each column, max 15 chars):

**Critical Rules**:
- Analyze sample values to identify enum/status patterns
- INFER all logically possible status values even if NOT in sample data
  * If status shows only 'COMPLETED', still add: FAILED, PENDING, CANCELLED, OVERDUE, SUCCESS, ERROR, UNPAID
  * Include ALL verb forms: fail/failed/failing, pay/paid/paying, complete/completed
- Translate ALL Korean terms to English (e.g., monthly rent, payment)
- Imagine natural user questions in English and add related keywords
- Include maximum synonyms (improves recall)
- **ALL OUTPUT MUST BE IN ENGLISH**

JSON Response (ALL IN ENGLISH):
{{
  "table_description": "Detailed English description (100-200 chars)",
  "table_keywords": "keyword1, keyword2, ... (30+ English keywords)",
  "use_cases": ["English question1", "English question2", "English question3", "English question4", "English question5"],
  "columns": {{
    "column_name": "English description",
    "column_name2": "English description2"
  }}
}}
"""

            # OpenAI API 호출
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                logger.warning("OPENAI_API_KEY가 설정되지 않음, 기본 패턴 사용")
                return self._fallback_pattern_matching(columns_info)

            headers = {
                "Authorization": f"Bearer {openai_api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 2000
            }

            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]

                usage = result.get("usage", {})
                tokens_used = usage.get("total_tokens", 0)

                try:
                    if content.startswith("```json"):
                        content = content.replace("```json", "").replace("```", "").strip()
                    elif content.startswith("```"):
                        content = content.replace("```", "").strip()

                    result_data = json.loads(content)

                    if isinstance(result_data, dict) and "columns" in result_data:
                        return {
                            "table_description": result_data.get("table_description", ""),
                            "table_keywords": result_data.get("table_keywords", ""),
                            "columns": result_data.get("columns", {}),
                            "tokens_used": tokens_used
                        }
                    else:
                        return {
                            "table_description": "",
                            "table_keywords": "",
                            "columns": result_data,
                            "tokens_used": tokens_used
                        }
                except json.JSONDecodeError as e:
                    logger.warning(f"GPT 응답 JSON 파싱 실패: {e}")
                    return self._fallback_pattern_matching(columns_info)
            else:
                logger.warning(f"OpenAI API 호출 실패: {response.status_code}, 기본 패턴 사용")
                return self._fallback_pattern_matching(columns_info)

        except Exception as e:
            logger.warning(f"GPT 분석 실패: {e}, 기본 패턴 사용")
            return self._fallback_pattern_matching(columns_info)

    def _fallback_pattern_matching(self, columns_info: Dict[str, Dict]) -> Dict[str, Any]:
        """기본 패턴 매칭 (GPT 실패 시 대체)"""
        descriptions = {}
        for column_name, column_data in columns_info.items():
            if isinstance(column_data, dict):
                data_type = column_data.get("data_type", "VARCHAR2")
            else:
                data_type = "VARCHAR2"
            descriptions[column_name] = self._generate_column_description_fallback(column_name, data_type)

        return {
            "table_description": "",
            "table_keywords": "",
            "columns": descriptions,
            "tokens_used": 0  # GPT 호출 안 함
        }

    def _generate_column_description_fallback(self, column_name: str, data_type: str) -> str:
        """컬럼명과 데이터 타입으로 자동 설명 생성 (기본 패턴)"""
        name_lower = column_name.lower()

        if 'id' in name_lower:
            if name_lower.endswith('_id'):
                entity = name_lower.replace('_id', '')
                return f"{entity} 고유번호"
            else:
                return "고유번호"
        elif 'name' in name_lower:
            return "명칭"
        elif 'date' in name_lower or 'time' in name_lower:
            return "날짜/시간"
        elif 'email' in name_lower:
            return "이메일 주소"
        elif 'phone' in name_lower:
            return "전화번호"
        elif 'address' in name_lower:
            return "주소"
        elif 'amount' in name_lower or 'price' in name_lower or 'cost' in name_lower:
            return "금액"
        elif 'status' in name_lower:
            return "상태"
        elif 'content' in name_lower:
            return "내용"
        elif 'title' in name_lower:
            return "제목"
        elif 'description' in name_lower:
            return "설명"
        elif data_type in ['NUMBER', 'INTEGER']:
            return "숫자"
        elif data_type in ['VARCHAR2', 'CHAR', 'CLOB']:
            return "텍스트"
        elif data_type in ['DATE', 'TIMESTAMP']:
            return "날짜"
        else:
            return column_name.replace('_', ' ').title()


    def _load_business_context(self) -> str:
        """비즈니스 컨텍스트 파일을 로드하여 텍스트로 반환"""
        try:
            business_context_path = os.path.join(os.path.dirname(__file__), '..', 'business_context.json')

            if not os.path.exists(business_context_path):
                return "비즈니스 컨텍스트가 설정되지 않았습니다."

            with open(business_context_path, 'r', encoding='utf-8') as f:
                business_data = json.load(f)

            # 비즈니스 컨텍스트를 텍스트로 변환
            context_parts = [
                f"도메인: {business_data.get('domain', '')}",
                f"설명: {business_data.get('description', '')}"
            ]

            # 엔티티 패턴
            entity_patterns = business_data.get("entity_patterns", {})
            if entity_patterns:
                context_parts.append("엔티티 패턴:")
                for pattern, meaning in entity_patterns.items():
                    context_parts.append(f"- {pattern}: {meaning}")

            # 비즈니스 규칙
            business_rules = business_data.get("business_rules", [])
            if business_rules:
                context_parts.append("규칙:")
                for rule in business_rules:
                    context_parts.append(f"- {rule}")

            return "\n".join(context_parts)

        except Exception as e:
            logger.warning(f"비즈니스 컨텍스트 로드 실패: {e}")
            return "비즈니스 컨텍스트 로드에 실패했습니다."

    def _translate_to_english(self, korean_text: str, table_name: str) -> str:
        """한글 텍스트를 영어로 번역 (임베딩 정확도 향상)"""
        try:
            import requests

            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                logger.warning(f"OPENAI_API_KEY 없음, 원본 사용: {table_name}")
                return korean_text

            logger.info(f"    {table_name} 영어 번역 시작...")

            headers = {
                "Authorization": f"Bearer {openai_api_key}",
                "Content-Type": "application/json"
            }

            prompt = f"""Translate the following Korean database schema description to English. Keep technical terms, table names, and SQL keywords in English.

Korean Text:
{korean_text}

English Translation:"""

            payload = {
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.0,
                "max_tokens": 3000
            }

            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                translated = result["choices"][0]["message"]["content"].strip()
                logger.info(f"    번역 완료: {len(korean_text)}자 -> {len(translated)}자")
                return translated
            else:
                logger.warning(f"번역 API 실패 ({response.status_code}), 원본 사용")
                return korean_text

        except Exception as e:
            logger.warning(f"번역 실패: {e}, 원본 사용")
            return korean_text

    def _create_schema_vector_document(self, table_name: str, schema_info: Dict) -> Dict[str, Any]:
        table_description = schema_info.get('description', f'{table_name} 테이블')
        text_parts = [
            f"테이블명: {table_name}",
            f"테이블 설명: {table_description}"
        ]

        if schema_info.get("table_keywords"):
            keywords = schema_info['table_keywords']
            text_parts.append(f"관련 키워드: {keywords}")

        if schema_info.get("use_cases"):
            use_cases = schema_info['use_cases']
            if isinstance(use_cases, list):
                use_cases_text = ", ".join(use_cases)
                text_parts.append(f"예상 질문: {use_cases_text}")

        columns_info = schema_info.get("columns", {})
        if columns_info:
            text_parts.append("컬럼 정보:")
            for col_name, col_data in columns_info.items():
                if isinstance(col_data, dict):
                    col_desc = col_data.get("description", "")
                    data_type = col_data.get("data_type", "VARCHAR2")
                    sample_values = col_data.get("sample_values", [])

                    text_line = f"- {col_name} ({data_type}): {col_desc}"
                    if sample_values:
                        text_line += f" (실제값: {', '.join(sample_values[:5])})"
                    text_parts.append(text_line)
                else:
                    text_parts.append(f"- {col_name}: {col_data}")

        column_names = list(columns_info.keys())
        if column_names:
            example_sql = f"SELECT {', '.join(column_names[:10])} FROM {table_name}"
            text_parts.append(f"SQL 예시: {example_sql}")

        text = "\n".join(text_parts)


        column_descriptions = []
        sample_values_all = []
        for col_name, col_data in columns_info.items():
            if isinstance(col_data, dict):
                column_descriptions.append(col_data.get("description", ""))
                sample_values_all.extend(col_data.get("sample_values", []))
            else:
                column_descriptions.append(str(col_data))

        # use_cases도 searchable_text에 포함
        use_cases_text = ""
        if schema_info.get("use_cases") and isinstance(schema_info["use_cases"], list):
            use_cases_text = " ".join(schema_info["use_cases"])

        searchable_text = f"{table_name} {' '.join(column_names)} {' '.join(column_descriptions)} {' '.join(sample_values_all)} {schema_info.get('table_keywords', '')} {use_cases_text}"
        metadata = {
            "type": "table_schema",
            "table_name": table_name,
            "table_description": table_description,
            "columns_json": json.dumps(columns_info, ensure_ascii=False),
            "column_count": len(columns_info),
            "sample_values_json": json.dumps(sample_values_all, ensure_ascii=False),
            "last_updated": datetime.now().isoformat(),
            "sql_table_name": table_name,
            "searchable_text": searchable_text
        }

        return {
            "text": text,
            "metadata": metadata
        }


    def get_sync_status(self) -> Dict[str, Any]:
        """Get vector DB sync status"""
        try:
            collection_info = self.rag_node.get_collection_info()
            return {
                "vector_db_connected": True,
                "collection_info": collection_info,
                "last_check": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "vector_db_connected": False,
                "error": str(e),
                "last_check": datetime.now().isoformat()
            }