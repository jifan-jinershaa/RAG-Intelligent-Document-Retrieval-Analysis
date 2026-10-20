import re
from typing import List, Tuple, Dict, Any
from rank_bm25 import BM25Plus
from app.schemas.schemas import ChunkItem, RetrievedChunk

def tokenize(text: str) -> List[str]:
    """Tokenizes text into lowercase alphanumeric words."""
    return re.findall(r'\b[a-zA-Z0-9_]+\b', text.lower())

class BM25RetrievalService:
    @classmethod
    def search(
        cls,
        query: str,
        chunks: List[ChunkItem],
        doc_names_map: Dict[str, str],
        top_k: int = 5
    ) -> List[RetrievedChunk]:
        if not chunks:
            return []

        tokenized_corpus = [tokenize(c.content) for c in chunks]
        tokenized_query = tokenize(query)

        # Handle empty query tokens
        if not tokenized_query:
            return []

        bm25 = BM25Plus(tokenized_corpus)
        scores = bm25.get_scores(tokenized_query)

        # Sort indices by score descending
        ranked_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)

        results = []
        for rank, idx in enumerate(ranked_indices[:top_k], start=1):
            chunk = chunks[idx]
            raw_score = float(scores[idx])
            results.append(RetrievedChunk(
                id=chunk.id,
                document_id=chunk.document_id,
                document_name=doc_names_map.get(chunk.document_id, "Unknown Document"),
                chunk_index=chunk.chunk_index,
                page_number=chunk.page_number,
                content=chunk.content,
                score=round(raw_score, 4),
                rank=rank,
                bm25_rank=rank,
                bm25_score=round(raw_score, 4),
                strategy=chunk.strategy
            ))

        return results
