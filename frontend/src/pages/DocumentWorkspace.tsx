import React, { useState, useRef } from 'react';
import { DocumentBase, DocumentDetail } from '../types';
import { api } from '../services/api';
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  HardDrive,
  FileCheck,
  X,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';

interface DocumentWorkspaceProps {
  documents: DocumentBase[];
  selectedDocIds: string[];
  onToggleSelectDoc: (id: string) => void;
  onRefreshDocs: () => void;
}

export const DocumentWorkspace: React.FC<DocumentWorkspaceProps> = ({
  documents,
  selectedDocIds,
  onToggleSelectDoc,
  onRefreshDocs,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentDetail | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.name.endsWith('.pdf') && !file.name.endsWith('.txt')) {
          throw new Error(`File ${file.name} is not a PDF or TXT.`);
        }
        await api.uploadDocument(file);
      }
      onRefreshDocs();
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading document');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDelete = async (docId: string, filename: string) => {
    if (!window.confirm(`Delete document "${filename}" and all its chunking indexes?`)) return;
    try {
      await api.deleteDocument(docId);
      onRefreshDocs();
      if (previewDoc?.id === docId) setPreviewDoc(null);
    } catch (err: any) {
      alert(`Failed to delete document: ${err.message}`);
    }
  };

  const handleOpenPreview = async (docId: string) => {
    setIsLoadingPreview(true);
    try {
      const detail = await api.getDocument(docId);
      setPreviewDoc(detail);
    } catch (err: any) {
      alert(`Could not load preview: ${err.message}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Upload Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
          dragActive
            ? 'border-purple-500 bg-purple-950/20'
            : 'border-slate-800 bg-[#0F172A]/60 hover:border-slate-700 hover:bg-[#0F172A]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400">
            {isUploading ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>
          <div className="text-sm font-semibold text-white">
            {isUploading ? 'Extracting & Ingesting Documents...' : 'Drop PDF or TXT files here, or click to browse'}
          </div>
          <p className="text-xs text-slate-400 max-w-md">
            PyMuPDF parses PDF structures and preserves page numbers. Scanned image-only PDFs without a text layer are identified.
          </p>
        </div>
      </div>

      {uploadError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Document Management Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            Document Repository
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {documents.length}
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Select documents to include them in experimental chunking and multi-strategy retrieval runs.
          </p>
        </div>

        <div className="text-xs text-slate-400">
          Selected for experiments:{' '}
          <span className="text-purple-400 font-semibold font-mono">
            {selectedDocIds.length} / {documents.length}
          </span>
        </div>
      </div>

      {/* Documents Table */}
      {documents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0F172A]/40 border border-slate-800 text-slate-400 text-sm">
          No documents uploaded yet. Upload a PDF or TXT document above to begin experiments.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0F172A]/80 shadow-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-mono text-[11px]">
                <th className="py-3 px-4 w-12 text-center">Include</th>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Pages</th>
                <th className="py-3 px-4">Characters</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {documents.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <tr
                    key={doc.id}
                    className={`hover:bg-slate-800/30 transition-colors ${
                      isSelected ? 'bg-purple-950/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelectDoc(doc.id)}
                        className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="truncate max-w-xs" title={doc.filename}>
                          {doc.filename}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{doc.file_type}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {formatFileSize(doc.file_size)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{doc.page_count}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {doc.char_count.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {doc.status === 'ready' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                          <CheckCircle className="w-3 h-3" /> Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                          <AlertTriangle className="w-3 h-3" /> Scanned / Empty
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenPreview(doc.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Preview Extracted Text"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.filename)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Modal / Drawer */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0B0F19] border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <FileCheck className="w-5 h-5 text-purple-400" />
                <div>
                  <h4 className="text-sm font-bold text-white truncate max-w-md">
                    {previewDoc.filename}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {previewDoc.page_count} Pages · {previewDoc.char_count} Characters
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyText(previewDoc.preview_text || '')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
                >
                  {copiedPreview ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPreview ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-[#080B12]">
              {previewDoc.preview_text || 'No text extracted from this document.'}
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/40 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Path: {previewDoc.file_path}</span>
              <span>Status: {previewDoc.status}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
