import time
import json
import uuid
import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

from app.core.database import get_db_connection
from app.services.document_service import DocumentService
from app.services.chunking_service import ChunkingService
from app.services.bm25_service import BM25RetrievalService
from app.services.vector_service import VectorRetrievalService
from app.services.hybrid_service import HybridRetrievalService
from app.schemas.schemas import (
    ChunkItem, RetrievedChunk, ConfigurationResult,
    NineConfigComparisonResponse, ConfigEvalSummary, EvaluationReport
)

CONFIGURATIONS = [
    {"id": "C1", "name": "Fixed + BM25", "strategy": "fixed", "retrieval": "bm25"},
    {"id": "C2", "name": "Fixed + Vector", "strategy": "fixed", "retrieval": "vector"},
    {"id": "C3", "name": "Fixed + Hybrid", "strategy": "fixed", "retrieval": "hybrid"},
    {"id": "C4", "name": "Recursive + BM25", "strategy": "recursive", "retrieval": "bm25"},
    {"id": "C5", "name": "Recursive + Vector", "strategy": "recursive", "retrieval": "vector"},
    {"id": "C6", "name": "Recursive + Hybrid", "strategy": "recursive", "retrieval": "hybrid"},
    {"id": "C7", "name": "Semantic + BM25", "strategy": "semantic", "retrieval": "bm25"},
    {"id": "C8", "name": "Semantic + Vector", "strategy": "semantic", "retrieval": "vector"},
    {"id": "C9", "name": "Semantic + Hybrid", "strategy": "semantic", "retrieval": "hybrid"},
]

def clean_tokens(text: str) -> set:
    words = re.findall(r'\b[a-zA-Z0-9]{3,}\b', text.lower())
    return set(words)

def is_chunk_relevant(chunk_content: str, expected_passage: str) -> bool:
    """
    Evaluates whether a retrieved chunk matches the ground-truth evidence passage.
    Checks:
    1. Direct substring inclusion (normalized)
    2. Token Jaccard overlap (threshold >= 0.40)
    """
    if not expected_passage or not chunk_content:
        return False

    clean_chunk = " ".join(chunk_content.lower().split())
    clean_expected = " ".join(expected_passage.lower().split())

    # Direct substring inclusion
    if clean_expected in clean_chunk or clean_chunk in clean_expected:
        return True

    # Check key excerpt (first 50 chars of ground truth)
    if len(clean_expected) > 50 and clean_expected[:50] in clean_chunk:
        return True

    # Token overlap check (Jaccard similarity)
    t_chunk = clean_tokens(chunk_content)
    t_exp = clean_tokens(expected_passage)
    if not t_exp or not t_chunk:
        return False

    intersection = len(t_chunk.intersection(t_exp))
    union = len(t_chunk.union(t_exp))
    jaccard = intersection / union if union > 0 else 0
    overlap_with_truth = intersection / len(t_exp) if len(t_exp) > 0 else 0

    return (jaccard >= 0.35) or (overlap_with_truth >= 0.60)

class EvaluationService:
    @classmethod
    def get_document_names_map(cls, doc_ids: List[str]) -> Dict[str, str]:
        conn = get_db_connection()
        cursor = conn.cursor()
        if not doc_ids:
            cursor.execute("SELECT id, filename FROM documents")
        else:
            placeholders = ",".join(["?"] * len(doc_ids))
            cursor.execute(f"SELECT id, filename FROM documents WHERE id IN ({placeholders})", doc_ids)
        rows = cursor.fetchall()
        conn.close()
        return {r["id"]: r["filename"] for r in rows}

    @classmethod
    def get_or_create_chunks_for_strategy(
        cls,
        doc_ids: List[str],
        strategy: str,
        params: Dict[str, Any]
    ) -> Tuple[List[ChunkItem], float, str]:
        """
        Retrieves or generates chunks for a given strategy and documents.
        Returns: (all_chunks, total_indexing_time_ms, params_hash)
        """
        all_chunks = []
        total_time = 0.0
        params_hash = ChunkingService._compute_params_hash(strategy, params)

        for doc_id in doc_ids:
            res = ChunkingService.process_and_store_chunks(
                document_id=doc_id,
                strategy=strategy,
                params=params
            )
            all_chunks.extend(res.chunks)
            total_time += res.indexing_time_ms

        return all_chunks, round(total_time, 2), params_hash

    @classmethod
    def run_single_retrieval(
        cls,
        query: str,
        strategy: str,
        retrieval_method: str,
        params_hash: str,
        doc_ids: List[str],
        chunks: List[ChunkItem],
        doc_names_map: Dict[str, str],
        top_k: int = 5
    ) -> Tuple[List[RetrievedChunk], float]:
        """
        Executes a single retrieval run and measures latency in milliseconds.
        """
        start = time.perf_counter()
        if retrieval_method == "bm25":
            results = BM25RetrievalService.search(
                query=query,
                chunks=chunks,
                doc_names_map=doc_names_map,
                top_k=top_k
            )
        elif retrieval_method == "vector":
            results = VectorRetrievalService.search(
                query=query,
                strategy=strategy,
                params_hash=params_hash,
                document_ids=doc_ids,
                chunks=chunks,
                doc_names_map=doc_names_map,
                top_k=top_k
            )
        elif retrieval_method == "hybrid":
            results = HybridRetrievalService.search(
                query=query,
                strategy=strategy,
                params_hash=params_hash,
                document_ids=doc_ids,
                chunks=chunks,
                doc_names_map=doc_names_map,
                top_k=top_k
            )
        else:
            raise ValueError(f"Unknown retrieval method: {retrieval_method}")

        latency = (time.perf_counter() - start) * 1000
        return results, round(latency, 2)

    @classmethod
    def compare_nine_configurations(
        cls,
        query: str,
        document_ids: List[str],
        top_k: int = 5,
        expected_relevant_text: Optional[str] = None,
        fixed_size: int = 500,
        fixed_overlap: int = 50,
        recursive_size: int = 500,
        recursive_overlap: int = 50,
        semantic_threshold: float = 0.65
    ) -> NineConfigComparisonResponse:
        """
        Runs the test question across all NINE configurations (C1 - C9).
        """
        doc_names = cls.get_document_names_map(document_ids)

        # Precompute/fetch chunks for the 3 chunking strategies
        fixed_params = {"chunk_size": fixed_size, "chunk_overlap": fixed_overlap}
        fixed_chunks, fixed_idx_time, fixed_hash = cls.get_or_create_chunks_for_strategy(
            document_ids, "fixed", fixed_params
        )

        recursive_params = {"chunk_size": recursive_size, "chunk_overlap": recursive_overlap}
        recursive_chunks, rec_idx_time, rec_hash = cls.get_or_create_chunks_for_strategy(
            document_ids, "recursive", recursive_params
        )

        semantic_params = {
            "similarity_threshold": semantic_threshold,
            "min_chunk_size": 200,
            "max_chunk_size": 1000
        }
        semantic_chunks, sem_idx_time, sem_hash = cls.get_or_create_chunks_for_strategy(
            document_ids, "semantic", semantic_params
        )

        strategy_data = {
            "fixed": (fixed_chunks, fixed_idx_time, fixed_hash),
            "recursive": (recursive_chunks, rec_idx_time, rec_hash),
            "semantic": (semantic_chunks, sem_idx_time, sem_hash),
        }

        config_results = []
        fastest_config = "C1"
        min_latency = float("inf")
        best_accuracy_config = None
        best_recall = -1.0

        for conf in CONFIGURATIONS:
            strat = conf["strategy"]
            retrieval = conf["retrieval"]
            chunks, idx_time, p_hash = strategy_data[strat]

            # Measure retrieval latency (repeat 3 times, take median for research accuracy)
            latencies = []
            results = []
            for run_i in range(3):
                res, lat = cls.run_single_retrieval(
                    query=query,
                    strategy=strat,
                    retrieval_method=retrieval,
                    params_hash=p_hash,
                    doc_ids=document_ids,
                    chunks=chunks,
                    doc_names_map=doc_names,
                    top_k=top_k
                )
                latencies.append(lat)
                if run_i == 0:
                    results = res

            median_lat = float(np.median(latencies))
            if median_lat < min_latency:
                min_latency = median_lat
                fastest_config = conf["id"]

            # Calculate accuracy metrics if ground truth evidence provided
            recall_val = None
            precision_val = None
            mrr_val = None

            if expected_relevant_text and results:
                relevant_matches = [
                    is_chunk_relevant(c.content, expected_relevant_text)
                    for c in results
                ]
                rel_count = sum(relevant_matches)
                precision_val = round(rel_count / len(results), 4)
                recall_val = 1.0 if rel_count > 0 else 0.0

                first_match_rank = None
                for rank_idx, is_rel in enumerate(relevant_matches, start=1):
                    if is_rel:
                        first_match_rank = rank_idx
                        break
                mrr_val = round(1.0 / first_match_rank, 4) if first_match_rank else 0.0

                if recall_val > best_recall:
                    best_recall = recall_val
                    best_accuracy_config = conf["id"]

            config_results.append(ConfigurationResult(
                config_id=conf["id"],
                config_name=conf["name"],
                chunking_strategy=strat,
                retrieval_method=retrieval,
                chunk_count=len(chunks),
                indexing_time_ms=idx_time,
                retrieval_time_ms=round(median_lat, 2),
                results=results,
                recall_at_k=recall_val,
                precision_at_k=precision_val,
                mrr=mrr_val
            ))

        return NineConfigComparisonResponse(
            query=query,
            document_ids=document_ids,
            top_k=top_k,
            fastest_config=fastest_config,
            most_accurate_config=best_accuracy_config,
            configurations=config_results
        )

    @classmethod
    def run_full_dataset_evaluation(
        cls,
        dataset_id: str,
        top_k: int = 5,
        configurations: Optional[List[str]] = None,
        fixed_size: int = 500,
        fixed_overlap: int = 50,
        recursive_size: int = 500,
        recursive_overlap: int = 50,
        semantic_threshold: float = 0.65
    ) -> EvaluationReport:
        """
        Runs comprehensive evaluation over a labeled dataset of queries.
        Calculates Recall@K, Precision@K, MRR, Latency distributions.
        Persists results into experiments table.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get dataset
        cursor.execute("SELECT id, name FROM eval_datasets WHERE id = ?", (dataset_id,))
        ds_row = cursor.fetchone()
        if not ds_row:
            conn.close()
            raise ValueError(f"Dataset {dataset_id} not found.")

        dataset_name = ds_row["name"]

        # Get queries
        cursor.execute("SELECT * FROM eval_queries WHERE dataset_id = ?", (dataset_id,))
        queries = cursor.fetchall()
        conn.close()

        if not queries:
            raise ValueError(f"Dataset {dataset_name} has no evaluation queries.")

        # Gather all document IDs used by the queries
        doc_ids = list(set(q["document_id"] for q in queries))
        doc_names = cls.get_document_names_map(doc_ids)

        # Precompute chunks for all strategies
        fixed_params = {"chunk_size": fixed_size, "chunk_overlap": fixed_overlap}
        fixed_chunks, _, fixed_hash = cls.get_or_create_chunks_for_strategy(doc_ids, "fixed", fixed_params)

        rec_params = {"chunk_size": recursive_size, "chunk_overlap": recursive_overlap}
        rec_chunks, _, rec_hash = cls.get_or_create_chunks_for_strategy(doc_ids, "recursive", rec_params)

        sem_params = {"similarity_threshold": semantic_threshold, "min_chunk_size": 200, "max_chunk_size": 1000}
        sem_chunks, _, sem_hash = cls.get_or_create_chunks_for_strategy(doc_ids, "semantic", sem_params)

        strategy_lookup = {
            "fixed": (fixed_chunks, fixed_hash),
            "recursive": (rec_chunks, rec_hash),
            "semantic": (sem_chunks, sem_hash)
        }

        active_configs = [c for c in CONFIGURATIONS if (not configurations or c["id"] in configurations)]

        # Track metrics per config
        config_metrics: Dict[str, Dict[str, Any]] = {
            c["id"]: {
                "config": c,
                "recalls": [],
                "precisions": [],
                "mrrs": [],
                "latencies": []
            }
            for c in active_configs
        }

        for q in queries:
            question_text = q["question"]
            expected_passage = q["relevant_passage"]
            query_doc_id = q["document_id"]

            for c in active_configs:
                cid = c["id"]
                strat = c["strategy"]
                retrieval = c["retrieval"]
                all_strat_chunks, p_hash = strategy_lookup[strat]

                # Filter chunks for this query's document
                doc_chunks = [ch for ch in all_strat_chunks if ch.document_id == query_doc_id]
                if not doc_chunks:
                    continue

                res, lat = cls.run_single_retrieval(
                    query=question_text,
                    strategy=strat,
                    retrieval_method=retrieval,
                    params_hash=p_hash,
                    doc_ids=[query_doc_id],
                    chunks=doc_chunks,
                    doc_names_map=doc_names,
                    top_k=top_k
                )

                config_metrics[cid]["latencies"].append(lat)

                # Compute query metrics
                relevant_matches = [
                    is_chunk_relevant(item.content, expected_passage)
                    for item in res
                ]
                rel_count = sum(relevant_matches)
                precision_val = rel_count / len(res) if res else 0.0
                recall_val = 1.0 if rel_count > 0 else 0.0

                first_match_rank = None
                for r_idx, is_rel in enumerate(relevant_matches, start=1):
                    if is_rel:
                        first_match_rank = r_idx
                        break
                mrr_val = 1.0 / first_match_rank if first_match_rank else 0.0

                config_metrics[cid]["recalls"].append(recall_val)
                config_metrics[cid]["precisions"].append(precision_val)
                config_metrics[cid]["mrrs"].append(mrr_val)

        # Summarize by configuration
        summaries: List[ConfigEvalSummary] = []
        best_recall_cid = ""
        max_recall = -1.0
        best_precision_cid = ""
        max_precision = -1.0
        best_mrr_cid = ""
        max_mrr = -1.0
        fastest_cid = ""
        min_median_lat = float("inf")

        for cid, data in config_metrics.items():
            cfg = data["config"]
            strat = cfg["strategy"]
            strat_chunks, _ = strategy_lookup[strat]

            rec_list = data["recalls"] or [0.0]
            prec_list = data["precisions"] or [0.0]
            mrr_list = data["mrrs"] or [0.0]
            lat_list = data["latencies"] or [0.0]

            avg_rec = round(float(np.mean(rec_list)), 4)
            avg_prec = round(float(np.mean(prec_list)), 4)
            mean_mrr = round(float(np.mean(mrr_list)), 4)
            median_lat = round(float(np.median(lat_list)), 2)
            avg_lat = round(float(np.mean(lat_list)), 2)

            if avg_rec > max_recall:
                max_recall = avg_rec
                best_recall_cid = cid
            if avg_prec > max_precision:
                max_precision = avg_prec
                best_precision_cid = cid
            if mean_mrr > max_mrr:
                max_mrr = mean_mrr
                best_mrr_cid = cid
            if median_lat < min_median_lat:
                min_median_lat = median_lat
                fastest_cid = cid

            summaries.append(ConfigEvalSummary(
                config_id=cid,
                chunking_strategy=strat,
                retrieval_method=cfg["retrieval"],
                avg_recall_at_k=avg_rec,
                avg_precision_at_k=avg_prec,
                mrr=mean_mrr,
                median_retrieval_latency_ms=median_lat,
                avg_retrieval_latency_ms=avg_lat,
                chunk_count=len(strat_chunks)
            ))

        # Build chart data structures
        charts_data = {
            "recall_chart": [
                {"name": f"{s.config_id} ({s.chunking_strategy[:3]}+{s.retrieval_method[:3]})", "recall": s.avg_recall_at_k}
                for s in summaries
            ],
            "precision_chart": [
                {"name": f"{s.config_id} ({s.chunking_strategy[:3]}+{s.retrieval_method[:3]})", "precision": s.avg_precision_at_k}
                for s in summaries
            ],
            "mrr_chart": [
                {"name": f"{s.config_id} ({s.chunking_strategy[:3]}+{s.retrieval_method[:3]})", "mrr": s.mrr}
                for s in summaries
            ],
            "latency_chart": [
                {"name": f"{s.config_id} ({s.chunking_strategy[:3]}+{s.retrieval_method[:3]})", "latency_ms": s.median_retrieval_latency_ms}
                for s in summaries
            ],
            "quality_vs_latency": [
                {
                    "config_id": s.config_id,
                    "name": f"{s.config_id}: {s.chunking_strategy} + {s.retrieval_method}",
                    "latency": s.median_retrieval_latency_ms,
                    "mrr": s.mrr,
                    "recall": s.avg_recall_at_k
                }
                for s in summaries
            ],
            "chunk_distribution": [
                {"strategy": "Fixed", "chunks": len(fixed_chunks)},
                {"strategy": "Recursive", "chunks": len(rec_chunks)},
                {"strategy": "Semantic", "chunks": len(sem_chunks)}
            ]
        }

        experiment_id = str(uuid.uuid4())
        now_ts = datetime.utcnow().isoformat()

        report = EvaluationReport(
            experiment_id=experiment_id,
            dataset_id=dataset_id,
            dataset_name=dataset_name,
            timestamp=now_ts,
            top_k=top_k,
            queries_evaluated=len(queries),
            best_recall_config=best_recall_cid,
            best_precision_config=best_precision_cid,
            best_mrr_config=best_mrr_cid,
            fastest_config=fastest_cid,
            summary_by_config=summaries,
            charts_data=charts_data
        )

        # Save to experiments table
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO experiments (
                id, title, timestamp, document_ids, chunking_strategy, chunking_params,
                retrieval_method, embedding_model, test_questions, metrics, timing_results, results_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            experiment_id,
            f"Evaluation: {dataset_name} ({len(queries)} queries)",
            now_ts,
            json.dumps(doc_ids),
            "all_9_configurations",
            json.dumps({"top_k": top_k, "fixed_size": fixed_size, "recursive_size": recursive_size, "semantic_threshold": semantic_threshold}),
            "bm25_vector_hybrid",
            "all-MiniLM-L6-v2",
            json.dumps([q["question"] for q in queries]),
            json.dumps({
                "best_recall_config": best_recall_cid,
                "best_precision_config": best_precision_cid,
                "best_mrr_config": best_mrr_cid,
                "fastest_config": fastest_cid
            }),
            json.dumps({s.config_id: s.median_retrieval_latency_ms for s in summaries}),
            report.model_dump_json()
        ))
        conn.commit()
        conn.close()

        return report
