from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
import logging
import os
from dotenv import load_dotenv

from models import AskRequest, AskResponse
from db.session import get_db

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter()

# 순수 LangChain 구현 (LangGraph 제거, 라우팅 제거, 번역 제거)
logger.info("순수 LangChain 구현 사용 (Simple SQL Orchestration)")
from sql_orchestrator import SimpleSQLOrchestration
orchestration = SimpleSQLOrchestration()

@router.post("/v1/ask", response_model=AskResponse)
async def ask_question(
    request: AskRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    accept_language: Optional[str] = Header(None, alias="Accept-Language")
):
    """
    AI Orchestration 질문 처리 엔드포인트
    
    - BASIC 모드: RAG + GPT 기반 지식 검색
    - DATA 모드: Oracle SQL 생성 → 보안검사 → 실행 → 요약
    - AUTO 모드: 질문 내용에 따라 자동 라우팅
    """
    try:
        # 1. Authorization 헤더 검증 (형식만 확인)
        if not authorization:
            raise HTTPException(
                status_code=401, 
                detail="Authorization 헤더가 필요합니다"
            )
        
        if not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=401, 
                detail="Authorization 헤더는 'Bearer <token>' 형식이어야 합니다"
            )
        
        # 2. 요청 로깅
        logger.info(f"Request: {request.userInput[:100]}... (mode: {request.mode})")
        
        # 3. Orchestration 실행
        auth_context = {
            "token": authorization.replace("Bearer ", ""),
            "language": accept_language
        }

        response = orchestration.run(db, request, auth_context)

        # 4. 응답 로깅
        logger.info(f"Response generated: {response.route} mode, {response.metrics.latencyMs}ms")
        
        return response
        
    except HTTPException:
        # HTTP 예외는 그대로 전파
        raise
    except Exception as e:
        # 기타 예외는 500 에러로 처리
        logger.error(f"질문 처리 중 예상치 못한 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"서버 내부 오류가 발생했습니다: {str(e)}"
        )
