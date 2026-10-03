import React, { useState } from 'react';
import { Languages, Download, Loader2, Copy, Check, FileText, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { requestTranslation } from '../../services/aiService';
import { extractTextFromPDF } from '../../services/pdfRenderer';
import { convertTextToPDF, downloadFile } from '../../services/pdfOperations';
import { Dropzone } from '../Dropzone';

interface AiTranslateToolProps {
  onSelectSample: (type: 'contract' | 'invoice' | 'report') => void;
}

const LANGUAGES = [
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Japanese',
  'Chinese (Simplified)',
  'Chinese (Traditional)',
  'Korean',
  'Arabic',
  'Hindi',
  'Russian',
  'Dutch',
  'Polish',
  'Turkish',
  'Swedish',
  'Vietnamese',
  'Thai',
  'Indonesian',
  'Greek',
  'Hebrew',
];

export const AiTranslateTool: React.FC<AiTranslateToolProps> = ({ onSelectSample }) => {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('Spanish');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [lastTranslatedPdfBytes, setLastTranslatedPdfBytes] = useState<Uint8Array | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    setFile({ name: f.name, bytes });
    setTranslatedText('');
    setErrorMessage(null);
    setDownloadSuccess(null);

    try {
      const { fullText } = await extractTextFromPDF(bytes);
      setSourceText(fullText);
      performTranslation(fullText, targetLanguage);
    } catch (err: any) {
      setErrorMessage(`Text extraction failed: ${err.message}`);
    }
  };

  const performTranslation = async (text: string, lang: string) => {
    setIsTranslating(true);
    setErrorMessage(null);
    try {
      const result = await requestTranslation(text, lang);
      setTranslatedText(result);
    } catch (err: any) {
      setErrorMessage(`Translation error: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setTargetLanguage(newLang);
    if (sourceText) {
      performTranslation(sourceText, newLang);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    setErrorMessage(null);
    try {
      const bytes = await convertTextToPDF(
        translatedText,
        `${file?.name.replace('.pdf', '')} (${targetLanguage} Translation)`
      );
      setLastTranslatedPdfBytes(bytes);
      const outName = `${file?.name.replace('.pdf', '')}_${targetLanguage}.pdf`;
      downloadFile(bytes, outName);
      setDownloadSuccess(`Downloaded translated PDF: ${outName}!`);
      setTimeout(() => setDownloadSuccess(null), 6000);
    } catch (err: any) {
      setErrorMessage(`PDF creation failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-300 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Omni AI
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">AI Document Translation</h2>
        <p className="text-xs text-slate-400">
          Translate documents into 20+ global languages while preserving layout, table structure, and tone.
        </p>
      </div>

      {!file ? (
        <Dropzone
          isAi
          title="Select a PDF to translate"
          subtitle="Supports Spanish, French, German, Japanese, Chinese, Arabic, Hindi & more"
          onFilesSelected={handleFileSelected}
          onSelectSample={onSelectSample}
        />
      ) : (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-white">{file.name}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Target Language:</span>
                <select
                  value={targetLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setFile(null);
                  setSourceText('');
                  setTranslatedText('');
                  setDownloadSuccess(null);
                  setErrorMessage(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                Change PDF
              </button>
            </div>
          </div>

          {downloadSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex items-center justify-between gap-2">
              <span>{downloadSuccess}</span>
              {lastTranslatedPdfBytes && (
                <button
                  onClick={handleDownloadPdf}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px]"
                >
                  Download Again
                </button>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              {sourceText && (
                <button
                  type="button"
                  onClick={() => performTranslation(sourceText, targetLanguage)}
                  disabled={isTranslating}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Translation
                </button>
              )}
            </div>
          )}

          {/* Side by side panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Source */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[550px]">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800 text-slate-400 font-semibold mb-3">
                <span>Original Document Text</span>
                <span>{sourceText.split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <div className="flex-1 bg-slate-950 rounded-xl p-4 border border-slate-800/80 overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
                {sourceText}
              </div>
            </div>

            {/* Translation */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[550px]">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800 font-semibold mb-3">
                <span className="text-cyan-400 flex items-center gap-1.5">
                  <Languages className="w-4 h-4" />
                  {targetLanguage} Translation
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    disabled={!translatedText || isTranslating}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 px-2"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={!translatedText || isTranslating}
                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1 shadow-sm shadow-blue-950/40"
                  >
                    <Download className="w-3 h-3" />
                    Export PDF
                  </button>
                </div>
              </div>

              {isTranslating ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                  <p className="text-sm font-semibold text-white">Translating into {targetLanguage}...</p>
                  <p className="text-xs text-slate-400">Preserving technical terms and formatting.</p>
                </div>
              ) : (
                <div className="flex-1 bg-slate-950 rounded-xl p-4 border border-slate-800/80 overflow-y-auto font-sans text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
                  {translatedText || 'Translation will appear here...'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
