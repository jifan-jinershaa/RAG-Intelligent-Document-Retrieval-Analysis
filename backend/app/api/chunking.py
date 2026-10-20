from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional
from app.services.chunking_service import ChunkingService
from app.schemas.schemas import ChunkingRequest, ChunkingResponse, ChunkingComparisonResponse

router = APIRouter(prefix="/chunking", tags=["Chunking"])

@router.post("/process", response_model=ChunkingResponse)
def process_chunking(req: ChunkingRequest):
    if not req.document_ids:
        raise HTTPException(status_code=400, detail="No documents selected.")

    # Process first document in list
    doc_id = req.document_ids[0]
    params = {}
    if req.strategy in ["fixed", "recursive"]:
        params = {"chunk_size": req.chunk_size, "chunk_overlap": req.chunk_overlap}
    elif req.strategy == "semantic":
        params = {
            "similarity_threshold": req.similarity_threshold,
            "min_chunk_size": req.min_chunk_size,
            "max_chunk_size": req.max_chunk_size
        }

    try:
        response = ChunkingService.process_and_store_chunks(
            document_id=doc_id,
            strategy=req.strategy,
            params=params
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chunking error: {str(e)}")

@router.post("/compare", response_model=ChunkingComparisonResponse)
def compare_chunking(
    document_id: str = Query(...),
    fixed_size: int = Query(500),
    fixed_overlap: int = Query(50),
    recursive_size: int = Query(500),
    recursive_overlap: int = Query(50),
    semantic_threshold: float = Query(0.65)
):
    try:
        fixed_res = ChunkingService.process_and_store_chunks(
            document_id=document_id,
            strategy="fixed",
            params={"chunk_size": fixed_size, "chunk_overlap": fixed_overlap}
        )
        rec_res = ChunkingService.process_and_store_chunks(
            document_id=document_id,
            strategy="recursive",
            params={"chunk_size": recursive_size, "chunk_overlap": recursive_overlap}
        )
        sem_res = ChunkingService.process_and_store_chunks(
            document_id=document_id,
            strategy="semantic",
            params={"similarity_threshold": semantic_threshold, "min_chunk_size": 200, "max_chunk_size": 1000}
        )

        return ChunkingComparisonResponse(
            document_id=document_id,
            fixed=fixed_res,
            recursive=rec_res,
            semantic=sem_res
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")
