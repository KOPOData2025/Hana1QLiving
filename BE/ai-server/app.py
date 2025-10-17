from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
import time
import sys
import asyncio
import codecs

from settings import settings
from routers import ask
from services.scheduler_service import SchedulerService

# Windows 환경에서 asyncio 이벤트 루프 정책 설정
if sys.platform.startswith('win'):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# 로깅 설정 - 중요한 로그만 표시
# Windows 콘솔 UTF-8 설정
if sys.platform.startswith('win'):
    import os
    os.environ['PYTHONIOENCODING'] = 'utf-8'

logging.basicConfig(
    level=logging.WARNING,  # WARNING 이상만 표시
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# 애플리케이션 핵심 로거만 INFO 레벨로 설정
core_loggers = [
    'services.vector_sync_service',
    'services.scheduler_service',
    'sql_pipeline.nodes.vector_db_manager',
    'routers.ask',
    'sql_pipeline.retrievers.schema_retriever',
    'sql_pipeline.nodes.sql_generator',
    '__main__',
    'app'
]

for logger_name in core_loggers:
    logging.getLogger(logger_name).setLevel(logging.INFO)

# 외부 라이브러리 로그 레벨 높이기
logging.getLogger('urllib3').setLevel(logging.ERROR)
logging.getLogger('sentence_transformers').setLevel(logging.ERROR)
logging.getLogger('sqlalchemy.engine').setLevel(logging.ERROR)
logging.getLogger('apscheduler').setLevel(logging.ERROR)

logger = logging.getLogger(__name__)

# FastAPI 앱 생성
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI Orchestration 서버 (MVP) - Oracle DB 기반 BASIC/DATA 라우팅",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발용, 운영에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 글로벌 스케줄러 인스턴스
scheduler_service = SchedulerService()

# 라우터 등록
app.include_router(ask.router, tags=["AI Orchestration"])

@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행"""
    logger.info("AI Orchestration 서버 시작 중...")

    # 스케줄러 시작
    scheduler_service.start_scheduler()
    logger.info("벡터DB 동기화 스케줄러 시작됨")

    # 시작 시 자동 동기화는 비활성화 (프론트에서 수동으로만 실행)
    logger.info("벡터DB 자동 동기화는 프론트엔드에서 수동으로 실행하세요")

    logger.info("AI Orchestration 서버 시작 완료")

# 수동 벡터DB 동기화 엔드포인트
@app.post("/admin/sync-vector-db")
async def manual_sync_vector_db():
    """수동으로 벡터DB 동기화 실행"""
    try:
        from services.vector_sync_service import VectorDBSyncService
        sync_service = VectorDBSyncService()

        logger.info("수동 벡터DB 동기화 시작")
        result = await sync_service.sync_all_tables()

        return {
            "success": True,
            "message": "벡터DB 동기화 완료",
            "result": result
        }
    except Exception as e:
        logger.error(f"수동 벡터DB 동기화 실패: {e}")
        return {
            "success": False,
            "message": f"벡터DB 동기화 실패: {str(e)}"
        }

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("서버 종료 중")
    # 스케줄러 중지
    scheduler_service.stop_scheduler()
    logger.info("벡터DB 동기화 스케줄러 중지됨")

@app.get("/health")
async def health_check():
    return {"ok": True, "timestamp": time.time()}

@app.get("/chroma-test")
async def chroma_test():
    try:
        from sql_pipeline.nodes.vector_db_manager import RAGSearchNode  # Lazy import
        rag_node = RAGSearchNode()
        is_connected = rag_node.test_connection()

        if is_connected:
            return {
                "status": "success",
                "message": "ChromaDB 연결 성공",
                "timestamp": time.time()
            }
        else:
            return {
                "status": "error",
                "message": "ChromaDB 연결 실패",
                "timestamp": time.time()
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"ChromaDB 테스트 오류: {str(e)}",
            "timestamp": time.time()
        }

@app.get("/chroma-info")
async def chroma_info():
    try:
        from sql_pipeline.nodes.vector_db_manager import RAGSearchNode  # Lazy import
        rag_node = RAGSearchNode()
        collection_info = rag_node.get_collection_info()

        if collection_info:
            return {
                "status": "success",
                "collection_info": collection_info,
                "timestamp": time.time()
            }
        else:
            return {
                "status": "error",
                "message": "컬렉션 정보 조회 실패",
                "timestamp": time.time()
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"컬렉션 정보 조회 중 오류: {str(e)}",
            "timestamp": time.time()
        }

@app.get("/chroma-documents")
async def chroma_list_documents():
    try:
        from sql_pipeline.nodes.vector_db_manager import RAGSearchNode  # Lazy import
        rag_node = RAGSearchNode()
        all_docs = rag_node.get_all_documents()

        return {
            "status": "success",
            "document_count": len(all_docs),
            "documents": all_docs,
            "timestamp": time.time()
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"문서 목록 조회 중 오류: {str(e)}",
            "timestamp": time.time()
        }

@app.post("/chroma-add")
async def chroma_add_document(request: Request):
    try:
        from sql_pipeline.nodes.vector_db_manager import RAGSearchNode  # Lazy import

        body = await request.json()
        text = body.get("text")
        metadata = body.get("metadata", {})
        doc_id = body.get("doc_id")

        if not text:
            return {
                "status": "error",
                "message": "텍스트는 필수입니다",
                "timestamp": time.time()
            }

        rag_node = RAGSearchNode()
        success = rag_node.add_document(text, metadata, doc_id)
        
        if success:
            return {
                "status": "success",
                "message": "문서 추가 완료",
                "doc_id": doc_id or "자동생성",
                "timestamp": time.time()
            }
        else:
            return {
                "status": "error",
                "message": "문서 추가 실패",
                "timestamp": time.time()
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"문서 추가 중 오류: {str(e)}",
            "timestamp": time.time()
        }

@app.delete("/chroma-delete/{doc_id}")
async def chroma_delete_document(doc_id: str):
    try:
        from sql_pipeline.nodes.vector_db_manager import RAGSearchNode  # Lazy import
        rag_node = RAGSearchNode()
        success = rag_node.delete_document(doc_id)
        
        if success:
            return {
                "status": "success",
                "message": "문서 삭제 완료",
                "doc_id": doc_id,
                "timestamp": time.time()
            }
        else:
            return {
                "status": "error",
                "message": "문서 삭제 실패",
                "timestamp": time.time()
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"문서 삭제 중 오류: {str(e)}",
            "timestamp": time.time()
        }

@app.put("/chroma-update/{doc_id}")
async def chroma_update_document(doc_id: str, request: Request):
    try:
        from sql_pipeline.nodes.vector_db_manager import RAGSearchNode  # Lazy import

        body = await request.json()
        text = body.get("text")
        metadata = body.get("metadata", {})

        if not text:
            return {
                "status": "error",
                "message": "텍스트는 필수입니다",
                "timestamp": time.time()
            }

        rag_node = RAGSearchNode()
        success = rag_node.update_document(doc_id, text, metadata)
        
        if success:
            return {
                "status": "success",
                "message": "문서 업데이트 완료",
                "doc_id": doc_id,
                "timestamp": time.time()
            }
        else:
            return {
                "status": "error",
                "message": "문서 업데이트 실패",
                "timestamp": time.time()
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"문서 업데이트 중 오류: {str(e)}",
            "timestamp": time.time()
        }

@app.get("/vector-sync/status")
async def get_sync_status():
    try:
        scheduler_status = scheduler_service.get_scheduler_status()
        vector_status = scheduler_service.vector_sync_service.get_sync_status()

        return {
            "status": "success",
            "scheduler": scheduler_status,
            "vector_db": vector_status,
            "timestamp": time.time()
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"상태 조회 중 오류: {str(e)}",
            "timestamp": time.time()
        }

@app.post("/vector-sync/manual")
async def manual_sync():
    try:
        result = await scheduler_service.manual_sync()
        return {
            "status": "success",
            "message": "수동 동기화 완료",
            "result": result,
            "timestamp": time.time()
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"수동 동기화 중 오류: {str(e)}",
            "timestamp": time.time()
        }

@app.post("/api/test/accuracy")
async def test_sql_accuracy():
    """
    SQL 정확도 테스트 실행

    Golden Dataset을 기반으로 정확도를 평가

    """
    try:
        from tests.evaluation_service import get_evaluation_service

        logger.info("SQL 정확도 테스트 시작")

        # 평가 서비스 실행
        evaluation_service = get_evaluation_service()
        result = evaluation_service.run_evaluation()

        logger.info(f"SQL 정확도 테스트 완료: {result['statistics']['accuracy']}%")

        return {
            "status": "success",
            "message": "정확도 테스트 완료",
            "data": result,
            "timestamp": time.time()
        }

    except Exception as e:
        logger.error(f"정확도 테스트 실패: {e}", exc_info=True)
        return {
            "status": "error",
            "message": f"정확도 테스트 실패: {str(e)}",
            "timestamp": time.time()
        }

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "AI Orchestration 서버 (MVP)",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "vector-sync-status": "/vector-sync/status",
        "vector-sync-manual": "/vector-sync/manual",
        "chroma-test": "/chroma-test",
        "chroma-info": "/chroma-info",
        "chroma-documents": "/chroma-documents",
        "chroma-add": "/chroma-add",
        "chroma-update": "/chroma-update/{doc_id}",
        "chroma-delete": "/chroma-delete/{doc_id}",
        "test-accuracy": "/api/test/accuracy",
        "api": "/v1/ask"
    }

# 전역 예외 핸들러
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP 예외 처리"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": request.url.path
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """일반 예외 처리"""
    logger.error(f"예상치 못한 오류 발생: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "서버 내부 오류가 발생했습니다",
            "status_code": 500,
            "path": request.url.path,
            "detail": str(exc) if settings.DEBUG else "내부 오류"
        }
    )

if __name__ == "__main__":
    import uvicorn
    import os

 
    port = 8095

    logger.info(f"서버 시작: http://localhost:{port}")
    logger.info(f"API 문서: http://localhost:{port}/docs")

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info" if not settings.DEBUG else "debug"
    )
