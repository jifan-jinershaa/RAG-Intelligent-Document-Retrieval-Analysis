import React from 'react';
import { DashboardSummary } from '../types';
import { NavTab } from '../components/Sidebar';
import {
  FileText,
  Scissors,
  Search,
  Bot,
  Zap,
  BarChart,
  ArrowRight,
  Database,
  Layers,
  Award,
  BookOpen,
  Cpu
} from 'lucide-react';

interface OverviewProps {
  summary: DashboardSummary | null;
  onNavigate: (tab: NavTab) => void;
}

export const Overview: React.FC<OverviewProps> = ({ summary, onNavigate }) => {
  const pipelineSteps = [
    {
      step: '01',
      title: 'Document Ingestion',
      desc: 'Extract clean UTF-8 text from PDF & TXT using PyMuPDF while tracking page numbers & offsets.',
      icon: FileText,
      color: 'from-blue-600 to-cyan-500',
    },
    {
      step: '02',
      title: 'Chunking Strategy',
      desc: 'Discretize into Fixed character windows, Recursive syntax boundaries, or Semantic topic clusters.',
      icon: Scissors,
      color: 'from-indigo-600 to-purple-500',
    },
    {
      step: '03',
      title: 'Dual-Index Storage',
      desc: 'Build inverted index token frequencies and generate all-MiniLM-L6-v2 vectors stored in ChromaDB.',
      icon: Database,
      color: 'from-purple-600 to-pink-500',
    },
    {
      step: '04',
      title: 'Hybrid Retrieval',
      desc: 'Execute BM25 keyword matching and dense vector similarity, fused via Reciprocal Rank Fusion (RRF).',
      icon: Search,
      color: 'from-pink-600 to-rose-500',
    },
    {
      step: '05',
      title: 'Grounded LLM Reasoning',
      desc: 'Inject retrieved evidence passages into Google Gemini with strict anti-hallucination citations.',
      icon: Bot,
      color: 'from-rose-600 to-amber-500',
    },
    {
      step: '06',
      title: 'Empirical Evaluation',
      desc: 'Measure Recall@K, Precision@K, MRR, and latency distributions against labeled ground-truth.',
      icon: BarChart,
      color: 'from-emerald-600 to-teal-500',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Hero Research Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#111827] via-[#0E1528] to-[#140E2D] border border-slate-800 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono uppercase tracking-wider mb-4">
            <Cpu className="w-3.5 h-3.5" /> University Research & Evaluation Project
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Optimizing Retrieval-Augmented Generation Using Chunking Strategies & Hybrid Search
          </h2>
          <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
            An empirical investigation analyzing how Fixed-Size, Recursive Hierarchy, and Semantic Segmentation chunking
            interact with BM25, Dense Vector, and Reciprocal Rank Fusion (RRF) retrieval across accuracy, latency, and groundedness.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('comparison')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              Launch 9-Configuration Lab
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('evaluation')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm transition-all cursor-pointer"
            >
              <BarChart className="w-4 h-4 text-purple-400" />
              Evaluation Dashboard
            </button>
            <button
              onClick={() => onNavigate('rag')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm transition-all cursor-pointer"
            >
              <Bot className="w-4 h-4 text-blue-400" />
              AI Question Answering
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Uploaded Documents</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white font-mono">
            {summary?.total_documents ?? 0}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <span>PDF and TXT format</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Indexed Chunks</span>
            <Scissors className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-bold text-white font-mono">
            {summary?.total_chunks ?? 0}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Across 3 chunking strategies
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Average Retrieval Latency</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-white font-mono">
            {summary?.average_retrieval_latency_ms !== null && summary?.average_retrieval_latency_ms !== undefined
              ? `${summary.average_retrieval_latency_ms} ms`
              : '—'}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {summary?.has_experiments ? 'Empirically measured' : 'Run benchmark to measure'}
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Top Configuration</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono truncate">
            {summary?.best_performing_config || 'Pending Eval'}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {summary?.best_performing_config ? 'Best Recall@K in benchmarks' : 'No evaluations executed yet'}
          </div>
        </div>
      </div>

      {/* Visual Pipeline Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">RAG Architectural Pipeline</h3>
            <p className="text-xs text-slate-400">End-to-end processing pipeline implemented in RAGLab</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pipelineSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="relative p-6 rounded-2xl bg-[#0F172A]/70 border border-slate-800 hover:border-slate-700 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} text-white shadow-md`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    STAGE {step.step}
                  </span>
                </div>
                <h4 className="text-base font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                  {step.title}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Research Methodology & Trade-offs */}
      <div className="p-6 rounded-2xl bg-[#0F172A]/50 border border-slate-800 text-xs text-slate-400 space-y-3 leading-relaxed">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
          <BookOpen className="w-4 h-4 text-purple-400" />
          Research Question & Hypothesis
        </div>
        <p>
          Chunk size and boundary segmentation define the fundamental trade-off in RAG systems: fine-grained chunks maximize
          retrieval specificity but truncate relational context, whereas coarse-grained chunks preserve surrounding narrative at
          the expense of introducing retrieval noise.
        </p>
        <p>
          Simultaneously, sparse retrieval (BM25) excels at lexical entity matching (e.g., proper nouns, model codes) but fails under
          paraphrasing, whereas dense retrieval handles semantic synonyms but risks semantic drift. Hybrid search with Reciprocal Rank
          Fusion (RRF) aims to establish Pareto-optimal performance across both precision and recall.
        </p>
      </div>
    </div>
  );
};
