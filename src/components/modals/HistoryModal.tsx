import React, { useState } from 'react';
import {
  X,
  History,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const HistoryModal: React.FC = () => {
  const { isHistoryOpen, setIsHistoryOpen, operations, clearHistory } = useAuth();
  const [search, setSearch] = useState('');
  const [filterTool, setFilterTool] = useState<string>('all');

  if (!isHistoryOpen) return null;

  const filtered = operations.filter((op) => {
    const matchesSearch =
      op.fileName.toLowerCase().includes(search.toLowerCase()) ||
      op.toolName.toLowerCase().includes(search.toLowerCase()) ||
      op.details.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterTool === 'all' || op.toolId === filterTool;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">PDF Operations History</h2>
              <p className="text-xs text-slate-400">
                Audited timeline of document transformations, conversions & AI extractions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {operations.length > 0 && (
              <button
                onClick={clearHistory}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/50 text-slate-400 hover:text-red-400 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear History
              </button>
            )}
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="py-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history by file or tool..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <select
            value={filterTool}
            onChange={(e) => setFilterTool(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
          >
            <option value="all">All Tools</option>
            <option value="ocr">AI OCR</option>
            <option value="ai-summarize">AI Summarize</option>
            <option value="ai-chat">AI Chat</option>
            <option value="merge">Merge PDF</option>
            <option value="split">Split PDF</option>
            <option value="organize">Organize</option>
            <option value="compress">Compress</option>
            <option value="vault">Cloud Vault</option>
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center">
              <History className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-300 mb-1">No operations recorded yet</p>
              <p className="text-xs max-w-sm text-slate-500">
                Any tool you run (OCR, Summarizer, Merge, Split, etc.) will automatically log its audit record here.
              </p>
            </div>
          ) : (
            filtered.map((op) => (
              <div
                key={op.id}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      op.status === 'success'
                        ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40'
                        : 'bg-red-950/50 text-red-400 border border-red-800/40'
                    }`}
                  >
                    {op.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{op.toolName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {op.fileName}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">{op.details}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(op.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
