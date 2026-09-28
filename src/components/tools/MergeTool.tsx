import React, { useState } from 'react';
import { Upload, Trash2, ArrowUp, ArrowDown, FileText, CheckCircle2, Loader2, Download, Plus } from 'lucide-react';
import { mergePDFs, downloadFile } from '../../services/pdfOperations';
import { loadPdfDocument } from '../../services/pdfRenderer';
import { createSamplePdf } from '../../utils/samplePdfs';
import { Dropzone } from '../Dropzone';

interface MergeToolProps {
  onSelectSample?: (type: 'contract' | 'invoice' | 'report') => void;
}

interface MergeItem {
  id: string;
  name: string;
  size: number;
  bytes: Uint8Array;
  pageCount: number;
}

export const MergeTool: React.FC<MergeToolProps> = () => {
  const [files, setFiles] = useState<MergeItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputName, setOutputName] = useState('Merged_Document.pdf');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastMergedBytes, setLastMergedBytes] = useState<Uint8Array | null>(null);

  const handleFilesSelected = async (newFiles: File[]) => {
    const items: MergeItem[] = [];
    setErrorMessage(null);
    for (const f of newFiles) {
      if (f.type !== 'application/pdf' && !f.name.endsWith('.pdf')) continue;
      try {
        const buffer = await f.arrayBuffer();
        // Allocate a dedicated, standalone Uint8Array copy
        const bytes = new Uint8Array(buffer.byteLength);
        bytes.set(new Uint8Array(buffer));

        const doc = await loadPdfDocument(new Uint8Array(bytes));
        items.push({
          id: `${Date.now()}_${Math.random()}`,
          name: f.name,
          size: f.size,
          bytes,
          pageCount: doc.numPages,
        });
      } catch (err: any) {
        console.error('Error loading PDF:', err);
        setErrorMessage(`Failed to read "${f.name}": ${err.message || 'Corrupted or unreadable PDF'}`);
      }
    }
    setFiles((prev) => [...prev, ...items]);
    setSuccessMessage(null);
  };

  const handleLoadSample = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const sample1 = await createSamplePdf('contract');
      const sample2 = await createSamplePdf('invoice');

      const bytes1 = new Uint8Array(sample1.bytes.byteLength);
      bytes1.set(sample1.bytes);

      const bytes2 = new Uint8Array(sample2.bytes.byteLength);
      bytes2.set(sample2.bytes);

      const doc1 = await loadPdfDocument(bytes1);
      const doc2 = await loadPdfDocument(bytes2);

      const items: MergeItem[] = [
        {
          id: `sample_${Date.now()}_1`,
          name: sample1.name,
          size: sample1.bytes.byteLength,
          bytes: bytes1,
          pageCount: doc1.numPages,
        },
        {
          id: `sample_${Date.now()}_2`,
          name: sample2.name,
          size: sample2.bytes.byteLength,
          bytes: bytes2,
          pageCount: doc2.numPages,
        },
      ];
      setFiles((prev) => [...prev, ...items]);
      setSuccessMessage('Loaded 2 sample documents! Click "Merge & Download PDF" below to combine them.');
    } catch (err: any) {
      setErrorMessage(`Failed to load samples: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
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
    setErrorMessage(null);
    try {
      const mergedBytes = await mergePDFs(files.map((f) => ({ name: f.name, bytes: f.bytes })));
      setLastMergedBytes(mergedBytes);
      const filename = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`;
      downloadFile(mergedBytes, filename);
      setSuccessMessage(`Successfully merged ${files.length} documents into ${filename}!`);
    } catch (err: any) {
      setErrorMessage(`Merge failed: ${err.message}`);
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
          onSelectSample={handleLoadSample}
        />
      ) : (
        <div className="space-y-6">
          {/* File list */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800 text-xs text-slate-400">
              <span className="font-semibold text-slate-200">
                {files.length} Files Selected · {totalPages} Total Pages
              </span>
              <label className="cursor-pointer text-blue-400 hover:text-sky-300 font-medium flex items-center gap-1">
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
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
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
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/50 text-slate-400 hover:text-red-400 transition-colors"
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
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 w-full sm:w-64"
              />
            </div>

            <button
              onClick={handleMerge}
              disabled={files.length < 2 || isProcessing}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/50 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
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
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
              {lastMergedBytes && (
                <button
                  onClick={() => {
                    const filename = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`;
                    downloadFile(lastMergedBytes, filename);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download File Again
                </button>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
