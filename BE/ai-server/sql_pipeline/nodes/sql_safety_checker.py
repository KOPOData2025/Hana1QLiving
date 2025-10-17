"""
SQL 안전성 검사 노드
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class SafetyNode:
    """SQL 안전성 검사"""

    def check_sql_safety(self, sql: str) -> Dict[str, Any]:
        """
        SQL 안전성 검사

        Args:
            sql: 검사할 SQL

        Returns:
            안전성 검사 결과
        """
        logger.info(f"SQL 안전성 검사: {sql[:100]}...")

        # 기본적인 안전성 검사
        sql_upper = sql.upper().strip()

        # 위험한 키워드 체크 (단어 경계 검사)
        import re
        dangerous_patterns = [
            r'\bDROP\b',
            r'\bDELETE\b',
            r'\bTRUNCATE\b',
            r'\bALTER\b',
            r'\bCREATE\b',
            r'\bUPDATE\b',
            r'\bINSERT\b'
        ]

        for pattern in dangerous_patterns:
            if re.search(pattern, sql_upper):
                logger.warning(f"위험한 SQL 키워드 감지: {pattern}")
                return {
                    "allowed": False,
                    "reason": f"위험한 SQL 명령어가 포함되어 있습니다: {pattern.replace(r'\b', '')}"
                }

        # SELECT 문만 허용
        if not sql_upper.startswith("SELECT"):
            logger.warning("SELECT 문이 아님")
            return {
                "allowed": False,
                "reason": "SELECT 문만 실행 가능합니다"
            }

        logger.info("SQL 안전성 검사 통과")
        return {
            "allowed": True,
            "reason": "안전한 SQL입니다"
        }
