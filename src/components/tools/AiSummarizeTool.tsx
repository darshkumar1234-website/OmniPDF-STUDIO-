import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Download,
  Check,
  Loader2,
  FileText,
  Tag,
  Lightbulb,
  Smile,
  Frown,
  Meh,
  Cloud,
  CheckCircle2,
  TrendingUp,
  Award,
  Layers,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { requestDeepSummary } from '../../services/aiService';
import { extractTextFromPDF } from '../../services/pdfRenderer';
import { convertTextToPDF, downloadFile } from '../../services/pdfOperations';
import { DeepSummaryResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Dropzone } from '../Dropzone';

interface AiSummarizeToolProps {
  onSelectSample: (type: 'contract' | 'invoice' | 'report') => void;
}

export const AiSummarizeTool: React.FC<AiSummarizeToolProps> = ({ onSelectSample }) => {
  const { logAction } = useAuth();
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [docText, setDocText] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'entities' | 'topics' | 'insights' | 'sentiment'>('summary');
  const [result, setResult] = useState<DeepSummaryResult | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    setFile({ name: f.name, bytes });
    setResult(null);
    setErrorMessage(null);
    setDownloadSuccess(null);

    try {
      const { fullText } = await extractTextFromPDF(bytes);
      setDocText(fullText);
      generateAnalysis(fullText, f.name);
    } catch (err: any) {
      setErrorMessage(`Could not extract document: ${err.message}`);
    }
  };

  const generateAnalysis = async (text: string, fileName: string) => {
    setIsSummarizing(true);
    setErrorMessage(null);
    try {
      const data = await requestDeepSummary(text);
      setResult(data);
      await logAction(
        'ai-summarize',
        'AI Summarize & Intelligence',
        fileName,
        'success',
        `Generated summary, ${data.entities.length} entities, and ${data.sentiment.overall} sentiment analysis`
      );
    } catch (err: any) {
      setErrorMessage(`Analysis failed: ${err.message}`);
      await logAction('ai-summarize', 'AI Summarize & Intelligence', fileName, 'failed', err.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const textToCopy =
      activeTab === 'summary'
        ? result.summary
        : JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    if (!result || !file) return;
    try {
      const pdfText = `# Executive Summary: ${file.name}

${result.summary}

# Key Entities & Stakeholders
${result.entities.map((e) => `- **${e.name}** (${e.category}): ${e.description}`).join('\n')}

# Core Topics & Themes
${result.topics.map((t) => `- **${t.topic}** (${t.relevance}% relevance): ${t.description}`).join('\n')}

# Strategic Insights & Takeaways
${result.insights.map((i) => `- **${i.title}**: ${i.takeaway}`).join('\n')}

# Sentiment & Tonal Assessment
Overall Tone: ${result.sentiment.overall.toUpperCase()} (Score: ${result.sentiment.score})
Analysis: ${result.sentiment.analysis}
Key Tonal Phrases:
${result.sentiment.keyPhrases.map((p) => `  * "${p}"`).join('\n')}
`;
      const outName = `${file.name.replace('.pdf', '')}_AI_Intelligence_Report.pdf`;
      const bytes = await convertTextToPDF(pdfText, `Intelligence Dossier: ${file.name}`);
      downloadFile(bytes, outName);
      setDownloadSuccess(`Downloaded report: ${outName}`);
      setTimeout(() => setDownloadSuccess(null), 6000);
    } catch (err: any) {
      setErrorMessage(`PDF export failed: ${err.message}`);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
      case 'constructive':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'cautious':
      case 'urgent':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'negative':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-cyan-300 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Powered by Omni AI
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">AI PDF Summarizer & Intelligence</h2>
        <p className="text-xs text-slate-400">
          Generate concise summaries, extract named entities, uncover themes, gather strategic insights, and analyze document sentiment.
        </p>
      </div>

      {!file ? (
        <Dropzone
          isAi
          title="Select a PDF for AI Summarization & Deep Analysis"
          subtitle="Extracts concise summaries, entities, topics, strategic insights, and sentiment tone"
          onFilesSelected={handleFileSelected}
          onSelectSample={onSelectSample}
        />
      ) : (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-blue-400" />
              <div>
                <span className="font-semibold text-white truncate max-w-sm block">{file.name}</span>
                <span className="text-[11px] text-slate-400">
                  {docText.split(/\s+/).filter(Boolean).length} Words Processed
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={!result || isSummarizing}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 font-medium disabled:opacity-40 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={!result || isSummarizing}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-blue-950/50 transition-all disabled:opacity-40 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Intelligence PDF
              </button>

              <button
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setDownloadSuccess(null);
                  setErrorMessage(null);
                }}
                className="text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
              >
                Change PDF
              </button>
            </div>
          </div>

          {downloadSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{downloadSuccess} — If your browser didn't save automatically, click the Download button above.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              {docText && file && (
                <button
                  type="button"
                  onClick={() => generateAnalysis(docText, file.name)}
                  disabled={isSummarizing}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Analysis
                </button>
              )}
            </div>
          )}

          {/* Intelligence Tabs Bar */}
          <div className="flex rounded-2xl bg-slate-900 border border-slate-800 p-1.5 overflow-x-auto no-scrollbar gap-1 text-xs">
            {[
              { id: 'summary', label: 'Concise Summary', icon: Sparkles },
              { id: 'entities', label: `Entities (${result?.entities.length || 0})`, icon: Tag },
              { id: 'topics', label: `Key Topics (${result?.topics.length || 0})`, icon: Layers },
              { id: 'insights', label: `Strategic Insights (${result?.insights.length || 0})`, icon: Lightbulb },
              { id: 'sentiment', label: 'Sentiment & Tone', icon: Smile },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-950/50'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Analysis Content Body */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl min-h-[380px]">
            {isSummarizing ? (
              <div className="py-20 text-center flex flex-col items-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                <p className="text-sm font-semibold text-white mb-1">
                  Synthesizing Document Intelligence with Omni AI...
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Extracting key entities, topic relevance weights, core conclusions, and evaluating tonal sentiment.
                </p>
              </div>
            ) : !result ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Click re-analyze or upload a document to view insights.
              </div>
            ) : (
              <div>
                {/* TAB 1: SUMMARY */}
                {activeTab === 'summary' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        Executive Summary
                      </span>
                      <span className="text-slate-400">
                        {result.summary.split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                      {result.summary}
                    </div>
                  </div>
                )}

                {/* TAB 2: ENTITIES */}
                {activeTab === 'entities' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-blue-400" />
                        Identified Entities & Key References
                      </span>
                      <span className="text-slate-400">{result.entities.length} Detected</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.entities.map((entity, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-xs font-bold text-white">{entity.name}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-slate-700 uppercase">
                              {entity.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {entity.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: TOPICS */}
                {activeTab === 'topics' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-cyan-400" />
                        Key Topics & Thematic Breakdown
                      </span>
                      <span className="text-slate-400">Ranked by Relevance</span>
                    </div>

                    <div className="space-y-3">
                      {result.topics.map((topic, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{topic.topic}</span>
                            <span className="text-xs font-mono font-bold text-cyan-400">
                              {topic.relevance}% Relevance
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                              style={{ width: `${topic.relevance}%` }}
                            />
                          </div>

                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {topic.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: INSIGHTS */}
                {activeTab === 'insights' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        Strategic Insights & Critical Takeaways
                      </span>
                      <span className="text-slate-400">{result.insights.length} Takeaways</span>
                    </div>

                    <div className="space-y-3">
                      {result.insights.map((insight, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-3.5"
                        >
                          <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                            <Lightbulb className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-xs font-bold text-white">{insight.title}</h4>
                              {insight.category && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                  {insight.category}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{insight.takeaway}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 5: SENTIMENT & TONE */}
                {activeTab === 'sentiment' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Smile className="w-4 h-4 text-cyan-400" />
                        Document Sentiment & Tonal Architecture
                      </span>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${getSentimentColor(
                          result.sentiment.overall
                        )}`}
                      >
                        {result.sentiment.overall} Tone
                      </span>
                    </div>

                    {/* Sentiment Score Gauge */}
                    <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="text-center sm:text-left">
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                          Calculated Sentiment Index
                        </span>
                        <div className="text-3xl font-extrabold text-white">
                          {result.sentiment.score > 0 ? `+${result.sentiment.score.toFixed(2)}` : result.sentiment.score.toFixed(2)}
                          <span className="text-xs text-slate-500 font-normal ml-2">(-1.0 to +1.0)</span>
                        </div>
                      </div>

                      {/* Scale Visualizer */}
                      <div className="w-full sm:w-72">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span>Critical / Adverse</span>
                          <span>Objective</span>
                          <span>Positive / Enthusiastic</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-slate-800 relative overflow-hidden">
                          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-600" />
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 via-amber-400 to-emerald-400 rounded-full"
                            style={{
                              width: `${Math.round(((result.sentiment.score + 1) / 2) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Detailed Analysis */}
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <h4 className="text-xs font-bold text-white mb-1.5">Tonal Perspective</h4>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {result.sentiment.analysis}
                      </p>
                    </div>

                    {/* Key Tonal Quotes */}
                    {result.sentiment.keyPhrases && result.sentiment.keyPhrases.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-300 mb-2.5">
                          Extracted Key Phrases Indicating Tone
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {result.sentiment.keyPhrases.map((phrase, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs italic text-sky-300/90 font-mono"
                            >
                              "{phrase}"
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
