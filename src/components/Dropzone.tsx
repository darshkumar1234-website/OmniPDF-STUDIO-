import React, { useRef, useState } from 'react';
import { Upload, FileUp, Sparkles, AlertCircle } from 'lucide-react';

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: string;
  subtitle?: string;
  onSelectSample?: (type: 'contract' | 'invoice' | 'report') => void;
  isAi?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFilesSelected,
  accept = '.pdf,application/pdf',
  multiple = false,
  title = 'Select or drop your PDF here',
  subtitle = 'Fast & private client-side processing · No size limits · 100% free',
  onSelectSample,
  isAi = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
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
      onFilesSelected(filesArray);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer p-8 sm:p-12 text-center group ${
        isDragging
          ? 'border-rose-500 bg-rose-950/20 scale-[0.99]'
          : isAi
          ? 'border-rose-800/40 bg-slate-900/40 hover:border-rose-500/60 hover:bg-slate-900/70'
          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
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
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${
            isAi
              ? 'bg-gradient-to-tr from-rose-500/20 to-purple-500/20 border border-rose-500/30 text-rose-400'
              : 'bg-slate-800 border border-slate-700 text-slate-300'
          }`}
        >
          {isAi ? <Sparkles className="w-8 h-8" /> : <FileUp className="w-8 h-8" />}
        </div>

        <h3 className="text-lg font-semibold text-white mb-1.5 group-hover:text-rose-400 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-slate-400 mb-4 max-w-sm">{subtitle}</p>

        <button
          type="button"
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 transition-all flex items-center gap-2 group-hover:shadow-rose-900/50"
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
              className="text-rose-400 hover:underline font-medium"
            >
              Test Contract
            </button>
            <span>·</span>
            <button
              onClick={() => onSelectSample('invoice')}
              className="text-rose-400 hover:underline font-medium"
            >
              Test Invoice
            </button>
            <span>·</span>
            <button
              onClick={() => onSelectSample('report')}
              className="text-rose-400 hover:underline font-medium"
            >
              Test Paper
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
