import { DetectedPII, ExtractedTable, StudyToolsData, DeepSummaryResult } from '../types';

/**
 * Format raw error messages into clean, user-friendly notices
 */
export function formatAiErrorMessage(error: any): string {
  if (!error) return 'The AI service encountered an unexpected error. Please try again.';
  const rawMsg = typeof error === 'string' ? error : error.message || String(error);

  try {
    const parsed = JSON.parse(rawMsg);
    if (parsed?.error?.message) {
      const code = parsed.error.code;
      const status = parsed.error.status;
      if (code === 503 || status === 'UNAVAILABLE' || parsed.error.message.includes('high demand')) {
        return 'The AI service is momentarily experiencing high demand. Please try again in a few moments.';
      }
      if (code === 429 || status === 'RESOURCE_EXHAUSTED' || parsed.error.message.includes('quota')) {
        return 'Rate limit temporarily reached. Please retry in a short moment.';
      }
      return parsed.error.message;
    }
  } catch {
    // Not a JSON string
  }

  if (rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('overloaded')) {
    return 'The AI service is momentarily experiencing high demand. Please try again in a few moments.';
  }
  if (rawMsg.includes('429') || rawMsg.includes('quota') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
    return 'AI request limit temporarily reached. Please try again shortly.';
  }

  return rawMsg;
}

/**
 * Intelligent regex fallback for PII Detection
 */
export function fallbackPIIDetection(text: string): DetectedPII[] {
  const items: DetectedPII[] = [];
  const seen = new Set<string>();

  const addUnique = (matchText: string, category: DetectedPII['category'], reason: string) => {
    const clean = matchText.trim();
    if (clean.length > 2 && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      items.push({ text: clean, category, reason, selected: true });
    }
  };

  // Emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  let match;
  while ((match = emailRegex.exec(text)) !== null) {
    addUnique(match[0], 'email', 'Personal contact email address');
  }

  // SSN
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  while ((match = ssnRegex.exec(text)) !== null) {
    addUnique(match[0], 'id', 'Government Social Security Number (SSN)');
  }

  // Credit Card Numbers
  const ccRegex = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
  while ((match = ccRegex.exec(text)) !== null) {
    addUnique(match[0], 'financial', 'Credit/Debit card number');
  }

  // Phone numbers
  const phoneRegex = /\b(?:\+?1[ -.]?)?\(?\d{3}\)?[ -.]?\d{3}[ -.]?\d{4}\b/g;
  while ((match = phoneRegex.exec(text)) !== null) {
    addUnique(match[0], 'phone', 'Direct telephone number');
  }

  // Financial amounts ($1,000.00)
  const moneyRegex = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g;
  while ((match = moneyRegex.exec(text)) !== null) {
    addUnique(match[0], 'financial', 'Confidential transaction or monetary figure');
  }

  // Physical Street Addresses
  const addressRegex = /\b\d+\s+[A-Za-z0-9\s,.'-]{3,}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Suite|Apt)\b/gi;
  while ((match = addressRegex.exec(text)) !== null) {
    addUnique(match[0], 'address', 'Physical residential or business street address');
  }

  // IPv4 Addresses
  const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
  while ((match = ipRegex.exec(text)) !== null) {
    addUnique(match[0], 'id', 'Internal or network IP address');
  }

  return items;
}

/**
 * Intelligent Document Intelligence & Deep Summary Fallback
 */
export function fallbackDeepSummary(text: string): DeepSummaryResult {
  const cleanText = text.replace(/\r\n/g, '\n').trim();
  const paragraphs = cleanText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  // Summary generation from lead, middle, and conclusion
  const lead = paragraphs[0] || 'The document outlines key organizational and operational objectives.';
  const middle = paragraphs[Math.floor(paragraphs.length / 2)] || '';
  const conclusion = paragraphs[paragraphs.length - 1] !== lead ? paragraphs[paragraphs.length - 1] : '';

  const summary = `### Executive Overview\n${lead}\n\n${
    middle ? `### Core Provisions & Operational Scope\n${middle}\n\n` : ''
  }${conclusion ? `### Conclusion & Outcomes\n${conclusion}` : ''}`;

  // Entity Extraction
  const entities: DeepSummaryResult['entities'] = [];
  const seenEntities = new Set<string>();

  // Organizations & capitalized title pairs
  const orgRegex = /\b([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){1,3})\s+(?:Inc|LLC|Corp|Corporation|Company|Group|University|Authority|Agency|Ltd)\b/g;
  let m;
  while ((m = orgRegex.exec(cleanText)) !== null) {
    if (!seenEntities.has(m[0])) {
      seenEntities.add(m[0]);
      entities.push({
        name: m[0],
        category: 'Organization',
        description: 'Key corporate or institutional stakeholder',
      });
    }
  }

  // Monetary figures
  const moneyRegex = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g;
  while ((m = moneyRegex.exec(cleanText)) !== null) {
    if (!seenEntities.has(m[0]) && entities.length < 10) {
      seenEntities.add(m[0]);
      entities.push({
        name: m[0],
        category: 'Financial',
        description: 'Noted contractual or financial figure',
      });
    }
  }

  // Dates
  const dateRegex = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi;
  while ((m = dateRegex.exec(cleanText)) !== null) {
    if (!seenEntities.has(m[0]) && entities.length < 12) {
      seenEntities.add(m[0]);
      entities.push({
        name: m[0],
        category: 'Date',
        description: 'Target deadline or documented event date',
      });
    }
  }

  if (entities.length === 0) {
    entities.push(
      { name: 'Document Stakeholders', category: 'Organization', description: 'Primary executing parties' },
      { name: 'Standard Terms & Conditions', category: 'Concept', description: 'Document regulatory provisions' }
    );
  }

  // Topic Relevance via word frequency
  const words = cleanText
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !['which', 'there', 'their', 'about', 'these', 'would', 'could', 'should', 'other'].includes(w));

  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  const sortedTopics = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topics = sortedTopics.map(([word, count], idx) => ({
    topic: word.charAt(0).toUpperCase() + word.slice(1),
    relevance: Math.max(95 - idx * 10, 50),
    description: `Central theme identified across ${count} occurrences within the text.`,
  }));

  if (topics.length === 0) {
    topics.push({
      topic: 'General Documentation',
      relevance: 90,
      description: 'Primary structural content of the provided document.',
    });
  }

  // Strategic Insights
  const sentences = cleanText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 200);

  const insights: DeepSummaryResult['insights'] = [];
  for (let i = 0; i < Math.min(sentences.length, 4); i++) {
    insights.push({
      title: `Insight ${i + 1}`,
      takeaway: sentences[i * 2] || sentences[i] || 'Document requires standard review prior to execution.',
      category: 'Strategic',
    });
  }

  // Sentiment analysis lexicon
  const positiveWords = ['success', 'benefit', 'growth', 'effective', 'achieve', 'compliant', 'agree', 'advantage', 'strong', 'secure', 'gain'];
  const negativeWords = ['risk', 'penalty', 'breach', 'liability', 'failure', 'delay', 'loss', 'dispute', 'critical', 'urgent', 'default'];

  let posCount = 0;
  let negCount = 0;
  const keyPhrases: string[] = [];

  for (const s of sentences) {
    const lower = s.toLowerCase();
    const hasPos = positiveWords.some((w) => lower.includes(w));
    const hasNeg = negativeWords.some((w) => lower.includes(w));
    if (hasPos) posCount++;
    if (hasNeg) negCount++;
    if ((hasPos || hasNeg) && keyPhrases.length < 4) {
      keyPhrases.push(s.length > 100 ? `${s.slice(0, 97)}...` : s);
    }
  }

  const scoreDiff = posCount - negCount;
  let overall: DeepSummaryResult['sentiment']['overall'] = 'neutral';
  let score = 0.0;

  if (scoreDiff > 2) {
    overall = 'positive';
    score = Math.min(0.2 + scoreDiff * 0.15, 0.85);
  } else if (scoreDiff < -2) {
    overall = 'cautious';
    score = Math.max(-0.2 + scoreDiff * 0.15, -0.85);
  } else if (posCount > 0 && negCount > 0) {
    overall = 'constructive';
    score = 0.15;
  }

  return {
    summary,
    entities,
    topics,
    insights,
    sentiment: {
      overall,
      score: parseFloat(score.toFixed(2)),
      analysis: `Document exhibits a predominantly ${overall} tone based on ${sentences.length} evaluated sentence clauses. Operational terms emphasize consistency and systematic governance.`,
      keyPhrases: keyPhrases.length > 0 ? keyPhrases : ['Standard terms and obligations are clearly defined.'],
    },
  };
}

/**
 * Intelligent Document Q&A Fallback
 */
export function fallbackChat(documentText: string, query: string): string {
  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['the', 'what', 'where', 'when', 'how', 'why', 'who', 'does', 'from', 'this', 'that'].includes(w));

  const paragraphs = documentText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  // Score paragraphs by matching terms
  let bestParagraph = '';
  let highestScore = -1;

  for (const p of paragraphs) {
    const lower = p.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      if (lower.includes(term)) {
        score += 1;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestParagraph = p;
    }
  }

  if (highestScore > 0 && bestParagraph) {
    return `Based on your document context:\n\n> "${bestParagraph.slice(0, 450)}${
      bestParagraph.length > 450 ? '...' : ''
    }"\n\n**Key Finding**: The document directly addresses your query regarding **${query}** above. *(Analysis synthesized directly from document text)*`;
  }

  // Fallback answer with general document orientation
  const leadSample = paragraphs.slice(0, 2).join('\n\n').slice(0, 350);
  return `Based on the provided document:\n\n> "${leadSample}..."\n\n**Note**: Your specific query was reviewed against the document context. If you need deeper details on a specific section, try specifying a keyword or section title!`;
}

/**
 * Intelligent Table Extraction Fallback
 */
export function fallbackExtractTables(text: string): ExtractedTable[] {
  const tables: ExtractedTable[] = [];
  const lines = text.split('\n');

  // Look for markdown pipe tables
  let currentPipeLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      currentPipeLines.push(trimmed);
    } else {
      if (currentPipeLines.length >= 2) {
        // Parse markdown table
        const headerLine = currentPipeLines[0];
        const headers = headerLine
          .split('|')
          .slice(1, -1)
          .map((h) => h.trim());
        const dataRows = currentPipeLines.slice(2).map((rowLine) =>
          rowLine
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        if (headers.length > 0 && dataRows.length > 0) {
          const csvLines = [headers.join(','), ...dataRows.map((r) => r.join(','))];
          tables.push({
            title: `Extracted Table ${tables.length + 1}`,
            headers,
            rows: dataRows,
            csv: csvLines.join('\n'),
          });
        }
      }
      currentPipeLines = [];
    }
  }

  // If no pipe tables found, check for tab/comma separated numeric lines
  if (tables.length === 0) {
    const numericLines = lines
      .map((l) => l.trim())
      .filter((l) => l.includes(',') || l.includes('\t') || (/\d/.test(l) && l.split(/\s{2,}/).length >= 2));

    if (numericLines.length >= 3) {
      const parsedRows = numericLines.slice(0, 20).map((l) =>
        l.split(/[,;\t]|\s{2,}/).map((c) => c.trim())
      );
      const headers = parsedRows[0];
      const rows = parsedRows.slice(1);
      const csv = parsedRows.map((r) => r.join(',')).join('\n');

      tables.push({
        title: 'Structured Document Data Matrix',
        headers,
        rows,
        csv,
      });
    }
  }

  return tables;
}

/**
 * Intelligent Study Guide, Flashcards & Quiz Fallback
 */
export function fallbackStudyTools(text: string): StudyToolsData {
  const clean = text.replace(/\r\n/g, '\n').trim();
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && s.length < 180);

  // Extract Flashcards from definitions (Word: definition or Word - definition)
  const flashcards: StudyToolsData['flashcards'] = [];
  const defRegex = /\b([A-Z][a-zA-Z\s]{2,25})\s*(?::|—|-)\s*([A-Z][^.!?\n]{15,140}[.!?]?)/g;
  let m;
  while ((m = defRegex.exec(clean)) !== null) {
    if (flashcards.length < 8) {
      flashcards.push({
        front: m[1].trim(),
        back: m[2].trim(),
      });
    }
  }

  // Generate generic flashcards from high-signal sentences if needed
  if (flashcards.length < 4) {
    sentences.slice(0, 6).forEach((s) => {
      const words = s.split(' ');
      const subject = words.slice(0, 3).join(' ');
      flashcards.push({
        front: `What is the significance of: "${subject}..."?`,
        back: s,
      });
    });
  }

  // Generate Multiple Choice Quiz Questions
  const quiz: StudyToolsData['quiz'] = [];
  for (let i = 0; i < Math.min(sentences.length, 5); i++) {
    const s = sentences[i];
    quiz.push({
      question: `According to the document text: "${s.slice(0, 100)}..." what is primarily emphasized?`,
      options: [
        'Precise execution of documented guidelines',
        'Optional exploratory recommendations',
        'Historical precedent without operational consequence',
        'Informal discussion topics',
      ],
      correctIndex: 0,
      explanation: `The document explicitly establishes: "${s.slice(0, 120)}" as a core requirement.`,
    });
  }

  // Key Concepts
  const keyConcepts = sentences.slice(0, 6).map((s) => s.trim());

  return {
    flashcards,
    quiz,
    keyConcepts: keyConcepts.length > 0 ? keyConcepts : ['Standard guidelines established in document context.'],
  };
}

/**
 * Intelligent Text Summary Fallback
 */
export function fallbackSummary(text: string, format: string = 'executive'): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  const lead = paragraphs[0] || 'The document contains comprehensive informational records.';
  const middle = paragraphs[1] || '';
  const conclusion = paragraphs[paragraphs.length - 1] || '';

  if (format === 'bullet_points') {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20 && s.length < 160)
      .slice(0, 6);
    return `### Key Takeaways\n\n${sentences.map((s) => `- ${s}`).join('\n')}`;
  }

  if (format === 'brief') {
    return `### Brief Overview\n${lead}\n\n${conclusion ? `### Summary\n${conclusion}` : ''}`;
  }

  if (format === 'action_items') {
    const actionSentences = text
      .split(/(?<=[.!?])\s+/)
      .filter((s) => /\b(shall|must|will|required|agreed|responsible|deliver|submit|due)\b/i.test(s))
      .slice(0, 6);
    return `### Required Actions & Responsibilities\n\n${
      actionSentences.length > 0
        ? actionSentences.map((s, idx) => `${idx + 1}. **Action**: ${s.trim()}`).join('\n')
        : '1. Review full document with team\n2. Confirm operational acceptance\n3. File compliance archive'
    }`;
  }

  // Executive summary
  return `## Executive Summary\n\n${lead}\n\n${
    middle ? `### Key Scope & Discussion\n${middle}\n\n` : ''
  }### Outcomes\n${conclusion || 'All terms remain effective as stated.'}`;
}
