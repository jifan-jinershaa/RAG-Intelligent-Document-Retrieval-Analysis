export interface DocumentBase {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  page_count: number;
  char_count: number;
  upload_date: string;
  status: string;
}

export interface DocumentDetail extends DocumentBase {
  file_path: string;
  preview_text?: string;
  metadata_json?: Record<string, any>;
}

export interface ChunkItem {
  id: string;
  document_id: string;
  chunk_index: number;
  strategy: string;
  content: string;
  char_count: number;
  word_count: number;
  page_number?: number;
  start_char?: number;
  end_char?: number;
}

export interface ChunkStats {
  total_chunks: number;
  avg_length: number;
  min_length: number;
  max_length: number;
  length_distribution: Array<{ range: string; count: number }>;
}

export interface ChunkingResponse {
  document_id: string;
  strategy: string;
  params: Record<string, any>;
  chunks: ChunkItem[];
  stats: ChunkStats;
  indexing_time_ms: number;
}

export interface ChunkingComparisonResponse {
  document_id: string;
  fixed: ChunkingResponse;
  recursive: ChunkingResponse;
  semantic: ChunkingResponse;
}

export interface RetrievedChunk {
  id: string;
  document_id: string;
  document_name: string;
  chunk_index: number;
  page_number?: number;
  content: string;
  score: number;
  rank: number;
  bm25_rank?: number;
  bm25_score?: number;
  vector_rank?: number;
  vector_score?: number;
  strategy: string;
}

export interface RetrievalResponse {
  query: string;
  retrieval_method: string;
  chunking_strategy: string;
  latency_ms: number;
  total_results: number;
  results: RetrievedChunk[];
}

export interface MultiRetrievalComparisonResponse {
  query: string;
  chunking_strategy: string;
  bm25: RetrievalResponse;
  vector: RetrievalResponse;
  hybrid: RetrievalResponse;
}

export interface RAGCitation {
  citation_id: number;
  document_name: string;
  page_number?: number;
  chunk_index: number;
  relevance_score: number;
  snippet: string;
}

export interface RAGResponse {
  query: string;
  answer: string;
  citations: RAGCitation[];
  retrieved_chunks: RetrievedChunk[];
  chunking_strategy: string;
  retrieval_method: string;
  model_used: string;
  retrieval_latency_ms: number;
  generation_latency_ms: number;
  total_latency_ms: number;
  is_grounded: boolean;
  api_available: boolean;
  error_message?: string;
}

export interface ConfigurationResult {
  config_id: string;
  config_name: string;
  chunking_strategy: string;
  retrieval_method: string;
  chunk_count: number;
  indexing_time_ms: number;
  retrieval_time_ms: number;
  results: RetrievedChunk[];
  recall_at_k?: number;
  precision_at_k?: number;
  mrr?: number;
}

export interface NineConfigComparisonResponse {
  query: string;
  document_ids: string[];
  top_k: number;
  fastest_config: string;
  most_accurate_config?: string;
  configurations: ConfigurationResult[];
}

export interface EvalQueryItem {
  id: string;
  dataset_id: string;
  question: string;
  document_id: string;
  expected_answer?: string;
  relevant_passage: string;
  notes?: string;
  created_at: string;
}

export interface EvalDatasetDetail {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  query_count: number;
}

export interface ConfigEvalSummary {
  config_id: string;
  chunking_strategy: string;
  retrieval_method: string;
  avg_recall_at_k: number;
  avg_precision_at_k: number;
  mrr: number;
  median_retrieval_latency_ms: number;
  avg_retrieval_latency_ms: number;
  chunk_count: number;
}

export interface EvaluationReport {
  experiment_id: string;
  dataset_id: string;
  dataset_name: string;
  timestamp: string;
  top_k: number;
  queries_evaluated: number;
  best_recall_config: string;
  best_precision_config: string;
  best_mrr_config: string;
  fastest_config: string;
  summary_by_config: ConfigEvalSummary[];
  charts_data: {
    recall_chart: Array<{ name: string; recall: number }>;
    precision_chart: Array<{ name: string; precision: number }>;
    mrr_chart: Array<{ name: string; mrr: number }>;
    latency_chart: Array<{ name: string; latency_ms: number }>;
    quality_vs_latency: Array<{ config_id: string; name: string; latency: number; mrr: number; recall: number }>;
    chunk_distribution: Array<{ strategy: string; chunks: number }>;
  };
}

export interface ExperimentSummary {
  id: string;
  title: string;
  timestamp: string;
  chunking_strategy: string;
  retrieval_method: string;
  metrics: Record<string, any>;
  timing_results: Record<string, any>;
}

export interface AppSettings {
  gemini_api_key_set: boolean;
  gemini_model: string;
  embedding_model: string;
  default_top_k: number;
  default_fixed_size: number;
  default_fixed_overlap: number;
  default_recursive_size: number;
  default_recursive_overlap: number;
  default_semantic_threshold: number;
  default_rrf_k: number;
  storage_info: {
    database_path: string;
    uploads_directory: string;
    chroma_directory: string;
    total_uploaded_files: number;
    chroma_entries: number;
  };
}

export interface DashboardSummary {
  total_documents: number;
  total_chunks: number;
  available_chunking_strategies: string[];
  available_retrieval_methods: string[];
  total_experiments: number;
  average_retrieval_latency_ms: number | null;
  best_performing_config: string | null;
  has_experiments: boolean;
}
