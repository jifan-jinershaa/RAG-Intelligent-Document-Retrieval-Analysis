import React, { useState, useEffect } from 'react';
import { EvalDatasetDetail, EvaluationReport, ConfigEvalSummary } from '../types';
import { api } from '../services/api';
import {
  BarChart3,
  Award,
  Zap,
  TrendingUp,
  Download,
  Play,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';

export const EvaluationDashboard: React.FC = () => {
  const [datasets, setDatasets] = useState<EvalDatasetDetail[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [topK, setTopK] = useState(5);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDatasets = async () => {
    try {
      const data = await api.listDatasets();
      setDatasets(data);
      if (data.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(data[0].id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleRunEvaluation = async () => {
    if (!selectedDatasetId) {
      setError('Please select an evaluation dataset.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await api.runEvaluation({
        dataset_id: selectedDatasetId,
        top_k: topK,
      });
      setReport(res);
    } catch (err: any) {
      setError(err.message || 'Evaluation run failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Evaluation Control Header */}
      <div className="p-6 rounded-3xl bg-[#0F172A]/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Empirical Evaluation & Benchmarking</h3>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Ground-Truth Relevance Alignment
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Target Evaluation Dataset:</label>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.query_count} queries)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Evaluation Top-K:</label>
              <select
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              >
                <option value={3}>Top 3</option>
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunEvaluation}
              disabled={isLoading || datasets.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <span className="animate-spin">⚙</span> : <Play className="w-4 h-4" />}
              <span>{isLoading ? 'Running Benchmark...' : 'Run Dataset Benchmark'}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!report && !isLoading && (
        <div className="p-16 text-center rounded-3xl bg-[#0F172A]/40 border border-slate-800 space-y-3">
          <HelpCircle className="w-10 h-10 text-slate-500 mx-auto" />
          <h4 className="text-base font-bold text-white">No evaluation results available</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Run an experiment with labeled test questions above to calculate real Recall@K, Precision@K,
            MRR, and latency distribution charts across all 9 configurations.
          </p>
        </div>
      )}

      {/* Active Evaluation Report */}
      {report && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-500/30">
              <span className="text-[11px] font-mono text-purple-400 uppercase tracking-wider block mb-1">
                Best Recall@K
              </span>
              <span className="text-2xl font-black text-white font-mono">
                {report.best_recall_config}
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                Highest evidence coverage
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-500/30">
              <span className="text-[11px] font-mono text-blue-400 uppercase tracking-wider block mb-1">
                Best Precision@K
              </span>
              <span className="text-2xl font-black text-white font-mono">
                {report.best_precision_config}
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                Lowest retrieved noise
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30">
              <span className="text-[11px] font-mono text-indigo-400 uppercase tracking-wider block mb-1">
                Best Ranking Quality (MRR)
              </span>
              <span className="text-2xl font-black text-white font-mono">
                {report.best_mrr_config}
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                Highest first-match rank
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30">
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider block mb-1">
                Fastest Retrieval
              </span>
              <span className="text-2xl font-black text-white font-mono">
                {report.fastest_config}
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                Lowest query execution latency
              </span>
            </div>
          </div>

          {/* Export Bar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
            <div className="text-slate-300 font-medium">
              Benchmark Dataset: <strong className="text-white">{report.dataset_name}</strong> ({report.queries_evaluated} test questions)
            </div>

            <div className="flex items-center gap-2">
              <a
                href={api.getExportUrl(report.experiment_id, 'csv')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                download
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Export CSV
              </a>
              <a
                href={api.getExportUrl(report.experiment_id, 'json')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                download
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                Export JSON
              </a>
            </div>
          </div>

          {/* 6 RESEARCH CHARTS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1: Recall@K */}
            <div className="p-6 rounded-3xl bg-[#0F172A]/80 border border-slate-800">
              <h4 className="text-xs font-semibold font-mono text-slate-300 mb-4">
                CHART 1: RECALL@K COMPARISON (HIGHER IS BETTER)
              </h4>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.charts_data.recall_chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 1]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="recall" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Precision@K */}
            <div className="p-6 rounded-3xl bg-[#0F172A]/80 border border-slate-800">
              <h4 className="text-xs font-semibold font-mono text-slate-300 mb-4">
                CHART 2: PRECISION@K COMPARISON (HIGHER IS BETTER)
              </h4>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.charts_data.precision_chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 1]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="precision" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Mean Reciprocal Rank */}
            <div className="p-6 rounded-3xl bg-[#0F172A]/80 border border-slate-800">
              <h4 className="text-xs font-semibold font-mono text-slate-300 mb-4">
                CHART 3: MEAN RECIPROCAL RANK (MRR)
              </h4>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.charts_data.mrr_chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 1]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="mrr" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Retrieval Latency */}
            <div className="p-6 rounded-3xl bg-[#0F172A]/80 border border-slate-800">
              <h4 className="text-xs font-semibold font-mono text-slate-300 mb-4">
                CHART 4: RETRIEVAL QUERY LATENCY (MS)
              </h4>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.charts_data.latency_chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="latency_ms" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 5: Chunk Count Distribution */}
            <div className="p-6 rounded-3xl bg-[#0F172A]/80 border border-slate-800">
              <h4 className="text-xs font-semibold font-mono text-slate-300 mb-4">
                CHART 5: CHUNK COUNT GENERATED BY STRATEGY
              </h4>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.charts_data.chunk_distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="strategy" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="chunks" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 6: Quality vs Latency */}
            <div className="p-6 rounded-3xl bg-[#0F172A]/80 border border-slate-800">
              <h4 className="text-xs font-semibold font-mono text-slate-300 mb-4">
                CHART 6: QUALITY VS LATENCY TRADE-OFF (MRR vs MS)
              </h4>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" dataKey="latency" name="Latency (ms)" stroke="#64748b" fontSize={11} unit="ms" />
                    <YAxis type="number" dataKey="mrr" name="MRR" stroke="#64748b" fontSize={11} domain={[0, 1]} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Scatter name="Configurations" data={report.charts_data.quality_vs_latency} fill="#a855f7" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Full Summary Table */}
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A] overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 text-[11px]">
                  <th className="py-3 px-4">Config ID</th>
                  <th className="py-3 px-4">Chunking Strategy</th>
                  <th className="py-3 px-4">Retrieval Method</th>
                  <th className="py-3 px-4">Recall@K</th>
                  <th className="py-3 px-4">Precision@K</th>
                  <th className="py-3 px-4">MRR</th>
                  <th className="py-3 px-4">Median Latency</th>
                  <th className="py-3 px-4">Chunks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {report.summary_by_config.map((s) => (
                  <tr key={s.config_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-white">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-slate-700">
                        {s.config_id}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 capitalize">{s.chunking_strategy}</td>
                    <td className="py-2.5 px-4 text-slate-300 uppercase">{s.retrieval_method}</td>
                    <td className="py-2.5 px-4 font-bold text-purple-400">
                      {(s.avg_recall_at_k * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">
                      {(s.avg_precision_at_k * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-4 text-emerald-400 font-bold">
                      {s.mrr.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-4 text-blue-400 font-bold">
                      {s.median_retrieval_latency_ms} ms
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">{s.chunk_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
