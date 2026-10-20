from typing import List, Dict, Any, Optional
from app.schemas.schemas import ChunkItem, RetrievedChunk
from app.services.bm25_service import BM25RetrievalService
from app.services.vector_service import VectorRetrievalService

class HybridRetrievalService:
    @classmethod
    def search(
        cls,
        query: str,
        strategy: str,
        params_hash: str,
        document_ids: List[str],
        chunks: List[ChunkItem],
        doc_names_map: Dict[str, str],
        top_k: int = 5,
        rrf_k: int = 60,
        candidate_pool_size: int = 20,
        bm25_weight: float = 1.0,
        vector_weight: float = 1.0
    ) -> List[RetrievedChunk]:
        """
        Executes Reciprocal Rank Fusion (RRF) between BM25 and Vector search.
        Formula:
            RRF(d) = (w_bm25 / (k + rank_bm25(d))) + (w_vector / (k + rank_vector(d)))
        """
        pool_size = max(top_k, candidate_pool_size)

        # 1. Retrieve BM25 candidates
        bm25_results = BM25RetrievalService.search(
            query=query,
            chunks=chunks,
            doc_names_map=doc_names_map,
            top_k=pool_size
        )

        # 2. Retrieve Vector candidates
        vector_results = VectorRetrievalService.search(
            query=query,
            strategy=strategy,
            params_hash=params_hash,
            document_ids=document_ids,
            chunks=chunks,
            doc_names_map=doc_names_map,
            top_k=pool_size
        )

        # 3. Fuse rankings via RRF
        # Map by chunk id -> dictionary of scores and metadata
        fused_items: Dict[str, Dict[str, Any]] = {}

        for r in bm25_results:
            rrf_contrib = bm25_weight / (rrf_k + r.rank)
            fused_items[r.id] = {
                "chunk": r,
                "fused_score": rrf_contrib,
                "bm25_rank": r.rank,
                "bm25_score": r.score,
                "vector_rank": None,
                "vector_score": None,
            }

        for r in vector_results:
            rrf_contrib = vector_weight / (rrf_k + r.rank)
            if r.id in fused_items:
                fused_items[r.id]["fused_score"] += rrf_contrib
                fused_items[r.id]["vector_rank"] = r.rank
                fused_items[r.id]["vector_score"] = r.score
            else:
                fused_items[r.id] = {
                    "chunk": r,
                    "fused_score": rrf_contrib,
                    "bm25_rank": None,
                    "bm25_score": None,
                    "vector_rank": r.rank,
                    "vector_score": r.score,
                }

        # 4. Sort by fused score descending
        sorted_candidates = sorted(
            fused_items.values(),
            key=lambda item: item["fused_score"],
            reverse=True
        )

        # 5. Build final RetrievedChunk objects
        final_results = []
        for rank, item in enumerate(sorted_candidates[:top_k], start=1):
            base_chunk: RetrievedChunk = item["chunk"]
            final_results.append(RetrievedChunk(
                id=base_chunk.id,
                document_id=base_chunk.document_id,
                document_name=base_chunk.document_name,
                chunk_index=base_chunk.chunk_index,
                page_number=base_chunk.page_number,
                content=base_chunk.content,
                score=round(item["fused_score"], 6),
                rank=rank,
                bm25_rank=item["bm25_rank"],
                bm25_score=item["bm25_score"],
                vector_rank=item["vector_rank"],
                vector_score=item["vector_score"],
                strategy=strategy
            ))

        return final_results
