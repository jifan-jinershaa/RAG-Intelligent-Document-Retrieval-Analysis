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

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
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
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
