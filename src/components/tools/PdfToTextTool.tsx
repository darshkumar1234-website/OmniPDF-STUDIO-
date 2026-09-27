import React, { useState } from 'react';
import { FileText, Copy, Download, Search, Check, Loader2 } from 'lucide-react';
import { extractTextFromPDF } from '../../services/pdfRenderer';
import { downloadFile } from '../../services/pdfOperations';
import { Dropzone } from '../Dropzone';

interface PdfToTextToolProps {
  onSelectSample: (type: 'contract' | 'invoice' | 'report') => void;
}

export const PdfToTextTool: React.FC<PdfToTextToolProps> = ({ onSelectSample }) => {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [extractedData, setExtractedData] = useState<{
    fullText: string;
    pages: { pageNum: number; text: string }[];
  } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    setFile({ name: f.name, bytes });
    setIsExtracting(true);
    try {
      const data = await extractTextFromPDF(bytes);
      setExtractedData(data);
    } catch (err: any) {
      alert(`Text extraction failed: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopy = () => {
    if (!extractedData) return;
    navigator.clipboard.writeText(extractedData.fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = (format: 'txt' | 'md') => {
    if (!file || !extractedData) return;
    const blob = new Blob([extractedData.fullText], { type: 'text/plain;charset=utf-8' });
    downloadFile(blob, `${file.name.replace('.pdf', '')}_extracted.${format}`, 'text/plain');
  };

  const wordsCount = extractedData?.fullText.split(/\s+/).filter(Boolean).length || 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">PDF to Plain Text</h2>
        <p className="text-xs text-slate-400">
          Extract text content instantly in-browser. Zero delay, fully private, ready to copy or download.
        </p>
      </div>

      {!file ? (
        <Dropzone
          title="Select a PDF to extract text"
          subtitle="Instant client-side extraction with word counts and page tags"
          onFilesSelected={handleFileSelected}
          onSelectSample={onSelectSample}
        />
      ) : isExtracting ? (
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto mb-3" />
          <p className="text-xs text-slate-400">Extracting document text...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-rose-400" />
              <span className="font-semibold text-white">{file.name}</span>
              <span className="text-slate-400">
                · {wordsCount} words · {extractedData?.pages.length || 0} pages
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy All'}
              </button>
              <button
                onClick={() => handleDownloadTxt('txt')}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                Download TXT
              </button>
              <button
                onClick={() => {
                  setFile(null);
                  setExtractedData(null);
                }}
                className="text-slate-400 hover:text-white px-2 py-1"
              >
                Change PDF
              </button>
            </div>
          </div>

          {/* Search within extracted text */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search extracted text..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Extracted Text View */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-h-[500px] overflow-y-auto space-y-6 font-mono text-xs leading-relaxed text-slate-300">
            {extractedData?.pages.map((p) => {
              if (searchQuery && !p.text.toLowerCase().includes(searchQuery.toLowerCase())) {
                return null;
              }
              return (
                <div key={p.pageNum} className="pb-4 border-b border-slate-800/80 last:border-b-0">
                  <div className="text-[11px] font-sans font-bold text-rose-400 mb-2 uppercase tracking-wider">
                    Page {p.pageNum}
                  </div>
                  <p className="whitespace-pre-wrap">{p.text || '(No text found on this page)'}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
