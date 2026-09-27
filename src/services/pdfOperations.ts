import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';

/**
 * Trigger browser file download
 */
export function downloadFile(data: Uint8Array | Blob, filename: string, mimeType: string = 'application/pdf') {
  const blob = data instanceof Blob ? data : new Blob([data.buffer as ArrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Merge multiple PDF files into a single PDF
 */
export async function mergePDFs(files: { name: string; bytes: Uint8Array }[]): Promise<Uint8Array> {
  if (files.length === 0) throw new Error('No files provided to merge');

  const mergedDoc = await PDFDocument.create();

  for (const file of files) {
    const srcDoc = await PDFDocument.load(file.bytes, { ignoreEncryption: true });
    const pageIndices = srcDoc.getPageIndices();
    const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => mergedDoc.addPage(page));
  }

  return await mergedDoc.save();
}

/**
 * Parse page range string like "1-3, 5, 7-10" into 0-indexed page numbers
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  const pagesSet = new Set<number>();
  const parts = rangeStr.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
      for (let i = start; i <= end; i++) {
        pagesSet.add(i - 1);
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        pagesSet.add(page - 1);
      }
    }
  }

  return Array.from(pagesSet).sort((a, b) => a - b);
}

/**
 * Split a PDF into either a single extracted PDF or multiple PDFs (one per range/page)
 */
export async function splitPDF(
  srcBytes: Uint8Array,
  ranges: string,
  mode: 'extract_selected' | 'split_ranges' | 'all_pages'
): Promise<{ filename: string; bytes: Uint8Array }[]> {
  const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const results: { filename: string; bytes: Uint8Array }[] = [];

  if (mode === 'all_pages') {
    for (let i = 0; i < totalPages; i++) {
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copiedPage);
      const bytes = await newDoc.save();
      results.push({ filename: `page_${i + 1}.pdf`, bytes });
    }
  } else if (mode === 'extract_selected') {
    const indices = parsePageRange(ranges, totalPages);
    if (indices.length === 0) throw new Error('No valid pages specified');

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach((p) => newDoc.addPage(p));
    const bytes = await newDoc.save();
    results.push({ filename: `extracted_pages.pdf`, bytes });
  } else {
    // split_ranges: each comma-separated segment becomes a separate file
    const segments = ranges.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    let count = 1;
    for (const segment of segments) {
      const indices = parsePageRange(segment, totalPages);
      if (indices.length === 0) continue;
      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(srcDoc, indices);
      copiedPages.forEach((p) => newDoc.addPage(p));
      const bytes = await newDoc.save();
      results.push({ filename: `split_part_${count}_pages_${segment.replace(/\s+/g, '')}.pdf`, bytes });
      count++;
    }
  }

  return results;
}

/**
 * Reorganize, reorder, rotate, and delete pages from PDF
 */
export async function reorderAndRotatePDF(
  srcBytes: Uint8Array,
  pageConfigs: { originalIndex: number; rotation: number; isDeleted?: boolean }[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();

  const activePages = pageConfigs.filter((p) => !p.isDeleted);
  if (activePages.length === 0) {
    throw new Error('At least one page must remain in the document');
  }

  for (const pageConfig of activePages) {
    const [copiedPage] = await newDoc.copyPages(srcDoc, [pageConfig.originalIndex]);
    const currentRotation = copiedPage.getRotation().angle;
    copiedPage.setRotation(degrees((currentRotation + pageConfig.rotation) % 360));
    newDoc.addPage(copiedPage);
  }

  return await newDoc.save();
}

/**
 * Convert multiple image files (JPG, PNG) into a clean, watermark-free PDF
 */
export async function convertImagesToPDF(
  images: { bytes: Uint8Array; mimeType: string }[],
  options: {
    pageSize: 'fit' | 'a4' | 'letter';
    orientation: 'portrait' | 'landscape' | 'auto';
    margin: number;
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Dimensions in points (72 points = 1 inch)
  const A4 = { width: 595.28, height: 841.89 };
  const LETTER = { width: 612.0, height: 792.0 };

  for (const item of images) {
    let embeddedImage;
    if (item.mimeType === 'image/png') {
      embeddedImage = await pdfDoc.embedPng(item.bytes);
    } else {
      // default jpg / webp converted
      embeddedImage = await pdfDoc.embedJpg(item.bytes);
    }

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    let targetWidth: number;
    let targetHeight: number;

    if (options.pageSize === 'fit') {
      targetWidth = imgWidth + options.margin * 2;
      targetHeight = imgHeight + options.margin * 2;
    } else {
      const base = options.pageSize === 'a4' ? A4 : LETTER;
      let isLandscape = false;

      if (options.orientation === 'landscape') {
        isLandscape = true;
      } else if (options.orientation === 'portrait') {
        isLandscape = false;
      } else {
        // auto
        isLandscape = imgWidth > imgHeight;
      }

      targetWidth = isLandscape ? base.height : base.width;
      targetHeight = isLandscape ? base.width : base.height;
    }

    const page = pdfDoc.addPage([targetWidth, targetHeight]);

    // Calculate image fitting with margins
    const availWidth = targetWidth - options.margin * 2;
    const availHeight = targetHeight - options.margin * 2;

    const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight, 1.0);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;

    const x = (targetWidth - drawWidth) / 2;
    const y = (targetHeight - drawHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return await pdfDoc.save();
}

/**
 * Add custom page numbers or header/footer to all pages
 */
export async function addPageNumbers(
  srcBytes: Uint8Array,
  options: {
    format: string; // e.g. "Page {page} of {total}" or "{page}"
    position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
    startFrom: number;
    fontSize: number;
    margin: number;
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const totalPages = pdfDoc.getPageCount();

  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    const pageNum = options.startFrom + i;
    const text = options.format
      .replace('{page}', pageNum.toString())
      .replace('{total}', (options.startFrom + totalPages - 1).toString());

    const textWidth = font.widthOfTextAtSize(text, options.fontSize);
    const textHeight = font.heightAtSize(options.fontSize);

    let x = (width - textWidth) / 2;
    let y = options.margin;

    switch (options.position) {
      case 'bottom-left':
        x = options.margin;
        y = options.margin;
        break;
      case 'bottom-center':
        x = (width - textWidth) / 2;
        y = options.margin;
        break;
      case 'bottom-right':
        x = width - textWidth - options.margin;
        y = options.margin;
        break;
      case 'top-left':
        x = options.margin;
        y = height - textHeight - options.margin;
        break;
      case 'top-center':
        x = (width - textWidth) / 2;
        y = height - textHeight - options.margin;
        break;
      case 'top-right':
        x = width - textWidth - options.margin;
        y = height - textHeight - options.margin;
        break;
    }

    page.drawText(text, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(0.2, 0.25, 0.3),
    });
  }

  return await pdfDoc.save();
}

/**
 * Convert plain text or markdown notes into a clean, formatted PDF
 */
export async function convertTextToPDF(text: string, title: string = 'Document'): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const contentWidth = pageWidth - margin * 2;
  const fontSize = 11;
  const lineHeight = 16;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  // Title
  if (title) {
    currentPage.drawText(title, {
      x: margin,
      y: currentY - 20,
      size: 20,
      font: fontBold,
      color: rgb(0.1, 0.12, 0.18),
    });
    currentY -= 45;
  }

  const lines = text.split('\n');

  for (const rawLine of lines) {
    const isHeading = rawLine.startsWith('# ') || rawLine.startsWith('## ');
    const cleanLine = rawLine.replace(/^#+\s*/, '');
    const activeFont = isHeading ? fontBold : fontRegular;
    const activeSize = isHeading ? 14 : fontSize;
    const activeLineHeight = isHeading ? 22 : lineHeight;

    // Word wrap
    const words = cleanLine.split(' ');
    let currentLineBuffer = '';

    for (const word of words) {
      const testLine = currentLineBuffer ? `${currentLineBuffer} ${word}` : word;
      const width = activeFont.widthOfTextAtSize(testLine, activeSize);

      if (width > contentWidth && currentLineBuffer !== '') {
        if (currentY - activeLineHeight < margin) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
        }

        currentPage.drawText(currentLineBuffer, {
          x: margin,
          y: currentY,
          size: activeSize,
          font: activeFont,
          color: rgb(0.15, 0.18, 0.22),
        });

        currentY -= activeLineHeight;
        currentLineBuffer = word;
      } else {
        currentLineBuffer = testLine;
      }
    }

    if (currentLineBuffer) {
      if (currentY - activeLineHeight < margin) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
      }

      currentPage.drawText(currentLineBuffer, {
        x: margin,
        y: currentY,
        size: activeSize,
        font: activeFont,
        color: rgb(0.15, 0.18, 0.22),
      });

      currentY -= activeLineHeight;
    }

    if (isHeading) currentY -= 6;
  }

  return await pdfDoc.save();
}

/**
 * Burn annotations (text, signatures, drawings) onto the PDF pages permanently
 */
export async function applyAnnotationsToPDF(
  srcBytes: Uint8Array,
  annotationsByPage: Record<
    number,
    {
      type: 'text' | 'draw' | 'stamp' | 'redact';
      x: number; // percentage 0 - 100
      y: number; // percentage 0 - 100
      width?: number; // percentage
      height?: number; // percentage
      text?: string;
      color?: string;
      fontSize?: number;
      points?: { x: number; y: number }[]; // canvas coordinates
      lineWidth?: number;
    }[]
  >
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const pageIdxStr of Object.keys(annotationsByPage)) {
    const pageIndex = parseInt(pageIdxStr, 10);
    if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) continue;

    const page = pdfDoc.getPage(pageIndex);
    const { width: pWidth, height: pHeight } = page.getSize();
    const items = annotationsByPage[pageIndex];

    for (const item of items) {
      if (item.type === 'text' && item.text) {
        const x = (item.x / 100) * pWidth;
        const y = pHeight - (item.y / 100) * pHeight;
        const fSize = item.fontSize || 14;

        page.drawText(item.text, {
          x,
          y: y - fSize,
          size: fSize,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
      } else if (item.type === 'redact') {
        const x = (item.x / 100) * pWidth;
        const width = ((item.width || 10) / 100) * pWidth;
        const height = ((item.height || 4) / 100) * pHeight;
        const y = pHeight - (item.y / 100) * pHeight - height;

        page.drawRectangle({
          x,
          y,
          width,
          height,
          color: rgb(0, 0, 0),
        });
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Zip multiple files for 1-click batch download
 */
export async function createZipDownload(
  files: { filename: string; blob?: Blob; bytes?: Uint8Array }[],
  zipFilename: string = 'OmniPDF_Export.zip'
) {
  const zip = new JSZip();

  for (const f of files) {
    if (f.blob) {
      zip.file(f.filename, f.blob);
    } else if (f.bytes) {
      zip.file(f.filename, f.bytes);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  downloadFile(content, zipFilename, 'application/zip');
}
