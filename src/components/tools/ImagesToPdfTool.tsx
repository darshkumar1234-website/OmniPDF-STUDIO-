import React, { useState } from 'react';
import { Image, Download, Trash2, ArrowUp, ArrowDown, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { convertImagesToPDF, downloadFile } from '../../services/pdfOperations';
import { Dropzone } from '../Dropzone';

interface ImageItem {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
  bytes: Uint8Array;
  mimeType: string;
}

export const ImagesToPdfTool: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<'fit' | 'a4' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [margin, setMargin] = useState<number>(15);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastPdfBytes, setLastPdfBytes] = useState<Uint8Array | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    const loaded: ImageItem[] = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(f);
      });

      loaded.push({
        id: `${Date.now()}_${Math.random()}`,
        name: f.name,
        size: f.size,
        dataUrl,
        bytes,
        mimeType: f.type,
      });
    }
    setImages((prev) => [...prev, ...loaded]);
    setSuccessMessage(null);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;
    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setImages(copy);
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleConvert = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const pdfBytes = await convertImagesToPDF(
        images.map((img) => ({ bytes: img.bytes, mimeType: img.mimeType })),
        { pageSize, orientation, margin }
      );
      setLastPdfBytes(pdfBytes);
      downloadFile(pdfBytes, 'Converted_Images.pdf');
      setSuccessMessage(`Converted ${images.length} images to PDF successfully!`);
    } catch (err: any) {
      setErrorMessage(`Conversion failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Convert Images to PDF</h2>
        <p className="text-xs text-slate-400">
          Transform multiple JPG, PNG, and WebP images into a single high-resolution PDF document.
        </p>
      </div>

      {images.length === 0 ? (
        <Dropzone
          multiple
          accept="image/png,image/jpeg,image/webp,image/*"
          title="Select or drop image files here"
          subtitle="Supports JPG, PNG, WebP · Reorder pages and customize layout"
          onFilesSelected={handleFilesSelected}
        />
      ) : (
        <div className="space-y-6">
          {/* Options Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Page Size</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="a4">A4 (Standard Document)</option>
                <option value="letter">US Letter</option>
                <option value="fit">Fit to Image Dimensions</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Orientation</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="auto">Auto (Match Image)</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Margins</label>
              <select
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value={0}>No Margin (Edge-to-edge)</option>
                <option value={15}>Normal (15 pt)</option>
                <option value={30}>Spacious (30 pt)</option>
              </select>
            </div>
          </div>

          {/* Image List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800 text-xs text-slate-400">
              <span className="font-semibold text-white">{images.length} Images Selected</span>
              <label className="cursor-pointer text-blue-400 hover:text-sky-300 font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                Add more images
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFilesSelected(Array.from(e.target.files));
                  }}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="relative rounded-xl border border-slate-800 bg-slate-950/80 p-2 flex flex-col group hover:border-slate-700"
                >
                  <div className="aspect-square rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center mb-2">
                    <img src={img.dataUrl} alt={img.name} className="max-h-full max-w-full object-contain" />
                  </div>
                  <p className="text-[11px] text-white font-medium truncate mb-2">{img.name}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs text-slate-400">
                    <span className="text-[10px] text-slate-400">Page {idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveImage(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveImage(idx, 'down')}
                        disabled={idx === images.length - 1}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeImage(img.id)}
                        className="p-1 rounded hover:bg-red-950/60 text-slate-400 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          <div className="flex items-center justify-end">
            <button
              onClick={handleConvert}
              disabled={isProcessing || images.length === 0}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/50 transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Convert & Download PDF ({images.length} Pages)
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
                  onClick={() => downloadFile(lastPdfBytes, 'Converted_Images.pdf')}
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
