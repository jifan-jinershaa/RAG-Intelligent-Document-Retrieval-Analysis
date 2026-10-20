import React from 'react';
import { NavTab } from './Sidebar';
import { Sparkles, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface NavbarProps {
  currentTab: NavTab;
  isBackendHealthy: boolean;
  geminiKeySet: boolean;
  geminiModel: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  overview: {
    title: 'Overview Dashboard',
    subtitle: 'System architecture, corpus summary, and empirical RAG pipeline metrics',
  },
  documents: {
    title: 'Document Workspace',
    subtitle: 'Upload, preprocess, and manage multi-format documents (PDF, TXT)',
  },
  chunking: {
    title: 'Chunking Laboratory',
    subtitle: 'Evaluate Fixed-Size, Recursive Hierarchy, and Semantic Segmentation',
  },
  retrieval: {
    title: 'Retrieval Playground',
    subtitle: 'Interactive side-by-side search comparing BM25, Dense Vector, and Hybrid RRF',
  },
  rag: {
    title: 'AI Question Answering',
    subtitle: 'Grounded reasoning with Google Gemini, citation verification, and latency breakdown',
  },
  comparison: {
    title: 'Comparison Laboratory',
    subtitle: 'Exhaustive benchmark testing all 9 Chunking-Retrieval combinations (C1–C9)',
  },
  evaluation: {
    title: 'Evaluation Dashboard',
    subtitle: 'Quantify retrieval performance with Recall@K, Precision@K, and MRR metrics',
  },
  history: {
    title: 'Experiment History',
    subtitle: 'Persistent archive of experimental runs with JSON and CSV export capabilities',
  },
  settings: {
    title: 'Settings & Storage',
    subtitle: 'Configure Gemini API credentials, default hyperparameters, and local vector storage',
  },
};

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  isBackendHealthy,
  geminiKeySet,
  geminiModel,
  onRefresh,
  isRefreshing,
}) => {
  const { title, subtitle } = TAB_TITLES[currentTab];

  return (
    <header className="h-20 border-b border-slate-800 bg-[#0B0F19]/90 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          {title}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center space-x-3">
        {/* Backend Status */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isBackendHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="text-slate-300 font-mono text-[11px]">
            {isBackendHealthy ? 'API Active' : 'API Disconnected'}
          </span>
        </div>

        {/* Gemini Status */}
        <div
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs ${
            geminiKeySet
              ? 'bg-purple-950/40 border-purple-500/30 text-purple-300'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
          }`}
        >
          {geminiKeySet ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-mono text-[11px]">{geminiModel}</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px]">Gemini Key Needed</span>
            </>
          )}
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all disabled:opacity-50"
          title="Refresh Current Data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};
