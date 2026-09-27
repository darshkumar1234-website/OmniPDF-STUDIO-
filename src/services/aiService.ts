import { DetectedPII, ExtractedTable, StudyToolsData, DeepSummaryResult } from '../types';

export async function requestOCR(
  imageBase64: string,
  mimeType: string = 'image/png',
  language: string = 'auto'
): Promise<{ text: string; detectedLanguage?: string }> {
  const res = await fetch('/api/gemini/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `OCR request failed with status ${res.status}`);
  }
  const data = await res.json();
  return {
    text: data.text || '',
    detectedLanguage: data.detectedLanguage || (language !== 'auto' ? language : 'Detected'),
  };
}

export async function requestDeepSummary(text: string): Promise<DeepSummaryResult> {
  const res = await fetch('/api/gemini/summarize-deep', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Deep summary failed (${res.status})`);
  }
  const data = await res.json();
  return data;
}

export async function requestSummary(options: {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
  format?: 'brief' | 'detailed' | 'bullet_points' | 'executive' | 'action_items';
}): Promise<string> {
  const res = await fetch('/api/gemini/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Summary request failed (${res.status})`);
  }
  const data = await res.json();
  return data.summary;
}

export async function requestChat(options: {
  documentText?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  query: string;
}): Promise<string> {
  const res = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Chat request failed (${res.status})`);
  }
  const data = await res.json();
  return data.reply;
}

export async function requestDetectPII(text: string): Promise<DetectedPII[]> {
  const res = await fetch('/api/gemini/detect-pii', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `PII detection failed (${res.status})`);
  }
  const data = await res.json();
  return (data.items || []).map((item: any) => ({ ...item, selected: true }));
}

export async function requestTranslation(text: string, targetLanguage: string): Promise<string> {
  const res = await fetch('/api/gemini/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLanguage }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Translation failed (${res.status})`);
  }
  const data = await res.json();
  return data.translatedText;
}

export async function requestExtractTables(options: {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<ExtractedTable[]> {
  const res = await fetch('/api/gemini/extract-tables', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Table extraction failed (${res.status})`);
  }
  const data = await res.json();
  return data.tables || [];
}

export async function requestStudyTools(text: string): Promise<StudyToolsData> {
  const res = await fetch('/api/gemini/study-tools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Study tools request failed (${res.status})`);
  }
  const data = await res.json();
  return data;
}
