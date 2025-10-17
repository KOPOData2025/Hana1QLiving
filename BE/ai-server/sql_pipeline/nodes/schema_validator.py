"""
SQL 검증 노드 (Schema Validation)

생성된 SQL을 실제 DB 스키마와 대조하여 오류 검증
"""
import logging
import re
from typing import Dict, Any, List, Set
from sqlalchemy import create_engine, inspect
import os
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class SQLValidatorNode:
    """SQL 스키마 검증 노드"""

    def __init__(self):
        """초기화 - DB 스키마 정보 로드"""
        self.engine = self._create_db_engine()
        self.schema_info = self._load_schema_info()
        logger.info(f"✅ SQL Validator 초기화: {len(self.schema_info)} 테이블")

    def _create_db_engine(self):
        """Oracle DB 엔진 생성"""
        try:
            db_host = os.getenv("ORACLE_DB_HOST", "localhost")
            db_port = os.getenv("ORACLE_DB_PORT", "1521")
            db_sid = os.getenv("ORACLE_DB_SID", "XE")
            db_user = os.getenv("ORACLE_DB_USER", "SCOTT")
            db_password = os.getenv("ORACLE_DB_PASSWORD", "tiger")

            connection_string = f"oracle+oracledb://{db_user}:{db_password}@{db_host}:{db_port}/?service_name={db_sid}"
            engine = create_engine(connection_string, echo=False)

            # 연결 테스트
            with engine.connect() as conn:
                from sqlalchemy import text
                conn.execute(text("SELECT 1 FROM DUAL"))

            logger.info("✅ Oracle DB 연결 성공 (Validator)")
            return engine

        except Exception as e:
            logger.error(f"❌ Oracle DB 연결 실패: {e}")
            raise

    def _load_schema_info(self) -> Dict[str, Set[str]]:
        """실제 DB에서 스키마 정보 로드"""
        schema_info = {}

        try:
            inspector = inspect(self.engine)
            tables = inspector.get_table_names()

            for table in tables:
                columns = inspector.get_columns(table)
                schema_info[table.upper()] = {col['name'].upper() for col in columns}

            logger.info(f"📊 Schema 로드: {list(schema_info.keys())}")
            return schema_info

        except Exception as e:
            logger.error(f"❌ Schema 로드 실패: {e}")
            raise

    def validate(self, sql: str) -> Dict[str, Any]:
        """
        SQL 스키마 검증

        Args:
            sql: 검증할 SQL 쿼리

        Returns:
            {
                "valid": bool,
                "errors": List[str],
                "suggestions": List[str],
                "feedback": str  # LLM에게 전달할 피드백
            }
        """
        errors = []
        suggestions = []

        try:
            # 1. 테이블 존재 검증
            tables = self._extract_tables(sql)
            for table in tables:
                if table.upper() not in self.schema_info:
                    errors.append(f"존재하지 않는 테이블: {table}")

            # 2. 컬럼 존재 검증
            for table in tables:
                if table.upper() not in self.schema_info:
                    continue  # 이미 테이블 에러로 기록됨

                columns = self._extract_columns_for_table(sql, table)
                valid_columns = self.schema_info.get(table.upper(), set())

                for col in columns:
                    # 집계 함수 제거 (COUNT, SUM, AVG 등)
                    col_clean = re.sub(
                        r'^(COUNT|SUM|AVG|MAX|MIN|DISTINCT)\s*\((.+)\)$',
                        r'\2',
                        col,
                        flags=re.IGNORECASE
                    ).strip()
                    col_clean = col_clean.split('.')[-1].strip().upper()

                    # 남은 괄호 제거 (ID) → ID)
                    col_clean = col_clean.rstrip(')')

                    if col_clean != '*' and col_clean not in valid_columns:
                        errors.append(f"테이블 {table}에 존재하지 않는 컬럼: {col_clean}")

                        # 유사 컬럼 제안
                        similar = self._find_similar_column(col_clean, valid_columns)
                        if similar:
                            suggestions.append(f"{col_clean} → {similar} 사용 권장")

            # 3. 피드백 생성 (LLM에게 전달)
            feedback = self._create_feedback(errors, suggestions)

            return {
                "valid": len(errors) == 0,
                "errors": errors,
                "suggestions": suggestions,
                "feedback": feedback
            }

        except Exception as e:
            logger.error(f"❌ SQL 검증 중 오류: {e}")
            return {
                "valid": False,
                "errors": [f"검증 중 오류: {str(e)}"],
                "suggestions": [],
                "feedback": f"SQL 검증 실패: {str(e)}"
            }

    def _extract_tables(self, sql: str) -> List[str]:
        """SQL에서 테이블명 추출"""
        # FROM, JOIN 절에서 테이블명 추출
        pattern = r'(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)'
        matches = re.findall(pattern, sql, re.IGNORECASE)
        return [m.upper() for m in matches]

    def _extract_columns_for_table(self, sql: str, table: str) -> List[str]:
        """특정 테이블의 컬럼 추출 (별칭 고려)"""
        # 테이블 별칭 찾기
        alias_pattern = rf'(?:FROM|JOIN)\s+{table}\s+([a-zA-Z_][a-zA-Z0-9_]*)'
        alias_match = re.search(alias_pattern, sql, re.IGNORECASE)
        alias = alias_match.group(1) if alias_match else table

        # SELECT 절에서 컬럼 추출
        select_pattern = r'SELECT\s+(.+?)\s+FROM'
        select_match = re.search(select_pattern, sql, re.IGNORECASE | re.DOTALL)
        if not select_match:
            return []

        select_clause = select_match.group(1)
        columns = [c.strip() for c in select_clause.split(',')]

        # 해당 테이블의 컬럼만 필터링
        table_columns = []
        for col in columns:
            if f"{alias}.".lower() in col.lower():
                col_name = col.split('.')[-1].strip()

                # AS 별칭 제거 (예: "id AS building_id" → "id")
                col_name = re.sub(r'\s+AS\s+\w+', '', col_name, flags=re.IGNORECASE).strip()

                # 괄호 제거 (예: "ID)" → "ID")
                col_name = col_name.rstrip(')')

                table_columns.append(col_name)

        # WHERE 절에서도 추출
        where_pattern = rf'\bWHERE\b.+?{alias}\.([a-zA-Z_][a-zA-Z0-9_]*)'
        where_matches = re.findall(where_pattern, sql, re.IGNORECASE | re.DOTALL)
        table_columns.extend(where_matches)

        return table_columns

    def _find_similar_column(self, col: str, valid_columns: Set[str]) -> str | None:
        """유사한 컬럼명 찾기 (간단한 휴리스틱)"""
        col_lower = col.lower()

        # 정확히 일치하는 다른 컬럼 찾기
        for valid_col in valid_columns:
            if col_lower in valid_col.lower() or valid_col.lower() in col_lower:
                return valid_col

        # building_id → unit_id 같은 패턴
        if 'building' in col_lower:
            for valid_col in valid_columns:
                if 'unit' in valid_col.lower():
                    return valid_col

        return None

    def _create_feedback(self, errors: List[str], suggestions: List[str]) -> str:
        """LLM에게 전달할 피드백 생성"""
        if not errors:
            return ""

        feedback_parts = ["이전 SQL 생성 시도에서 다음 오류가 발생했습니다:"]
        feedback_parts.extend([f"- {error}" for error in errors])

        if suggestions:
            feedback_parts.append("\n권장 사항:")
            feedback_parts.extend([f"- {suggestion}" for suggestion in suggestions])

        feedback_parts.append("\n위 오류를 수정하여 SQL을 다시 생성해주세요.")

        return "\n".join(feedback_parts)


# 싱글톤 인스턴스
_validator_instance = None


def get_validator() -> SQLValidatorNode:
    """SQL Validator 싱글톤 인스턴스 반환"""
    global _validator_instance
    if _validator_instance is None:
        _validator_instance = SQLValidatorNode()
    return _validator_instance
