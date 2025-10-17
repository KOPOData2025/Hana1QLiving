from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from settings import settings
import logging

logger = logging.getLogger(__name__)

# Oracle DB 엔진 생성 (동기) - oracledb 사용
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=5,
    poolclass=QueuePool,
    echo=settings.DEBUG
)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Session:
    """
    DB 세션 의존성 함수
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
