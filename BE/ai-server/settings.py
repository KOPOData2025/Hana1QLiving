import os
from typing import Set
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

class Settings:
    def __init__(self):
        # Oracle DB 연결 설정
        self.DATABASE_URL: str = os.getenv(
            "DATABASE_URL", 
            "oracle+oracledb://orchestrator:tiger@34.173.241.9:1521/XEPDB1"
        )
        
        # 모든 테이블 허용 (개발/테스트용)
        allowed_tables_str = os.getenv("ALLOWED_TABLES", "*")
        print(f"환경변수 ALLOWED_TABLES 값: '{allowed_tables_str}'")
        
        if allowed_tables_str == "*":
            # 모든 테이블 허용
            self.ALLOWED_TABLES = {"*"}
            print("모든 테이블이 허용됩니다. (개발/테스트 모드)")
        else:
            # 특정 테이블만 허용
            self.ALLOWED_TABLES: Set[str] = set(allowed_tables_str.upper().split(","))
            print(f"허용된 테이블: {self.ALLOWED_TABLES}")
        
        # 디버깅을 위해 허용된 테이블 목록 로깅
        print(f"허용된 테이블 목록: {self.ALLOWED_TABLES}")
        print(f"허용된 테이블 개수: {len(self.ALLOWED_TABLES)}")
        print(f"각 테이블: {list(self.ALLOWED_TABLES)}")
        
        # 디버그 모드
        self.DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
        
        # JWT 시크릿 (실제 운영에서는 환경변수로 설정)
        self.JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-key")
        
        # API 설정
        self.API_V1_STR: str = "/v1"
        self.PROJECT_NAME: str = "AI Orchestration Server (MVP)"

settings = Settings()
