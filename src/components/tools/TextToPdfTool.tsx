import React, { useState } from 'react';
import { PenTool, Download, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { convertTextToPDF, downloadFile } from '../../services/pdfOperations';

export const TextToPdfTool: React.FC = () => {
  const [title, setTitle] = useState('Meeting Notes & Project Roadmap');
  const [content, setContent] = useState(`# Executive Overview
This document outlines key project objectives, operational timelines, and milestone deliverables for the upcoming fiscal quarter.

# 1. Project Objectives
- Modernize core enterprise infrastructure with automated deployment pipelines
- Implement end-to-end encryption for all stored files and data transfers
- Optimize cloud compute expenditures by 30% without sacrificing availability

# 2. Key Milestones & Deliverables
- Milestone 1 (Nov 15): Architectural review and baseline load testing completed
- Milestone 2 (Dec 01): Client-side security verification and zero-knowledge audits
- Milestone 3 (Jan 10): Production rollout and developer documentation release

# 3. Action Items
- Schedule bi-weekly review meetings with stakeholders
- Validate compliance certifications across all active regions`);

  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastPdfBytes, setLastPdfBytes] = useState<Uint8Array | null>(null);

  const handleGenerate = async () => {
    if (!content.trim()) return;
    setIsProcessing(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const pdfBytes = await convertTextToPDF(content, title);
      setLastPdfBytes(pdfBytes);
      const outName = `${(title || 'Document').replace(/\s+/g, '_')}.pdf`;
      downloadFile(pdfBytes, outName);
      setSuccessMessage(`Successfully generated and downloaded ${outName}!`);
    } catch (err: any) {
      setErrorMessage(`Generation failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Text / Notes to PDF</h2>
        <p className="text-xs text-slate-400">
          Turn written notes, meeting summaries, or markdown into a clean, paginated PDF document.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">Document Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document Title"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Content (Supports # Headings & auto-wrapping)
            </label>
            <span className="text-[11px] text-slate-400">
              {content.split(/\s+/).filter(Boolean).length} words
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => {
              setTitle('Quarterly Financial Review');
              setContent(`# Financial Summary Q4 2026\n\nTotal Revenue: $4,820,000 (+18% YoY)\nNet Operating Margin: 24.5%\nFree Cash Flow: $1,180,000\n\n# Operational Highlights\n- Customer acquisition cost declined by 12%\n- Average contract value increased from $48k to $62k\n- Team expansion in R&D and platform engineering`);
            }}
            className="text-xs text-sky-400 hover:text-cyan-300 font-medium cursor-pointer"
          >
            Insert Financial Template
          </button>

          <button
            onClick={handleGenerate}
            disabled={isProcessing || !content.trim()}
            className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/50 transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generate & Download PDF
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
            {lastPdfBytes && (
              <button
                onClick={() => {
                  const outName = `${(title || 'Document').replace(/\s+/g, '_')}.pdf`;
                  downloadFile(lastPdfBytes, outName);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow transition-colors cursor-pointer"
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
    </div>
  );
};
