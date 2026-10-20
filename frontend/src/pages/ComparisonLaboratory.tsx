import React, { useState, useEffect } from 'react';
import { DocumentBase, NineConfigComparisonResponse, ConfigurationResult } from '../types';
import { api } from '../services/api';
import {
  FlaskConical,
  Zap,
  Award,
  Layers,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sliders,
  BarChart2,
  FileText,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';

interface ComparisonLaboratoryProps {
  documents: DocumentBase[];
  selectedDocIds: string[];
}

export const ComparisonLaboratory: React.FC<ComparisonLaboratoryProps> = ({
  documents,
  selectedDocIds,
}) => {
  const [query, setQuery] = useState('What is the difference between supervised and unsupervised learning?');
  const [activeDocIds, setActiveDocIds] = useState<string[]>([]);
  const [topK, setTopK] = useState(3);
  const [expectedText, setExpectedText] = useState(
    'Supervised Learning: Algorithms are trained on labeled datasets containing pairs of input features and target ground-truth annotations'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<NineConfigComparisonResponse | null>(null);
  const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDocIds.length > 0) {
      setActiveDocIds(selectedDocIds);
    } else if (documents.length > 0 && activeDocIds.length === 0) {
      setActiveDocIds([documents[0].id]);
    }
  }, [documents, selectedDocIds]);

  const handleRunComparison = async () => {
    if (!query.trim()) {
      setError('Please enter a query.');
      return;
    }
    if (activeDocIds.length === 0) {
      setError('Please select a document.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await api.compareNine({
        query,
        document_ids: activeDocIds,
        top_k: topK,
        expected_relevant_text: expectedText.trim() ? expectedText.trim() : undefined,
      });
      setComparisonData(res);
    } catch (err: any) {
      setError(err.message || 'Comparison failed');
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = comparisonData?.configurations.map((c) => ({
    name: c.config_id,
    label: c.config_name,
    latency: c.retrieval_time_ms,
    recall: c.recall_at_k ?? 0,
    precision: c.precision_at_k ?? 0,
    mrr: c.mrr ?? 0,
  })) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Benchmark Controls Card */}
      <div className="p-6 rounded-3xl bg-[#0F172A]/90 border border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <FlaskConical className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold text-white">9-Configuration Matrix Laboratory (C1–C9)</h3>
          </div>

          <div className="text-xs font-mono text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            3 Chunking × 3 Retrieval Algorithms
          </div>
        </div>

        {/* Query Input */}
        <div>
          <label className="text-slate-400 text-xs block mb-1">Standardized Test Question:</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#080B12] border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 shadow-inner"
          />
        </div>

        {/* Expected Evidence Passage for Ground Truth Accuracy */}
        <div>
          <label className="text-slate-400 text-xs block mb-1">
            Optional Ground-Truth Passage Excerpt (for real Recall@K, Precision@K & MRR calculation):
          </label>
          <input
            type="text"
            value={expectedText}
            onChange={(e) => setExpectedText(e.target.value)}
            placeholder="Paste target excerpt to empirically measure retrieval relevance..."
            className="w-full bg-[#080B12] border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
          />
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Document:</span>
              <select
                value={activeDocIds[0] || ''}
                onChange={(e) => setActiveDocIds([e.target.value])}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.filename}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Top-K:</span>
              <select
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
              >
                <option value={1}>Top 1</option>
                <option value={3}>Top 3</option>
                <option value={5}>Top 5</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleRunComparison}
            disabled={isLoading || documents.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? <span className="animate-spin">⚙</span> : <Zap className="w-4 h-4" />}
            <span>{isLoading ? 'Benchmarking 9 Configs...' : 'Execute 9-Way Benchmark'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Comparison Results */}
      {comparisonData && (
        <div className="space-y-6">
          {/* Winner Highlights Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-blue-400 uppercase tracking-wider font-mono font-bold block mb-1">
                  Fastest Configuration
                </span>
                <span className="text-xl font-extrabold text-white">
                  {comparisonData.fastest_config}
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Lowest median query execution latency
                </span>
              </div>
              <Zap className="w-8 h-8 text-blue-400" />
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 to-slate-900 border border-purple-500/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-purple-400 uppercase tracking-wider font-mono font-bold block mb-1">
                  Highest Retrieval Recall
                </span>
                <span className="text-xl font-extrabold text-white">
                  {comparisonData.most_accurate_config || 'N/A (Provide ground-truth)'}
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Best matching of ground-truth passage
                </span>
              </div>
              <Award className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          {/* Latency Comparison Chart */}
          <div className="p-6 rounded-3xl bg-[#0F172A]/80 border border-slate-800 shadow-lg">
            <h4 className="text-xs font-semibold font-mono text-slate-400 mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-400" />
              QUERY EXECUTION LATENCY BY CONFIGURATION (MILLISECONDS)
            </h4>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="latency" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.name === comparisonData.fastest_config ? '#3b82f6' : '#8b5cf6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 9-Configuration Comparison Table */}
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A] overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-mono text-[11px]">
                  <th className="py-3.5 px-4">Config</th>
                  <th className="py-3.5 px-4">Chunking Method</th>
                  <th className="py-3.5 px-4">Retrieval Algorithm</th>
                  <th className="py-3.5 px-4">Chunks</th>
                  <th className="py-3.5 px-4">Latency (ms)</th>
                  {comparisonData.most_accurate_config && (
                    <>
                      <th className="py-3.5 px-4">Recall@K</th>
                      <th className="py-3.5 px-4">Precision@K</th>
                      <th className="py-3.5 px-4">MRR</th>
                    </>
                  )}
                  <th className="py-3.5 px-4 text-right">Passages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {comparisonData.configurations.map((cfg) => {
                  const isFastest = cfg.config_id === comparisonData.fastest_config;
                  const isBestAcc = cfg.config_id === comparisonData.most_accurate_config;
                  const isExpanded = expandedConfigId === cfg.config_id;

                  return (
                    <React.Fragment key={cfg.config_id}>
                      <tr
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isFastest ? 'bg-blue-950/15' : ''
                        } ${isBestAcc ? 'bg-purple-950/15' : ''}`}
                      >
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-slate-700">
                            {cfg.config_id}
                          </span>
                          {isFastest && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              Fastest
                            </span>
                          )}
                          {isBestAcc && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              Top Recall
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300 capitalize">{cfg.chunking_strategy}</td>
                        <td className="py-3 px-4 text-slate-300 uppercase">{cfg.retrieval_method}</td>
                        <td className="py-3 px-4 text-slate-400">{cfg.chunk_count}</td>
                        <td className="py-3 px-4 font-bold text-emerald-400">
                          {cfg.retrieval_time_ms} ms
                        </td>
                        {comparisonData.most_accurate_config && (
                          <>
                            <td className="py-3 px-4 text-slate-300 font-bold">
                              {cfg.recall_at_k !== null && cfg.recall_at_k !== undefined ? (cfg.recall_at_k * 100).toFixed(0) + '%' : '—'}
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {cfg.precision_at_k !== null && cfg.precision_at_k !== undefined ? (cfg.precision_at_k * 100).toFixed(0) + '%' : '—'}
                            </td>
                            <td className="py-3 px-4 text-purple-400 font-bold">
                              {cfg.mrr !== null && cfg.mrr !== undefined ? cfg.mrr.toFixed(2) : '—'}
                            </td>
                          </>
                        )}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() =>
                              setExpandedConfigId(isExpanded ? null : cfg.config_id)
                            }
                            className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Passages Preview */}
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={comparisonData.most_accurate_config ? 9 : 6}
                            className="p-4 bg-slate-900/90 border-b border-slate-800"
                          >
                            <div className="space-y-3 font-sans">
                              <span className="text-[11px] font-mono text-slate-400 block">
                                Top-{cfg.results.length} Retrieved Passages for {cfg.config_id} ({cfg.config_name}):
                              </span>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {cfg.results.map((r) => (
                                  <div
                                    key={r.id}
                                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between text-[10px] font-mono text-purple-400">
                                      <span>Rank #{r.rank}</span>
                                      <span>Score: {r.score}</span>
                                    </div>
                                    <p className="font-mono text-slate-300 text-[11px] line-clamp-4">
                                      {r.content}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
