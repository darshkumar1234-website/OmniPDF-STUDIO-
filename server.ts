import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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

// 1. Advanced Multi-Language OCR Endpoint
app.post('/api/gemini/ocr', async (req: Request, res: Response) => {
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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
    return res.status(500).json({ error: error.message || 'Failed to perform OCR extraction' });
  }
});

// 1b. Deep PDF Summarizer with Entities, Topics, Insights, and Sentiment Analysis
app.post('/api/gemini/summarize-deep', async (req: Request, res: Response) => {
  try {
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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
                  relevance: { type: Type.NUMBER, description: 'Percentage 0-100' },
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
                  category: { type: Type.STRING },
                },
                required: ['title', 'takeaway', 'category'],
              },
            },
            sentiment: {
              type: Type.OBJECT,
              properties: {
                overall: { type: Type.STRING },
                score: { type: Type.NUMBER },
                analysis: { type: Type.STRING },
                keyPhrases: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['overall', 'score', 'analysis', 'keyPhrases'],
            },
          },
          required: ['summary', 'entities', 'topics', 'insights', 'sentiment'],
        },
        temperature: 0.15,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Deep Summarization Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate deep summary analysis' });
  }
});

// 2. Summarize Document
app.post('/api/gemini/summarize', async (req: Request, res: Response) => {
  try {
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        temperature: 0.2,
      },
    });

    return res.json({ summary: response.text || '' });
  } catch (error: any) {
    console.error('Summarize Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to summarize document' });
  }
});

// 3. Chat with Document
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { documentText, history = [], query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const systemInstruction = `You are OmniPDF Document Assistant, an expert AI analyst who answers questions strictly based on the provided document context.
- Always quote or cite specific sections or page references when relevant.
- If the document does not contain the answer, say "Based on the provided document, this information is not mentioned" rather than hallucinating.
- Format responses in clean Markdown with clear headings and bullet points.`;

    const contextPrefix = documentText
      ? `=== DOCUMENT CONTEXT ===\n${documentText.slice(0, 100000)}\n=== END CONTEXT ===\n\n`
      : '';

    // Build chat contents
    const contents: any[] = [];
    if (history.length > 0) {
      // Add previous turns
      for (const msg of history) {
        contents.push({
          role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Append current turn with context prefix if first message or standalone
    contents.push({
      role: 'user',
      parts: [{ text: `${contextPrefix}User Question: ${query}` }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    return res.json({ reply: response.text || '' });
  } catch (error: any) {
    console.error('Chat Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to answer document query' });
  }
});

// 4. Smart PII Detection for Redaction
app.post('/api/gemini/detect-pii', async (req: Request, res: Response) => {
  try {
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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
    console.error('PII Detection Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to detect PII' });
  }
});

// 5. Document Translation
app.post('/api/gemini/translate', async (req: Request, res: Response) => {
  try {
    const { text, targetLanguage = 'Spanish' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const prompt = `Translate the following document text into ${targetLanguage}.
Maintain all markdown formatting, tables, lists, code blocks, technical terms, and paragraph structures unchanged.
Only provide the translated content without any conversational prologue or notes.

Text to translate:
${text.slice(0, 60000)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.1,
      },
    });

    return res.json({ translatedText: response.text || '' });
  } catch (error: any) {
    console.error('Translate Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to translate' });
  }
});

// 6. Extract Tables to CSV & JSON
app.post('/api/gemini/extract-tables', async (req: Request, res: Response) => {
  try {
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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
    console.error('Extract Tables Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to extract tables' });
  }
});

// 7. Study Guide, Flashcards & Quiz Generator
app.post('/api/gemini/study-tools', async (req: Request, res: Response) => {
  try {
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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
    console.error('Study Tools Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate study materials' });
  }
});

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
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
