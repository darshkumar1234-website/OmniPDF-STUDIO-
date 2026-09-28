import React, { useState } from 'react';
import { Scissors, Download, Loader2, CheckCircle2, FileText, RefreshCw } from 'lucide-react';
import { splitPDF, downloadFile, createZipDownload, parsePageRange } from '../../services/pdfOperations';
import { loadPdfDocument } from '../../services/pdfRenderer';
import { createSamplePdf } from '../../utils/samplePdfs';
import { Dropzone } from '../Dropzone';

interface SplitToolProps {
  onSelectSample?: (type: 'contract' | 'invoice' | 'report') => void;
}

export const SplitTool: React.FC<SplitToolProps> = () => {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array; pageCount: number } | null>(null);
  const [mode, setMode] = useState<'extract_selected' | 'split_ranges' | 'all_pages'>('extract_selected');
  const [rangeInput, setRangeInput] = useState('1');
  const [selectedPages, setSelectedPages] = useState<number[]>([0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer.byteLength);
      bytes.set(new Uint8Array(buffer));
      setErrorMessage(null);
      setSuccessMessage(null);
      const doc = await loadPdfDocument(new Uint8Array(bytes));
      setFile({ name: f.name, bytes, pageCount: doc.numPages });
      setRangeInput(`1-${Math.min(doc.numPages, 3)}`);
      setSelectedPages(Array.from({ length: Math.min(doc.numPages, 3) }, (_, i) => i));
    } catch (err: any) {
      setErrorMessage(`Could not load PDF: ${err.message}`);
    }
  };

  const handleLoadSample = async (type: 'contract' | 'invoice' | 'report' = 'contract') => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const sample = await createSamplePdf(type);
      const cleanBytes = new Uint8Array(sample.bytes.byteLength);
      cleanBytes.set(sample.bytes);
      const doc = await loadPdfDocument(new Uint8Array(cleanBytes));
      setFile({ name: sample.name, bytes: cleanBytes, pageCount: doc.numPages });
      setRangeInput(`1-${Math.min(doc.numPages, 2)}`);
      setSelectedPages(Array.from({ length: Math.min(doc.numPages, 2) }, (_, i) => i));
    } catch (err: any) {
      setErrorMessage(`Failed to load sample: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePageSelection = (pageIdx: number) => {
    let updated: number[];
    if (selectedPages.includes(pageIdx)) {
      updated = selectedPages.filter((p) => p !== pageIdx);
    } else {
      updated = [...selectedPages, pageIdx].sort((a, b) => a - b);
    }
    setSelectedPages(updated);
    setRangeInput(updated.map((p) => p + 1).join(', '));
  };

  const handleRangeInputChange = (val: string) => {
    setRangeInput(val);
    if (!file) return;
    const parsed = parsePageRange(val, file.pageCount);
    setSelectedPages(parsed);
  };

  const handleSplit = async () => {
    if (!file) return;
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      if (mode === 'all_pages') {
        const results = await splitPDF(file.bytes, '', 'all_pages');
        await createZipDownload(results, `${file.name.replace('.pdf', '')}_individual_pages.zip`);
        setSuccessMessage(`Separated into ${results.length} files and downloaded as ZIP!`);
      } else if (mode === 'extract_selected') {
        const results = await splitPDF(file.bytes, rangeInput, 'extract_selected');
        if (results.length > 0) {
          downloadFile(results[0].bytes, `${file.name.replace('.pdf', '')}_extracted.pdf`);
          setSuccessMessage(`Extracted ${selectedPages.length} pages into a new PDF!`);
        }
      } else {
        // split_ranges
        const results = await splitPDF(file.bytes, rangeInput, 'split_ranges');
        if (results.length === 1) {
          downloadFile(results[0].bytes, results[0].filename);
        } else {
          await createZipDownload(results, `${file.name.replace('.pdf', '')}_split_ranges.zip`);
        }
        setSuccessMessage(`Split into ${results.length} documents!`);
      }
    } catch (err: any) {
      setErrorMessage(`Split failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Split PDF</h2>
        <p className="text-xs text-slate-400">
          Extract specific pages, split into custom range chunks, or burst every page into separate files.
        </p>
      </div>

      {!file ? (
        <Dropzone
          title="Select a PDF to split"
          subtitle="Choose page ranges or burst into separate documents"
          onFilesSelected={handleFileSelected}
          onSelectSample={handleLoadSample}
        />
      ) : (
        <div className="space-y-6">
          {/* File Header */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm font-semibold text-white">{file.name}</p>
                <p className="text-xs text-slate-400">{file.pageCount} Total Pages</p>
              </div>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 transition-colors cursor-pointer"
            >
              Change File
            </button>
          </div>

          {/* Mode Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <label className="text-xs font-semibold text-slate-300 block">Choose Split Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'extract_selected',
                  title: 'Extract Selected Pages',
                  desc: 'Merge chosen pages into 1 new PDF',
                },
                {
                  id: 'split_ranges',
                  title: 'Split by Ranges',
                  desc: 'e.g. 1-2, 3-5 into separate files',
                },
                {
                  id: 'all_pages',
                  title: 'Burst All Pages',
                  desc: 'Every page becomes a separate PDF (ZIP)',
                },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as any)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    mode === m.id
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-semibold mb-1 text-white">{m.title}</p>
                  <p className="text-[11px] text-slate-400">{m.desc}</p>
                </button>
              ))}
            </div>

            {mode !== 'all_pages' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Page Ranges (e.g. "1-3, 5, 8")
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {selectedPages.length} of {file.pageCount} pages selected
                  </span>
                </div>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => handleRangeInputChange(e.target.value)}
                  placeholder="e.g. 1-3, 5"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />

                {/* Interactive Page Selector Chips */}
                <div className="mt-3 pt-3 border-t border-slate-800/80">
                  <p className="text-[11px] text-slate-400 mb-2">Or click pages to toggle:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                    {Array.from({ length: file.pageCount }, (_, i) => {
                      const isSelected = selectedPages.includes(i);
                      return (
                        <button
                          key={i}
                          onClick={() => togglePageSelection(i)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-950/50'
                              : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="flex items-center justify-end">
            <button
              onClick={handleSplit}
              disabled={isProcessing || (mode !== 'all_pages' && selectedPages.length === 0)}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/50 transition-all flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Splitting PDF...
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4" />
                  {mode === 'all_pages'
                    ? 'Download All Pages (ZIP)'
                    : `Extract & Download (${selectedPages.length} Pages)`}
                </>
              )}
            </button>
          </div>

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
