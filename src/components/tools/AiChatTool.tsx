import React, { useState, useRef, useEffect } from 'react';
import { MessageSquareText, Send, Sparkles, Loader2, FileText, Bot, User, Trash2, RotateCcw, AlertCircle } from 'lucide-react';
import { requestChat } from '../../services/aiService';
import { extractTextFromPDF } from '../../services/pdfRenderer';
import { Dropzone } from '../Dropzone';

interface AiChatToolProps {
  onSelectSample: (type: 'contract' | 'invoice' | 'report') => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
  failedQuery?: string;
}

export const AiChatTool: React.FC<AiChatToolProps> = ({ onSelectSample }) => {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [docText, setDocText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    setFile({ name: f.name, bytes });
    setIsExtracting(true);

    try {
      const { fullText } = await extractTextFromPDF(bytes);
      setDocText(fullText);
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `I've analyzed **${f.name}**! Ask me anything about this document—such as key terms, numerical data, obligations, or specific page citations.`,
          timestamp: Date.now(),
        },
      ]);
    } catch (err: any) {
      setMessages([
        {
          id: 'error',
          role: 'assistant',
          content: `⚠️ Could not extract document text: ${err.message}. Please try another file or re-upload.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSend = async (queryToSend?: string) => {
    const query = queryToSend || inputQuery;
    if (!query.trim() || isThinking || !docText) return;

    const userMsg: Message = {
      id: `${Date.now()}_u`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsThinking(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const reply = await requestChat({
        documentText: docText,
        history,
        query,
      });

      const assistantMsg: Message = {
        id: `${Date.now()}_a`,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}_err`,
          role: 'assistant',
          content: err.message || 'Unable to retrieve response from AI service.',
          timestamp: Date.now(),
          isError: true,
          failedQuery: query,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const sampleQuestions = [
    'Give me a concise 3-bullet summary.',
    'What are the critical dates and deadlines mentioned?',
    'What financial obligations or numbers appear?',
    'Who are the parties and representatives involved?',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-cyan-300 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Powered by Omni AI
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Chat with PDF</h2>
        <p className="text-xs text-slate-400">
          Ask questions, verify clauses, and synthesize insights grounded strictly in your document.
        </p>
      </div>

      {!file ? (
        <Dropzone
          isAi
          title="Select a PDF to start chatting"
          subtitle="Ask questions, query tables, and extract insights with citations"
          onFilesSelected={handleFileSelected}
          onSelectSample={onSelectSample}
        />
      ) : isExtracting ? (
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Ingesting document context...</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[650px]">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-white truncate max-w-xs">{file.name}</span>
              <span className="text-slate-400">· {docText.split(/\s+/).filter(Boolean).length} words</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMessages([])}
                title="Clear Chat History"
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setFile(null);
                  setDocText('');
                  setMessages([]);
                }}
                className="text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
              >
                Change PDF
              </button>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      msg.isError
                        ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                        : 'bg-blue-500/20 border border-blue-500/30 text-cyan-300'
                    }`}
                  >
                    {msg.isError ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : msg.isError
                      ? 'bg-amber-950/20 border border-amber-800/40 text-amber-200 rounded-tl-xs space-y-2.5'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-xs whitespace-pre-wrap'
                  }`}
                >
                  <div>{msg.content}</div>
                  {msg.isError && msg.failedQuery && (
                    <div className="pt-2 border-t border-amber-800/30 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSend(msg.failedQuery)}
                        disabled={isThinking}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-semibold transition-colors cursor-pointer border border-amber-500/30 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Retry Query
                      </button>
                      <span className="text-[10px] text-amber-400/70">Automatic multi-engine fallback enabled</span>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isThinking && (
              <div className="flex gap-3 text-xs justify-start">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-cyan-300 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-950 border border-slate-800 text-slate-400 rounded-2xl rounded-tl-xs p-3 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>Analyzing document citations...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] text-slate-400 whitespace-nowrap">Suggested:</span>
              {sampleQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-[11px] whitespace-nowrap border border-slate-700/60 transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="Ask anything about this document..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputQuery.trim() || isThinking}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 transition-colors shrink-0 cursor-pointer shadow-md shadow-blue-950/50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
