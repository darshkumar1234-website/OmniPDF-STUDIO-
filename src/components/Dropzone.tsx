import React, { useRef, useState } from 'react';
import { Upload, FileUp, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import { PdfThumbnailPreview } from './PdfThumbnailPreview';

export interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: string;
  subtitle?: string;
  onSelectSample?: (type: 'contract' | 'invoice' | 'report') => void;
  isAi?: boolean;
  /** Whether to show thumbnail preview before confirming processing */
  previewBeforeProcess?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFilesSelected,
  accept = '.pdf,application/pdf',
  multiple = false,
  title = 'Select or drop your PDF here',
  subtitle = 'Fast & private client-side processing · No size limits · 100% free',
  onSelectSample,
  isAi = false,
  previewBeforeProcess = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      if (previewBeforeProcess) {
        setStagedFiles(filesArray);
      } else {
        onFilesSelected(filesArray);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      if (previewBeforeProcess) {
        setStagedFiles(filesArray);
      } else {
        onFilesSelected(filesArray);
      }
    }
  };

  const handleConfirmProcessing = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stagedFiles.length > 0) {
      onFilesSelected(stagedFiles);
    }
  };

  const handleClearStaged = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setStagedFiles([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  // If a file is staged and preview is enabled, display the document preview before processing
  if (stagedFiles.length > 0 && previewBeforeProcess) {
    const isSingle = stagedFiles.length === 1;
    const primaryFile = stagedFiles[0];

    return (
      <div className="relative rounded-3xl border border-blue-900/40 bg-gradient-to-br from-[#0c1633] via-[#091126] to-[#070b14] p-6 sm:p-10 shadow-2xl text-center flex flex-col items-center justify-center animate-in fade-in duration-200">
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-cyan-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Document Ready for Processing
          </div>
          <h3 className="text-xl font-bold text-white mb-1">
            {isSingle ? 'Review Document Before Processing' : `Review ${stagedFiles.length} Selected Documents`}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            View the live page thumbnail below to verify your document before proceeding with {isAi ? 'Omni AI' : 'processing'}.
          </p>
        </div>

        {/* Thumbnail Preview(s) */}
        <div className="flex flex-wrap items-center justify-center gap-4 my-4 max-w-4xl w-full">
          {stagedFiles.slice(0, 3).map((f, idx) => (
            <PdfThumbnailPreview
              key={idx}
              file={f}
              size={isSingle ? 'lg' : 'sm'}
              onRemove={handleClearStaged}
            />
          ))}
          {stagedFiles.length > 3 && (
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex items-center justify-center">
              +{stagedFiles.length - 3} more files selected
            </div>
          )}
        </div>

        {/* Confirm or Change Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-4 border-t border-slate-800/80 w-full max-w-md">
          <button
            type="button"
            onClick={handleConfirmProcessing}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/60 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Confirm & Process {isSingle ? 'Document' : `${stagedFiles.length} Files`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleClearStaged}
            className="px-4 py-2.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            Change File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative rounded-3xl border-2 border-dashed transition-all cursor-pointer p-8 sm:p-12 text-center group ${
        isDragging
          ? 'border-blue-500 bg-blue-950/30 scale-[0.99]'
          : isAi
          ? 'border-blue-800/40 bg-[#0b1222]/80 hover:border-blue-500/70 hover:bg-[#0e172f]'
          : 'border-slate-800 bg-[#0b1222]/60 hover:border-blue-700/60 hover:bg-[#0e172f]'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center max-w-md mx-auto">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-lg ${
            isAi
              ? 'bg-gradient-to-tr from-blue-600/30 to-cyan-500/20 border border-blue-500/30 text-cyan-300 shadow-blue-950/40'
              : 'bg-slate-800/90 border border-slate-700 text-sky-300'
          }`}
        >
          {isAi ? <Sparkles className="w-8 h-8 text-cyan-400" /> : <FileUp className="w-8 h-8 text-sky-400" />}
        </div>

        <h3 className="text-lg font-semibold text-white mb-1.5 group-hover:text-sky-300 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-slate-400 mb-4 max-w-sm">{subtitle}</p>

        <button
          type="button"
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/50 transition-all flex items-center gap-2 group-hover:shadow-blue-900/60 cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          Choose File{multiple ? 's' : ''}
        </button>

        {onSelectSample && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-6 pt-4 border-t border-slate-800/80 w-full flex items-center justify-center gap-2 text-xs text-slate-400"
          >
            <span>Don't have a file?</span>
            <button
              onClick={() => onSelectSample('contract')}
              className="text-sky-400 hover:text-cyan-300 hover:underline font-medium cursor-pointer"
            >
              Test Contract
            </button>
            <span>·</span>
            <button
              onClick={() => onSelectSample('invoice')}
              className="text-sky-400 hover:text-cyan-300 hover:underline font-medium cursor-pointer"
            >
              Test Invoice
            </button>
            <span>·</span>
            <button
              onClick={() => onSelectSample('report')}
              className="text-sky-400 hover:text-cyan-300 hover:underline font-medium cursor-pointer"
            >
              Test Paper
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const FileDrop = Dropzone;
