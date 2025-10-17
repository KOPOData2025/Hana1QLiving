"""
RAG 검색 노드 (ChromaDB)
"""
import logging
import os
import requests
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class RAGSearchNode:
    """ChromaDB RAG 검색"""

    def __init__(self):
        self.chroma_host = os.getenv("CHROMA_HOST", "localhost")
        self.chroma_port = os.getenv("CHROMA_PORT", "8000")
        self.tenant = os.getenv("CHROMA_TENANT", "default_tenant")
        self.database = os.getenv("CHROMA_DATABASE", "default_database")
        self.collection_name = "database_schema"
        
        self.embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        
        logger.info(f"RAGSearchNode 초기화: {self.chroma_host}:{self.chroma_port}")

    def _get_collection_id(self) -> str:
        """컬렉션 ID 조회"""
        try:
            check_url = f"http://{self.chroma_host}:{self.chroma_port}/api/v2/tenants/{self.tenant}/databases/{self.database}/collections/{self.collection_name}"
            response = requests.get(check_url, timeout=10)
            
            if response.status_code == 200:
                return response.json().get("id")
            return None
        except Exception as e:
            logger.error(f"컬렉션 ID 조회 실패: {e}")
            return None

    def test_connection(self) -> bool:
        """ChromaDB 연결 테스트"""
        try:
            collection_id = self._get_collection_id()
            return collection_id is not None
        except Exception as e:
            logger.error(f"연결 테스트 실패: {e}")
            return False

    def get_collection_info(self) -> Dict[str, Any]:
        """컬렉션 정보 조회"""
        try:
            collection_id = self._get_collection_id()
            if not collection_id:
                return None

            get_url = f"http://{self.chroma_host}:{self.chroma_port}/api/v2/tenants/{self.tenant}/databases/{self.database}/collections/{collection_id}/get"
            
            response = requests.post(get_url, json={"limit": 1}, timeout=10)
            if response.status_code == 200:
                result = response.json()
                return {
                    "collection_id": collection_id,
                    "count": len(result.get("documents", []))
                }
            return None
        except Exception as e:
            logger.error(f"컬렉션 정보 조회 실패: {e}")
            return None

    def get_all_documents(self) -> List[Dict[str, Any]]:
        """모든 문서 조회"""
        try:
            collection_id = self._get_collection_id()
            if not collection_id:
                return []

            get_url = f"http://{self.chroma_host}:{self.chroma_port}/api/v2/tenants/{self.tenant}/databases/{self.database}/collections/{collection_id}/get"
            
            response = requests.post(get_url, json={"limit": 1000, "include": ["documents", "metadatas"]}, timeout=30)
            if response.status_code == 200:
                result = response.json()
                docs = result.get("documents", [])
                metadatas = result.get("metadatas", [])
                
                return [
                    {"content": doc, "metadata": metadatas[i] if i < len(metadatas) else {}}
                    for i, doc in enumerate(docs)
                ]
            return []
        except Exception as e:
            logger.error(f"문서 조회 실패: {e}")
            return []

    def add_document(self, text: str, metadata: Dict[str, Any] = None, doc_id: str = None) -> bool:
        """문서 추가"""
        try:
            collection_id = self._get_collection_id()
            if not collection_id:
                return False

            embedding = self.embedding_model.encode(text).tolist()
            
            add_url = f"http://{self.chroma_host}:{self.chroma_port}/api/v2/tenants/{self.tenant}/databases/{self.database}/collections/{collection_id}/add"
            
            payload = {
                "embeddings": [embedding],
                "documents": [text],
                "metadatas": [metadata or {}],
                "ids": [doc_id] if doc_id else None
            }
            
            response = requests.post(add_url, json=payload, timeout=30)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"문서 추가 실패: {e}")
            return False

    def delete_document(self, doc_id: str) -> bool:
        """문서 삭제"""
        try:
            collection_id = self._get_collection_id()
            if not collection_id:
                return False

            delete_url = f"http://{self.chroma_host}:{self.chroma_port}/api/v2/tenants/{self.tenant}/databases/{self.database}/collections/{collection_id}/delete"
            
            response = requests.post(delete_url, json={"ids": [doc_id]}, timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"문서 삭제 실패: {e}")
            return False

    def update_document(self, doc_id: str, text: str, metadata: Dict[str, Any] = None) -> bool:
        """문서 업데이트"""
        try:
            collection_id = self._get_collection_id()
            if not collection_id:
                return False

            embedding = self.embedding_model.encode(text).tolist()
            
            update_url = f"http://{self.chroma_host}:{self.chroma_port}/api/v2/tenants/{self.tenant}/databases/{self.database}/collections/{collection_id}/update"
            
            payload = {
                "embeddings": [embedding],
                "documents": [text],
                "metadatas": [metadata or {}],
                "ids": [doc_id]
            }
            
            response = requests.post(update_url, json=payload, timeout=30)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"문서 업데이트 실패: {e}")
            return False

    def search_knowledge(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """지식 검색"""
        try:
            collection_id = self._get_collection_id()
            if not collection_id:
                return []

            query_embedding = self.embedding_model.encode(query).tolist()
            
            search_url = f"http://{self.chroma_host}:{self.chroma_port}/api/v2/tenants/{self.tenant}/databases/{self.database}/collections/{collection_id}/query"
            
            payload = {
                "query_embeddings": [query_embedding],
                "n_results": top_k,
                "include": ["documents", "metadatas", "distances"]
            }
            
            response = requests.post(search_url, json=payload, timeout=30)
            if response.status_code != 200:
                return []

            result = response.json()
            search_results = []
            
            if "documents" in result and len(result["documents"]) > 0:
                docs = result["documents"][0]
                metadatas = result.get("metadatas", [[]])[0]
                distances = result.get("distances", [[]])[0]

                for i, doc_text in enumerate(docs):
                    metadata = metadatas[i] if i < len(metadatas) else {}
                    distance = distances[i] if i < len(distances) else 1.0

                    search_results.append({
                        "content": doc_text,
                        "metadata": metadata,
                        "distance": distance
                    })

            return search_results
        except Exception as e:
            logger.error(f"검색 실패: {e}")
            return []
