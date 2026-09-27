import React, { useState } from 'react';
import { Upload, Trash2, ArrowUp, ArrowDown, FileText, CheckCircle2, Loader2, Download, Plus } from 'lucide-react';
import { mergePDFs, downloadFile } from '../../services/pdfOperations';
import { loadPdfDocument } from '../../services/pdfRenderer';
import { Dropzone } from '../Dropzone';

interface MergeToolProps {
  onSelectSample: (type: 'contract' | 'invoice' | 'report') => void;
}

interface MergeItem {
  id: string;
  name: string;
  size: number;
  bytes: Uint8Array;
  pageCount: number;
}

export const MergeTool: React.FC<MergeToolProps> = ({ onSelectSample }) => {
  const [files, setFiles] = useState<MergeItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputName, setOutputName] = useState('Merged_Document.pdf');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFilesSelected = async (newFiles: File[]) => {
    const items: MergeItem[] = [];
    for (const f of newFiles) {
      if (f.type !== 'application/pdf' && !f.name.endsWith('.pdf')) continue;
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      try {
        const doc = await loadPdfDocument(bytes);
        items.push({
          id: `${Date.now()}_${Math.random()}`,
          name: f.name,
          size: f.size,
          bytes,
          pageCount: doc.numPages,
        });
      } catch (err) {
        console.error('Error loading PDF:', err);
      }
    }
    setFiles((prev) => [...prev, ...items]);
    setSuccessMessage(null);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= files.length) return;
    const updated = [...files];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFiles(updated);
  };

  const removeItem = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);
    setSuccessMessage(null);
    try {
      const mergedBytes = await mergePDFs(files.map((f) => ({ name: f.name, bytes: f.bytes })));
      downloadFile(mergedBytes, outputName || 'Merged_Document.pdf');
      setSuccessMessage(`Successfully merged ${files.length} documents into ${outputName}!`);
    } catch (err: any) {
      alert(`Merge failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPages = files.reduce((acc, f) => acc + f.pageCount, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Merge PDF Files</h2>
        <p className="text-xs text-slate-400">
          Combine multiple PDFs into a single file in your desired order. 100% private, free, and watermark-free.
        </p>
      </div>

      {files.length === 0 ? (
        <Dropzone
          multiple
          title="Select or drop 2 or more PDF files to merge"
          subtitle="Files will be merged in the exact order you select"
          onFilesSelected={handleFilesSelected}
          onSelectSample={onSelectSample}
        />
      ) : (
        <div className="space-y-6">
          {/* File list */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800 text-xs text-slate-400">
              <span className="font-semibold text-slate-200">
                {files.length} Files Selected · {totalPages} Total Pages
              </span>
              <label className="cursor-pointer text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                Add more files
                <input
                  type="file"
                  multiple
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFilesSelected(Array.from(e.target.files));
                  }}
                />
              </label>
            </div>

            <div className="space-y-2">
              {files.map((file, idx) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-300">
                      {idx + 1}
                    </span>
                    <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{file.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {file.pageCount} page{file.pageCount > 1 ? 's' : ''} · {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveItem(idx, 'up')}
                      disabled={idx === 0}
                      title="Move up"
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveItem(idx, 'down')}
                      disabled={idx === files.length - 1}
                      title="Move down"
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeItem(file.id)}
                      title="Remove file"
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Merge Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Output File Name
              </label>
              <input
                type="text"
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 w-full sm:w-64"
              />
            </div>

            <button
              onClick={handleMerge}
              disabled={files.length < 2 || isProcessing}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Merging PDFs...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Merge & Download ({totalPages} Pages)
                </>
              )}
            </button>
          </div>

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {successMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
