import {
  DocumentBase,
  DocumentDetail,
  ChunkingResponse,
  ChunkingComparisonResponse,
  RetrievalResponse,
  MultiRetrievalComparisonResponse,
  RAGResponse,
  NineConfigComparisonResponse,
  EvalDatasetDetail,
  EvalQueryItem,
  EvaluationReport,
  ExperimentSummary,
  AppSettings,
  DashboardSummary
} from '../types';

// Resolve backend URL: uses VITE_API_URL in production (Render), or /api fallback in local dev
const resolveApiUrl = (): string => {
  let raw = (import.meta.env.VITE_API_URL || '').trim();
  if (!raw) return '/api';
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = `https://${raw}`;
  }
  raw = raw.replace(/\/+$/, '');
  return raw.endsWith('/api') ? raw : `${raw}/api`;
};

const BASE_URL = resolveApiUrl();

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorDetail = 'API Request Failed';
    try {
      const data = await res.json();
      errorDetail = data.detail || data.message || errorDetail;
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  // Dashboard & Health
  getDashboardSummary: () => fetchJSON<DashboardSummary>('/dashboard/summary'),
  getHealth: () => fetchJSON<{ status: string; service: string; version: string }>('/health'),

  // Documents
  listDocuments: () => fetchJSON<DocumentBase[]>('/documents'),
  getDocument: (id: string) => fetchJSON<DocumentDetail>(`/documents/${id}`),
  uploadDocument: async (file: File): Promise<DocumentDetail> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Failed to upload document');
    }
    return res.json();
  },
  deleteDocument: (id: string) =>
    fetchJSON<{ status: string; message: string }>(`/documents/${id}`, {
      method: 'DELETE',
    }),

  // Chunking
  processChunking: (data: {
    document_ids: string[];
    strategy: string;
    chunk_size?: number;
    chunk_overlap?: number;
    similarity_threshold?: number;
    min_chunk_size?: number;
    max_chunk_size?: number;
  }) =>
    fetchJSON<ChunkingResponse>('/chunking/process', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  compareChunking: (params: {
    document_id: string;
    fixed_size?: number;
    fixed_overlap?: number;
    recursive_size?: number;
    recursive_overlap?: number;
    semantic_threshold?: number;
  }) => {
    const query = new URLSearchParams({
      document_id: params.document_id,
      fixed_size: String(params.fixed_size ?? 500),
      fixed_overlap: String(params.fixed_overlap ?? 50),
      recursive_size: String(params.recursive_size ?? 500),
      recursive_overlap: String(params.recursive_overlap ?? 50),
      semantic_threshold: String(params.semantic_threshold ?? 0.65),
    }).toString();
    return fetchJSON<ChunkingComparisonResponse>(`/chunking/compare?${query}`, {
      method: 'POST',
    });
  },

  // Retrieval
  search: (data: {
    query: string;
    document_ids: string[];
    chunking_strategy?: string;
    retrieval_method?: string;
    top_k?: number;
    chunk_size?: number;
    chunk_overlap?: number;
    similarity_threshold?: number;
    rrf_k?: number;
    candidate_pool_size?: number;
    bm25_weight?: number;
    vector_weight?: number;
  }) =>
    fetchJSON<RetrievalResponse>('/retrieval/search', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  compareAllRetrievals: (data: {
    query: string;
    document_ids: string[];
    chunking_strategy?: string;
    top_k?: number;
    chunk_size?: number;
    chunk_overlap?: number;
    similarity_threshold?: number;
  }) =>
    fetchJSON<MultiRetrievalComparisonResponse>('/retrieval/compare-all', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // RAG Question Answering
  askRAG: (data: {
    query: string;
    document_ids: string[];
    chunking_strategy?: string;
    retrieval_method?: string;
    top_k?: number;
    chunk_size?: number;
    chunk_overlap?: number;
    similarity_threshold?: number;
    model_name?: string;
  }) =>
    fetchJSON<RAGResponse>('/rag/ask', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 9 Configurations Comparison Laboratory
  compareNine: (data: {
    query: string;
    document_ids: string[];
    top_k?: number;
    expected_relevant_text?: string;
    fixed_size?: number;
    fixed_overlap?: number;
    recursive_size?: number;
    recursive_overlap?: number;
    semantic_threshold?: number;
  }) =>
    fetchJSON<NineConfigComparisonResponse>('/experiments/compare-nine', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Experiments History
  listExperiments: () => fetchJSON<ExperimentSummary[]>('/experiments'),
  getExperiment: (id: string) => fetchJSON<any>(`/experiments/${id}`),
  deleteExperiment: (id: string) =>
    fetchJSON<{ status: string; message: string }>(`/experiments/${id}`, {
      method: 'DELETE',
    }),
  getExportUrl: (id: string, format: 'json' | 'csv') =>
    `${BASE_URL}/experiments/${id}/export/${format}`,

  // Evaluation
  listDatasets: () => fetchJSON<EvalDatasetDetail[]>('/evaluation/datasets'),
  createDataset: (data: { name: string; description?: string }) =>
    fetchJSON<EvalDatasetDetail>('/evaluation/datasets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getDatasetDetail: (id: string) =>
    fetchJSON<{ dataset: EvalDatasetDetail; queries: EvalQueryItem[] }>(
      `/evaluation/datasets/${id}`
    ),
  addQueryToDataset: (
    dataset_id: string,
    data: {
      question: string;
      document_id: string;
      expected_answer?: string;
      relevant_passage: string;
      notes?: string;
    }
  ) =>
    fetchJSON<EvalQueryItem>(`/evaluation/datasets/${dataset_id}/queries`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteQuery: (id: string) =>
    fetchJSON<{ status: string; message: string }>(`/evaluation/queries/${id}`, {
      method: 'DELETE',
    }),
  runEvaluation: (data: {
    dataset_id: string;
    top_k?: number;
    configurations?: string[];
    fixed_size?: number;
    fixed_overlap?: number;
    recursive_size?: number;
    recursive_overlap?: number;
    semantic_threshold?: number;
  }) =>
    fetchJSON<EvaluationReport>('/evaluation/run', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getEvaluationReport: (experiment_id: string) =>
    fetchJSON<EvaluationReport>(`/evaluation/results/${experiment_id}`),

  // Settings
  getSettings: () => fetchJSON<AppSettings>('/settings'),
  updateSettings: (data: Partial<Record<string, any>>) =>
    fetchJSON<{ status: string; message: string }>('/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  testGemini: () =>
    fetchJSON<{ status: string; message: string; response?: string }>('/settings/test-gemini', {
      method: 'POST',
    }),
};
