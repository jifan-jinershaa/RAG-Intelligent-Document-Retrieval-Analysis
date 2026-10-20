import time
from fastapi import APIRouter, HTTPException

from app.schemas.schemas import RAGRequest, RAGResponse, RetrievalRequest
from app.api.retrieval import search
from app.services.rag_service import RAGService

router = APIRouter(prefix="/rag", tags=["RAG"])

@router.post("/ask", response_model=RAGResponse)
def ask_question(req: RAGRequest):
    if not req.document_ids:
        raise HTTPException(status_code=400, detail="Please select at least one document.")
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        # 1. Retrieve evidence
        retrieval_req = RetrievalRequest(
            query=req.query,
            document_ids=req.document_ids,
            chunking_strategy=req.chunking_strategy,
            chunk_size=req.chunk_size,
            chunk_overlap=req.chunk_overlap,
            similarity_threshold=req.similarity_threshold,
            retrieval_method=req.retrieval_method,
            top_k=req.top_k
        )
        retrieval_res = search(retrieval_req)

        # 2. Generate answer with Gemini
        rag_response = RAGService.generate_answer(
            query=req.query,
            retrieved_chunks=retrieval_res.results,
            chunking_strategy=req.chunking_strategy,
            retrieval_method=req.retrieval_method,
            retrieval_latency_ms=retrieval_res.latency_ms,
            model_name=req.model_name
        )
        return rag_response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG processing error: {str(e)}")
