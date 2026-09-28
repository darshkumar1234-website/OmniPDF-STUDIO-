import React, { useState } from 'react';
import { FileImage, Download, Loader2, CheckCircle2, FileText, Image as ImageIcon } from 'lucide-react';
import { convertPdfToImages } from '../../services/pdfRenderer';
import { downloadFile, createZipDownload } from '../../services/pdfOperations';
import { Dropzone } from '../Dropzone';

interface PdfToImagesToolProps {
  onSelectSample: (type: 'contract' | 'invoice' | 'report') => void;
}

export const PdfToImagesTool: React.FC<PdfToImagesToolProps> = ({ onSelectSample }) => {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [dpi, setDpi] = useState<number>(2.0); // 2.0 = ~150 DPI, 3.0 = ~225 DPI, 4.0 = ~300 DPI
  const [isConverting, setIsConverting] = useState(false);
  const [convertedImages, setConvertedImages] = useState<
    { pageNum: number; dataUrl: string; blob: Blob }[]
  >([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    setFile({ name: f.name, bytes });
    setConvertedImages([]);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleStartConversion = async () => {
    if (!file) return;
    setIsConverting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const results = await convertPdfToImages(file.bytes, format, dpi);
      setConvertedImages(results);
      setSuccessMessage(`Successfully converted ${results.length} pages to ${format.toUpperCase()}!`);
    } catch (err: any) {
      setErrorMessage(`Conversion failed: ${err.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownloadSingle = (img: { pageNum: number; blob: Blob }) => {
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const baseName = file?.name.replace('.pdf', '') || 'document';
    downloadFile(img.blob, `${baseName}_page_${img.pageNum}.${ext}`, `image/${format}`);
  };

  const handleDownloadAllZip = async () => {
    if (!file || convertedImages.length === 0) return;
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const baseName = file.name.replace('.pdf', '');
    const filesToZip = convertedImages.map((img) => ({
      filename: `${baseName}_page_${img.pageNum}.${ext}`,
      blob: img.blob,
    }));
    await createZipDownload(filesToZip, `${baseName}_images.zip`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Convert PDF to Images</h2>
        <p className="text-xs text-slate-400">
          Render PDF pages into crystal-clear PNG or JPEG image files. Download individually or 1-click batch ZIP.
        </p>
      </div>

      {!file ? (
        <Dropzone
          title="Select a PDF to extract pages as images"
          subtitle="Supports high-resolution PNG & JPEG exports"
          onFilesSelected={handleFileSelected}
          onSelectSample={onSelectSample}
        />
      ) : (
        <div className="space-y-6">
          {/* File Header & Options */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-semibold text-white">{file.name}</span>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setConvertedImages([]);
                }}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 transition-colors cursor-pointer"
              >
                Change PDF
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Image Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="png">PNG (Lossless & Sharpest)</option>
                  <option value="jpeg">JPEG (Compressed & Smaller)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Resolution / DPI</label>
                <select
                  value={dpi}
                  onChange={(e) => setDpi(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={1.5}>Standard Screen (~110 DPI)</option>
                  <option value={2.0}>High Definition (~150 DPI)</option>
                  <option value={3.0}>Ultra HD Print (~225 DPI)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleStartConversion}
                  disabled={isConverting}
                  className="w-full px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/50 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Converting Pages...
                    </>
                  ) : (
                    <>
                      <FileImage className="w-4 h-4" />
                      {convertedImages.length > 0 ? 'Re-Convert' : 'Convert Pages'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          {convertedImages.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  {convertedImages.length} Converted Pages
                </span>
                <button
                  onClick={handleDownloadAllZip}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download All as ZIP
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {convertedImages.map((img) => (
                  <div
                    key={img.pageNum}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-900 flex flex-col justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="aspect-[3/4] bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center p-2 mb-2">
                      <img
                        src={img.dataUrl}
                        alt={`Page ${img.pageNum}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
                      <span className="font-medium text-slate-300">Page {img.pageNum}</span>
                      <button
                        onClick={() => handleDownloadSingle(img)}
                        className="p-1 rounded hover:bg-slate-800 text-blue-400 hover:text-sky-300 cursor-pointer"
                        title="Download Image"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
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
