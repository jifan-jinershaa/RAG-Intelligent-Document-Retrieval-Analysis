import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { api } from '../services/api';
import {
  Settings as SettingsIcon,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Cpu,
  Sparkles,
  Sliders,
  Save,
  RefreshCw
} from 'lucide-react';

interface SettingsPageProps {
  onSettingsUpdated: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onSettingsUpdated }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [defaultTopK, setDefaultTopK] = useState(5);
  const [fixedSize, setFixedSize] = useState(500);
  const [fixedOverlap, setFixedOverlap] = useState(50);
  const [recursiveSize, setRecursiveSize] = useState(500);
  const [recursiveOverlap, setRecursiveOverlap] = useState(50);
  const [semanticThreshold, setSemanticThreshold] = useState(0.65);
  const [rrfK, setRrfK] = useState(60);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setGeminiModel(data.gemini_model);
      setDefaultTopK(data.default_top_k);
      setFixedSize(data.default_fixed_size);
      setFixedOverlap(data.default_fixed_overlap);
      setRecursiveSize(data.default_recursive_size);
      setRecursiveOverlap(data.default_recursive_overlap);
      setSemanticThreshold(data.default_semantic_threshold);
      setRrfK(data.default_rrf_k);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const payload: Record<string, any> = {
        gemini_model: geminiModel,
        default_top_k: defaultTopK,
        default_fixed_size: fixedSize,
        default_fixed_overlap: fixedOverlap,
        default_recursive_size: recursiveSize,
        default_recursive_overlap: recursiveOverlap,
        default_semantic_threshold: semanticThreshold,
        default_rrf_k: rrfK,
      };
      if (geminiKeyInput.trim()) {
        payload.gemini_api_key = geminiKeyInput.trim();
      }

      await api.updateSettings(payload);
      setSaveSuccess(true);
      setGeminiKeyInput('');
      fetchSettings();
      onSettingsUpdated();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.testGemini();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ status: 'error', message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-purple-400" />
          System Settings & Storage Configuration
        </h3>
        <p className="text-xs text-slate-400">
          Manage AI credentials, default hyperparameter thresholds, and review local vector storage.
        </p>
      </div>

      {/* Gemini API Credentials Card */}
      <div className="p-6 rounded-3xl bg-[#0F172A]/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-4 h-4 text-purple-400" />
            <h4 className="text-sm font-bold text-white">Google Gemini API Credentials</h4>
          </div>

          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-mono border ${
              settings?.gemini_api_key_set
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            {settings?.gemini_api_key_set ? 'Key Configured' : 'Not Configured'}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              GEMINI_API_KEY (Stored securely in local SQLite / environment):
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder={
                  settings?.gemini_api_key_set
                    ? '•••••••••••••••••••••••••••• (Leave blank to keep current key)'
                    : 'Paste your Gemini API key (AIzaSy...)'
                }
                className="w-full bg-[#080B12] border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400">Gemini Model:</label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended)</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              </select>
            </div>

            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-purple-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{isTesting ? 'Testing...' : 'Test API Connection'}</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.status === 'success'
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Embedding Model Specs */}
      <div className="p-6 rounded-3xl bg-[#0F172A]/90 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Cpu className="w-4 h-4 text-blue-400" />
          <h4 className="text-sm font-bold text-white">Dense Vector Embedding Model</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">Architecture</span>
            <span className="text-slate-200 font-bold">all-MiniLM-L6-v2</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">Vector Dimensions</span>
            <span className="text-blue-400 font-bold">384-dimensional</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">Similarity Metric</span>
            <span className="text-emerald-400 font-bold">Cosine Similarity (Normalized)</span>
          </div>
        </div>
      </div>

      {/* Default Hyperparameters */}
      <div className="p-6 rounded-3xl bg-[#0F172A]/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-bold text-white">Default Hyperparameters</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Default Top-K:</label>
            <input
              type="number"
              value={defaultTopK}
              onChange={(e) => setDefaultTopK(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Fixed Chunk Size (chars):</label>
            <input
              type="number"
              value={fixedSize}
              onChange={(e) => setFixedSize(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Fixed Overlap (chars):</label>
            <input
              type="number"
              value={fixedOverlap}
              onChange={(e) => setFixedOverlap(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Recursive Chunk Size:</label>
            <input
              type="number"
              value={recursiveSize}
              onChange={(e) => setRecursiveSize(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Recursive Overlap:</label>
            <input
              type="number"
              value={recursiveOverlap}
              onChange={(e) => setRecursiveOverlap(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">RRF Fusion Constant (k):</label>
            <input
              type="number"
              value={rrfK}
              onChange={(e) => setRrfK(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          {saveSuccess ? (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Settings saved successfully!
            </span>
          ) : (
            <span />
          )}

          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Local Storage & Vector Store Info */}
      {settings?.storage_info && (
        <div className="p-6 rounded-3xl bg-[#0F172A]/90 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">Local Persistent Storage Information</h4>
          </div>

          <div className="space-y-2 text-xs font-mono text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">SQLite Database:</span>
              <span className="text-slate-200">{settings.storage_info.database_path}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Uploads Directory:</span>
              <span className="text-slate-200">{settings.storage_info.uploads_directory}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">ChromaDB Path:</span>
              <span className="text-slate-200">{settings.storage_info.chroma_directory}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Stored Files / Collections:</span>
              <span className="text-purple-400 font-bold">
                {settings.storage_info.total_uploaded_files} files / {settings.storage_info.chroma_entries} chroma entries
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
