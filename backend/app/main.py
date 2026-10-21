import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.utils.sample_data import init_sample_documents_and_eval
from app.api import (
    documents,
    chunking,
    retrieval,
    rag,
    experiments,
    evaluation,
    settings_api,
    dashboard
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB & Sample data
    init_db()
    init_sample_documents_and_eval()
    yield
    # Shutdown

app = FastAPI(
    title=settings.APP_NAME,
    description="Research-Oriented Retrieval-Augmented Generation Platform for Chunking and Hybrid Search Analysis",
    version="1.0.0",
    lifespan=lifespan
)

# Parse CORS Origins from environment (supports wildcard or comma-separated list of domains)
cors_origins_raw = getattr(settings, "CORS_ORIGINS", "*")
if cors_origins_raw == "*" or not cors_origins_raw.strip():
    allow_origins = ["*"]
else:
    allow_origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

# CORS Middleware for Render production cross-origin communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root health check endpoint for Render platform health checker
@app.get("/health", tags=["Health"])
def root_health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": "1.0.0"
    }

# Include API Routers with /api prefix
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(chunking.router, prefix=settings.API_V1_STR)
app.include_router(retrieval.router, prefix=settings.API_V1_STR)
app.include_router(rag.router, prefix=settings.API_V1_STR)
app.include_router(experiments.router, prefix=settings.API_V1_STR)
app.include_router(evaluation.router, prefix=settings.API_V1_STR)
app.include_router(settings_api.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "docs_url": "/docs",
        "api_prefix": settings.API_V1_STR,
        "status": "operational"
    }

if __name__ == "__main__":
    import uvicorn
    # Listen on Render's assigned PORT and 0.0.0.0
    port = int(os.environ.get("PORT", settings.PORT))
    host = os.environ.get("HOST", settings.HOST)
    uvicorn.run("app.main:app", host=host, port=port, reload=False)
