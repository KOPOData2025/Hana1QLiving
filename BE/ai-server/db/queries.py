from typing import List, Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

class BasicQueries:
    """BASIC 모드에서 사용하는 Oracle 쿼리들"""
    
    @staticmethod
    def search_terms(db: Session, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """용어 검색"""
        try:
            sql = text("""
                SELECT TERM_KEY, DESCRIPTION, SYNONYMS 
                FROM TERMS 
                WHERE LOWER(TERM_KEY) LIKE :query 
                   OR LOWER(DESCRIPTION) LIKE :query
                   OR (SYNONYMS IS NOT NULL AND LOWER(SYNONYMS) LIKE :query)
                FETCH FIRST :limit ROWS ONLY
            """)
            
            result = db.execute(sql, {"query": f"%{query.lower()}%", "limit": limit})
            return [{"term_key": row[0], "description": row[1], "synonyms": row[2]} 
                   for row in result.fetchall()]
        except Exception as e:
            logger.error(f"TERMS 검색 실패: {e}")
            return []
    
    @staticmethod
    def search_configs(db: Session, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """설정 검색"""
        try:
            sql = text("""
                SELECT KEY, VALUE, TENANT_ID 
                FROM CONFIGS 
                WHERE LOWER(KEY) LIKE :query 
                   OR LOWER(VALUE) LIKE :query
                FETCH FIRST :limit ROWS ONLY
            """)
            
            result = db.execute(sql, {"query": f"%{query.lower()}%", "limit": limit})
            return [{"key": row[0], "value": row[1], "tenant_id": row[2]} 
                   for row in result.fetchall()]
        except Exception as e:
            logger.error(f"CONFIGS 검색 실패: {e}")
            return []
    
    @staticmethod
    def search_faqs(db: Session, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """FAQ 검색"""
        try:
            sql = text("""
                SELECT ID, QUESTION, ANSWER, URL 
                FROM FAQ 
                WHERE LOWER(QUESTION) LIKE :query 
                   OR LOWER(ANSWER) LIKE :query
                FETCH FIRST :limit ROWS ONLY
            """)
            
            result = db.execute(sql, {"query": f"%{query.lower()}%", "limit": limit})
            return [{"id": row[0], "question": row[1], "answer": row[2], "url": row[3]} 
                   for row in result.fetchall()]
        except Exception as e:
            logger.error(f"FAQ 검색 실패: {e}")
            return []
    
    @staticmethod
    def get_meta_columns(db: Session, table_name: str = None) -> List[Dict[str, Any]]:
        """메타 컬럼 정보 조회"""
        try:
            if table_name:
                sql = text("""
                    SELECT TABLE_NAME, COLUMN_NAME, DESCRIPTION 
                    FROM META_COLUMNS 
                    WHERE UPPER(TABLE_NAME) = :table_name
                    ORDER BY COLUMN_NAME
                """)
                result = db.execute(sql, {"table_name": table_name.upper()})
            else:
                sql = text("""
                    SELECT TABLE_NAME, COLUMN_NAME, DESCRIPTION 
                    FROM META_COLUMNS 
                    ORDER BY TABLE_NAME, COLUMN_NAME
                """)
                result = db.execute(sql)
            
            return [{"table_name": row[0], "column_name": row[1], "description": row[2]} 
                   for row in result.fetchall()]
        except Exception as e:
            logger.error(f"메타 컬럼 조회 실패: {e}")
            return []
