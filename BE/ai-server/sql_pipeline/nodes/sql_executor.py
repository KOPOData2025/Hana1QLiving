"""
SQL 실행 노드
"""
import logging
from typing import List, Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class ExecuteNode:
    """SQL 실행"""

    def execute_sql(self, db: Session, sql: str) -> Dict[str, Any]:
        """
        SQL 실행

        Args:
            db: DB 세션
            sql: 실행할 SQL

        Returns:
            실행 결과
        """
        logger.info(f"SQL 실행: {sql[:100]}...")

        try:
            result = db.execute(text(sql))
            rows = result.fetchall()

            # 결과를 딕셔너리 리스트로 변환
            columns = result.keys()
            data = [dict(zip(columns, row)) for row in rows]

            logger.info(f"SQL 실행 완료: {len(data)}행")

            return {
                "success": True,
                "data": data,
                "row_count": len(data)
            }

        except Exception as e:
            logger.error(f"SQL 실행 실패: {e}")
            return {
                "success": False,
                "error": str(e),
                "data": []
            }
