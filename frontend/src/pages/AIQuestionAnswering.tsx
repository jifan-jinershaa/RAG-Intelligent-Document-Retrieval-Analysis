import React, { useState, useEffect } from 'react';
import { DocumentBase, RAGResponse, RAGCitation, RetrievedChunk } from '../types';
import { api } from '../services/api';
import { NavTab } from '../components/Sidebar';
import {
  Bot,
  Sparkles,
  Send,
  Zap,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  KeyRound,
  ExternalLink
} from 'lucide-react';

interface AIQuestionAnsweringProps {
  documents: DocumentBase[];
  selectedDocIds: string[];
  geminiKeySet: boolean;
  onNavigate: (tab: NavTab) => void;
}

export const AIQuestionAnswering: React.FC<AIQuestionAnsweringProps> = ({
  documents,
  selectedDocIds,
  geminiKeySet,
  onNavigate,
}) => {
  const [query, setQuery] = useState(
    'What is the difference between supervised and unsupervised learning?'
  );
  const [activeDocIds, setActiveDocIds] = useState<string[]>([]);
  const [chunkingStrategy, setChunkingStrategy] = useState<string>('recursive');
  const [retrievalMethod, setRetrievalMethod] = useState<string>('hybrid');
  const [topK, setTopK] = useState<number>(5);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ragResponse, setRagResponse] = useState<RAGResponse | null>(null);
  const [expandedCitationId, setExpandedCitationId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedDocIds.length > 0) {
      setActiveDocIds(selectedDocIds);
    } else if (documents.length > 0 && activeDocIds.length === 0) {
      setActiveDocIds([documents[0].id]);
    }
  }, [documents, selectedDocIds]);

  const handleAsk = async () => {
    if (!query.trim()) {
      setError('Please enter a question.');
      return;
    }
    if (activeDocIds.length === 0) {
      setError('Please select at least one document.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await api.askRAG({
        query,
        document_ids: activeDocIds,
        chunking_strategy: chunkingStrategy,
        retrieval_method: retrievalMethod,
        top_k: topK,
      });
      setRagResponse(res);
    } catch (err: any) {
      setError(err.message || 'RAG generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    'What is the difference between supervised and unsupervised learning?',
    'How does Reciprocal Rank Fusion combine BM25 and vector search?',
    'What does Mean Reciprocal Rank (MRR) evaluate?',
    'Why is fixed-size chunking disadvantageous?',
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Configuration & Input Card */}
      <div className="p-6 rounded-3xl bg-[#0F172A]/90 border border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold text-white">RAG Synthesis Console</h3>
          </div>

          {!geminiKeySet && (
            <button
              onClick={() => onNavigate('settings')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs hover:bg-amber-500/20 transition-all cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Configure Gemini API Key
            </button>
          )}
        </div>

        {/* Question Input */}
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={2}
            placeholder="Ask a natural-language question about the uploaded documents..."
            className="w-full bg-[#080B12] border border-slate-700/80 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-purple-500 shadow-inner resize-none"
          />
          <button
            onClick={handleAsk}
            disabled={isLoading || documents.length === 0}
            className="absolute right-3 bottom-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isLoading ? <span className="animate-spin">⚙</span> : <Sparkles className="w-4 h-4" />}
            <span>{isLoading ? 'Synthesizing...' : 'Generate Answer'}</span>
          </button>
        </div>

        {/* Sample queries */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px]">Demo Questions:</span>
          {sampleQuestions.map((sq, i) => (
            <button
              key={i}
              onClick={() => setQuery(sq)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] transition-colors cursor-pointer"
            >
              {sq}
            </button>
          ))}
        </div>

        {/* Hyperparameters */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Source Document:</label>
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

          <div>
            <label className="text-slate-400 block mb-1">Retrieval Algorithm:</label>
            <select
              value={retrievalMethod}
              onChange={(e) => setRetrievalMethod(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
            >
              <option value="hybrid">Hybrid (RRF Fusion)</option>
              <option value="vector">Dense Vector (Cosine)</option>
              <option value="bm25">BM25 Keyword</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Evidence Passages (Top-K):</label>
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
            >
              <option value={3}>3 Passages</option>
              <option value={5}>5 Passages</option>
              <option value={10}>10 Passages</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Answer & Evidence Display */}
      {ragResponse && (
        <div className="space-y-6">
          {/* Main Grounded Answer Card */}
          <div className="p-6 rounded-3xl bg-[#0F172A]/90 border border-purple-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h4 className="text-base font-bold text-white">Grounded Answer</h4>
                {ragResponse.is_grounded && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    Evidence-Grounded
                  </span>
                )}
              </div>

              <div className="text-xs font-mono text-slate-400">
                Model: <span className="text-purple-300">{ragResponse.model_used}</span>
              </div>
            </div>

            {/* Answer Content */}
            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
              {ragResponse.answer}
            </div>

            {/* Latency Breakdown Bar */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-slate-400 block text-[10px]">Retrieval Time</span>
                  <span className="text-blue-400 font-bold">{ragResponse.retrieval_latency_ms} ms</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">LLM Generation</span>
                  <span className="text-purple-400 font-bold">{ragResponse.generation_latency_ms} ms</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Latency</span>
                  <span className="text-emerald-400 font-bold">{ragResponse.total_latency_ms} ms</span>
                </div>
              </div>

              <div className="text-slate-400 text-[11px]">
                {ragResponse.citations.length} Verified Evidence Citations
              </div>
            </div>
          </div>

          {/* Citations & Evidence Passages */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              Retrieved Evidence & Citations ({ragResponse.citations.length})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ragResponse.citations.map((c) => {
                const isExpanded = expandedCitationId === c.citation_id;
                return (
                  <div
                    key={c.citation_id}
                    className="p-5 rounded-2xl bg-[#0B0F19] border border-slate-800/80 hover:border-slate-700 transition-all text-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono text-[10px]">
                          [Citation {c.citation_id}]
                        </span>
                        <span className="font-mono text-slate-400 text-[11px]">
                          Score: {c.relevance_score}
                        </span>
                      </div>

                      <div className="text-slate-400 text-[11px] mb-2">
                        Document: <strong className="text-slate-300">{c.document_name}</strong>{' '}
                        {c.page_number && `(Page ${c.page_number})`}
                      </div>

                      <p
                        className={`font-mono text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap ${
                          isExpanded ? '' : 'line-clamp-3'
                        }`}
                      >
                        {c.snippet}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                      <button
                        onClick={() =>
                          setExpandedCitationId(isExpanded ? null : c.citation_id)
                        }
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" /> Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" /> View full passage
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
