import os
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from google import genai

from app.core.config import settings
from app.core.database import get_setting, set_setting
from app.schemas.schemas import AppSettingsSchema, UpdateSettingsRequest
from app.services.rag_service import RAGService

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=AppSettingsSchema)
def get_app_settings():
    api_key = RAGService.get_api_key()
    gemini_model = get_setting("DEFAULT_GEMINI_MODEL", settings.DEFAULT_GEMINI_MODEL)
    top_k = get_setting("DEFAULT_TOP_K", settings.DEFAULT_TOP_K)
    fixed_size = get_setting("DEFAULT_FIXED_CHUNK_SIZE", settings.DEFAULT_FIXED_CHUNK_SIZE)
    fixed_overlap = get_setting("DEFAULT_FIXED_CHUNK_OVERLAP", settings.DEFAULT_FIXED_CHUNK_OVERLAP)
    rec_size = get_setting("DEFAULT_RECURSIVE_CHUNK_SIZE", settings.DEFAULT_RECURSIVE_CHUNK_SIZE)
    rec_overlap = get_setting("DEFAULT_RECURSIVE_CHUNK_OVERLAP", settings.DEFAULT_RECURSIVE_CHUNK_OVERLAP)
    sem_thresh = get_setting("DEFAULT_SEMANTIC_THRESHOLD", settings.DEFAULT_SEMANTIC_THRESHOLD)
    rrf_k = get_setting("DEFAULT_RRF_K", settings.DEFAULT_RRF_K)

    # Calculate storage info
    upload_count = len(list(settings.UPLOAD_PATH.glob("*"))) if settings.UPLOAD_PATH.exists() else 0
    chroma_count = len(list(settings.CHROMA_PATH.glob("*"))) if settings.CHROMA_PATH.exists() else 0
    
    return AppSettingsSchema(
        gemini_api_key_set=bool(api_key),
        gemini_model=gemini_model,
        embedding_model=settings.EMBEDDING_MODEL_NAME,
        default_top_k=top_k,
        default_fixed_size=fixed_size,
        default_fixed_overlap=fixed_overlap,
        default_recursive_size=rec_size,
        default_recursive_overlap=rec_overlap,
        default_semantic_threshold=sem_thresh,
        default_rrf_k=rrf_k,
        storage_info={
            "database_path": str(settings.DB_PATH),
            "uploads_directory": str(settings.UPLOAD_PATH),
            "chroma_directory": str(settings.CHROMA_PATH),
            "total_uploaded_files": upload_count,
            "chroma_entries": chroma_count
        }
    )

@router.post("")
def update_app_settings(req: UpdateSettingsRequest):
    if req.gemini_api_key is not None:
        key = req.gemini_api_key.strip()
        set_setting("GEMINI_API_KEY", key)
    if req.gemini_model is not None:
        set_setting("DEFAULT_GEMINI_MODEL", req.gemini_model.strip())
    if req.default_top_k is not None:
        set_setting("DEFAULT_TOP_K", req.default_top_k)
    if req.default_fixed_size is not None:
        set_setting("DEFAULT_FIXED_CHUNK_SIZE", req.default_fixed_size)
    if req.default_fixed_overlap is not None:
        set_setting("DEFAULT_FIXED_CHUNK_OVERLAP", req.default_fixed_overlap)
    if req.default_recursive_size is not None:
        set_setting("DEFAULT_RECURSIVE_CHUNK_SIZE", req.default_recursive_size)
    if req.default_recursive_overlap is not None:
        set_setting("DEFAULT_RECURSIVE_CHUNK_OVERLAP", req.default_recursive_overlap)
    if req.default_semantic_threshold is not None:
        set_setting("DEFAULT_SEMANTIC_THRESHOLD", req.default_semantic_threshold)
    if req.default_rrf_k is not None:
        set_setting("DEFAULT_RRF_K", req.default_rrf_k)

    return {"status": "success", "message": "Settings updated successfully."}

@router.post("/test-gemini")
def test_gemini_connection():
    api_key = RAGService.get_api_key()
    if not api_key:
        return {"status": "error", "message": "No API key configured. Please set GEMINI_API_KEY."}

    active_model = get_setting("DEFAULT_GEMINI_MODEL", settings.DEFAULT_GEMINI_MODEL)
    try:
        client = genai.Client(api_key=api_key)
        res = client.models.generate_content(
            model=active_model,
            contents="Say 'OK' if you receive this message."
        )
        return {
            "status": "success",
            "message": f"Successfully connected to {active_model}!",
            "response": res.text
        }
    except Exception as e:
        return {"status": "error", "message": f"Gemini connection failed: {str(e)}"}
