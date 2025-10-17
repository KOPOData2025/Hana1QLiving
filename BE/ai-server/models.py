from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
import uuid
from datetime import datetime

class Mode(str, Enum):
    AUTO = "AUTO"
    BASIC = "BASIC"
    DATA = "DATA"

class SourceType(str, Enum):
    FAQ = "FAQ"
    TERM = "TERM"
    CONF = "CONF"
    BQ = "BQ"
    OTHER = "OTHER"

class Citation(BaseModel):
    title: str
    url: Optional[str] = None
    sourceType: SourceType

class UICapabilities(BaseModel):
    maxResults: Optional[int] = None
    supportsCharts: Optional[bool] = None
    supportsTables: Optional[bool] = None

class AskRequest(BaseModel):
    userInput: str = Field(..., max_length=8000)
    mode: Mode = Mode.AUTO
    contextHints: Optional[List[str]] = None
    topK: int = Field(default=5, ge=1, le=100)
    uiCapabilities: Optional[UICapabilities] = None
    debug: bool = False

class Safety(BaseModel):
    allowed: bool
    reason: str

class Metrics(BaseModel):
    latencyMs: float
    tokens: Dict[str, int] = Field(default_factory=lambda: {"in": 0, "out": 0})

class AskResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    route: Mode
    text: str
    citations: List[Citation] = Field(default_factory=list)
    followUps: List[str] = Field(default_factory=list)
    safety: Safety
    metrics: Metrics

# === 스키마 벡터 인덱스 모델들 ===
class TableSchema(BaseModel):
    """테이블 스키마 정보"""
    table_name: str
    table_comment: Optional[str] = None
    table_type: str = "TABLE"  # TABLE, VIEW, FACT, DIM
    business_domain: Optional[str] = None  # 매출, 고객, 제품 등
    description: Optional[str] = None
    created_date: Optional[datetime] = None
    last_updated: Optional[datetime] = None

class ColumnSchema(BaseModel):
    """컬럼 스키마 정보"""
    table_name: str
    column_name: str
    data_type: str
    nullable: bool = True
    column_comment: Optional[str] = None
    business_meaning: Optional[str] = None  # 비즈니스 의미
    sample_values: Optional[List[str]] = None  # 샘플 값들
    is_primary_key: bool = False
    is_foreign_key: bool = False

class JoinKey(BaseModel):
    """조인키 정보"""
    table_name: str
    column_name: str
    referenced_table: str
    referenced_column: str
    join_type: str = "INNER"  # INNER, LEFT, RIGHT
    relationship: Optional[str] = None  # 1:1, 1:N, N:M

class QueryExample(BaseModel):
    """쿼리 예시"""
    example_id: str
    business_question: str
    sql_query: str
    description: str
    difficulty: str = "BASIC"  # BASIC, INTERMEDIATE, ADVANCED
    tags: List[str] = Field(default_factory=list)

class SchemaVectorIndex(BaseModel):
    """벡터 인덱스 메타데이터"""
    index_id: str
    index_name: str
    created_date: datetime
    last_updated: datetime

class SQLExecutionResult(BaseModel):
    """SQL 실행 결과"""
    success: bool
    data: List[Dict[str, Any]] = Field(default_factory=list)
    row_count: int = 0
    execution_time_ms: float = 0.0
    message: str = ""

class SQLAnalysis(BaseModel):
    """SQL 분석 결과"""
    query_type: str = "SELECT"
    tables: List[str] = Field(default_factory=list)
    columns: List[str] = Field(default_factory=list)
    aggregations: List[str] = Field(default_factory=list)
    grouping: List[str] = Field(default_factory=list)
    ordering: List[str] = Field(default_factory=list)
    filters: List[str] = Field(default_factory=list)
    limit: int = 500

class SQLPathResponse(BaseModel):
    """SQL Path 응답"""
    sql: str
    analysis: SQLAnalysis
    explanation: str
    schema_context: Dict[str, Any] = Field(default_factory=dict)
    execution_result: SQLExecutionResult
    total_tables: int
    total_columns: int
    total_join_keys: int
    total_examples: int
    embedding_model: str
    vector_dimension: int
