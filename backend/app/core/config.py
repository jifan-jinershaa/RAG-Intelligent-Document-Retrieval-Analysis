import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR.parent / "data"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "RAGLab — Intelligent Document Retrieval & Analysis"
    API_V1_STR: str = "/api"
    
    # Storage Paths
    DATA_PATH: Path = DATA_DIR
    UPLOAD_PATH: Path = DATA_DIR / "uploads"
    CHROMA_PATH: Path = DATA_DIR / "chroma"
    EXPERIMENTS_PATH: Path = DATA_DIR / "experiments"
    DB_PATH: Path = DATA_DIR / "raglab.db"
    
    # Models & Defaults
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DEFAULT_GEMINI_MODEL: str = os.getenv("DEFAULT_GEMINI_MODEL", "gemini-2.5-flash")
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    
    # Chunking Defaults
    DEFAULT_FIXED_CHUNK_SIZE: int = 500
    DEFAULT_FIXED_CHUNK_OVERLAP: int = 50
    DEFAULT_RECURSIVE_CHUNK_SIZE: int = 500
    DEFAULT_RECURSIVE_CHUNK_OVERLAP: int = 50
    DEFAULT_SEMANTIC_THRESHOLD: float = 0.65
    DEFAULT_SEMANTIC_MIN_CHUNK: int = 200
    DEFAULT_SEMANTIC_MAX_CHUNK: int = 1000
    
    # Retrieval Defaults
    DEFAULT_TOP_K: int = 5
    DEFAULT_RRF_K: int = 60
    DEFAULT_CANDIDATE_POOL_SIZE: int = 20

settings = Settings()

# Ensure directories exist
settings.UPLOAD_PATH.mkdir(parents=True, exist_ok=True)
settings.CHROMA_PATH.mkdir(parents=True, exist_ok=True)
settings.EXPERIMENTS_PATH.mkdir(parents=True, exist_ok=True)
