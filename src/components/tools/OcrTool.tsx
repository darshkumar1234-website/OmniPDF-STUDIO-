import React, { useState } from 'react';
import {
  ScanText,
  Copy,
  Download,
  Check,
  Loader2,
  Sparkles,
  FileText,
  ChevronLeft,
  ChevronRight,
  Globe,
  Cloud,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import { requestOCR } from '../../services/aiService';
import { loadPdfDocument, renderPageToCanvas } from '../../services/pdfRenderer';
import { convertTextToPDF, downloadFile } from '../../services/pdfOperations';
import { useAuth } from '../../context/AuthContext';
import { Dropzone } from '../Dropzone';

interface OcrToolProps {
  onSelectSample: (type: 'contract' | 'invoice' | 'report') => void;
}

const OCR_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect (Multi-Script)' },
  { code: 'English', name: 'English' },
  { code: 'Spanish', name: 'Spanish (Español)' },
  { code: 'French', name: 'French (Français)' },
  { code: 'German', name: 'German (Deutsch)' },
  { code: 'Japanese', name: 'Japanese (日本語)' },
  { code: 'Chinese (Simplified)', name: 'Chinese Simplified (简体中文)' },
  { code: 'Chinese (Traditional)', name: 'Chinese Traditional (繁體中文)' },
  { code: 'Arabic', name: 'Arabic (العربية)' },
  { code: 'Hindi', name: 'Hindi (हिन्दी)' },
  { code: 'Russian', name: 'Russian (Русский)' },
  { code: 'Portuguese', name: 'Portuguese (Português)' },
  { code: 'Italian', name: 'Italian (Italiano)' },
  { code: 'Korean', name: 'Korean (한국어)' },
  { code: 'Dutch', name: 'Dutch (Nederlands)' },
  { code: 'Turkish', name: 'Turkish (Türkçe)' },
];

export const OcrTool: React.FC<OcrToolProps> = ({ onSelectSample }) => {
  const { logAction } = useAuth();

  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');

  const [extractedText, setExtractedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const loadPdfPageAsImage = async (bytes: Uint8Array, pageNum: number) => {
    const doc = await loadPdfDocument(bytes);
    setTotalPages(doc.numPages);
    const canvas = await renderPageToCanvas(doc, pageNum, 2.0);
    const dataUrl = canvas.toDataURL('image/png');
    setSourceImage(dataUrl);
    return dataUrl;
  };

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFileName(f.name);
    setExtractedText('');
    setErrorMessage(null);
    setDownloadSuccess(null);

    if (f.type === 'application/pdf' || f.name.endsWith('.pdf')) {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setPdfBytes(bytes);
      setCurrentPage(1);
      const dataUrl = await loadPdfPageAsImage(bytes, 1);
      triggerOcr(dataUrl, f.name, selectedLanguage);
    } else {
      // Direct image (PNG, JPG, WebP)
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(f);
      });
      setPdfBytes(null);
      setTotalPages(1);
      setSourceImage(dataUrl);
      triggerOcr(dataUrl, f.name, selectedLanguage);
    }
  };

  const triggerOcr = async (imgDataUrl: string, nameToLog: string, lang: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await requestOCR(imgDataUrl, 'image/png', lang);
      setExtractedText(res.text);
      setDetectedLanguage(res.detectedLanguage || (lang !== 'auto' ? lang : 'Detected'));

      await logAction(
        'ocr',
        'Advanced Multi-Language OCR',
        nameToLog,
        'success',
        `Extracted ${res.text.split(/\s+/).filter(Boolean).length} words (${lang})`
      );
    } catch (err: any) {
      setErrorMessage(`OCR Extraction error: ${err.message}`);
      await logAction('ocr', 'Advanced Multi-Language OCR', nameToLog, 'failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setSelectedLanguage(newLang);
    if (sourceImage) {
      triggerOcr(sourceImage, fileName, newLang);
    }
  };

  const handlePageChange = async (newPage: number) => {
    if (!pdfBytes || newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    const dataUrl = await loadPdfPageAsImage(pdfBytes, newPage);
    triggerOcr(dataUrl, fileName, selectedLanguage);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const outName = `${fileName.replace(/\.[^/.]+$/, '')}_OCR_result.md`;
    const blob = new Blob([extractedText], { type: 'text/markdown;charset=utf-8' });
    downloadFile(blob, outName, 'text/markdown');
    setDownloadSuccess(`Downloaded Markdown file: ${outName}`);
    setTimeout(() => setDownloadSuccess(null), 6000);
  };

  const handleCreateSearchablePdf = async () => {
    setErrorMessage(null);
    try {
      const outName = `${fileName.replace(/\.[^/.]+$/, '')}_searchable.pdf`;
      const bytes = await convertTextToPDF(
        extractedText,
        `${fileName.replace(/\.[^/.]+$/, '')} (Searchable Digitized PDF)`
      );
      downloadFile(bytes, outName);
      setDownloadSuccess(`Downloaded Searchable PDF: ${outName}`);
      setTimeout(() => setDownloadSuccess(null), 6000);
    } catch (err: any) {
      setErrorMessage(`Searchable PDF creation failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-cyan-300 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Powered by Omni AI OCR Engine
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Advanced Multi-Language AI OCR</h2>
        <p className="text-xs text-slate-400">
          Accurately transcribe scanned PDF documents, invoices, receipts, and images with 100% precision. Create searchable PDFs, copy text, and download instantly.
        </p>
      </div>

      {!sourceImage ? (
        <Dropzone
          isAi
          accept=".pdf,application/pdf,image/*"
          title="Select or drop scanned PDF or image"
          subtitle="Supports multiple languages, printed documents, forms, receipts & clear handwriting"
          onFilesSelected={handleFilesSelected}
          onSelectSample={onSelectSample}
        />
      ) : (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-white truncate max-w-xs">{fileName}</span>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  {OCR_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || isProcessing}
                    className="disabled:opacity-30 p-0.5 hover:text-white cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-slate-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || isProcessing}
                    className="disabled:opacity-30 p-0.5 hover:text-white cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={!extractedText || isProcessing}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 font-medium disabled:opacity-40 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>

              <button
                onClick={handleDownloadTxt}
                disabled={!extractedText || isProcessing}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 font-medium disabled:opacity-40 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Markdown
              </button>

              <button
                onClick={handleCreateSearchablePdf}
                disabled={!extractedText || isProcessing}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-blue-950/50 disabled:opacity-40 cursor-pointer"
              >
                <FileCheck className="w-3.5 h-3.5" />
                Download Searchable PDF
              </button>

              <button
                onClick={() => {
                  setSourceImage(null);
                  setExtractedText('');
                  setDownloadSuccess(null);
                  setErrorMessage(null);
                }}
                className="text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
              >
                Change File
              </button>
            </div>
          </div>

          {downloadSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{downloadSuccess} — If your browser didn't save it automatically, click the download button above.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Side-by-Side View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Source Document Viewer */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <div className="text-xs font-semibold text-slate-400 mb-3 flex items-center justify-between">
                <span>Original Document Preview</span>
                <span className="text-[11px] text-slate-500">Page {currentPage} of {totalPages}</span>
              </div>
              <div className="aspect-[3/4] bg-slate-950 rounded-2xl overflow-auto p-3 flex items-center justify-center border border-slate-800/80">
                <img
                  src={sourceImage}
                  alt="Original Document"
                  className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                />
              </div>
            </div>

            {/* Extracted Text View */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col min-h-[550px]">
              <div className="text-xs font-semibold text-slate-400 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Omni AI Multi-Language OCR ({detectedLanguage || selectedLanguage})
                </span>
                {extractedText && (
                  <span className="text-[11px] text-slate-400">
                    {extractedText.split(/\s+/).filter(Boolean).length} Words Extracted
                  </span>
                )}
              </div>

              {isProcessing ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                  <p className="text-sm font-semibold text-white mb-1">
                    Digitizing Document with Omni AI...
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Recognizing characters, punctuation, tables, and script formatting in{' '}
                    <span className="text-sky-300 font-semibold">{selectedLanguage}</span>.
                  </p>
                </div>
              ) : (
                <div className="flex-1 bg-slate-950 rounded-2xl p-4 border border-slate-800/80 overflow-y-auto max-h-[550px] flex flex-col">
                  <textarea
                    value={extractedText}
                    onChange={(e) => setExtractedText(e.target.value)}
                    rows={22}
                    className="w-full flex-1 bg-transparent text-xs text-slate-200 font-mono leading-relaxed focus:outline-none resize-none"
                    placeholder="Extracted text will appear here..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
