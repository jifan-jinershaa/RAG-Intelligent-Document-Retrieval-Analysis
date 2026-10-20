import React, { useState, useEffect } from 'react';
import { DocumentBase, ChunkingResponse, ChunkingComparisonResponse, ChunkItem } from '../types';
import { api } from '../services/api';
import {
  Scissors,
  Layers,
  Sparkles,
  Sliders,
  Copy,
  Check,
  Search,
  BarChart2,
  FileText,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

interface ChunkingLaboratoryProps {
  documents: DocumentBase[];
  selectedDocIds: string[];
}

export const ChunkingLaboratory: React.FC<ChunkingLaboratoryProps> = ({
  documents,
  selectedDocIds,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'compare'>('single');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [strategy, setStrategy] = useState<'fixed' | 'recursive' | 'semantic'>('recursive');

  // Parameters
  const [fixedSize, setFixedSize] = useState(500);
  const [fixedOverlap, setFixedOverlap] = useState(50);
  const [recursiveSize, setRecursiveSize] = useState(500);
  const [recursiveOverlap, setRecursiveOverlap] = useState(50);
  const [semanticThreshold, setSemanticThreshold] = useState(0.65);
  const [semanticMin, setSemanticMin] = useState(200);
  const [semanticMax, setSemanticMax] = useState(1000);

  // Results
  const [singleResult, setSingleResult] = useState<ChunkingResponse | null>(null);
  const [compareResult, setCompareResult] = useState<ChunkingComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Initialize selected document
  useEffect(() => {
    if (!selectedDocId && documents.length > 0) {
      if (selectedDocIds.length > 0) {
        setSelectedDocId(selectedDocIds[0]);
      } else {
        setSelectedDocId(documents[0].id);
      }
    }
  }, [documents, selectedDocIds, selectedDocId]);

  const handleRunChunking = async () => {
    if (!selectedDocId) {
      setError('Please select a document first.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      if (activeTab === 'single') {
        const res = await api.processChunking({
          document_ids: [selectedDocId],
          strategy,
          chunk_size: strategy === 'fixed' ? fixedSize : recursiveSize,
          chunk_overlap: strategy === 'fixed' ? fixedOverlap : recursiveOverlap,
          similarity_threshold: semanticThreshold,
          min_chunk_size: semanticMin,
          max_chunk_size: semanticMax,
        });
        setSingleResult(res);
      } else {
        const comp = await api.compareChunking({
          document_id: selectedDocId,
          fixed_size: fixedSize,
          fixed_overlap: fixedOverlap,
          recursive_size: recursiveSize,
          recursive_overlap: recursiveOverlap,
          semantic_threshold: semanticThreshold,
        });
        setCompareResult(comp);
      }
    } catch (err: any) {
      setError(err.message || 'Chunking failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyChunk = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredChunks = singleResult?.chunks.filter((c) =>
    c.content.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'single'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Interactive Chunk Generator
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'compare'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            3-Way Side-by-Side Comparison
          </button>
        </div>

        {/* Selected Document Dropdown */}
        <div className="flex items-center space-x-3 text-xs">
          <span className="text-slate-400">Target Document:</span>
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 focus:border-purple-500 focus:outline-none"
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.filename} ({d.file_type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Control Panel Card */}
      <div className="p-6 rounded-3xl bg-[#0F172A]/80 border border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Algorithm & Hyperparameters</h3>
          </div>

          <button
            onClick={handleRunChunking}
            disabled={isLoading || documents.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? <span className="animate-spin">⚙</span> : <Scissors className="w-4 h-4" />}
            <span>{isLoading ? 'Executing Chunking...' : 'Generate Chunks'}</span>
          </button>
        </div>

        {activeTab === 'single' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Strategy Selectors */}
            <div
              onClick={() => setStrategy('fixed')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                strategy === 'fixed'
                  ? 'bg-purple-950/30 border-purple-500/50 text-white'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-sm text-slate-200 mb-1">Fixed-Size Chunking</div>
              <p className="text-[11px] text-slate-400">
                Rigid character stride without linguistic awareness. Rapid, deterministic baseline.
              </p>
            </div>

            <div
              onClick={() => setStrategy('recursive')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                strategy === 'recursive'
                  ? 'bg-purple-950/30 border-purple-500/50 text-white'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-sm text-slate-200 mb-1">Recursive Hierarchy</div>
              <p className="text-[11px] text-slate-400">
                Splits along paragraphs, newlines, and sentences to preserve grammatical flow.
              </p>
            </div>

            <div
              onClick={() => setStrategy('semantic')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                strategy === 'semantic'
                  ? 'bg-purple-950/30 border-purple-500/50 text-white'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-sm text-slate-200 mb-1">Semantic Segmentation</div>
              <p className="text-[11px] text-slate-400">
                Uses sentence embeddings to detect topic shifts when cosine distance drops.
              </p>
            </div>
          </div>
        )}

        {/* Hyperparameter Inputs */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {(activeTab === 'compare' || strategy === 'fixed') && (
            <div>
              <label className="text-slate-400 block mb-1">Fixed Size (chars):</label>
              <input
                type="number"
                value={fixedSize}
                onChange={(e) => setFixedSize(Number(e.target.value))}
                min={100}
                max={2000}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
          )}

          {(activeTab === 'compare' || strategy === 'fixed') && (
            <div>
              <label className="text-slate-400 block mb-1">Fixed Overlap (chars):</label>
              <input
                type="number"
                value={fixedOverlap}
                onChange={(e) => setFixedOverlap(Number(e.target.value))}
                min={0}
                max={fixedSize - 1}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
          )}

          {(activeTab === 'compare' || strategy === 'recursive') && (
            <div>
              <label className="text-slate-400 block mb-1">Recursive Chunk Size:</label>
              <input
                type="number"
                value={recursiveSize}
                onChange={(e) => setRecursiveSize(Number(e.target.value))}
                min={100}
                max={2000}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
          )}

          {(activeTab === 'compare' || strategy === 'recursive') && (
            <div>
              <label className="text-slate-400 block mb-1">Recursive Overlap:</label>
              <input
                type="number"
                value={recursiveOverlap}
                onChange={(e) => setRecursiveOverlap(Number(e.target.value))}
                min={0}
                max={recursiveSize - 1}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
          )}

          {(activeTab === 'compare' || strategy === 'semantic') && (
            <div>
              <label className="text-slate-400 block mb-1">Similarity Threshold (0-1):</label>
              <input
                type="number"
                step="0.05"
                value={semanticThreshold}
                onChange={(e) => setSemanticThreshold(Number(e.target.value))}
                min={0.1}
                max={0.95}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
          )}

          {(activeTab === 'compare' || strategy === 'semantic') && (
            <div>
              <label className="text-slate-400 block mb-1">Semantic Min Chars:</label>
              <input
                type="number"
                value={semanticMin}
                onChange={(e) => setSemanticMin(Number(e.target.value))}
                min={50}
                max={500}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SINGLE VIEW: Statistics & Chunks Visualization */}
      {activeTab === 'single' && singleResult && (
        <div className="space-y-6">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Total Chunks</span>
              <span className="text-2xl font-bold font-mono text-purple-400">
                {singleResult.stats.total_chunks}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Avg Length</span>
              <span className="text-2xl font-bold font-mono text-blue-400">
                {singleResult.stats.avg_length} c
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Min Length</span>
              <span className="text-2xl font-bold font-mono text-slate-200">
                {singleResult.stats.min_length} c
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Max Length</span>
              <span className="text-2xl font-bold font-mono text-slate-200">
                {singleResult.stats.max_length} c
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Execution Latency</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {singleResult.indexing_time_ms} ms
              </span>
            </div>
          </div>

          {/* Histogram Chart */}
          <div className="p-6 rounded-3xl bg-[#0F172A]/70 border border-slate-800">
            <h4 className="text-xs font-semibold font-mono text-slate-400 mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-400" />
              CHUNK SIZE DISTRIBUTION (CHARACTERS)
            </h4>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={singleResult.stats.length_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="range" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chunks Cards List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">
                Generated Chunks ({filteredChunks.length})
              </h4>
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search within chunks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredChunks.map((chunk) => {
                const isExpanded = expandedId === chunk.id;
                const isCopied = copiedId === chunk.id;

                return (
                  <div
                    key={chunk.id}
                    className="p-5 rounded-2xl bg-[#0B0F19] border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono text-[10px]">
                            Chunk #{chunk.chunk_index + 1}
                          </span>
                          {chunk.page_number && (
                            <span className="text-slate-400 text-[11px]">
                              Page {chunk.page_number}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                          <span>{chunk.char_count} chars</span>
                          <span>·</span>
                          <span>{chunk.word_count} words</span>
                        </div>
                      </div>

                      <div
                        className={`font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap ${
                          isExpanded ? '' : 'line-clamp-4'
                        }`}
                      >
                        {chunk.content}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : chunk.id)}
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" /> Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" /> Expand chunk
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleCopyChunk(chunk.id, chunk.content)}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3-WAY COMPARISON VIEW */}
      {activeTab === 'compare' && compareResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Fixed */}
            <div className="p-5 rounded-3xl bg-[#0F172A]/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-bold text-white text-sm">Fixed-Size Chunking</h4>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {compareResult.fixed.chunks.length} chunks
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div>Avg Length: <span className="text-white font-mono">{compareResult.fixed.stats.avg_length} c</span></div>
                <div>Indexing Time: <span className="text-emerald-400 font-mono">{compareResult.fixed.indexing_time_ms} ms</span></div>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {compareResult.fixed.chunks.slice(0, 5).map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-[10px] font-mono text-purple-400 block mb-1">Chunk #{c.chunk_index + 1} ({c.char_count} c)</span>
                    <p className="text-slate-300 font-mono text-[11px] line-clamp-3">{c.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recursive */}
            <div className="p-5 rounded-3xl bg-[#0F172A]/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-bold text-white text-sm">Recursive Hierarchy</h4>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {compareResult.recursive.chunks.length} chunks
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div>Avg Length: <span className="text-white font-mono">{compareResult.recursive.stats.avg_length} c</span></div>
                <div>Indexing Time: <span className="text-emerald-400 font-mono">{compareResult.recursive.indexing_time_ms} ms</span></div>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {compareResult.recursive.chunks.slice(0, 5).map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-[10px] font-mono text-purple-400 block mb-1">Chunk #{c.chunk_index + 1} ({c.char_count} c)</span>
                    <p className="text-slate-300 font-mono text-[11px] line-clamp-3">{c.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Semantic */}
            <div className="p-5 rounded-3xl bg-[#0F172A]/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-bold text-white text-sm">Semantic Segmentation</h4>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  {compareResult.semantic.chunks.length} chunks
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div>Avg Length: <span className="text-white font-mono">{compareResult.semantic.stats.avg_length} c</span></div>
                <div>Indexing Time: <span className="text-emerald-400 font-mono">{compareResult.semantic.indexing_time_ms} ms</span></div>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {compareResult.semantic.chunks.slice(0, 5).map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-[10px] font-mono text-purple-400 block mb-1">Chunk #{c.chunk_index + 1} ({c.char_count} c)</span>
                    <p className="text-slate-300 font-mono text-[11px] line-clamp-3">{c.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
