import React, { useState, useRef, useEffect } from 'react';
import {
  FileSignature,
  Type,
  PenTool,
  ShieldAlert,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  FileText,
} from 'lucide-react';
import { loadPdfDocument, renderPageToCanvas } from '../../services/pdfRenderer';
import { applyAnnotationsToPDF, downloadFile } from '../../services/pdfOperations';
import { Dropzone } from '../Dropzone';

interface AnnotateToolProps {
  onSelectSample: (type: 'contract' | 'invoice' | 'report') => void;
}

interface TextAnnotation {
  type: 'text';
  x: number; // percentage
  y: number; // percentage
  text: string;
  fontSize: number;
}

interface RedactAnnotation {
  type: 'redact';
  x: number;
  y: number;
  width: number;
  height: number;
}

type AnnotationItem = TextAnnotation | RedactAnnotation;

export const AnnotateTool: React.FC<AnnotateToolProps> = ({ onSelectSample }) => {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTool, setActiveTool] = useState<'text' | 'draw' | 'redact'>('text');

  // Text tool options
  const [textInput, setTextInput] = useState('Approved & Signed');
  const [fontSize, setFontSize] = useState(14);

  // Annotations stored per page index
  const [annotations, setAnnotations] = useState<Record<number, AnnotationItem[]>>({});

  // Drawing canvas layer state
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#2563eb');
  const [lineWidth, setLineWidth] = useState(2);

  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastModifiedBytes, setLastModifiedBytes] = useState<Uint8Array | null>(null);

  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Render current page when file or page changes
  useEffect(() => {
    if (!file) return;

    let isMounted = true;
    setIsLoadingPage(true);

    (async () => {
      try {
        const doc = await loadPdfDocument(file.bytes);
        if (!isMounted) return;
        setTotalPages(doc.numPages);

        const renderedCanvas = await renderPageToCanvas(doc, currentPage, 1.8);
        if (!isMounted) return;

        const baseCanvas = baseCanvasRef.current;
        const drawCanvas = drawCanvasRef.current;

        if (baseCanvas && drawCanvas) {
          baseCanvas.width = renderedCanvas.width;
          baseCanvas.height = renderedCanvas.height;
          const ctx = baseCanvas.getContext('2d');
          ctx?.drawImage(renderedCanvas, 0, 0);

          drawCanvas.width = renderedCanvas.width;
          drawCanvas.height = renderedCanvas.height;
          const drawCtx = drawCanvas.getContext('2d');
          drawCtx?.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        }
      } catch (err: any) {
        console.error('Page render error:', err);
      } finally {
        if (isMounted) setIsLoadingPage(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [file, currentPage]);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    setFile({ name: f.name, bytes });
    setCurrentPage(1);
    setAnnotations({});
    setSuccessMessage(null);
  };

  // Canvas click to add text or start drawing
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'text' && activeTool !== 'redact') return;
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const rect = drawCanvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const percentX = (clickX / rect.width) * 100;
    const percentY = (clickY / rect.height) * 100;

    const pageIdx = currentPage - 1;
    const currentList = annotations[pageIdx] || [];

    if (activeTool === 'text') {
      const newItem: TextAnnotation = {
        type: 'text',
        x: percentX,
        y: percentY,
        text: textInput,
        fontSize,
      };
      setAnnotations({ ...annotations, [pageIdx]: [...currentList, newItem] });
    } else if (activeTool === 'redact') {
      const newItem: RedactAnnotation = {
        type: 'redact',
        x: percentX,
        y: percentY,
        width: 18,
        height: 3.5,
      };
      setAnnotations({ ...annotations, [pageIdx]: [...currentList, newItem] });
    }
  };

  // Freehand drawing handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'draw') return;
    setIsDrawing(true);
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = lineWidth * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool !== 'draw') return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClearCurrentPage = () => {
    const pageIdx = currentPage - 1;
    const copy = { ...annotations };
    delete copy[pageIdx];
    setAnnotations(copy);

    const drawCanvas = drawCanvasRef.current;
    if (drawCanvas) {
      const ctx = drawCanvas.getContext('2d');
      ctx?.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    }
  };

  const handleSaveDocument = async () => {
    if (!file) return;
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const modifiedBytes = await applyAnnotationsToPDF(file.bytes, annotations as any);
      setLastModifiedBytes(modifiedBytes);
      const outName = `${file.name.replace('.pdf', '')}_annotated.pdf`;
      downloadFile(modifiedBytes, outName);
      setSuccessMessage(`Successfully exported annotated PDF without any watermarks into ${outName}!`);
    } catch (err: any) {
      setErrorMessage(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const currentPageAnnotations = annotations[currentPage - 1] || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Annotate & Sign PDF</h2>
          <p className="text-xs text-slate-400">
            Draw freehand signatures, add custom text stamps, blackout sensitive areas, and download clean.
          </p>
        </div>

        {file && (
          <button
            onClick={handleSaveDocument}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/50 transition-all flex items-center gap-2 self-start sm:self-auto disabled:opacity-40 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Save & Download PDF
              </>
            )}
          </button>
        )}
      </div>

      {!file ? (
        <Dropzone
          title="Select a PDF to annotate or sign"
          subtitle="Add signatures, text notes, and redaction boxes without watermarks"
          onFilesSelected={handleFileSelected}
          onSelectSample={onSelectSample}
        />
      ) : (
        <div className="space-y-4">
          {/* Tool Control Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTool('text')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTool === 'text'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                Text Stamp
              </button>
              <button
                onClick={() => setActiveTool('draw')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTool === 'draw'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                Signature / Pen
              </button>
              <button
                onClick={() => setActiveTool('redact')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTool === 'redact'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Blackout Box
              </button>
            </div>

            {/* Contextual Options */}
            {activeTool === 'text' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Text to stamp..."
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white w-44 focus:outline-none focus:border-blue-500"
                />
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                >
                  <option value={10}>10pt</option>
                  <option value={14}>14pt</option>
                  <option value={18}>18pt</option>
                  <option value={24}>24pt</option>
                </select>
                <span className="text-[11px] text-slate-400">Click on page to place</span>
              </div>
            )}

            {activeTool === 'draw' && (
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Color:</span>
                  {['#2563eb', '#dc2626', '#16a34a', '#000000'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setPenColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-5 h-5 rounded-full border cursor-pointer ${
                        penColor === color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Width:</span>
                  <select
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-xs text-white"
                  >
                    <option value={1.5}>Thin</option>
                    <option value={2.5}>Medium</option>
                    <option value={4}>Thick</option>
                  </select>
                </div>
              </div>
            )}

            {/* Pagination & Clear */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-0.5 rounded hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-slate-300 px-1">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-0.5 rounded hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleClearCurrentPage}
                title="Clear Page Annotations"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/50 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Document Canvas Container */}
          <div
            ref={containerRef}
            onClick={handleCanvasClick}
            className="relative mx-auto bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center p-2 min-h-[500px]"
            style={{ maxWidth: '750px', cursor: activeTool === 'draw' ? 'crosshair' : 'pointer' }}
          >
            {isLoadingPage ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading page {currentPage}...</p>
              </div>
            ) : (
              <div className="relative w-full">
                <canvas ref={baseCanvasRef} className="w-full h-auto block rounded" />
                <canvas
                  ref={drawCanvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="absolute inset-0 w-full h-full pointer-events-auto"
                />

                {/* Render overlay text & redact items */}
                {currentPageAnnotations.map((item, idx) => {
                  if (item.type === 'text') {
                    return (
                      <div
                        key={idx}
                        style={{
                          left: `${item.x}%`,
                          top: `${item.y}%`,
                          fontSize: `${item.fontSize}px`,
                        }}
                        className="absolute text-slate-900 font-sans font-semibold bg-yellow-200/90 px-1.5 py-0.5 rounded shadow pointer-events-none select-none -translate-y-full"
                      >
                        {item.text}
                      </div>
                    );
                  } else if (item.type === 'redact') {
                    return (
                      <div
                        key={idx}
                        style={{
                          left: `${item.x}%`,
                          top: `${item.y}%`,
                          width: `${item.width}%`,
                          height: `${item.height}%`,
                        }}
                        className="absolute bg-black rounded-xs shadow pointer-events-none"
                      />
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
              {lastModifiedBytes && (
                <button
                  onClick={() => {
                    const outName = `${file.name.replace('.pdf', '')}_annotated.pdf`;
                    downloadFile(lastModifiedBytes, outName);
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
