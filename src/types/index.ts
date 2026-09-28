export type ToolCategory = 'all' | 'organize' | 'convert' | 'edit' | 'ai';

export type ToolId =
  | 'merge'
  | 'split'
  | 'organize'
  | 'images-to-pdf'
  | 'pdf-to-images'
  | 'pdf-to-text'
  | 'text-to-pdf'
  | 'page-numbers'
  | 'compress'
  | 'annotate'
  | 'ocr'
  | 'ai-chat'
  | 'ai-summarize'
  | 'ai-redact'
  | 'ai-translate'
  | 'ai-tables'
  | 'ai-study';

export interface ToolDef {
  id: ToolId;
  path: string;
  name: string;
  tagline: string;
  description: string;
  category: ToolCategory;
  icon: string;
  badge?: string;
  isAi?: boolean;
}

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount?: number;
  bytes?: Uint8Array;
  previewUrl?: string;
}

export interface PDFPageInfo {
  index: number;
  originalIndex: number;
  rotation: number;
  thumbnailUrl?: string;
  isDeleted?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  pageReferences?: number[];
}

export interface DetectedPII {
  text: string;
  category: 'name' | 'email' | 'phone' | 'financial' | 'address' | 'id';
  reason: string;
  selected?: boolean;
}

export interface ExtractedTable {
  title: string;
  csv: string;
  headers: string[];
  rows: string[][];
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface StudyToolsData {
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  keyConcepts: string[];
}

export interface DocumentEntity {
  name: string;
  category: string;
  description: string;
}

export interface DocumentTopic {
  topic: string;
  relevance: number;
  description: string;
}

export interface DocumentInsight {
  title: string;
  takeaway: string;
  category: string;
}

export interface SentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative' | 'cautious' | 'urgent' | 'constructive';
  score: number;
  analysis: string;
  keyPhrases: string[];
}

export interface DeepSummaryResult {
  summary: string;
  entities: DocumentEntity[];
  topics: DocumentTopic[];
  insights: DocumentInsight[];
  sentiment: SentimentAnalysis;
}

export interface CloudFile {
  id: string;
  userId: string;
  name: string;
  size: number;
  pageCount?: number;
  dataBase64?: string;
  textContent?: string;
  summary?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OperationRecord {
  id: string;
  userId: string;
  toolId: string;
  toolName: string;
  fileName: string;
  status: 'success' | 'failed' | 'processing';
  details: string;
  timestamp: string;
}

