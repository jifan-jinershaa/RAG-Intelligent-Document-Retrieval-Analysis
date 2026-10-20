import React, { useState, useEffect } from 'react';
import {
  DocumentBase,
  RetrievalResponse,
  MultiRetrievalComparisonResponse,
  RetrievedChunk
} from '../types';
import { api } from '../services/api';
import {
  Search,
  Zap,
  Sliders,
  Layers,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  SplitSquareVertical,
  CheckCircle2
} from 'lucide-react';

interface RetrievalPlaygroundProps {
  documents: DocumentBase[];
  selectedDocIds: string[];
}

export const RetrievalPlayground: React.FC<RetrievalPlaygroundProps> = ({
  documents,
  selectedDocIds,
}) => {
  const [viewMode, setViewMode] = useState<'single' | 'compare_all'>('compare_all');
  const [query, setQuery] = useState('What is the difference between supervised and unsupervised learning?');
  const [activeDocIds, setActiveDocIds] = useState<string[]>([]);
  const [chunkingStrategy, setChunkingStrategy] = useState<string>('recursive');
  const [retrievalMethod, setRetrievalMethod] = useState<string>('hybrid');
  const [topK, setTopK] = useState<number>(5);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [singleResult, setSingleResult] = useState<RetrievalResponse | null>(null);
  const [multiResult, setMultiResult] = useState<MultiRetrievalComparisonResponse | null>(null);

  // Sync activeDocIds with props
  useEffect(() => {
    if (selectedDocIds.length > 0) {
      setActiveDocIds(selectedDocIds);
    } else if (documents.length > 0 && activeDocIds.length === 0) {
      setActiveDocIds([documents[0].id]);
    }
  }, [documents, selectedDocIds]);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a query.');
      return;
    }
    if (activeDocIds.length === 0) {
      setError('Please select at least one document.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      if (viewMode === 'single') {
        const res = await api.search({
          query,
          document_ids: activeDocIds,
          chunking_strategy: chunkingStrategy,
          retrieval_method: retrievalMethod,
          top_k: topK,
        });
        setSingleResult(res);
      } else {
        const comp = await api.compareAllRetrievals({
          query,
          document_ids: activeDocIds,
          chunking_strategy: chunkingStrategy,
          top_k: topK,
        });
        setMultiResult(comp);
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQueries = [
    'What is the difference between supervised and unsupervised learning?',
    'How does Reciprocal Rank Fusion combine BM25 and vector search?',
    'Why is fixed-size chunking disadvantageous?',
    'What does Mean Reciprocal Rank (MRR) evaluate?',
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Search Header Card */}
      <div className="p-6 rounded-3xl bg-[#0F172A]/90 border border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Retrieval Engine Query Console</h3>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={() => setViewMode('compare_all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                viewMode === 'compare_all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Side-by-Side (BM25 vs Vector vs Hybrid)
            </button>
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Single Mode
            </button>
          </div>
        </div>

        {/* Query Input Box */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ask a question or enter retrieval query..."
            className="w-full bg-[#080B12] border border-slate-700/80 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-purple-500 shadow-inner"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="absolute right-2 top-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {isLoading ? (
              <span className="animate-spin">⚙</span>
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span>{isLoading ? 'Retrieving...' : 'Search'}</span>
          </button>
        </div>

        {/* Quick Sample Queries */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px]">Demo Queries:</span>
          {sampleQueries.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => setQuery(sq)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] transition-colors cursor-pointer"
            >
              {sq}
            </button>
          ))}
        </div>

        {/* Hyperparameter Controls */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Target Document:</label>
            <select
              value={activeDocIds[0] || ''}
              onChange={(e) => setActiveDocIds([e.target.value])}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.filename}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Chunking Strategy:</label>
            <select
              value={chunkingStrategy}
              onChange={(e) => setChunkingStrategy(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
            >
              <option value="fixed">Fixed-Size Chunking</option>
              <option value="recursive">Recursive Hierarchy</option>
              <option value="semantic">Semantic Segmentation</option>
            </select>
          </div>

          {viewMode === 'single' && (
            <div>
              <label className="text-slate-400 block mb-1">Retrieval Algorithm:</label>
              <select
                value={retrievalMethod}
                onChange={(e) => setRetrievalMethod(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value="bm25">BM25 Keyword Matching</option>
                <option value="vector">Dense Vector (Cosine Similarity)</option>
                <option value="hybrid">Hybrid (Reciprocal Rank Fusion)</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-slate-400 block mb-1">Top-K Results:</label>
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
            >
              <option value={1}>Top 1</option>
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* 3-COLUMN SIDE-BY-SIDE VIEW (BM25 vs Vector vs Hybrid) */}
      {viewMode === 'compare_all' && multiResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Query: <strong className="text-white font-medium">"{multiResult.query}"</strong></span>
            <span>Chunking: <strong className="text-purple-400 font-mono capitalize">{multiResult.chunking_strategy}</strong></span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Column 1: BM25 */}
            <div className="p-5 rounded-3xl bg-[#0F172A]/90 border border-slate-800 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-white text-sm">BM25 Keyword Search</h4>
                  <span className="text-[11px] text-slate-400">Lexical TF-IDF ranking</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 block">
                    {multiResult.bm25.latency_ms} ms
                  </span>
                </div>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {multiResult.bm25.results.map((r) => (
                  <div key={r.id} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono text-[10px]">
                        Rank #{r.rank}
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        BM25: {r.score}
                      </span>
                    </div>
                    <p className="font-mono text-slate-300 text-[11px] leading-relaxed line-clamp-5">
                      {r.content}
                    </p>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 flex items-center justify-between">
                      <span>{r.document_name}</span>
                      {r.page_number && <span>Page {r.page_number}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Vector */}
            <div className="p-5 rounded-3xl bg-[#0F172A]/90 border border-slate-800 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-white text-sm">Dense Vector Search</h4>
                  <span className="text-[11px] text-slate-400">all-MiniLM-L6-v2 cosine</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 block">
                    {multiResult.vector.latency_ms} ms
                  </span>
                </div>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {multiResult.vector.results.map((r) => (
                  <div key={r.id} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono text-[10px]">
                        Rank #{r.rank}
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        Cosine Sim: {(r.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="font-mono text-slate-300 text-[11px] leading-relaxed line-clamp-5">
                      {r.content}
                    </p>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 flex items-center justify-between">
                      <span>{r.document_name}</span>
                      {r.page_number && <span>Page {r.page_number}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Hybrid RRF */}
            <div className="p-5 rounded-3xl bg-[#0F172A]/90 border border-purple-500/30 flex flex-col space-y-4 shadow-lg shadow-purple-950/20">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                    Hybrid (RRF Fusion)
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  </h4>
                  <span className="text-[11px] text-slate-400">Reciprocal Rank Fusion</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 block">
                    {multiResult.hybrid.latency_ms} ms
                  </span>
                </div>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {multiResult.hybrid.results.map((r) => (
                  <div key={r.id} className="p-4 rounded-2xl bg-purple-950/10 border border-purple-500/20 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono text-[10px]">
                        Fused Rank #{r.rank}
                      </span>
                      <span className="font-mono text-purple-300 text-[11px]">
                        Score: {r.score}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                      <span>BM25 Rank: {r.bm25_rank ? `#${r.bm25_rank}` : 'None'}</span>
                      <span>·</span>
                      <span>Vector Rank: {r.vector_rank ? `#${r.vector_rank}` : 'None'}</span>
                    </div>

                    <p className="font-mono text-slate-200 text-[11px] leading-relaxed line-clamp-5">
                      {r.content}
                    </p>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 flex items-center justify-between">
                      <span>{r.document_name}</span>
                      {r.page_number && <span>Page {r.page_number}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE VIEW */}
      {viewMode === 'single' && singleResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div>
              Returned <strong className="text-white font-mono">{singleResult.total_results}</strong> passages for "{singleResult.query}"
            </div>
            <div>
              Retrieval Latency: <strong className="text-emerald-400 font-mono">{singleResult.latency_ms} ms</strong>
            </div>
          </div>

          <div className="space-y-3">
            {singleResult.results.map((r) => (
              <div key={r.id} className="p-5 rounded-2xl bg-[#0F172A] border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono text-xs font-semibold">
                      Rank #{r.rank}
                    </span>
                    <span className="text-slate-400">{r.document_name}</span>
                    {r.page_number && <span className="text-slate-500">· Page {r.page_number}</span>}
                  </div>
                  <span className="font-mono text-slate-300">Score: {r.score}</span>
                </div>
                <p className="font-mono text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                  {r.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
