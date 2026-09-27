import React, { useState } from 'react';
import {
  X,
  Cloud,
  FileText,
  Download,
  Trash2,
  Upload,
  ExternalLink,
  Search,
  Sparkles,
  Calendar,
  Layers,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { downloadFile } from '../../services/pdfOperations';
import { CloudFile, ToolId } from '../../types';

interface VaultModalProps {
  onOpenToolWithFile?: (toolId: ToolId, file: { name: string; bytes: Uint8Array }) => void;
}

export const VaultModal: React.FC<VaultModalProps> = ({ onOpenToolWithFile }) => {
  const { isVaultOpen, setIsVaultOpen, cloudFiles, deleteFileFromCloud, saveFileToCloud, user } =
    useAuth();
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);

  if (!isVaultOpen) return null;

  const filtered = cloudFiles.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownload = (file: CloudFile) => {
    if (!file.dataBase64) return;
    try {
      const binary = atob(file.dataBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      downloadFile(bytes, file.name);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleOpenInTool = (file: CloudFile, toolId: ToolId) => {
    if (!file.dataBase64 || !onOpenToolWithFile) return;
    try {
      const binary = atob(file.dataBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      onOpenToolWithFile(toolId, { name: file.name, bytes });
      setIsVaultOpen(false);
    } catch (err) {
      console.error('Open error:', err);
    }
  };

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const f = e.target.files[0];
    setUploading(true);
    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      await saveFileToCloud({
        name: f.name,
        bytes,
        pageCount: 1,
      });
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Personal Cloud Storage</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Encrypted & Private
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Securely stored PDF documents linked to {user?.email || 'your account'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors">
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              Upload PDF
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                disabled={uploading}
                onChange={handleDirectUpload}
              />
            </label>
            <button
              onClick={() => setIsVaultOpen(false)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="pt-4 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your saved documents..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center">
              <Cloud className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-300 mb-1">No files in cloud storage yet</p>
              <p className="text-xs max-w-sm text-slate-500 mb-4">
                When you process files in any tool, click "Save to Cloud" to keep them permanently secure in your personal vault.
              </p>
            </div>
          ) : (
            filtered.map((file) => (
              <div
                key={file.id}
                className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                      {file.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(file.createdAt).toLocaleDateString()}
                      </span>
                      {file.pageCount && file.pageCount > 0 && (
                        <>
                          <span>·</span>
                          <span>{file.pageCount} page{file.pageCount > 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                    {file.summary && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-1 font-mono">
                        {file.summary}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {onOpenToolWithFile && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenInTool(file, 'ai-summarize')}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-800 flex items-center gap-1"
                        title="Analyze with AI Summarizer"
                      >
                        <Sparkles className="w-3 h-3 text-rose-400" />
                        Summarize
                      </button>
                      <button
                        onClick={() => handleOpenInTool(file, 'ocr')}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-800 flex items-center gap-1"
                        title="Extract with OCR"
                      >
                        OCR
                      </button>
                      <button
                        onClick={() => handleOpenInTool(file, 'organize')}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-800 flex items-center gap-1"
                        title="Organize Pages"
                      >
                        <Layers className="w-3 h-3" />
                        Edit
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => handleDownload(file)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteFileFromCloud(file.id)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"
                    title="Delete File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
