from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# --- Document Schemas ---
class DocumentBase(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    page_count: int
    char_count: int
    upload_date: str
    status: str

class DocumentDetail(DocumentBase):
    file_path: str
    preview_text: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None

# --- Chunking Schemas ---
class ChunkItem(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    strategy: str
    content: str
    char_count: int
    word_count: int
    page_number: Optional[int] = None
    start_char: Optional[int] = None
    end_char: Optional[int] = None

class ChunkStats(BaseModel):
    total_chunks: int
    avg_length: float
    min_length: int
    max_length: int
    length_distribution: List[Dict[str, Any]]  # bin label and count

class ChunkingRequest(BaseModel):
    document_ids: List[str]
    strategy: str = "recursive"  # fixed, recursive, semantic
    # Fixed & Recursive params
    chunk_size: int = 500
    chunk_overlap: int = 50
    # Semantic params
    similarity_threshold: float = 0.65
    min_chunk_size: int = 200
    max_chunk_size: int = 1000

class ChunkingResponse(BaseModel):
    document_id: str
    strategy: str
    params: Dict[str, Any]
    chunks: List[ChunkItem]
    stats: ChunkStats
    indexing_time_ms: float

class ChunkingComparisonResponse(BaseModel):
    document_id: str
    fixed: ChunkingResponse
    recursive: ChunkingResponse
    semantic: ChunkingResponse

# --- Retrieval Schemas ---
class RetrievalRequest(BaseModel):
    query: str
    document_ids: List[str]
    chunking_strategy: str = "recursive"
    chunk_size: int = 500
    chunk_overlap: int = 50
    similarity_threshold: float = 0.65
    retrieval_method: str = "hybrid"  # bm25, vector, hybrid
    top_k: int = 5
    rrf_k: int = 60
    candidate_pool_size: int = 20
    vector_weight: float = 1.0
    bm25_weight: float = 1.0

class RetrievedChunk(BaseModel):
    id: str
    document_id: str
    document_name: str
    chunk_index: int
    page_number: Optional[int] = None
    content: str
    score: float
    rank: int
    bm25_rank: Optional[int] = None
    bm25_score: Optional[float] = None
    vector_rank: Optional[int] = None
    vector_score: Optional[float] = None
    strategy: str

class RetrievalResponse(BaseModel):
    query: str
    retrieval_method: str
    chunking_strategy: str
    latency_ms: float
    total_results: int
    results: List[RetrievedChunk]

class MultiRetrievalComparisonResponse(BaseModel):
    query: str
    chunking_strategy: str
    bm25: RetrievalResponse
    vector: RetrievalResponse
    hybrid: RetrievalResponse

# --- RAG Schemas ---
class RAGRequest(BaseModel):
    query: str
    document_ids: List[str]
    chunking_strategy: str = "recursive"
    retrieval_method: str = "hybrid"
    top_k: int = 5
    chunk_size: int = 500
    chunk_overlap: int = 50
    similarity_threshold: float = 0.65
    model_name: Optional[str] = None

class RAGCitation(BaseModel):
    citation_id: int
    document_name: str
    page_number: Optional[int] = None
    chunk_index: int
    relevance_score: float
    snippet: str

class RAGResponse(BaseModel):
    query: str
    answer: str
    citations: List[RAGCitation]
    retrieved_chunks: List[RetrievedChunk]
    chunking_strategy: str
    retrieval_method: str
    model_used: str
    retrieval_latency_ms: float
    generation_latency_ms: float
    total_latency_ms: float
    is_grounded: bool
    api_available: bool
    error_message: Optional[str] = None

# --- Comparison Laboratory Schemas (9 Configurations) ---
class ConfigurationResult(BaseModel):
    config_id: str  # C1 - C9
    config_name: str
    chunking_strategy: str
    retrieval_method: str
    chunk_count: int
    indexing_time_ms: float
    retrieval_time_ms: float
    results: List[RetrievedChunk]
    recall_at_k: Optional[float] = None
    precision_at_k: Optional[float] = None
    mrr: Optional[float] = None

class NineConfigComparisonRequest(BaseModel):
    query: str
    document_ids: List[str]
    top_k: int = 5
    expected_relevant_text: Optional[str] = None
    fixed_size: int = 500
    fixed_overlap: int = 50
    recursive_size: int = 500
    recursive_overlap: int = 50
    semantic_threshold: float = 0.65

class NineConfigComparisonResponse(BaseModel):
    query: str
    document_ids: List[str]
    top_k: int
    fastest_config: str
    most_accurate_config: Optional[str] = None
    configurations: List[ConfigurationResult]

# --- Evaluation Dataset & Metrics Schemas ---
class EvalQueryCreate(BaseModel):
    question: str
    document_id: str
    expected_answer: Optional[str] = None
    relevant_passage: str  # Ground truth passage / keywords
    notes: Optional[str] = None

class EvalQueryItem(EvalQueryCreate):
    id: str
    dataset_id: str
    created_at: str

class EvalDatasetCreate(BaseModel):
    name: str
    description: Optional[str] = None

class EvalDatasetDetail(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: str
    query_count: int

class RunEvaluationRequest(BaseModel):
    dataset_id: str
    top_k: int = 5
    configurations: Optional[List[str]] = None  # C1 to C9 (default all)
    fixed_size: int = 500
    fixed_overlap: int = 50
    recursive_size: int = 500
    recursive_overlap: int = 50
    semantic_threshold: float = 0.65

class ConfigEvalSummary(BaseModel):
    config_id: str
    chunking_strategy: str
    retrieval_method: str
    avg_recall_at_k: float
    avg_precision_at_k: float
    mrr: float
    median_retrieval_latency_ms: float
    avg_retrieval_latency_ms: float
    chunk_count: int

class EvaluationReport(BaseModel):
    experiment_id: str
    dataset_id: str
    dataset_name: str
    timestamp: str
    top_k: int
    queries_evaluated: int
    best_recall_config: str
    best_precision_config: str
    best_mrr_config: str
    fastest_config: str
    summary_by_config: List[ConfigEvalSummary]
    charts_data: Dict[str, Any]

# --- App Settings Schemas ---
class AppSettingsSchema(BaseModel):
    gemini_api_key_set: bool
    gemini_model: str
    embedding_model: str
    default_top_k: int
    default_fixed_size: int
    default_fixed_overlap: int
    default_recursive_size: int
    default_recursive_overlap: int
    default_semantic_threshold: float
    default_rrf_k: int
    storage_info: Dict[str, Any]

class UpdateSettingsRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    default_top_k: Optional[int] = None
    default_fixed_size: Optional[int] = None
    default_fixed_overlap: Optional[int] = None
    default_recursive_size: Optional[int] = None
    default_recursive_overlap: Optional[int] = None
    default_semantic_threshold: Optional[float] = None
    default_rrf_k: Optional[int] = None
