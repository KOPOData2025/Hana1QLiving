import logging
from typing import List

from langchain.schema import Document
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import CrossEncoderReranker
from langchain_community.cross_encoders import HuggingFaceCrossEncoder

logger = logging.getLogger(__name__)


class Reranker:
   
    def __init__(
        self,
        model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        top_n: int = 3,
        hybrid_weight: float = 0.3,
        rerank_weight: float = 0.7
    ):

        self.model_name = model_name
        self.top_n = top_n
        self.hybrid_weight = hybrid_weight
        self.rerank_weight = rerank_weight

        # Cross-Encoder 모델
        try:
            self.cross_encoder = HuggingFaceCrossEncoder(
                model_name=model_name
            )
            logger.info(f"Reranker initialized: {model_name}, top-{top_n}")

        except Exception as e:
            logger.error(f"Cross-Encoder 모델 로드 실패: {e}")
            raise

        # Compressor 생성
        self.compressor = CrossEncoderReranker(
            model=self.cross_encoder,
            top_n=top_n
        )

    def apply(self, base_retriever) -> ContextualCompressionRetriever:
       
        return ContextualCompressionRetriever(
            base_compressor=self.compressor,
            base_retriever=base_retriever
        )

    def rerank_documents(
        self,
        query: str,
        documents: List[Document]
    ) -> List[Document]:
       
        query_doc_pairs = [(query, doc.page_content) for doc in documents]

        try:
  
            rerank_scores = self.cross_encoder.score(query_doc_pairs)

            hybrid_scores = []
            for doc in documents:
                hybrid_score = doc.metadata.get("similarity", doc.metadata.get("score", 0.5))
                hybrid_scores.append(hybrid_score)

            rerank_scores_list = rerank_scores.tolist() if hasattr(rerank_scores, 'tolist') else list(rerank_scores)

            if len(rerank_scores_list) > 0:
                rerank_min, rerank_max = min(rerank_scores_list), max(rerank_scores_list)
                if rerank_max > rerank_min:
                    normalized_rerank = [(s - rerank_min) / (rerank_max - rerank_min) for s in rerank_scores_list]
                else:
                    normalized_rerank = [0.5] * len(rerank_scores_list)
            else:
                normalized_rerank = [0.5] * len(documents)

            if len(hybrid_scores) > 0:
                hybrid_min, hybrid_max = min(hybrid_scores), max(hybrid_scores)
                if hybrid_max > hybrid_min:
                    normalized_hybrid = [(s - hybrid_min) / (hybrid_max - hybrid_min) for s in hybrid_scores]
                else:
                    normalized_hybrid = [0.5] * len(hybrid_scores)
            else:
                normalized_hybrid = [0.5] * len(documents)


            final_scores = []
            for i in range(len(documents)):
                combined_score = (
                    self.hybrid_weight * normalized_hybrid[i] +
                    self.rerank_weight * normalized_rerank[i]
                )
                final_scores.append(combined_score)


            scored_docs = list(zip(documents, final_scores, rerank_scores, hybrid_scores))

            scored_docs.sort(key=lambda x: x[1], reverse=True)

            top_docs = scored_docs[:self.top_n]

            reranked_docs = []
            for doc, final_score, rerank_score, hybrid_score in top_docs:
                doc.metadata["final_score"] = float(final_score)
                doc.metadata["rerank_score"] = float(rerank_score)
                doc.metadata["hybrid_score"] = float(hybrid_score)
                reranked_docs.append(doc)

            logger.info(f"Rerank complete: {len(reranked_docs)} docs selected")
            return reranked_docs

        except Exception as e:
            logger.error(f"Rerank 실패: {e}")
            # 실패 시 원본 순서대로 Top-N 반환
            return documents[:self.top_n]


# 편의 함수
def create_reranked_retriever(
    base_retriever,
    model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
    top_n: int = 3
) -> ContextualCompressionRetriever:
   
    reranker = Reranker(model_name=model_name, top_n=top_n)
    return reranker.apply(base_retriever)
