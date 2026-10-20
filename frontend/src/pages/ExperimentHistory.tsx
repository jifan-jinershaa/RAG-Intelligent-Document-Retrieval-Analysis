import React, { useState, useEffect } from 'react';
import { ExperimentSummary } from '../types';
import { api } from '../services/api';
import {
  History,
  Trash2,
  Eye,
  Download,
  FileSpreadsheet,
  Clock,
  Layers,
  Award,
  Zap,
  X,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

export const ExperimentHistory: React.FC = () => {
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [selectedExp, setSelectedExp] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.listExperiments();
      setExperiments(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this experiment record?')) return;
    try {
      await api.deleteExperiment(id);
      fetchHistory();
      if (selectedExp?.id === id) setSelectedExp(null);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleOpenDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const data = await api.getExperiment(id);
      setSelectedExp(data);
    } catch (err: any) {
      alert(`Could not load experiment detail: ${err.message}`);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            Experimental Run Archive
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {experiments.length} runs
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Persistent records of multi-configuration benchmark runs and evaluation reports.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={isLoading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Refresh History"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Experiments List */}
      {experiments.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-[#0F172A]/40 border border-slate-800 text-slate-400 text-xs space-y-2">
          <FolderOpen className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="font-medium text-white">No experiments stored in database</p>
          <p>Run a benchmark in the Comparison Laboratory or Evaluation Dashboard to persist experiment results.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0F172A] shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-mono text-[11px]">
                <th className="py-3 px-4">Experiment Title</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Methodology</th>
                <th className="py-3 px-4">Best Config</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {experiments.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-200">
                    <div className="truncate max-w-sm" title={exp.title}>
                      {exp.title}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {new Date(exp.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    <span className="capitalize">{exp.chunking_strategy}</span> +{' '}
                    <span className="uppercase">{exp.retrieval_method}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-purple-400 font-bold">
                    {exp.metrics?.best_recall_config || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleOpenDetail(exp.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="View Detailed Results"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={api.getExportUrl(exp.id, 'csv')}
                        download
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors"
                        title="Download CSV"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={api.getExportUrl(exp.id, 'json')}
                        download
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition-colors"
                        title="Download JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Experiment Details Modal */}
      {selectedExp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0B0F19] border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <div>
                <h4 className="text-sm font-bold text-white">{selectedExp.title}</h4>
                <p className="text-[11px] font-mono text-slate-400">ID: {selectedExp.id}</p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={api.getExportUrl(selectedExp.id, 'csv')}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-emerald-300 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  CSV
                </a>
                <a
                  href={api.getExportUrl(selectedExp.id, 'json')}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-blue-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  JSON
                </a>
                <button
                  onClick={() => setSelectedExp(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-300 leading-relaxed space-y-4 bg-[#080B12]">
              <pre className="whitespace-pre-wrap font-mono text-[11px] bg-slate-950 p-4 rounded-2xl border border-slate-900">
                {JSON.stringify(selectedExp, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
