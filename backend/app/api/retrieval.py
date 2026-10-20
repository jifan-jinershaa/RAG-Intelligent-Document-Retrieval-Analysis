import time
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

from app.schemas.schemas import (
    RetrievalRequest, RetrievalResponse, MultiRetrievalComparisonResponse
)
from app.services.chunking_service import ChunkingService
from app.services.evaluation_service import EvaluationService
from app.services.bm25_service import BM25RetrievalService
from app.services.vector_service import VectorRetrievalService
from app.services.hybrid_service import HybridRetrievalService

router = APIRouter(prefix="/retrieval", tags=["Retrieval"])

@router.post("/search", response_model=RetrievalResponse)
def search(req: RetrievalRequest):
    if not req.document_ids:
        raise HTTPException(status_code=400, detail="Please select at least one document.")
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")

    params = {}
    if req.chunking_strategy in ["fixed", "recursive"]:
        params = {"chunk_size": req.chunk_size, "chunk_overlap": req.chunk_overlap}
    elif req.chunking_strategy == "semantic":
        params = {
            "similarity_threshold": req.similarity_threshold,
            "min_chunk_size": 200,
            "max_chunk_size": 1000
        }

    try:
        chunks, _, params_hash = EvaluationService.get_or_create_chunks_for_strategy(
            req.document_ids, req.chunking_strategy, params
        )
        if not chunks:
            return RetrievalResponse(
                query=req.query,
                retrieval_method=req.retrieval_method,
                chunking_strategy=req.chunking_strategy,
                latency_ms=0.0,
                total_results=0,
                results=[]
            )

        doc_names = EvaluationService.get_document_names_map(req.document_ids)
        start_time = time.perf_counter()

        if req.retrieval_method == "bm25":
            results = BM25RetrievalService.search(
                query=req.query,
                chunks=chunks,
                doc_names_map=doc_names,
                top_k=req.top_k
            )
        elif req.retrieval_method == "vector":
            results = VectorRetrievalService.search(
                query=req.query,
                strategy=req.chunking_strategy,
                params_hash=params_hash,
                document_ids=req.document_ids,
                chunks=chunks,
                doc_names_map=doc_names,
                top_k=req.top_k
            )
        elif req.retrieval_method == "hybrid":
            results = HybridRetrievalService.search(
                query=req.query,
                strategy=req.chunking_strategy,
                params_hash=params_hash,
                document_ids=req.document_ids,
                chunks=chunks,
                doc_names_map=doc_names,
                top_k=req.top_k,
                rrf_k=req.rrf_k,
                candidate_pool_size=req.candidate_pool_size,
                bm25_weight=req.bm25_weight,
                vector_weight=req.vector_weight
            )
        else:
            raise HTTPException(status_code=400, detail=f"Invalid retrieval method: {req.retrieval_method}")

        latency = (time.perf_counter() - start_time) * 1000
        return RetrievalResponse(
            query=req.query,
            retrieval_method=req.retrieval_method,
            chunking_strategy=req.chunking_strategy,
            latency_ms=round(latency, 2),
            total_results=len(results),
            results=results
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retrieval error: {str(e)}")

@router.post("/compare-all", response_model=MultiRetrievalComparisonResponse)
def compare_all_retrieval_methods(req: RetrievalRequest):
    if not req.document_ids:
        raise HTTPException(status_code=400, detail="Please select at least one document.")
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")

    params = {}
    if req.chunking_strategy in ["fixed", "recursive"]:
        params = {"chunk_size": req.chunk_size, "chunk_overlap": req.chunk_overlap}
    elif req.chunking_strategy == "semantic":
        params = {
            "similarity_threshold": req.similarity_threshold,
            "min_chunk_size": 200,
            "max_chunk_size": 1000
        }

    try:
        chunks, _, params_hash = EvaluationService.get_or_create_chunks_for_strategy(
            req.document_ids, req.chunking_strategy, params
        )
        doc_names = EvaluationService.get_document_names_map(req.document_ids)

        # 1. BM25
        t0 = time.perf_counter()
        bm25_res = BM25RetrievalService.search(
            query=req.query, chunks=chunks, doc_names_map=doc_names, top_k=req.top_k
        )
        bm25_lat = (time.perf_counter() - t0) * 1000

        # 2. Vector
        t1 = time.perf_counter()
        vector_res = VectorRetrievalService.search(
            query=req.query, strategy=req.chunking_strategy, params_hash=params_hash,
            document_ids=req.document_ids, chunks=chunks, doc_names_map=doc_names, top_k=req.top_k
        )
        vector_lat = (time.perf_counter() - t1) * 1000

        # 3. Hybrid
        t2 = time.perf_counter()
        hybrid_res = HybridRetrievalService.search(
            query=req.query, strategy=req.chunking_strategy, params_hash=params_hash,
            document_ids=req.document_ids, chunks=chunks, doc_names_map=doc_names,
            top_k=req.top_k, rrf_k=req.rrf_k, candidate_pool_size=req.candidate_pool_size
        )
        hybrid_lat = (time.perf_counter() - t2) * 1000

        return MultiRetrievalComparisonResponse(
            query=req.query,
            chunking_strategy=req.chunking_strategy,
            bm25=RetrievalResponse(
                query=req.query, retrieval_method="bm25", chunking_strategy=req.chunking_strategy,
                latency_ms=round(bm25_lat, 2), total_results=len(bm25_res), results=bm25_res
            ),
            vector=RetrievalResponse(
                query=req.query, retrieval_method="vector", chunking_strategy=req.chunking_strategy,
                latency_ms=round(vector_lat, 2), total_results=len(vector_res), results=vector_res
            ),
            hybrid=RetrievalResponse(
                query=req.query, retrieval_method="hybrid", chunking_strategy=req.chunking_strategy,
                latency_ms=round(hybrid_lat, 2), total_results=len(hybrid_res), results=hybrid_res
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison retrieval error: {str(e)}")
