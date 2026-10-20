import json
import csv
import io
from fastapi import APIRouter, HTTPException, Response
from typing import List, Dict, Any, Optional

from app.core.database import get_db_connection
from app.schemas.schemas import NineConfigComparisonRequest, NineConfigComparisonResponse
from app.services.evaluation_service import EvaluationService

router = APIRouter(prefix="/experiments", tags=["Experiments"])

@router.post("/compare-nine", response_model=NineConfigComparisonResponse)
def compare_nine(req: NineConfigComparisonRequest):
    if not req.document_ids:
        raise HTTPException(status_code=400, detail="Please select at least one document.")
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        response = EvaluationService.compare_nine_configurations(
            query=req.query,
            document_ids=req.document_ids,
            top_k=req.top_k,
            expected_relevant_text=req.expected_relevant_text,
            fixed_size=req.fixed_size,
            fixed_overlap=req.fixed_overlap,
            recursive_size=req.recursive_size,
            recursive_overlap=req.recursive_overlap,
            semantic_threshold=req.semantic_threshold
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

@router.get("")
def list_experiments():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, timestamp, chunking_strategy, retrieval_method, metrics, timing_results 
        FROM experiments ORDER BY timestamp DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "title": r["title"],
            "timestamp": r["timestamp"],
            "chunking_strategy": r["chunking_strategy"],
            "retrieval_method": r["retrieval_method"],
            "metrics": json.loads(r["metrics"]) if r["metrics"] else {},
            "timing_results": json.loads(r["timing_results"]) if r["timing_results"] else {}
        })
    return results

@router.get("/{experiment_id}")
def get_experiment_detail(experiment_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM experiments WHERE id = ?", (experiment_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Experiment not found.")

    return {
        "id": row["id"],
        "title": row["title"],
        "timestamp": row["timestamp"],
        "document_ids": json.loads(row["document_ids"]) if row["document_ids"] else [],
        "chunking_strategy": row["chunking_strategy"],
        "chunking_params": json.loads(row["chunking_params"]) if row["chunking_params"] else {},
        "retrieval_method": row["retrieval_method"],
        "embedding_model": row["embedding_model"],
        "test_questions": json.loads(row["test_questions"]) if row["test_questions"] else [],
        "metrics": json.loads(row["metrics"]) if row["metrics"] else {},
        "timing_results": json.loads(row["timing_results"]) if row["timing_results"] else {},
        "report": json.loads(row["results_json"]) if row["results_json"] else None
    }

@router.delete("/{experiment_id}")
def delete_experiment(experiment_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM experiments WHERE id = ?", (experiment_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Experiment {experiment_id} deleted."}

@router.get("/{experiment_id}/export/{format}")
def export_experiment(experiment_id: str, format: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM experiments WHERE id = ?", (experiment_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Experiment not found.")

    report = json.loads(row["results_json"]) if row["results_json"] else {}

    if format.lower() == "json":
        return Response(
            content=json.dumps(report, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="experiment_{experiment_id[:8]}.json"'}
        )
    elif format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Config ID", "Chunking Strategy", "Retrieval Method", 
            "Recall@K", "Precision@K", "MRR", "Median Latency (ms)", "Chunk Count"
        ])
        summaries = report.get("summary_by_config", [])
        for s in summaries:
            writer.writerow([
                s.get("config_id"),
                s.get("chunking_strategy"),
                s.get("retrieval_method"),
                s.get("avg_recall_at_k"),
                s.get("avg_precision_at_k"),
                s.get("mrr"),
                s.get("median_retrieval_latency_ms"),
                s.get("chunk_count")
            ])
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="experiment_{experiment_id[:8]}.csv"'}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Supported formats: json, csv")
