import json
from fastapi import APIRouter
from typing import Dict, Any, Optional

from app.core.database import get_db_connection

router = APIRouter(tags=["Dashboard"])

@router.get("/dashboard/summary")
def get_dashboard_summary():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Document count
    cursor.execute("SELECT COUNT(*) as doc_count FROM documents")
    doc_count = cursor.fetchone()["doc_count"]

    # Chunks count
    cursor.execute("SELECT COUNT(*) as chunk_count FROM document_chunks")
    chunk_count = cursor.fetchone()["chunk_count"]

    # Experiments count
    cursor.execute("SELECT COUNT(*) as exp_count FROM experiments")
    exp_count = cursor.fetchone()["exp_count"]

    # Evaluation results & average latency
    cursor.execute("SELECT metrics, timing_results FROM experiments ORDER BY timestamp DESC")
    exp_rows = cursor.fetchall()
    conn.close()

    latencies = []
    best_config_name = None
    best_recall_val = None

    for r in exp_rows:
        if r["timing_results"]:
            try:
                times = json.loads(r["timing_results"])
                for v in times.values():
                    if isinstance(v, (int, float)):
                        latencies.append(v)
            except Exception:
                pass

        if not best_config_name and r["metrics"]:
            try:
                m = json.loads(r["metrics"])
                if "best_recall_config" in m and m["best_recall_config"]:
                    best_config_name = m["best_recall_config"]
            except Exception:
                pass

    avg_latency = round(sum(latencies) / len(latencies), 2) if latencies else None

    return {
        "total_documents": doc_count,
        "total_chunks": chunk_count,
        "available_chunking_strategies": ["Fixed-Size", "Recursive Hierarchy", "Semantic Segmentation"],
        "available_retrieval_methods": ["BM25 Keyword", "Vector (all-MiniLM-L6-v2)", "Hybrid (Reciprocal Rank Fusion)"],
        "total_experiments": exp_count,
        "average_retrieval_latency_ms": avg_latency,
        "best_performing_config": best_config_name,
        "has_experiments": exp_count > 0
    }

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "RAGLab Backend API",
        "version": "1.0.0"
    }
