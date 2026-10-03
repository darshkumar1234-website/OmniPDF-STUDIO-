import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { requestStudyTools } from '../../services/aiService';
import { fallbackStudyTools } from '../../services/aiFallbacks';
import { extractTextFromPDF } from '../../services/pdfRenderer';
import { StudyToolsData } from '../../types';
import { Dropzone } from '../Dropzone';

interface AiStudyToolProps {
  onSelectSample: (type: 'contract' | 'invoice' | 'report') => void;
}

export const AiStudyTool: React.FC<AiStudyToolProps> = ({ onSelectSample }) => {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [data, setData] = useState<StudyToolsData | null>(null);
  const [activeTab, setActiveTab] = useState<'flashcards' | 'quiz' | 'concepts'>('flashcards');
  const [isGenerating, setIsGenerating] = useState(false);

  // Flashcards state
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    setFile({ name: f.name, bytes });
    setIsGenerating(true);
    setData(null);
    setSelectedAnswers({});
    setShowResults(false);
    setErrorMessage(null);

    try {
      const { fullText } = await extractTextFromPDF(bytes);
      try {
        const studyData = await requestStudyTools(fullText);
        setData(studyData);
      } catch (apiErr: any) {
        console.warn('AI study tools API temporarily unavailable, using heuristic generator:', apiErr);
        const fallbackData = fallbackStudyTools(fullText);
        setData(fallbackData);
      }
      setCurrentCardIdx(0);
      setIsFlipped(false);
    } catch (err: any) {
      setErrorMessage(`Study guide generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectAnswer = (questionIdx: number, optionIdx: number) => {
    if (showResults) return;
    setSelectedAnswers({ ...selectedAnswers, [questionIdx]: optionIdx });
  };

  const calculateScore = () => {
    if (!data) return 0;
    let score = 0;
    data.quiz.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) score++;
    });
    return score;
  };

  const currentFlashcard = data?.flashcards[currentCardIdx];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-300 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Interactive Learning & Retention
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">AI Study Guide & Flashcards</h2>
        <p className="text-xs text-slate-400">
          Transform academic papers, research, or manuals into interactive flip cards, scored quizzes, and key notes.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center justify-between gap-3">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-200 underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {!file ? (
        <Dropzone
          isAi
          title="Select a study document or textbook chapter"
          subtitle="Generates definition flashcards, multiple-choice quizzes & key concepts"
          onFilesSelected={handleFileSelected}
          onSelectSample={onSelectSample}
        />
      ) : isGenerating ? (
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Generating study materials with Omni AI...</p>
          <p className="text-xs text-slate-400">Formulating concept flashcards and practice test questions.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header & Tabs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-white truncate max-w-xs">{file.name}</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('flashcards')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'flashcards' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Flashcards ({data?.flashcards.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('quiz')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'quiz' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Practice Quiz ({data?.quiz.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('concepts')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'concepts' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Key Notes
              </button>
            </div>
          </div>

          {/* TAB 1: FLASHCARDS */}
          {activeTab === 'flashcards' && data?.flashcards && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col items-center">
              <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-4">
                <span>Click card to reveal answer</span>
                <span>
                  Card {currentCardIdx + 1} of {data.flashcards.length}
                </span>
              </div>

              {/* 3D Flip Card */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full max-w-lg aspect-[16/10] min-h-[220px] rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-700/80 p-8 flex flex-col justify-between cursor-pointer hover:border-blue-500/60 shadow-2xl transition-all select-none text-center relative group"
              >
                <div className="text-[11px] font-semibold tracking-wider uppercase text-cyan-400 flex items-center justify-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300" />
                  {isFlipped ? 'Answer / Explanation' : 'Question / Concept'}
                </div>

                <div className="text-base sm:text-lg font-semibold text-white my-auto px-4">
                  {isFlipped ? currentFlashcard?.back : currentFlashcard?.front}
                </div>

                <div className="text-[11px] text-slate-500">Tap to flip</div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-4 mt-6">
                <button
                  onClick={() => {
                    setCurrentCardIdx((prev) => Math.max(0, prev - 1));
                    setIsFlipped(false);
                  }}
                  disabled={currentCardIdx === 0}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => {
                    setCurrentCardIdx((prev) => Math.min(data.flashcards.length - 1, prev + 1));
                    setIsFlipped(false);
                  }}
                  disabled={currentCardIdx === data.flashcards.length - 1}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 shadow-lg shadow-blue-950/40"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: QUIZ */}
          {activeTab === 'quiz' && data?.quiz && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white">Practice Assessment</h3>
                {showResults && (
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    Score: {calculateScore()} / {data.quiz.length} (
                    {Math.round((calculateScore() / data.quiz.length) * 100)}%)
                  </span>
                )}
              </div>

              <div className="space-y-6">
                {data.quiz.map((q, qIdx) => {
                  const isAnswered = selectedAnswers[qIdx] !== undefined;
                  const isCorrect = selectedAnswers[qIdx] === q.correctIndex;

                  return (
                    <div
                      key={qIdx}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3"
                    >
                      <p className="text-xs font-semibold text-white">
                        {qIdx + 1}. {q.question}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = selectedAnswers[qIdx] === optIdx;
                          let btnStyle = 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700';

                          if (showResults) {
                            if (optIdx === q.correctIndex) {
                              btnStyle = 'border-emerald-500 bg-emerald-950/30 text-emerald-300 font-bold';
                            } else if (isSelected) {
                              btnStyle = 'border-red-500 bg-red-950/30 text-red-300';
                            }
                          } else if (isSelected) {
                            btnStyle = 'border-blue-500 bg-blue-500/20 text-white font-medium';
                          }

                          return (
                            <button
                              key={optIdx}
                              onClick={() => handleSelectAnswer(qIdx, optIdx)}
                              className={`p-2.5 rounded-lg border text-left transition-all ${btnStyle}`}
                            >
                              <span className="mr-2 font-mono text-[10px] text-slate-400">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {showResults && (
                        <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800/80">
                          <span className="font-semibold text-cyan-300">Explanation: </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                {!showResults ? (
                  <button
                    onClick={() => setShowResults(true)}
                    disabled={Object.keys(selectedAnswers).length === 0}
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/40 transition-all disabled:opacity-40"
                  >
                    Check Answers & Calculate Score
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedAnswers({});
                      setShowResults(false);
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    Retake Quiz
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CONCEPTS */}
          {activeTab === 'concepts' && data?.keyConcepts && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white mb-2">Essential Concepts for Revision</h3>
              <ul className="space-y-3">
                {data.keyConcepts.map((concept, idx) => (
                  <li
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200 leading-relaxed flex items-start gap-3"
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      {idx + 1}
                    </span>
                    <span>{concept}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
