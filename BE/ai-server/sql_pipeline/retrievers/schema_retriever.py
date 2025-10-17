import logging
import os
import requests
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

from langchain.schema import Document
from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever
from langchain_core.retrievers import BaseRetriever

load_dotenv()
logger = logging.getLogger(__name__)


class ChromaHTTPRetriever(BaseRetriever):
    collection_name: str = "database_schema"
    k: int = 10
    chroma_host: str = ""
    chroma_port: str = ""
    tenant: str = ""
    database: str = ""
    collection_id: str = ""
    embedding_model: Any = None

    def __init__(self, collection_name: str = "database_schema", k: int = 10):
        super().__init__()

        self.chroma_host = os.getenv("CHROMA_HOST", "localhost")
        self.chroma_port = os.getenv("CHROMA_PORT", "8000")
        self.tenant = os.getenv("CHROMA_TENANT", "default_tenant")
        self.database = os.getenv("CHROMA_DATABASE", "default_database")

        self.collection_name = collection_name
        self.k = k

        self.embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

        self.collection_id = self._get_collection_id()

    def _get_collection_id(self) -> str:
        try:
            check_url = f"http://{self.chroma_host}:{self.chroma_port}/api/v2/tenants/{self.tenant}/databases/{self.database}/collections/{self.collection_name}"

            response = requests.get(check_url, timeout=10)

            if response.status_code == 200:
                result = response.json()
                collection_id = result.get("id")
                return collection_id
            elif response.status_code == 404:
                return self._create_collection()
            else:
                error_msg = f"컬렉션 조회 실패: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise Exception(error_msg)

        except Exception as e:
            logger.error(f"컬렉션 ID 조회 중 오류: {e}")
            raise

    def _create_collection(self) -> str:
        try:
            create_url = f"http://{self.chroma_host}:{self.chroma_port}/api/v2/tenants/{self.tenant}/databases/{self.database}/collections"

            create_payload = {
                "name": self.collection_name,
                "metadata": {"description": "데이터베이스 스키마 정보 (Text-to-SQL용)"},
                "embedding_function": None,
                "dimension": 384,  # all-MiniLM-L6-v2 모델의 차원
                "configuration": {
                    "hnsw": {
                        "space": "cosine"  # 코사인 유사도
                    }
                }
            }

            response = requests.post(create_url, json=create_payload, timeout=10)

            if response.status_code == 200:
                result = response.json()
                collection_id = result.get("id")
                return collection_id
            else:
                error_msg = f"컬렉션 생성 실패: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise Exception(error_msg)

        except Exception as e:
            logger.error(f"컬렉션 생성 중 오류: {e}")
            raise

    def _get_relevant_documents(self, query: str) -> List[Document]:
        try:
            query_embedding = self.embedding_model.encode(query).tolist()

            search_url = f"http://{self.chroma_host}:{self.chroma_port}/api/v2/tenants/{self.tenant}/databases/{self.database}/collections/{self.collection_id}/query"

            payload = {
                "query_embeddings": [query_embedding],
                "n_results": self.k,
                "include": ["documents", "metadatas", "distances"]
            }

            response = requests.post(search_url, json=payload, timeout=30)
            response.raise_for_status()

            result = response.json()

            documents = []

            if "documents" in result and len(result["documents"]) > 0:
                docs = result["documents"][0]
                metadatas = result.get("metadatas", [[]])[0]
                distances = result.get("distances", [[]])[0]

                for i, doc_text in enumerate(docs):
                    metadata = metadatas[i] if i < len(metadatas) else {}
                    distance = distances[i] if i < len(distances) else 1.0

                    similarity = 1 / (1 + distance)

                    documents.append(Document(
                        page_content=doc_text,
                        metadata={
                            **metadata,
                            "similarity": similarity,
                            "source": "chroma_semantic"
                        }
                    ))

            return documents

        except Exception as e:
            logger.error(f"ChromaDB 검색 실패: {e}")
            return []


class HybridRetriever:

    def __init__(
        self,
        collection_name: str = "database_schema",
        k: int = 10,
        semantic_weight: float = 0.6,
        keyword_weight: float = 0.4
    ):

        self.collection_name = collection_name
        self.k = k

        # 1. Semantic Retriever (ChromaDB)
        self.semantic_retriever = ChromaHTTPRetriever(
            collection_name=collection_name,
            k=k
        )

        # 2. Keyword Retriever (BM25)
        documents = self._load_documents_from_chroma()

        if documents:
            self.keyword_retriever = BM25Retriever.from_documents(
                documents,
                k=k
            )
        else:
            self.keyword_retriever = None

        if self.keyword_retriever:
            self.ensemble = EnsembleRetriever(
                retrievers=[self.semantic_retriever, self.keyword_retriever],
                weights=[semantic_weight, keyword_weight]
            )
        else:
            self.ensemble = self.semantic_retriever

    def _load_documents_from_chroma(self) -> List[Document]:
        try:
            chroma_host = os.getenv("CHROMA_HOST", "localhost")
            chroma_port = os.getenv("CHROMA_PORT", "8000")
            tenant = os.getenv("CHROMA_TENANT", "default_tenant")
            database = os.getenv("CHROMA_DATABASE", "default_database")

            check_url = f"http://{chroma_host}:{chroma_port}/api/v2/tenants/{tenant}/databases/{database}/collections/{self.collection_name}"
            check_response = requests.get(check_url, timeout=10)

            if check_response.status_code != 200:
                return []

            collection_id = check_response.json().get("id")

            get_url = f"http://{chroma_host}:{chroma_port}/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}/get"

            payload = {
                "limit": 1000,
                "include": ["documents", "metadatas"]
            }

            response = requests.post(get_url, json=payload, timeout=30)
            response.raise_for_status()

            result = response.json()

            documents = []

            if "documents" in result:
                docs = result["documents"]
                metadatas = result.get("metadatas", [])

                for i, doc_text in enumerate(docs):
                    metadata = metadatas[i] if i < len(metadatas) else {}

                    documents.append(Document(
                        page_content=doc_text,
                        metadata={
                            **metadata,
                            "source": "chroma_keyword"
                        }
                    ))

            return documents

        except Exception as e:
            logger.error(f"ChromaDB 문서 로드 실패: {e}")
            return []

    def get_relevant_documents(self, query: str) -> List[Document]:
        results = self.ensemble.get_relevant_documents(query)
        return results
