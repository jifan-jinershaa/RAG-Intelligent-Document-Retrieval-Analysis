from typing import List, Union
import numpy as np
from sentence_transformers import SentenceTransformer
from app.core.config import settings

class EmbeddingService:
    _instance = None
    _model = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        if EmbeddingService._model is None:
            print(f"Loading embedding model: {settings.EMBEDDING_MODEL_NAME}...")
            EmbeddingService._model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
            print("Embedding model loaded successfully.")

    @property
    def model(self) -> SentenceTransformer:
        if EmbeddingService._model is None:
            EmbeddingService._model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        return EmbeddingService._model

    def embed_texts(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        if not texts:
            return []
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embeddings.tolist()

    def embed_query(self, query: str) -> List[float]:
        embedding = self.model.encode(
            query,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embedding.tolist()

embedding_service = EmbeddingService.get_instance()
