import { DetectedPII, ExtractedTable, StudyToolsData, DeepSummaryResult } from '../types';
import { formatAiErrorMessage } from './aiFallbacks';

async function parseResponseOrThrow(res: Response, fallbackPrefix: string) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const rawError = err.error || `${fallbackPrefix} (status ${res.status})`;
    throw new Error(formatAiErrorMessage(rawError));
  }
  return res.json();
}

export async function requestOCR(
  imageBase64: string,
  mimeType: string = 'image/png',
  language: string = 'auto'
): Promise<{ text: string; detectedLanguage?: string }> {
  const res = await fetch('/api/ai/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType, language }),
  });
  const data = await parseResponseOrThrow(res, 'OCR request failed');
  return {
    text: data.text || '',
    detectedLanguage: data.detectedLanguage || (language !== 'auto' ? language : 'Detected'),
  };
}

export async function requestDeepSummary(text: string): Promise<DeepSummaryResult> {
  const res = await fetch('/api/ai/summarize-deep', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return parseResponseOrThrow(res, 'Deep summary failed');
}

export async function requestSummary(options: {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
  format?: 'brief' | 'detailed' | 'bullet_points' | 'executive' | 'action_items';
}): Promise<string> {
  const res = await fetch('/api/ai/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  const data = await parseResponseOrThrow(res, 'Summary request failed');
  return data.summary;
}

export async function requestChat(options: {
  documentText?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  query: string;
}): Promise<string> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  const data = await parseResponseOrThrow(res, 'Chat request failed');
  return data.reply;
}

export async function requestDetectPII(text: string): Promise<DetectedPII[]> {
  const res = await fetch('/api/ai/detect-pii', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const data = await parseResponseOrThrow(res, 'PII detection failed');
  return (data.items || []).map((item: any) => ({ ...item, selected: true }));
}

export async function requestTranslation(text: string, targetLanguage: string): Promise<string> {
  const res = await fetch('/api/ai/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLanguage }),
  });
  const data = await parseResponseOrThrow(res, 'Translation failed');
  return data.translatedText;
}

export async function requestExtractTables(options: {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<ExtractedTable[]> {
  const res = await fetch('/api/ai/extract-tables', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  const data = await parseResponseOrThrow(res, 'Table extraction failed');
  return data.tables || [];
}

export async function requestStudyTools(text: string): Promise<StudyToolsData> {
  const res = await fetch('/api/ai/study-tools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return parseResponseOrThrow(res, 'Study tools request failed');
}
