import re
import time
import hashlib
import json
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.database import get_db_connection
from app.services.document_service import DocumentService
from app.services.embedding_service import embedding_service
from app.schemas.schemas import ChunkItem, ChunkStats, ChunkingResponse

def calculate_stats(chunks: List[ChunkItem]) -> ChunkStats:
    if not chunks:
        return ChunkStats(
            total_chunks=0,
            avg_length=0.0,
            min_length=0,
            max_length=0,
            length_distribution=[]
        )
    lengths = [len(c.content) for c in chunks]
    total = len(lengths)
    avg_len = float(np.mean(lengths))
    min_len = int(np.min(lengths))
    max_len = int(np.max(lengths))

    # Bins: 0-250, 251-500, 501-750, 751-1000, 1000+
    bins = [
        {"range": "0-250", "count": 0},
        {"range": "251-500", "count": 0},
        {"range": "501-750", "count": 0},
        {"range": "751-1000", "count": 0},
        {"range": "1000+", "count": 0},
    ]
    for l in lengths:
        if l <= 250:
            bins[0]["count"] += 1
        elif l <= 500:
            bins[1]["count"] += 1
        elif l <= 750:
            bins[2]["count"] += 1
        elif l <= 1000:
            bins[3]["count"] += 1
        else:
            bins[4]["count"] += 1

    return ChunkStats(
        total_chunks=total,
        avg_length=round(avg_len, 2),
        min_length=min_len,
        max_length=max_len,
        length_distribution=bins
    )

def find_page_for_offset(char_offset: int, pages_data: List[Dict[str, Any]]) -> int:
    """Finds which page number a character offset falls into."""
    if not pages_data:
        return 1
    for page in pages_data:
        if page["start_char"] <= char_offset <= page["end_char"]:
            return page["page_number"]
    return pages_data[-1]["page_number"]

class ChunkingService:
    @staticmethod
    def _compute_params_hash(strategy: str, params: Dict[str, Any]) -> str:
        serialized = json.dumps({"strategy": strategy, **params}, sort_keys=True)
        return hashlib.md5(serialized.encode("utf-8")).hexdigest()

    @classmethod
    def chunk_fixed(
        cls, 
        text: str, 
        pages_data: List[Dict[str, Any]], 
        chunk_size: int = 500, 
        chunk_overlap: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Fixed-size character chunking with exact stride.
        """
        if chunk_overlap >= chunk_size:
            raise ValueError(f"Overlap ({chunk_overlap}) must be strictly less than chunk size ({chunk_size})")

        stride = chunk_size - chunk_overlap
        chunks = []
        text_len = len(text)
        
        start = 0
        idx = 0
        while start < text_len:
            end = min(start + chunk_size, text_len)
            chunk_text = text[start:end].strip()
            if chunk_text:
                page_num = find_page_for_offset(start, pages_data)
                chunks.append({
                    "chunk_index": idx,
                    "content": chunk_text,
                    "start_char": start,
                    "end_char": end,
                    "page_number": page_num
                })
                idx += 1
            if end >= text_len:
                break
            start += stride

        return chunks

    @classmethod
    def chunk_recursive(
        cls, 
        text: str, 
        pages_data: List[Dict[str, Any]], 
        chunk_size: int = 500, 
        chunk_overlap: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Hierarchical recursive chunking using LangChain RecursiveCharacterTextSplitter.
        """
        if chunk_overlap >= chunk_size:
            raise ValueError(f"Overlap ({chunk_overlap}) must be strictly less than chunk size ({chunk_size})")

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
            keep_separator=True
        )

        raw_chunks = splitter.split_text(text)
        chunks = []
        last_found_pos = 0

        for idx, chunk_text in enumerate(raw_chunks):
            clean_chunk = chunk_text.strip()
            if not clean_chunk:
                continue

            # Approximate character location in the full text
            pos = text.find(clean_chunk[:50], last_found_pos)
            if pos == -1:
                pos = last_found_pos
            else:
                last_found_pos = pos

            page_num = find_page_for_offset(pos, pages_data)
            chunks.append({
                "chunk_index": idx,
                "content": clean_chunk,
                "start_char": pos,
                "end_char": pos + len(clean_chunk),
                "page_number": page_num
            })

        return chunks

    @classmethod
    def chunk_semantic(
        cls, 
        text: str, 
        pages_data: List[Dict[str, Any]], 
        similarity_threshold: float = 0.65,
        min_chunk_size: int = 200,
        max_chunk_size: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Embedding-based semantic chunking:
        1. Breaks text into natural sentences.
        2. Computes sentence embeddings using Sentence Transformers.
        3. Computes cosine similarity between consecutive sentences.
        4. Splits on topic shifts (similarity < threshold) while enforcing min/max boundaries.
        """
        # Split into sentences using punctuation boundaries
        sentence_delimiters = r'(?<=[.?!])\s+'
        raw_sentences = [s.strip() for s in re.split(sentence_delimiters, text) if s.strip()]
        
        if not raw_sentences:
            return []

        if len(raw_sentences) == 1:
            return [{
                "chunk_index": 0,
                "content": raw_sentences[0],
                "start_char": 0,
                "end_char": len(raw_sentences[0]),
                "page_number": find_page_for_offset(0, pages_data)
            }]

        # Embed sentences
        embeddings = np.array(embedding_service.embed_texts(raw_sentences))
        
        # Calculate cosine similarities between adjacent sentences
        # Since embeddings from our service are L2-normalized: dot product is cosine similarity
        similarities = []
        for i in range(len(embeddings) - 1):
            sim = float(np.dot(embeddings[i], embeddings[i+1]))
            similarities.append(sim)

        chunks = []
        current_chunk_sentences = [raw_sentences[0]]
        current_length = len(raw_sentences[0])
        chunk_idx = 0
        last_found_pos = 0

        for i, sim in enumerate(similarities):
            next_sentence = raw_sentences[i+1]
            next_len = len(next_sentence)

            # Check boundary conditions
            is_dissimilar = sim < similarity_threshold
            exceeds_min = current_length >= min_chunk_size
            exceeds_max = (current_length + next_len) > max_chunk_size

            # Split if semantically dissimilar and min size met, OR if adding next sentence exceeds max size
            if (is_dissimilar and exceeds_min) or exceeds_max:
                chunk_str = " ".join(current_chunk_sentences).strip()
                pos = text.find(chunk_str[:50], last_found_pos)
                if pos == -1:
                    pos = last_found_pos
                else:
                    last_found_pos = pos

                chunks.append({
                    "chunk_index": chunk_idx,
                    "content": chunk_str,
                    "start_char": pos,
                    "end_char": pos + len(chunk_str),
                    "page_number": find_page_for_offset(pos, pages_data)
                })
                chunk_idx += 1
                current_chunk_sentences = [next_sentence]
                current_length = next_len
            else:
                current_chunk_sentences.append(next_sentence)
                current_length += next_len + 1

        # Append remaining
        if current_chunk_sentences:
            chunk_str = " ".join(current_chunk_sentences).strip()
            pos = text.find(chunk_str[:50], last_found_pos)
            if pos == -1:
                pos = last_found_pos

            chunks.append({
                "chunk_index": chunk_idx,
                "content": chunk_str,
                "start_char": pos,
                "end_char": pos + len(chunk_str),
                "page_number": find_page_for_offset(pos, pages_data)
            })

        return chunks

    @classmethod
    def process_and_store_chunks(
        cls,
        document_id: str,
        strategy: str,
        params: Dict[str, Any]
    ) -> ChunkingResponse:
        """
        Executes chunking, caches/persists to SQLite, and returns results.
        """
        full_text, pages_data = DocumentService.get_document_full_text(document_id)
        if not full_text:
            raise ValueError(f"Document {document_id} has no extracted text.")

        params_hash = cls._compute_params_hash(strategy, params)
        start_time = time.perf_counter()

        # Check existing cached chunks in database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM document_chunks 
            WHERE document_id = ? AND strategy = ? AND strategy_params_hash = ?
            ORDER BY chunk_index ASC
        """, (document_id, strategy, params_hash))
        existing_rows = cursor.fetchall()
        
        if existing_rows:
            chunks = [
                ChunkItem(
                    id=row["id"],
                    document_id=row["document_id"],
                    chunk_index=row["chunk_index"],
                    strategy=row["strategy"],
                    content=row["content"],
                    char_count=row["char_count"],
                    word_count=row["word_count"],
                    page_number=row["page_number"],
                    start_char=row["start_char"],
                    end_char=row["end_char"]
                )
                for row in existing_rows
            ]
            conn.close()
            indexing_time = (time.perf_counter() - start_time) * 1000
            return ChunkingResponse(
                document_id=document_id,
                strategy=strategy,
                params=params,
                chunks=chunks,
                stats=calculate_stats(chunks),
                indexing_time_ms=round(indexing_time, 2)
            )

        # Generate new chunks based on strategy
        if strategy == "fixed":
            size = params.get("chunk_size", 500)
            overlap = params.get("chunk_overlap", 50)
            raw_chunks = cls.chunk_fixed(full_text, pages_data, chunk_size=size, chunk_overlap=overlap)
        elif strategy == "recursive":
            size = params.get("chunk_size", 500)
            overlap = params.get("chunk_overlap", 50)
            raw_chunks = cls.chunk_recursive(full_text, pages_data, chunk_size=size, chunk_overlap=overlap)
        elif strategy == "semantic":
            thresh = params.get("similarity_threshold", 0.65)
            min_size = params.get("min_chunk_size", 200)
            max_size = params.get("max_chunk_size", 1000)
            raw_chunks = cls.chunk_semantic(
                full_text, pages_data, 
                similarity_threshold=thresh, 
                min_chunk_size=min_size, 
                max_chunk_size=max_size
            )
        else:
            conn.close()
            raise ValueError(f"Unknown chunking strategy: {strategy}")

        # Insert into DB
        from datetime import datetime
        now = datetime.utcnow().isoformat()
        items = []
        insert_tuples = []
        for c in raw_chunks:
            chunk_id = f"{document_id}_{strategy}_{params_hash[:8]}_{c['chunk_index']}"
            content = c["content"]
            char_len = len(content)
            word_len = len(content.split())
            item = ChunkItem(
                id=chunk_id,
                document_id=document_id,
                chunk_index=c["chunk_index"],
                strategy=strategy,
                content=content,
                char_count=char_len,
                word_count=word_len,
                page_number=c.get("page_number"),
                start_char=c.get("start_char"),
                end_char=c.get("end_char")
            )
            items.append(item)
            insert_tuples.append((
                chunk_id, document_id, c["chunk_index"], strategy, params_hash,
                json.dumps(params), content, char_len, word_len,
                c.get("page_number"), c.get("start_char"), c.get("end_char"), now
            ))

        cursor.executemany("""
            INSERT INTO document_chunks (
                id, document_id, chunk_index, strategy, strategy_params_hash,
                strategy_params, content, char_count, word_count,
                page_number, start_char, end_char, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, insert_tuples)
        conn.commit()
        conn.close()

        indexing_time = (time.perf_counter() - start_time) * 1000
        return ChunkingResponse(
            document_id=document_id,
            strategy=strategy,
            params=params,
            chunks=items,
            stats=calculate_stats(items),
            indexing_time_ms=round(indexing_time, 2)
        )
