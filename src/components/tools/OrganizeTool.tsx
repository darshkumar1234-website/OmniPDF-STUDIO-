import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  RotateCcw,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Download,
  Loader2,
  CheckCircle2,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { reorderAndRotatePDF, downloadFile } from '../../services/pdfOperations';
import { loadPdfDocument, renderPageThumbnail } from '../../services/pdfRenderer';
import { Dropzone } from '../Dropzone';

interface OrganizeToolProps {
  onSelectSample: (type: 'contract' | 'invoice' | 'report') => void;
}

interface PageCard {
  originalIndex: number;
  rotation: number;
  thumbnailUrl: string;
  isDeleted: boolean;
}

export const OrganizeTool: React.FC<OrganizeToolProps> = ({ onSelectSample }) => {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [pages, setPages] = useState<PageCard[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastModifiedBytes, setLastModifiedBytes] = useState<Uint8Array | null>(null);

  const loadDocumentPages = async (bytes: Uint8Array, fileName: string) => {
    setIsLoadingPages(true);
    setErrorMessage(null);
    try {
      const doc = await loadPdfDocument(bytes);
      const loaded: PageCard[] = [];

      for (let i = 1; i <= doc.numPages; i++) {
        const thumb = await renderPageThumbnail(doc, i, 280, 0);
        loaded.push({
          originalIndex: i - 1,
          rotation: 0,
          thumbnailUrl: thumb,
          isDeleted: false,
        });
      }

      setFile({ name: fileName, bytes });
      setPages(loaded);
      setSuccessMessage(null);
    } catch (err: any) {
      setErrorMessage(`Failed to load PDF pages: ${err.message}`);
    } finally {
      setIsLoadingPages(false);
    }
  };

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    await loadDocumentPages(bytes, f.name);
  };

  const rotatePage = (index: number) => {
    setPages((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        rotation: (copy[index].rotation + 90) % 360,
      };
      return copy;
    });
  };

  const rotateAll = () => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: (p.rotation + 90) % 360,
      }))
    );
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    setPages((prev) => {
      const copy = [...prev];
      const temp = copy[fromIndex];
      copy[fromIndex] = copy[toIndex];
      copy[toIndex] = temp;
      return copy;
    });
  };

  const toggleDelete = (index: number) => {
    setPages((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isDeleted: !copy[index].isDeleted };
      return copy;
    });
  };

  const handleSave = async () => {
    if (!file) return;
    const active = pages.filter((p) => !p.isDeleted);
    if (active.length === 0) {
      setErrorMessage('You must keep at least 1 page.');
      return;
    }

    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const modifiedBytes = await reorderAndRotatePDF(file.bytes, pages);
      setLastModifiedBytes(modifiedBytes);
      const outName = `${file.name.replace('.pdf', '')}_organized.pdf`;
      downloadFile(modifiedBytes, outName);
      setSuccessMessage(`Successfully saved reorganized PDF with ${active.length} pages into ${outName}!`);
    } catch (err: any) {
      setErrorMessage(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = pages.filter((p) => !p.isDeleted).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Organize & Rotate Pages</h2>
          <p className="text-xs text-slate-400">
            Rearrange pages in any sequence, rotate orientation by 90°, and delete unwanted pages.
          </p>
        </div>

        {file && (
          <div className="flex items-center gap-2">
            <button
              onClick={rotateAll}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Rotate All 90°
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || activeCount === 0}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/50 transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Save & Download ({activeCount} Pages)
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {!file ? (
        <Dropzone
          title="Select a PDF to organize and rotate"
          subtitle="View thumbnails, drag to reorder, rotate 90°, and remove pages"
          onFilesSelected={handleFileSelected}
          onSelectSample={onSelectSample}
        />
      ) : isLoadingPages ? (
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-xs text-slate-400">Rendering high-resolution page thumbnails...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Status */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-white">{file.name}</span>
              <span className="text-slate-400">
                · {activeCount} of {pages.length} pages active
              </span>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setPages([]);
              }}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              Change PDF
            </button>
          </div>

          {/* Grid of Pages */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pages.map((p, idx) => (
              <div
                key={p.originalIndex}
                className={`relative rounded-xl border p-2 flex flex-col transition-all group ${
                  p.isDeleted
                    ? 'border-red-900/50 bg-red-950/20 opacity-40'
                    : 'border-slate-800 bg-slate-900/90 hover:border-slate-700 hover:shadow-xl'
                }`}
              >
                {/* Header of page card */}
                <div className="flex items-center justify-between px-1 mb-1.5 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">#{idx + 1}</span>
                  <span className="text-[10px]">Orig #{p.originalIndex + 1}</span>
                </div>

                {/* Thumbnail */}
                <div className="relative aspect-[3/4] bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center p-2 mb-2">
                  <img
                    src={p.thumbnailUrl}
                    alt={`Page ${idx + 1}`}
                    style={{
                      transform: `rotate(${p.rotation}deg)`,
                      transition: 'transform 0.2s ease',
                    }}
                    className="max-h-full max-w-full object-contain shadow-sm"
                  />

                  {p.isDeleted && (
                    <div className="absolute inset-0 bg-red-950/70 backdrop-blur-xs flex items-center justify-center">
                      <span className="text-xs font-bold text-red-300 uppercase tracking-wider">
                        Deleted
                      </span>
                    </div>
                  )}

                  {p.rotation !== 0 && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-900/90 text-[10px] text-sky-300 border border-slate-700">
                      {p.rotation}°
                    </span>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => movePage(idx, idx - 1)}
                      disabled={idx === 0 || p.isDeleted}
                      title="Move Left"
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => movePage(idx, idx + 1)}
                      disabled={idx === pages.length - 1 || p.isDeleted}
                      title="Move Right"
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => rotatePage(idx)}
                      disabled={p.isDeleted}
                      title="Rotate 90°"
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-blue-400 disabled:opacity-20 cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => toggleDelete(idx)}
                      title={p.isDeleted ? 'Restore Page' : 'Delete Page'}
                      className={`p-1 rounded cursor-pointer ${
                        p.isDeleted
                          ? 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-800/50'
                          : 'bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
                    const outName = `${file.name.replace('.pdf', '')}_organized.pdf`;
                    downloadFile(lastModifiedBytes, outName);
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
      )}
    </div>
  );
};
