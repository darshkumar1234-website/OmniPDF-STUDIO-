import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import {
  formatAiErrorMessage,
  fallbackPIIDetection,
  fallbackDeepSummary,
  fallbackChat,
  fallbackExtractTables,
  fallbackStudyTools,
  fallbackSummary,
} from './src/services/aiFallbacks';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Initialize GoogleGenAI SDK with required user-agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

/**
 * Determine if an error is temporary or overload-related and can be retried
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : error.message || String(error);
  return (
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('high demand') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('overloaded') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('rate limit') ||
    msg.includes('try again later') ||
    msg.includes('fetch failed') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT')
  );
}

/**
 * Call Gemini with automated backoff retry and alternate model fallbacks
 * Sequence: gemini-3.8-flash -> gemini-flash-latest -> gemini-3.1-flash-lite
 */
async function callGeminiWithRetry(options: {
  contents: any;
  config?: any;
  primaryModel?: string;
}): Promise<any> {
  const models = [
    options.primaryModel || 'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];

  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Engine] Attempt ${attempt + 1} with ${model} encountered:`, err?.message || err);
        if (!isRetryableError(err)) {
          // If fatal invalid parameter, don't repeat this model
          break;
        }
        // Exponential backoff with random jitter
        const delay = (attempt + 1) * 800 + Math.random() * 400;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

// 1. Advanced Multi-Language OCR Endpoint
app.post(['/api/ai/ocr', '/api/gemini/ocr'], async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/png', language = 'auto', enhanceFormatting = true } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 payload' });
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const languageInstruction = language && language !== 'auto'
      ? `The document is primarily or partially in ${language}. Ensure accurate extraction of characters, diacritics, script features, and vocabulary in ${language}.`
      : `Detect the language(s) automatically (including multilingual or mixed scripts such as English, Spanish, French, German, Japanese, Chinese, Arabic, Hindi, Russian, etc.).`;

    const prompt = `You are an advanced, ultra-high-precision optical character recognition (OCR) and document digitization engine.
Extract all visible text from this document image with 100% accuracy.
${languageInstruction}

Instructions:
- Maintain original structural layout: hierarchy (#, ##, ###), paragraphs, numbered lists, bullet lists, footnotes, and tables (using GitHub-flavored Markdown tables).
- Read both printed typography and handwritten annotations or signatures.
- Retain math symbols, currency codes, invoice line items, dates, and technical nomenclature verbatim.
- Detect the predominant language used.
- Do NOT output conversational filler like "Here is the transcription:".
- Only output the exact extracted document content.`;

    const response = await callGeminiWithRetry({
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        temperature: 0.1,
      },
    });

    return res.json({
      text: response.text || '',
      detectedLanguage: language !== 'auto' ? language : 'Detected',
    });
  } catch (error: any) {
    console.error('OCR Error:', error);
    return res.status(500).json({ error: formatAiErrorMessage(error) });
  }
});

// 1b. Deep PDF Summarizer with Entities, Topics, Insights, and Sentiment Analysis
app.post(['/api/ai/summarize-deep', '/api/gemini/summarize-deep'], async (req: Request, res: Response) => {
  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Document text is required for analysis' });
  }

  const prompt = `Analyze this PDF document and perform a comprehensive document intelligence breakdown:
1. "summary": Provide a concise, structured executive summary covering the main purpose, essential background, and outcomes.
2. "entities": Extract all key named entities (Organizations, People, Locations, Dates/Deadlines, Financial figures/Amounts, Laws/Standards).
3. "topics": Identify the top 4-8 core themes/topics with a relevance percentage (0-100) and brief description.
4. "insights": Extract 4-6 strategic insights or high-impact takeaways from the document.
5. "sentiment": Conduct sentiment & tonal analysis of the document text:
   - "overall": One of "positive", "neutral", "negative", "cautious", "urgent", or "constructive".
   - "score": A numeric score from -1.0 (strongly negative/critical) to +1.0 (strongly positive/enthusiastic), with 0.0 being objective/neutral.
   - "analysis": A clear 2-3 sentence explanation of the document's tone, urgency, perspective, and underlying sentiment.
   - "keyPhrases": 3-6 quotes or key phrases that demonstrate the tonal sentiment.

Document Text (excerpt or full):
${text.slice(0, 60000)}`;

  try {
    const response = await callGeminiWithRetry({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            entities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING, description: 'Organization, Person, Date, Financial, Location, Concept' },
                  description: { type: Type.STRING },
                },
                required: ['name', 'category', 'description'],
              },
            },
            topics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  relevance: { type: Type.INTEGER, description: 'Percentage 0-100' },
                  description: { type: Type.STRING },
                },
                required: ['topic', 'relevance', 'description'],
              },
            },
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  takeaway: { type: Type.STRING },
                },
                required: ['title', 'takeaway'],
              },
            },
            sentiment: {
              type: Type.OBJECT,
              properties: {
                overall: { type: Type.STRING, description: 'positive, neutral, negative, cautious, urgent, constructive' },
                score: { type: Type.NUMBER, description: 'Score between -1.0 and 1.0' },
                analysis: { type: Type.STRING, description: 'Tonal and perspective analysis' },
                keyPhrases: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Key excerpts demonstrating sentiment',
                },
              },
              required: ['overall', 'score', 'analysis', 'keyPhrases'],
            },
          },
          required: ['summary', 'entities', 'topics', 'insights', 'sentiment'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.warn('Deep Summarization API unavailable, engaging resilient document intelligence fallback:', error?.message);
    try {
      const fallbackResult = fallbackDeepSummary(text);
      return res.json(fallbackResult);
    } catch (fallbackError: any) {
      console.error('Deep Summarization Fallback Error:', fallbackError);
      return res.status(500).json({ error: formatAiErrorMessage(error) });
    }
  }
});

// 2. Summarize Document
app.post(['/api/ai/summarize', '/api/gemini/summarize'], async (req: Request, res: Response) => {
  const { text, imageBase64, mimeType = 'image/png', format = 'executive' } = req.body;

  if (!text && !imageBase64) {
    return res.status(400).json({ error: 'Either text or imageBase64 must be provided' });
  }

  const parts: any[] = [];
  if (imageBase64) {
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType,
        data: cleanBase64,
      },
    });
  }

  let formatPrompt = '';
  if (format === 'bullet_points') {
    formatPrompt = 'Provide a structured bullet-point summary highlighting critical facts, numbers, and takeaways.';
  } else if (format === 'brief') {
    formatPrompt = 'Provide an ultra-concise 3-paragraph summary covering Background, Core Content, and Conclusion.';
  } else if (format === 'action_items') {
    formatPrompt = 'Extract all actionable tasks, next steps, deadlines, and responsibilities mentioned or implied.';
  } else {
    formatPrompt = 'Provide a comprehensive Executive Summary including Overview, Key Findings, Critical Metrics/Data, and Key Implications.';
  }

  const promptText = `Analyze the provided document content and produce a high-value summary.
${formatPrompt}
Format cleanly in Markdown with bold headers and clear spacing.
Document text:
${text || '(refer to attached document image)'}`;

  parts.push({ text: promptText });

  try {
    const response = await callGeminiWithRetry({
      contents: { parts },
      config: {
        temperature: 0.2,
      },
    });

    return res.json({ summary: response.text || '' });
  } catch (error: any) {
    console.warn('Summarize API unavailable, engaging heuristic summary fallback:', error?.message);
    if (text) {
      try {
        return res.json({ summary: fallbackSummary(text, format) });
      } catch (fallbackErr: any) {
        console.error('Summary fallback error:', fallbackErr);
      }
    }
    return res.status(500).json({ error: formatAiErrorMessage(error) });
  }
});

// 3. Chat with Document
app.post(['/api/ai/chat', '/api/gemini/chat'], async (req: Request, res: Response) => {
  const { documentText, history = [], query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const systemInstruction = `You are OmniPDF Document Assistant, an expert AI analyst who answers questions strictly based on the provided document context.
Rules:
- Be clear, direct, and factual.
- If referencing facts, numbers, or terms, cite the specific sections or details from the document.
- If the document does not contain sufficient information to answer the question, clearly state that the document does not mention it, rather than speculating.
- Format responses nicely in Markdown with bullet points or bold text where appropriate.`;

  const contents: any[] = [];

  if (documentText) {
    contents.push({
      role: 'user',
      parts: [
        {
          text: `DOCUMENT CONTEXT:\n\n${documentText.slice(0, 50000)}\n\nEND OF DOCUMENT CONTEXT.`,
        },
      ],
    });
    contents.push({
      role: 'model',
      parts: [
        {
          text: 'I have analyzed the document context and will answer all your questions strictly based on this material.',
        },
      ],
    });
  }

  // Append history
  for (const msg of history.slice(-6)) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: query }],
  });

  try {
    const response = await callGeminiWithRetry({
      contents,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    return res.json({ reply: response.text || '' });
  } catch (error: any) {
    console.warn('Chat API unavailable, engaging direct document grounding fallback:', error?.message);
    if (documentText) {
      try {
        const fallbackReply = fallbackChat(documentText, query);
        return res.json({ reply: fallbackReply });
      } catch (fallbackErr: any) {
        console.error('Chat fallback error:', fallbackErr);
      }
    }
    return res.status(500).json({ error: formatAiErrorMessage(error) });
  }
});

// 4. Smart PII Detection for Redaction
app.post(['/api/ai/detect-pii', '/api/gemini/detect-pii'], async (req: Request, res: Response) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Document text is required' });
  }

  const prompt = `Analyze this document text and identify all sensitive Personally Identifiable Information (PII) and confidential data that should be redacted for privacy and compliance (GDPR/HIPAA/FERPA).
Categories to detect:
- Individual names
- Email addresses
- Phone numbers
- Physical street addresses
- Social Security Numbers (SSN), Passport, ID numbers
- Credit card numbers, Bank account details
- Financial balances or salary numbers
- Passwords or credentials

Return a valid JSON array of objects with the exact detected substrings.
Text:
${text.slice(0, 50000)}`;

  try {
    const response = await callGeminiWithRetry({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: 'Exact string detected in document' },
              category: { type: Type.STRING, description: 'Category: name, email, phone, financial, address, id' },
              reason: { type: Type.STRING, description: 'Brief explanation why this is sensitive' },
            },
            required: ['text', 'category', 'reason'],
          },
        },
      },
    });

    const jsonText = response.text?.trim() || '[]';
    const detectedItems = JSON.parse(jsonText);
    return res.json({ items: detectedItems });
  } catch (error: any) {
    console.warn('PII API unavailable, engaging high-precision regex fallback:', error?.message);
    try {
      const items = fallbackPIIDetection(text);
      return res.json({ items });
    } catch (fallbackErr: any) {
      console.error('PII fallback error:', fallbackErr);
      return res.status(500).json({ error: formatAiErrorMessage(error) });
    }
  }
});

// 5. Document Translation
app.post(['/api/ai/translate', '/api/gemini/translate'], async (req: Request, res: Response) => {
  const { text, targetLanguage = 'Spanish' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const prompt = `Translate the following document text into ${targetLanguage}.
Maintain all markdown formatting, tables, lists, code blocks, technical terms, and paragraph structures unchanged.
Only provide the translated content without any conversational prologue or notes.

Text to translate:
${text.slice(0, 60000)}`;

  try {
    const response = await callGeminiWithRetry({
      contents: prompt,
      config: {
        temperature: 0.1,
      },
    });

    return res.json({ translatedText: response.text || '' });
  } catch (error: any) {
    console.error('Translate Error:', error);
    return res.status(500).json({ error: formatAiErrorMessage(error) });
  }
});

// 6. Extract Tables to CSV & JSON
app.post(['/api/ai/extract-tables', '/api/gemini/extract-tables'], async (req: Request, res: Response) => {
  const { text, imageBase64, mimeType = 'image/png' } = req.body;

  const parts: any[] = [];
  if (imageBase64) {
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType,
        data: cleanBase64,
      },
    });
  }

  const prompt = `Examine this document and extract ALL tables found into structured tables.
For each table:
1. Provide a title/description.
2. Provide the table in standard CSV format with comma delimiters and headers.
3. Provide the table headers and rows as structured arrays.

If no tables are found, return an empty array.
Text context:
${text || '(refer to image)'}`;

  parts.push({ text: prompt });

  try {
    const response = await callGeminiWithRetry({
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              csv: { type: Type.STRING, description: 'Comma separated values with newlines' },
              headers: { type: Type.ARRAY, items: { type: Type.STRING } },
              rows: {
                type: Type.ARRAY,
                items: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
            },
            required: ['title', 'csv', 'headers', 'rows'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '[]');
    return res.json({ tables: parsed });
  } catch (error: any) {
    console.warn('Extract Tables API unavailable, engaging heuristic table parser:', error?.message);
    if (text) {
      try {
        const tables = fallbackExtractTables(text);
        return res.json({ tables });
      } catch (fallbackErr: any) {
        console.error('Table parser fallback error:', fallbackErr);
      }
    }
    return res.status(500).json({ error: formatAiErrorMessage(error) });
  }
});

// 7. Study Guide, Flashcards & Quiz Generator
app.post(['/api/ai/study-tools', '/api/gemini/study-tools'], async (req: Request, res: Response) => {
  const { text, type = 'all' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const prompt = `From this educational or professional document, generate comprehensive study materials:
1. "flashcards": 5-10 question/answer flashcards covering key definitions, concepts, and relationships.
2. "quiz": 5 multiple-choice questions with 4 options, the correct answer index (0-3), and an explanation.
3. "keyConcepts": 5-8 bulleted high-impact concepts to remember.

Document text:
${text.slice(0, 50000)}`;

  try {
    const response = await callGeminiWithRetry({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING, description: 'Question or concept term' },
                  back: { type: Type.STRING, description: 'Answer or explanation' },
                },
                required: ['front', 'back'],
              },
            },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
                required: ['question', 'options', 'correctIndex', 'explanation'],
              },
            },
            keyConcepts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['flashcards', 'quiz', 'keyConcepts'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.warn('Study Tools API unavailable, engaging heuristic study generator:', error?.message);
    try {
      const studyData = fallbackStudyTools(text);
      return res.json(studyData);
    } catch (fallbackErr: any) {
      console.error('Study tools fallback error:', fallbackErr);
      return res.status(500).json({ error: formatAiErrorMessage(error) });
    }
  }
});

const SEO_DATA: Record<string, { title: string; description: string }> = {
  '/mergepdf': {
    title: 'Merge PDF Online Free – Combine Multiple PDFs | OmniPDF Studio',
    description: 'Combine multiple PDF files into one clean document in seconds. Reorder pages freely with zero file size limits, zero watermarks, and 100% browser privacy.',
  },
  '/splitpdf': {
    title: 'Split PDF Online Free – Extract Pages & Split Files | OmniPDF Studio',
    description: 'Extract pages, split PDF by custom ranges, or burst into individual files. 100% free, private client-side processing with zero watermarks and no limits.',
  },
  '/organizepdf': {
    title: 'Organize & Rotate PDF Pages Online Free | OmniPDF Studio',
    description: 'Reorder, rotate, and delete PDF pages with an interactive visual page grid. 100% free client-side processing with instant download and zero watermarks.',
  },
  '/pagenumbers': {
    title: 'Add Page Numbers to PDF Online Free | OmniPDF Studio',
    description: 'Add custom page numbers, headers, and footers to your PDF documents. Select custom positions, formats, and fonts with instant watermark-free export.',
  },
  '/compresspdf': {
    title: 'Compress PDF Online – Reduce PDF File Size | OmniPDF Studio',
    description: 'Shrink and optimize PDF file sizes for fast email attachments and uploads without losing visual clarity. 100% private in-browser compression.',
  },
  '/imagestopdf': {
    title: 'Convert JPG & PNG Images to PDF Online Free | OmniPDF Studio',
    description: 'Convert JPG, PNG, and WebP images into clean, formatted PDF documents. Custom page margins, orientations, and instant download with zero watermarks.',
  },
  '/pdftoimages': {
    title: 'Convert PDF to Images (PNG & JPG) High Res | OmniPDF Studio',
    description: 'Convert PDF pages into crystal-clear PNG and JPG images. Download single pages or 1-click batch ZIP archives with full resolution and privacy.',
  },
  '/pdftotext': {
    title: 'Extract Text from PDF Online Free (TXT & MD) | OmniPDF Studio',
    description: 'Extract full text from PDF documents with page numbers and word counts. Copy to clipboard or download as TXT and Markdown with zero latency.',
  },
  '/texttopdf': {
    title: 'Convert Text & Notes to Formatted PDF Free | OmniPDF Studio',
    description: 'Convert plain text, notes, and meeting minutes into beautifully formatted, paginated PDF files with custom typography and instant download.',
  },
  '/annotatepdf': {
    title: 'Annotate & Sign PDF Online Free – Draw & Type | OmniPDF Studio',
    description: 'Draw e-signatures, add custom text annotations, place stamps, and highlight PDF documents online without printing or scanning. 100% free and private.',
  },
  '/ocrpdf': {
    title: 'AI OCR PDF Scanner – Extract Scanned Text & Handwriting | OmniPDF Studio',
    description: 'Digitize scanned PDFs, photos, and handwriting into editable text and tables with Omni AI OCR. Fast, accurate, and watermark-free exports.',
  },
  '/chatpdf': {
    title: 'Chat with PDF AI – Ask Document Questions & Citations | OmniPDF Studio',
    description: 'Ask questions and get instant cited answers from your PDF documents powered by Omni AI. Deep document comprehension with 100% privacy.',
  },
  '/summarizepdf': {
    title: 'AI PDF Summarizer – Key Takeaways & Action Items | OmniPDF Studio',
    description: 'Generate executive summaries, key takeaways, entities, and strategic action items from long PDF reports using Omni AI. Instant exports.',
  },
  '/redactpdf': {
    title: 'AI PDF Redaction – Auto-Blackout Sensitive PII Data | OmniPDF Studio',
    description: 'Automatically detect and permanently blackout emails, SSNs, credit card numbers, and confidential PII from PDF documents for GDPR & HIPAA compliance.',
  },
  '/tablespdf': {
    title: 'AI PDF Table Extractor – Export Tables to CSV & JSON | OmniPDF Studio',
    description: 'Extract financial, scientific, and tabular data from PDF files directly into clean CSV spreadsheets and structured JSON with Omni AI.',
  },
  '/translatepdf': {
    title: 'Translate PDF Online Free – 25+ Global Languages | OmniPDF Studio',
    description: 'Translate PDF documents into Spanish, French, German, Japanese, Chinese, Arabic and 20+ languages while preserving structural layout and tables.',
  },
  '/studypdf': {
    title: 'AI PDF Flashcards & Quiz Generator for Students | OmniPDF Studio',
    description: 'Transform textbook chapters and research papers into interactive flip flashcards, scored practice quizzes, and key revision notes with Omni AI.',
  },
};

// Vite integration
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, { index: false }));
      app.get('*', (req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        if (!fs.existsSync(indexPath)) {
          return res.status(404).send('Not found');
        }
        let html = fs.readFileSync(indexPath, 'utf-8');
        const seo = SEO_DATA[req.path.toLowerCase()];
        if (seo) {
          const origin = req.protocol + '://' + req.get('host');
          const fullUrl = `${origin}${req.path}`;
          html = html
            .replace(/<title>.*?<\/title>/i, `<title>${seo.title}</title>`)
            .replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${seo.description}" />`)
            .replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i, `<meta property="og:title" content="${seo.title}" />`)
            .replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i, `<meta property="og:description" content="${seo.description}" />`)
            .replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${seo.title}" />`)
            .replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${seo.description}" />`);
          html = html.replace('</head>', `<meta property="og:url" content="${fullUrl}" />\n    <link rel="canonical" href="${fullUrl}" />\n  </head>`);
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
      });
    }
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
