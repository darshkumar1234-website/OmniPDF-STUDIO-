import React, { useState } from 'react';
import { ShieldAlert, CheckSquare, Square, Download, Loader2, CheckCircle2, FileText, Sparkles, Plus, AlertCircle } from 'lucide-react';
import { requestDetectPII } from '../../services/aiService';
import { extractTextFromPDF } from '../../services/pdfRenderer';
import { convertTextToPDF, downloadFile } from '../../services/pdfOperations';
import { DetectedPII } from '../../types';
import { Dropzone } from '../Dropzone';

interface AiRedactToolProps {
  onSelectSample: (type: 'contract' | 'invoice' | 'report') => void;
}

export const AiRedactTool: React.FC<AiRedactToolProps> = ({ onSelectSample }) => {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [docText, setDocText] = useState('');
  const [detectedItems, setDetectedItems] = useState<DetectedPII[]>([]);
  const [customTerm, setCustomTerm] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isRedacting, setIsRedacting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSanitizedBytes, setLastSanitizedBytes] = useState<Uint8Array | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    setFile({ name: f.name, bytes });
    setIsScanning(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setLastSanitizedBytes(null);

    try {
      const { fullText } = await extractTextFromPDF(bytes);
      setDocText(fullText);
      const items = await requestDetectPII(fullText);
      setDetectedItems(items);
    } catch (err: any) {
      setErrorMessage(`Scanning failed: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleItem = (index: number) => {
    setDetectedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], selected: !copy[index].selected };
      return copy;
    });
  };

  const selectAll = (selected: boolean) => {
    setDetectedItems((prev) => prev.map((item) => ({ ...item, selected })));
  };

  const handleAddCustom = () => {
    if (!customTerm.trim()) return;
    setDetectedItems((prev) => [
      ...prev,
      {
        text: customTerm.trim(),
        category: 'id',
        reason: 'Manually specified keyword',
        selected: true,
      },
    ]);
    setCustomTerm('');
  };

  const handleRedactAndDownload = async () => {
    if (!file || !docText) return;
    setIsRedacting(true);
    setSuccessMessage(null);

    try {
      // Scrub selected items from document text replacing with [REDACTED: CATEGORY] or solid blocks
      let redactedText = docText;
      const selectedToRedact = detectedItems.filter((i) => i.selected);

      for (const item of selectedToRedact) {
        // Escape regex special chars
        const escaped = item.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'gi');
        redactedText = redactedText.replace(regex, `████████ [REDACTED]`);
      }

      // Generate sanitized PDF
      const sanitizedBytes = await convertTextToPDF(
        redactedText,
        `${file.name.replace('.pdf', '')} (Redacted Compliance Copy)`
      );

      setLastSanitizedBytes(sanitizedBytes);
      const outName = `${file.name.replace('.pdf', '')}_sanitized.pdf`;
      downloadFile(sanitizedBytes, outName);
      setSuccessMessage(
        `Successfully redacted ${selectedToRedact.length} sensitive items and downloaded ${outName}!`
      );
    } catch (err: any) {
      setErrorMessage(`Redaction failed: ${err.message}`);
    } finally {
      setIsRedacting(false);
    }
  };

  const selectedCount = detectedItems.filter((i) => i.selected).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-300 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          GDPR & HIPAA Compliance Automation
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">AI Smart Redaction</h2>
        <p className="text-xs text-slate-400">
          Auto-detect names, emails, phone numbers, SSNs, credit cards, and confidential terms for permanent blackout.
        </p>
      </div>

      {!file ? (
        <Dropzone
          isAi
          title="Select a PDF to scan for sensitive PII"
          subtitle="Identifies personal information, banking details, and contact numbers"
          onFilesSelected={handleFileSelected}
          onSelectSample={onSelectSample}
        />
      ) : isScanning ? (
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Auditing document with Omni AI...</p>
          <p className="text-xs text-slate-400">Checking for emails, SSNs, financial data, and PII.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-white">{file.name}</span>
              <span className="text-slate-400">· {detectedItems.length} PII entities identified</span>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setDetectedItems([]);
              }}
              className="text-slate-400 hover:text-white"
            >
              Change PDF
            </button>
          </div>

          {/* Detected items checklist */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Detected Sensitive Elements</span>
                <span className="text-slate-400">({selectedCount} to blackout)</span>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => selectAll(true)} className="text-xs text-blue-400 hover:underline">
                  Select All
                </button>
                <span className="text-slate-600">·</span>
                <button onClick={() => selectAll(false)} className="text-xs text-slate-400 hover:text-white">
                  Deselect All
                </button>
              </div>
            </div>

            {detectedItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No high-risk PII entities detected in this document. You can add custom terms below.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto p-1">
                {detectedItems.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleItem(idx)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                      item.selected
                        ? 'border-blue-500/60 bg-blue-950/30'
                        : 'border-slate-800 bg-slate-950/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.selected ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-semibold text-white truncate">{item.text}</p>
                        <p className="text-[11px] text-slate-400">{item.reason}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                      {item.category}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Add custom term */}
            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={customTerm}
                onChange={(e) => setCustomTerm(e.target.value)}
                placeholder="Add custom keyword or phrase to blackout..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleAddCustom}
                disabled={!customTerm.trim()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Term
              </button>
            </div>
          </div>

          {/* Action */}
          <div className="flex justify-end">
            <button
              onClick={handleRedactAndDownload}
              disabled={isRedacting || selectedCount === 0}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/40 transition-all flex items-center gap-2 disabled:opacity-40"
            >
              {isRedacting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scrubbing Sensitive Data...
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  Blackout & Download Sanitized PDF ({selectedCount} Items)
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
              {lastSanitizedBytes && (
                <button
                  onClick={() => {
                    const outName = `${file.name.replace('.pdf', '')}_sanitized.pdf`;
                    downloadFile(lastSanitizedBytes, outName);
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
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
