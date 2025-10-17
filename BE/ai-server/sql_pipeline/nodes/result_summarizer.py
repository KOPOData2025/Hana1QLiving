"""
결과 요약 노드
"""
import logging
import os
import requests
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class SummarizeNode:

    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.gpt_model = os.getenv("GPT_MODEL", "gpt-4o-mini")

    def summarize_results(
        self,
        user_input: str,
        sql: str,
        data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:

        logger.info(f"결과 요약 시작: {len(data)}행")

        try:
            # 데이터 샘플링 (최대 5개)
            sample_data = data[:5]

            # GPT 프롬프트
            prompt = f"""다음 SQL 쿼리 결과를 사용자가 이해하기 쉽게 요약해주세요.

질문: {user_input}

실행된 SQL:
{sql}

결과 ({len(data)}행 중 최대 5개):
{sample_data}

요약 시 다음을 포함해주세요:
1. 조회된 데이터 개수
2. 주요 결과 요약 (3-5문장)
3. 한국어로 답변
"""

            # GPT 호출
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.gpt_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 500
                },
                timeout=30
            )
            response.raise_for_status()

            gpt_result = response.json()
            summary = gpt_result["choices"][0]["message"]["content"]

            logger.info(f"결과 요약 완료: {len(summary)}자")

            return {
                "summary": summary,
                "row_count": len(data)
            }

        except Exception as e:
            logger.error(f"결과 요약 실패: {e}")
            return {
                "summary": f"쿼리 실행 완료: {len(data)}개의 결과가 조회되었습니다.",
                "row_count": len(data),
                "error": str(e)
            }
