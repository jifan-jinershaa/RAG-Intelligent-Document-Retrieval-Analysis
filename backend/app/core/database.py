import sqlite3
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.core.config import settings

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(settings.DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Documents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        page_count INTEGER NOT NULL,
        char_count INTEGER NOT NULL,
        upload_date TEXT NOT NULL,
        status TEXT NOT NULL,
        file_path TEXT NOT NULL,
        metadata_json TEXT
    )
    """)
    
    # Document Chunks table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        strategy TEXT NOT NULL,
        strategy_params_hash TEXT NOT NULL,
        strategy_params TEXT NOT NULL,
        content TEXT NOT NULL,
        char_count INTEGER NOT NULL,
        word_count INTEGER NOT NULL,
        page_number INTEGER,
        start_char INTEGER,
        end_char INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_chunks_doc_strat ON document_chunks (document_id, strategy, strategy_params_hash)")

    # Evaluation datasets table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS eval_datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # Evaluation queries table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS eval_queries (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL,
        question TEXT NOT NULL,
        document_id TEXT NOT NULL,
        expected_answer TEXT,
        relevant_passage TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (dataset_id) REFERENCES eval_datasets (id) ON DELETE CASCADE
    )
    """)

    # Experiments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS experiments (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        document_ids TEXT NOT NULL,
        chunking_strategy TEXT NOT NULL,
        chunking_params TEXT NOT NULL,
        retrieval_method TEXT NOT NULL,
        embedding_model TEXT NOT NULL,
        test_questions TEXT,
        metrics TEXT,
        timing_results TEXT,
        results_json TEXT
    )
    """)

    # App settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)
    
    conn.commit()
    conn.close()

def get_setting(key: str, default: Any = None) -> Any:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    if row:
        try:
            return json.loads(row["value"])
        except Exception:
            return row["value"]
    return default

def set_setting(key: str, value: Any):
    conn = get_db_connection()
    cursor = conn.cursor()
    serialized = json.dumps(value) if not isinstance(value, str) else value
    cursor.execute("""
        INSERT INTO app_settings (key, value, updated_at) 
        VALUES (?, ?, ?) 
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    """, (key, serialized, datetime.now(timezone.utc).isoformat()))
    conn.commit()
    conn.close()
