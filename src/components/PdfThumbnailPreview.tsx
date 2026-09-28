import React, { useState, useEffect } from 'react';
import {
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  FileCheck,
  Eye,
} from 'lucide-react';
import { generatePdfThumbnail } from '../services/pdfRenderer';

export interface PdfThumbnailPreviewProps {
  /** The PDF File, Blob, or raw byte buffer to preview */
  file?: File | Blob | Uint8Array | ArrayBuffer | null;
  /** Optional pre-rendered thumbnail data URL */
  thumbnailUrl?: string;
  /** Optional explicit file name if not deriving from File */
  fileName?: string;
  /** Optional explicit file size in bytes */
  fileSize?: number;
  /** Optional explicit total page count */
  totalPageCount?: number;
  /** Custom CSS classes for the container */
  className?: string;
  /** Compact card mode or full preview mode */
  size?: 'sm' | 'md' | 'lg';
  /** Optional callback when user clicks remove */
  onRemove?: () => void;
  /** Whether to allow pagination to preview subsequent pages */
  allowPageNavigation?: boolean;
}

export const PdfThumbnailPreview: React.FC<PdfThumbnailPreviewProps> = ({
  file,
  thumbnailUrl: initialThumbnail,
  fileName,
  fileSize,
  totalPageCount,
  className = '',
  size = 'md',
  onRemove,
  allowPageNavigation = true,
}) => {
  const [thumbnail, setThumbnail] = useState<string | null>(initialThumbnail || null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(totalPageCount || 1);
  const [isLoading, setIsLoading] = useState<boolean>(!initialThumbnail && !!file);
  const [error, setError] = useState<string | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);

  const displayName = fileName || (file instanceof File ? file.name : 'Document.pdf');
  const displaySize = fileSize || (file instanceof File ? file.size : (file instanceof Uint8Array ? file.byteLength : 0));

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  useEffect(() => {
    if (initialThumbnail) {
      setThumbnail(initialThumbnail);
      setIsLoading(false);
      return;
    }

    if (!file) {
      setThumbnail(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const renderThumbnail = async () => {
      try {
        const { thumbnailUrl, numPages } = await generatePdfThumbnail(file, currentPage, 480);
        if (isMounted) {
          setThumbnail(thumbnailUrl);
          setPages(numPages);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('PDF thumbnail generation failed:', err);
          setError('Preview unavailable');
          setIsLoading(false);
        }
      }
    };

    renderThumbnail();

    return () => {
      isMounted = false;
    };
  }, [file, currentPage, initialThumbnail]);

  const handlePrevPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPage < pages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const sizeClasses = {
    sm: 'max-w-xs',
    md: 'max-w-sm sm:max-w-md',
    lg: 'max-w-xl',
  }[size];

  return (
    <>
      <div
        className={`relative rounded-2xl bg-gradient-to-br from-[#0c1633] via-[#091126] to-[#070b14] border border-blue-900/50 p-4 shadow-xl overflow-hidden group ${sizeClasses} ${className}`}
      >
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

        {/* Thumbnail Preview Area */}
        <div className="relative aspect-[3/4] max-h-[300px] w-full rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center overflow-hidden mb-3.5 shadow-inner">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-2" />
              <p className="text-xs font-medium text-slate-300">Rendering preview...</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Page {currentPage}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <FileText className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-300">PDF Document</p>
              <p className="text-[10px] text-slate-500 mt-1">{error}</p>
            </div>
          ) : thumbnail ? (
            <div className="relative w-full h-full flex items-center justify-center p-2">
              <img
                src={thumbnail}
                alt={`Page ${currentPage} preview`}
                className="max-h-full max-w-full object-contain rounded shadow-lg transition-transform duration-200 group-hover:scale-[1.02]"
              />
              {/* Zoom overlay on hover */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomOpen(true);
                }}
                className="absolute inset-0 bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs text-white font-medium cursor-pointer"
              >
                <Maximize2 className="w-4 h-4 text-cyan-300" />
                <span className="bg-slate-950/80 px-2.5 py-1 rounded-full border border-blue-800/40 text-[11px]">
                  Enlarge Preview
                </span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <FileText className="w-10 h-10 text-blue-400 mb-2" />
              <p className="text-xs font-medium text-slate-300">Ready to Process</p>
            </div>
          )}

          {/* Page Badge */}
          {pages > 0 && (
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/85 backdrop-blur-sm border border-slate-700/80 text-[11px] font-mono text-cyan-300 font-semibold flex items-center gap-1">
              <Eye className="w-3 h-3 text-cyan-400" />
              <span>
                Page {currentPage} of {pages}
              </span>
            </div>
          )}

          {/* Remove / Reset Button */}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 text-slate-400 hover:text-white hover:bg-red-950/60 hover:border-red-800/40 border border-slate-800 transition-colors cursor-pointer"
              title="Change or remove file"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Page Navigation Controls */}
          {allowPageNavigation && pages > 1 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-slate-950/85 backdrop-blur-sm p-0.5 rounded-lg border border-slate-700/80">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1 || isLoading}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= pages || isLoading}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* File Details Bar */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="min-w-0 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-cyan-400 shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white truncate max-w-[200px]" title={displayName}>
                {displayName}
              </p>
              <p className="text-[11px] text-slate-400">
                {displaySize > 0 && `${formatFileSize(displaySize)} · `}
                {pages} {pages === 1 ? 'page' : 'pages'}
              </p>
            </div>
          </div>

          <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 font-semibold text-[10px]">
            Ready
          </span>
        </div>
      </div>

      {/* Modal Zoom View */}
      {isZoomOpen && thumbnail && (
        <div
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl p-6 flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-white text-sm">{displayName}</span>
                <span className="text-slate-400 text-xs">· Page {currentPage} of {pages}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center p-2 min-h-[300px]">
              <img
                src={thumbnail}
                alt={`Page ${currentPage} full preview`}
                className="max-h-[70vh] object-contain rounded-lg shadow-2xl"
              />
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-4 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1 || isLoading}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span>Page {currentPage} of {pages}</span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={currentPage >= pages || isLoading}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 cursor-pointer flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export const PdfPreview = PdfThumbnailPreview;
