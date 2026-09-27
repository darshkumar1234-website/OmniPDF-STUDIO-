import React, { useState } from 'react';
import { Hash, Download, Loader2, CheckCircle2, FileText } from 'lucide-react';
import { addPageNumbers, downloadFile } from '../../services/pdfOperations';
import { Dropzone } from '../Dropzone';

interface PageNumbersToolProps {
  onSelectSample: (type: 'contract' | 'invoice' | 'report') => void;
}

export const PageNumbersTool: React.FC<PageNumbersToolProps> = ({ onSelectSample }) => {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [position, setPosition] = useState<
    'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left'
  >('bottom-center');
  const [format, setFormat] = useState('Page {page} of {total}');
  const [startFrom, setStartFrom] = useState(1);
  const [fontSize, setFontSize] = useState(10);
  const [margin, setMargin] = useState(25);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    setFile({ name: f.name, bytes });
    setSuccessMessage(null);
  };

  const handleApplyNumbers = async () => {
    if (!file) return;
    setIsProcessing(true);
    setSuccessMessage(null);
    try {
      const numberedBytes = await addPageNumbers(file.bytes, {
        position,
        format,
        startFrom,
        fontSize,
        margin,
      });
      downloadFile(numberedBytes, `${file.name.replace('.pdf', '')}_numbered.pdf`);
      setSuccessMessage('Successfully applied page numbers and downloaded!');
    } catch (err: any) {
      alert(`Failed to add page numbers: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Add Page Numbers</h2>
        <p className="text-xs text-slate-400">
          Insert customizable page numbers, headers, and footers across all pages without watermarks.
        </p>
      </div>

      {!file ? (
        <Dropzone
          title="Select a PDF to add page numbers"
          subtitle="Supports custom positions, offsets, and formats"
          onFilesSelected={handleFileSelected}
          onSelectSample={onSelectSample}
        />
      ) : (
        <div className="space-y-6">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-rose-400" />
              <span className="font-semibold text-white">{file.name}</span>
            </div>
            <button onClick={() => setFile(null)} className="text-slate-400 hover:text-white">
              Change PDF
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Numbering Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Page {page} of {total}">Page {"{page}"} of {"{total}"}</option>
                  <option value="{page} / {total}">{"{page}"} / {"{total}"}</option>
                  <option value="{page}">{"{page}"} (Number only)</option>
                  <option value="- {page} -">- {"{page}"} -</option>
                  <option value="Page {page}">Page {"{page}"}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Position</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="bottom-center">Bottom Center (Standard)</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right (Header)</option>
                  <option value="top-left">Top Left (Header)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Start Number</label>
                <input
                  type="number"
                  min={1}
                  value={startFrom}
                  onChange={(e) => setStartFrom(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Font Size & Margin</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value={9}>Small (9 pt)</option>
                    <option value={10}>Normal (10 pt)</option>
                    <option value={12}>Large (12 pt)</option>
                  </select>
                  <select
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value={15}>Tight (15 pt)</option>
                    <option value={25}>Normal (25 pt)</option>
                    <option value={40}>Spacious (40 pt)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Live Preview Sample */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs">
              <span className="text-slate-400">Sample Page 1 Preview: </span>
              <span className="font-mono text-rose-300 font-semibold">
                {format.replace('{page}', startFrom.toString()).replace('{total}', (startFrom + 4).toString())}
              </span>
              <span className="text-slate-500 ml-2">({position})</span>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={handleApplyNumbers}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 transition-all flex items-center gap-2 disabled:opacity-40"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Applying Numbers...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Add Numbers & Download
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
