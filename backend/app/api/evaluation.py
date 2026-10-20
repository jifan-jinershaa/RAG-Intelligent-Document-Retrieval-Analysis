import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from typing import List, Optional

from app.core.database import get_db_connection
from app.schemas.schemas import (
    EvalDatasetCreate, EvalDatasetDetail, EvalQueryCreate, EvalQueryItem,
    RunEvaluationRequest, EvaluationReport
)
from app.services.evaluation_service import EvaluationService

router = APIRouter(prefix="/evaluation", tags=["Evaluation"])

@router.get("/datasets", response_model=List[EvalDatasetDetail])
def list_datasets():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT d.id, d.name, d.description, d.created_at, COUNT(q.id) as query_count
        FROM eval_datasets d
        LEFT JOIN eval_queries q ON d.id = q.dataset_id
        GROUP BY d.id
        ORDER BY d.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    return [
        EvalDatasetDetail(
            id=r["id"],
            name=r["name"],
            description=r["description"],
            created_at=r["created_at"],
            query_count=r["query_count"]
        )
        for r in rows
    ]

@router.post("/datasets", response_model=EvalDatasetDetail)
def create_dataset(req: EvalDatasetCreate):
    dataset_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO eval_datasets (id, name, description, created_at)
        VALUES (?, ?, ?, ?)
    """, (dataset_id, req.name, req.description, now))
    conn.commit()
    conn.close()

    return EvalDatasetDetail(
        id=dataset_id,
        name=req.name,
        description=req.description,
        created_at=now,
        query_count=0
    )

@router.get("/datasets/{dataset_id}")
def get_dataset_queries(dataset_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM eval_datasets WHERE id = ?", (dataset_id,))
    ds = cursor.fetchone()
    if not ds:
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found.")

    cursor.execute("SELECT * FROM eval_queries WHERE dataset_id = ? ORDER BY created_at ASC", (dataset_id,))
    queries = cursor.fetchall()
    conn.close()

    return {
        "dataset": {
            "id": ds["id"],
            "name": ds["name"],
            "description": ds["description"],
            "created_at": ds["created_at"]
        },
        "queries": [
            EvalQueryItem(
                id=q["id"],
                dataset_id=q["dataset_id"],
                question=q["question"],
                document_id=q["document_id"],
                expected_answer=q["expected_answer"],
                relevant_passage=q["relevant_passage"],
                notes=q["notes"],
                created_at=q["created_at"]
            )
            for q in queries
        ]
    }

@router.post("/datasets/{dataset_id}/queries", response_model=EvalQueryItem)
def add_query(dataset_id: str, req: EvalQueryCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM eval_datasets WHERE id = ?", (dataset_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found.")

    query_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    cursor.execute("""
        INSERT INTO eval_queries (
            id, dataset_id, question, document_id, expected_answer,
            relevant_passage, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        query_id, dataset_id, req.question, req.document_id,
        req.expected_answer, req.relevant_passage, req.notes, now
    ))
    conn.commit()
    conn.close()

    return EvalQueryItem(
        id=query_id,
        dataset_id=dataset_id,
        question=req.question,
        document_id=req.document_id,
        expected_answer=req.expected_answer,
        relevant_passage=req.relevant_passage,
        notes=req.notes,
        created_at=now
    )

@router.delete("/queries/{query_id}")
def delete_query(query_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM eval_queries WHERE id = ?", (query_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Query deleted."}

@router.post("/run", response_model=EvaluationReport)
def run_evaluation(req: RunEvaluationRequest):
    try:
        report = EvaluationService.run_full_dataset_evaluation(
            dataset_id=req.dataset_id,
            top_k=req.top_k,
            configurations=req.configurations,
            fixed_size=req.fixed_size,
            fixed_overlap=req.fixed_overlap,
            recursive_size=req.recursive_size,
            recursive_overlap=req.recursive_overlap,
            semantic_threshold=req.semantic_threshold
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation execution failed: {str(e)}")

@router.get("/results/{experiment_id}", response_model=EvaluationReport)
def get_evaluation_results(experiment_id: str):
    import json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT results_json FROM experiments WHERE id = ?", (experiment_id,))
    row = cursor.fetchone()
    conn.close()

    if not row or not row["results_json"]:
        raise HTTPException(status_code=404, detail="Evaluation experiment report not found.")

    data = json.loads(row["results_json"])
    return data
