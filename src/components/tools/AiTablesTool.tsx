import React, { useState } from 'react';
import { Table, Download, Loader2, FileText, Sparkles, Check, Copy } from 'lucide-react';
import { requestExtractTables } from '../../services/aiService';
import { extractTextFromPDF } from '../../services/pdfRenderer';
import { downloadFile } from '../../services/pdfOperations';
import { ExtractedTable } from '../../types';
import { Dropzone } from '../Dropzone';

interface AiTablesToolProps {
  onSelectSample: (type: 'contract' | 'invoice' | 'report') => void;
}

export const AiTablesTool: React.FC<AiTablesToolProps> = ({ onSelectSample }) => {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [tables, setTables] = useState<ExtractedTable[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTableIndex, setActiveTableIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    setFile({ name: f.name, bytes });
    setIsProcessing(true);
    setTables([]);

    try {
      const { fullText } = await extractTextFromPDF(bytes);
      const extracted = await requestExtractTables({ text: fullText });
      setTables(extracted);
      setActiveTableIndex(0);
    } catch (err: any) {
      alert(`Table extraction failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadCsv = (table: ExtractedTable) => {
    const blob = new Blob([table.csv], { type: 'text/csv;charset=utf-8' });
    downloadFile(blob, `${(table.title || 'Table').replace(/\s+/g, '_')}.csv`, 'text/csv');
  };

  const handleDownloadJson = (table: ExtractedTable) => {
    const jsonStr = JSON.stringify(table, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    downloadFile(blob, `${(table.title || 'Table').replace(/\s+/g, '_')}.json`, 'application/json');
  };

  const handleCopyCsv = (table: ExtractedTable) => {
    navigator.clipboard.writeText(table.csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeTable = tables[activeTableIndex];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Gemini 3.8 Flash
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">AI Table & Data Extractor</h2>
        <p className="text-xs text-slate-400">
          Automatically detect financial, scientific, and tabular data from documents and export to CSV or JSON.
        </p>
      </div>

      {!file ? (
        <Dropzone
          isAi
          title="Select a PDF containing tables or invoices"
          subtitle="Converts PDF tabular data into clean spreadsheets (CSV & JSON)"
          onFilesSelected={handleFileSelected}
          onSelectSample={onSelectSample}
        />
      ) : isProcessing ? (
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Extracting tables with Gemini...</p>
          <p className="text-xs text-slate-400">Parsing column boundaries, numbers, and headers.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-rose-400" />
              <span className="font-semibold text-white">{file.name}</span>
              <span className="text-slate-400">· {tables.length} table(s) found</span>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setTables([]);
              }}
              className="text-slate-400 hover:text-white"
            >
              Change PDF
            </button>
          </div>

          {tables.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400">
              No tabular structures could be detected in this document.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              {/* Table Tabs if multiple */}
              {tables.length > 1 && (
                <div className="flex items-center gap-2 p-3 border-b border-slate-800 bg-slate-950/60 overflow-x-auto no-scrollbar">
                  {tables.map((t, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTableIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        activeTableIndex === idx
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.title || `Table ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Table Header Action Bar */}
              {activeTable && (
                <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 text-xs">
                  <div>
                    <h3 className="text-sm font-bold text-white">{activeTable.title || 'Extracted Table'}</h3>
                    <p className="text-[11px] text-slate-400">
                      {activeTable.rows.length} Rows · {activeTable.headers.length} Columns
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyCsv(activeTable)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy CSV'}
                    </button>
                    <button
                      onClick={() => handleDownloadCsv(activeTable)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 text-xs shadow-md transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download CSV
                    </button>
                    <button
                      onClick={() => handleDownloadJson(activeTable)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 text-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      JSON
                    </button>
                  </div>
                </div>
              )}

              {/* Interactive Data Table */}
              {activeTable && (
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-950 text-slate-300 font-semibold sticky top-0 border-b border-slate-800 z-10">
                      <tr>
                        {activeTable.headers.map((h, i) => (
                          <th key={i} className="px-4 py-3 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
                      {activeTable.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-slate-800/40 transition-colors">
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="px-4 py-2.5 whitespace-nowrap">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
