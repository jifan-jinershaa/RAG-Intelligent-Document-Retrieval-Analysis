import pytest
import os
import io
from pathlib import Path
from fastapi.testclient import TestClient
import numpy as np

from app.main import app
from app.core.config import settings
from app.core.database import init_db, get_db_connection
from app.services.document_service import DocumentService, clean_extracted_text
from app.services.chunking_service import ChunkingService
from app.services.bm25_service import BM25RetrievalService, tokenize
from app.services.vector_service import VectorRetrievalService
from app.services.hybrid_service import HybridRetrievalService
from app.services.evaluation_service import EvaluationService, is_chunk_relevant
from app.services.rag_service import RAGService
from app.schemas.schemas import ChunkItem

@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    init_db()
    yield

client = TestClient(app)

# 1. Text Cleaning and PDF/TXT Extraction
def test_text_cleaning():
    raw = "Hello   world!\r\n\r\n\r\n\r\nThis   is\ta test.\xa0"
    cleaned = clean_extracted_text(raw)
    assert "Hello world!" in cleaned
    assert "This is a test." in cleaned
    assert "\r" not in cleaned
    assert "\xa0" not in cleaned

def test_unsupported_file_upload():
    response = client.post(
        "/api/documents/upload",
        files={"file": ("malicious.exe", b"binarycontent", "application/octet-stream")}
    )
    assert response.status_code == 400
    assert "Only .pdf and .txt files are supported" in response.json()["detail"]

def test_empty_file_upload():
    response = client.post(
        "/api/documents/upload",
        files={"file": ("empty.txt", b"", "text/plain")}
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()

# 2. Document upload and persistence
def test_document_upload_and_metadata():
    sample_text = (
        "Retrieval-Augmented Generation (RAG) combines dense semantic retrieval with "
        "generative foundation models. This architecture grounds model responses in factual evidence."
    )
    response = client.post(
        "/api/documents/upload",
        files={"file": ("test_doc.txt", sample_text.encode("utf-8"), "text/plain")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "test_doc.txt"
    assert data["file_type"] == "TXT"
    assert data["char_count"] > 0
    assert data["status"] == "ready"
    doc_id = data["id"]

    # Verify retrieval via GET
    get_res = client.get(f"/api/documents/{doc_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == doc_id
    assert "Retrieval-Augmented" in get_res.json()["preview_text"]



# 3. Fixed-size chunking
def test_fixed_size_chunking():
    text = "The quick brown fox jumps over the lazy dog. " * 20
    pages = [{"page_number": 1, "text": text, "start_char": 0, "end_char": len(text)}]
    chunks = ChunkingService.chunk_fixed(text, pages, chunk_size=200, chunk_overlap=30)
    
    assert len(chunks) > 1
    for c in chunks:
        assert len(c["content"]) <= 200
        assert c["page_number"] == 1
        assert "chunk_index" in c

def test_fixed_chunking_invalid_overlap():
    text = "Sample text for chunking."
    pages = [{"page_number": 1, "text": text, "start_char": 0, "end_char": len(text)}]
    with pytest.raises(ValueError):
        ChunkingService.chunk_fixed(text, pages, chunk_size=100, chunk_overlap=150)

# 4. Recursive chunking
def test_recursive_chunking():
    paragraphs = (
        "Section 1: Foundations of Artificial Intelligence.\n\n"
        "Machine learning is a field of inquiry devoted to understanding and building methods "
        "that learn from data to improve performance on some set of tasks.\n\n"
        "Section 2: Neural Networks.\n\n"
        "Deep learning is part of a broader family of machine learning methods based on artificial neural networks."
    )
    pages = [{"page_number": 1, "text": paragraphs, "start_char": 0, "end_char": len(paragraphs)}]
    chunks = ChunkingService.chunk_recursive(paragraphs, pages, chunk_size=150, chunk_overlap=20)
    
    assert len(chunks) >= 2
    # Check that chunks preserve section headings or paragraph blocks
    assert any("Foundations" in c["content"] for c in chunks)
    assert any("Neural Networks" in c["content"] for c in chunks)

# 5. Semantic chunking
def test_semantic_chunking():
    text = (
        "Supervised learning algorithms are trained with labeled data. "
        "They predict outcomes based on previously observed input-output pairs. "
        "Classification and regression are primary examples. "
        "In contrast, quantum mechanics is a fundamental theory in physics that provides a description "
        "of the physical properties of nature at the scale of atoms and subatomic particles. "
        "Schrodinger's wave equation describes how quantum state changes over time."
    )
    pages = [{"page_number": 1, "text": text, "start_char": 0, "end_char": len(text)}]
    chunks = ChunkingService.chunk_semantic(
        text, pages, similarity_threshold=0.60, min_chunk_size=50, max_chunk_size=500
    )
    assert len(chunks) >= 2
    # Ensure topics are separated
    first_chunk_text = chunks[0]["content"]
    assert "Supervised learning" in first_chunk_text or "quantum" in chunks[-1]["content"]

# 6. BM25 Retrieval
def test_bm25_retrieval():
    chunks = [
        ChunkItem(
            id="c1", document_id="d1", chunk_index=0, strategy="fixed",
            content="Supervised learning requires labeled training datasets for optimization.",
            char_count=70, word_count=9, page_number=1
        ),
        ChunkItem(
            id="c2", document_id="d1", chunk_index=1, strategy="fixed",
            content="Photosynthesis is the biological process used by plants to convert light energy.",
            char_count=78, word_count=11, page_number=1
        ),
    ]
    doc_map = {"d1": "Biology and AI"}
    results = BM25RetrievalService.search("supervised learning", chunks, doc_map, top_k=2)
    assert len(results) == 2
    assert results[0].id == "c1"
    assert results[0].score > results[1].score
    assert results[0].rank == 1

# 7. Vector Retrieval
def test_vector_retrieval():
    chunks = [
        ChunkItem(
            id="v1", document_id="d1", chunk_index=0, strategy="fixed",
            content="Support Vector Machines and Neural Networks learn decision boundaries from supervision.",
            char_count=87, word_count=10, page_number=1
        ),
        ChunkItem(
            id="v2", document_id="d1", chunk_index=1, strategy="fixed",
            content="Baking a chocolate cake requires flour, sugar, cocoa powder, and baking soda.",
            char_count=77, word_count=12, page_number=1
        ),
    ]
    doc_map = {"d1": "Testing Doc"}
    results = VectorRetrievalService.search(
        query="classification algorithms in machine learning",
        strategy="fixed",
        params_hash="test_hash_1",
        document_ids=["d1"],
        chunks=chunks,
        doc_names_map=doc_map,
        top_k=2
    )
    assert len(results) == 2
    assert results[0].id == "v1"
    assert results[0].score > results[1].score
    assert results[0].vector_score is not None

# 8. Hybrid Retrieval with RRF
def test_hybrid_rrf():
    chunks = [
        ChunkItem(
            id="h1", document_id="d1", chunk_index=0, strategy="recursive",
            content="Reciprocal Rank Fusion aggregates ordinal rankings across keyword and vector models.",
            char_count=87, word_count=11, page_number=1
        ),
        ChunkItem(
            id="h2", document_id="d1", chunk_index=1, strategy="recursive",
            content="BM25 is a term matching algorithm while dense embeddings capture conceptual synonyms.",
            char_count=86, word_count=12, page_number=1
        ),
    ]
    doc_map = {"d1": "Hybrid Test"}
    results = HybridRetrievalService.search(
        query="Reciprocal Rank Fusion RRF ranking",
        strategy="recursive",
        params_hash="test_hash_hybrid",
        document_ids=["d1"],
        chunks=chunks,
        doc_names_map=doc_map,
        top_k=2,
        rrf_k=60
    )
    assert len(results) == 2
    assert results[0].id == "h1"
    assert results[0].score > 0.0
    assert results[0].rank == 1
    assert results[0].bm25_rank is not None
    assert results[0].vector_rank is not None

# 9. Relevance Matching & Evaluation Metrics
def test_relevance_matching():
    ground_truth = "Supervised learning algorithms are trained with labeled data to predict outcomes."
    matching_chunk = "In machine learning, supervised learning algorithms are trained with labeled data to predict outcomes effectively."
    unrelated_chunk = "The solar system consists of eight planets revolving around the Sun."

    assert is_chunk_relevant(matching_chunk, ground_truth) is True
    assert is_chunk_relevant(unrelated_chunk, ground_truth) is False

# 10. Missing Gemini API Key Handling
def test_rag_missing_api_key_graceful_fallback():
    # Test RAG generation without API key: must NOT crash or hallucinate fake text
    from app.schemas.schemas import RetrievedChunk
    retrieved = [
        RetrievedChunk(
            id="rc1", document_id="d1", document_name="Test Doc", chunk_index=0,
            content="RAG reduces hallucinations by grounding answers in retrieved evidence.",
            score=0.95, rank=1, strategy="recursive"
        )
    ]
    # Temporarily ensure no API key
    original_key = os.environ.get("GEMINI_API_KEY", "")
    os.environ["GEMINI_API_KEY"] = ""
    try:
        response = RAGService.generate_answer(
            query="How does RAG reduce hallucinations?",
            retrieved_chunks=retrieved,
            chunking_strategy="recursive",
            retrieval_method="hybrid",
            retrieval_latency_ms=12.5
        )
        assert response.api_available is False
        assert len(response.citations) == 1
        assert "Gemini API key" in response.answer or "Settings" in response.answer
    finally:
        os.environ["GEMINI_API_KEY"] = original_key

# 11. End-to-End Integration Test
def test_end_to_end_flow():
    # 1. Upload Doc
    doc_content = (
        "Deep Learning Architectures and Transformer Models.\n\n"
        "Transformers rely entirely on self-attention mechanisms to compute representations "
        "of input and output sequences without using sequence-aligned RNNs or convolution.\n\n"
        "The self-attention layer allows the model to attend to information from different representation "
        "subspaces at different positions simultaneously."
    )
    upload_res = client.post(
        "/api/documents/upload",
        files={"file": ("transformers.txt", doc_content.encode("utf-8"), "text/plain")}
    )
    assert upload_res.status_code == 200
    doc_id = upload_res.json()["id"]

    # 2. Chunking
    chunk_res = client.post(
        "/api/chunking/process",
        json={"document_ids": [doc_id], "strategy": "recursive", "chunk_size": 200, "chunk_overlap": 20}
    )
    assert chunk_res.status_code == 200
    assert len(chunk_res.json()["chunks"]) >= 2
    assert chunk_res.json()["stats"]["total_chunks"] >= 2

    # 3. Retrieval
    search_res = client.post(
        "/api/retrieval/search",
        json={
            "query": "self-attention mechanism",
            "document_ids": [doc_id],
            "chunking_strategy": "recursive",
            "retrieval_method": "hybrid",
            "top_k": 3
        }
    )
    assert search_res.status_code == 200
    assert len(search_res.json()["results"]) > 0
    assert "self-attention" in search_res.json()["results"][0]["content"].lower()

    # 4. 9-Configuration Comparison
    comp_res = client.post(
        "/api/experiments/compare-nine",
        json={
            "query": "What do transformers rely on?",
            "document_ids": [doc_id],
            "top_k": 3,
            "expected_relevant_text": "Transformers rely entirely on self-attention mechanisms"
        }
    )
    assert comp_res.status_code == 200
    configs = comp_res.json()["configurations"]
    assert len(configs) == 9
    assert comp_res.json()["fastest_config"] in ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9"]

    # 5. Cleanup
    del_res = client.delete(f"/api/documents/{doc_id}")
    assert del_res.status_code == 200
