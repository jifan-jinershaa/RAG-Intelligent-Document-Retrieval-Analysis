import time
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import settings
from app.services.embedding_service import embedding_service
from app.schemas.schemas import ChunkItem, RetrievedChunk

class VectorRetrievalService:
    _chroma_client = None

    @classmethod
    def get_client(cls):
        if cls._chroma_client is None:
            cls._chroma_client = chromadb.PersistentClient(
                path=str(settings.CHROMA_PATH),
                settings=ChromaSettings(anonymized_telemetry=False)
            )
        return cls._chroma_client

    @classmethod
    def _get_collection_name(cls, strategy: str, params_hash: str) -> str:
        # Chroma collection names must be 3-63 chars: alphanumeric, underscores, hyphens
        safe_hash = params_hash[:16]
        return f"raglab_{strategy}_{safe_hash}"

    @classmethod
    def index_chunks(
        cls,
        chunks: List[ChunkItem],
        strategy: str,
        params_hash: str,
        doc_names_map: Dict[str, str]
    ):
        """
        Ensures all chunks are embedded and indexed into the Chroma collection.
        Uses existing items to avoid re-embedding chunks that already exist in the collection.
        """
        if not chunks:
            return

        client = cls.get_client()
        coll_name = cls._get_collection_name(strategy, params_hash)
        collection = client.get_or_create_collection(
            name=coll_name,
            metadata={"hnsw:space": "cosine"}
        )

        existing_ids = set(collection.get(ids=[c.id for c in chunks])["ids"])
        new_chunks = [c for c in chunks if c.id not in existing_ids]

        if not new_chunks:
            return

        # Embed new chunks in batches
        texts = [c.content for c in new_chunks]
        embeddings = embedding_service.embed_texts(texts)
        ids = [c.id for c in new_chunks]
        metadatas = [
            {
                "document_id": c.document_id,
                "document_name": doc_names_map.get(c.document_id, "Unknown"),
                "chunk_index": c.chunk_index,
                "strategy": c.strategy,
                "page_number": c.page_number if c.page_number is not None else 1
            }
            for c in new_chunks
        ]

        # Chroma handles adding in batches
        batch_size = 100
        for i in range(0, len(new_chunks), batch_size):
            collection.add(
                ids=ids[i:i+batch_size],
                embeddings=embeddings[i:i+batch_size],
                documents=texts[i:i+batch_size],
                metadatas=metadatas[i:i+batch_size]
            )

    @classmethod
    def search(
        cls,
        query: str,
        strategy: str,
        params_hash: str,
        document_ids: List[str],
        chunks: List[ChunkItem],
        doc_names_map: Dict[str, str],
        top_k: int = 5
    ) -> List[RetrievedChunk]:
        """
        Queries ChromaDB vector collection.
        If chunks are not yet indexed, indexes them first.
        """
        cls.index_chunks(chunks, strategy, params_hash, doc_names_map)
        
        client = cls.get_client()
        coll_name = cls._get_collection_name(strategy, params_hash)
        collection = client.get_collection(name=coll_name)

        query_embedding = embedding_service.embed_query(query)

        # Filter by document_ids if specified
        where_filter = None
        if document_ids:
            if len(document_ids) == 1:
                where_filter = {"document_id": document_ids[0]}
            else:
                where_filter = {"document_id": {"$in": document_ids}}

        # Fetch up to top_k results
        actual_top_k = min(top_k, max(len(chunks), 1))
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=actual_top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )

        retrieved = []
        if results and results["ids"] and len(results["ids"][0]) > 0:
            ids = results["ids"][0]
            docs = results["documents"][0]
            metas = results["metadatas"][0]
            distances = results["distances"][0]

            for rank, (cid, doc_text, meta, dist) in enumerate(zip(ids, docs, metas, distances), start=1):
                # For cosine distance, distance = 1 - cosine_similarity. Thus similarity = 1 - distance.
                # Clamp similarity to [0.0, 1.0]
                similarity = max(0.0, min(1.0, 1.0 - dist))
                retrieved.append(RetrievedChunk(
                    id=cid,
                    document_id=meta.get("document_id", ""),
                    document_name=meta.get("document_name", "Unknown Document"),
                    chunk_index=meta.get("chunk_index", 0),
                    page_number=meta.get("page_number"),
                    content=doc_text,
                    score=round(similarity, 4),
                    rank=rank,
                    vector_rank=rank,
                    vector_score=round(similarity, 4),
                    strategy=strategy
                ))

        return retrieved
