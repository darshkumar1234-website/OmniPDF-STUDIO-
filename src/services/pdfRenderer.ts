import * as pdfjsLib from 'pdfjs-dist';

// Configure CDN worker for standard browser execution
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/**
 * Load a PDF document from Uint8Array
 */
export async function loadPdfDocument(data: Uint8Array) {
  // Clone data buffer so worker transfer never detaches/neuters the caller's ArrayBuffer
  const clone = new Uint8Array(data.byteLength);
  clone.set(data);
  const loadingTask = pdfjsLib.getDocument({
    data: clone,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  return await loadingTask.promise;
}

/**
 * Render a single page to an HTML Canvas
 */
export async function renderPageToCanvas(
  pdfDoc: any,
  pageNum: number,
  scale: number = 1.5,
  rotationOffset: number = 0
): Promise<HTMLCanvasElement> {
  const page = await pdfDoc.getPage(pageNum);
  const rotation = (page.rotate + rotationOffset) % 360;
  const viewport = page.getViewport({ scale, rotation });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not get 2D canvas context');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;
  return canvas;
}

/**
 * Render thumbnail data URL for a specific page
 */
export async function renderPageThumbnail(
  pdfDoc: any,
  pageNum: number,
  maxDimension: number = 320,
  rotationOffset: number = 0
): Promise<string> {
  const page = await pdfDoc.getPage(pageNum);
  const initialViewport = page.getViewport({ scale: 1.0 });
  const longestSide = Math.max(initialViewport.width, initialViewport.height);
  const scale = maxDimension / longestSide;

  const canvas = await renderPageToCanvas(pdfDoc, pageNum, scale, rotationOffset);
  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Generate a thumbnail data URL and page count directly from a File, Blob, Uint8Array or ArrayBuffer
 */
export async function generatePdfThumbnail(
  fileOrBytes: File | Blob | Uint8Array | ArrayBuffer,
  pageNum: number = 1,
  maxDimension: number = 360
): Promise<{ thumbnailUrl: string; numPages: number }> {
  // Handle direct image files (e.g. in Image-to-PDF tool)
  if (fileOrBytes instanceof File || fileOrBytes instanceof Blob) {
    if (fileOrBytes.type.startsWith('image/')) {
      const url = URL.createObjectURL(fileOrBytes);
      return { thumbnailUrl: url, numPages: 1 };
    }
  }

  let bytes: Uint8Array;
  if (fileOrBytes instanceof Uint8Array) {
    bytes = fileOrBytes;
  } else if (fileOrBytes instanceof ArrayBuffer) {
    bytes = new Uint8Array(fileOrBytes);
  } else {
    const buffer = await fileOrBytes.arrayBuffer();
    bytes = new Uint8Array(buffer);
  }

  // Detect image magic bytes
  if (
    (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) ||
    (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)
  ) {
    const blob = new Blob([bytes as unknown as BlobPart]);
    const url = URL.createObjectURL(blob);
    return { thumbnailUrl: url, numPages: 1 };
  }

  const doc = await loadPdfDocument(bytes);
  const targetPage = Math.min(Math.max(1, pageNum), doc.numPages);
  const thumbnailUrl = await renderPageThumbnail(doc, targetPage, maxDimension);
  return { thumbnailUrl, numPages: doc.numPages };
}

/**
 * Extract all text from a PDF document page by page
 */
export async function extractTextFromPDF(data: Uint8Array): Promise<{
  fullText: string;
  pages: { pageNum: number; text: string }[];
}> {
  const doc = await loadPdfDocument(data);
  const pages: { pageNum: number; text: string }[] = [];
  let fullText = '';

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    pages.push({ pageNum: i, text: pageText });
    fullText += (i > 1 ? '\n\n' : '') + `--- Page ${i} ---\n` + pageText;
  }

  return { fullText, pages };
}

/**
 * Convert PDF pages to images (PNG or JPEG)
 */
export async function convertPdfToImages(
  data: Uint8Array,
  format: 'png' | 'jpeg' = 'png',
  dpiScale: number = 2.0
): Promise<{ pageNum: number; dataUrl: string; blob: Blob }[]> {
  const doc = await loadPdfDocument(data);
  const results: { pageNum: number; dataUrl: string; blob: Blob }[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const canvas = await renderPageToCanvas(doc, i, dpiScale);
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpeg' ? 0.92 : undefined;
    const dataUrl = canvas.toDataURL(mimeType, quality);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), mimeType, quality);
    });

    results.push({ pageNum: i, dataUrl, blob });
  }

  return results;
}
