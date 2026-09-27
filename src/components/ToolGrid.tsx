import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Lock, FileCheck } from 'lucide-react';
import { ToolDef, ToolCategory } from '../types';
import { ToolIcon } from './ToolIcon';

interface ToolGridProps {
  tools: ToolDef[];
  activeCategory: ToolCategory;
  onSelectTool: (id: string) => void;
  onSelectSample: (type: 'contract' | 'invoice' | 'report') => void;
}

export const ToolGrid: React.FC<ToolGridProps> = ({
  tools,
  activeCategory,
  onSelectTool,
  onSelectSample,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero Banner when viewing all tools */}
      {activeCategory === 'all' && (
        <div className="mb-10 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-rose-950/30 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-4">
              <Zap className="w-3.5 h-3.5" />
              100% Free · No Watermarks · Unlimited Pages
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
              Every PDF Tool You Need,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-purple-300 to-indigo-300">
                With Zero Watermarks
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mb-6 leading-relaxed">
              Merge, split, reorganize, sign, convert, and compress files locally in your browser.
              Unlock next-generation AI OCR text digitization, document summaries, and Q&A powered by Gemini.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero File Uploads For Basic Edits</span>
              </div>
              <span className="text-slate-700">·</span>
              <div className="flex items-center gap-1.5 text-slate-300">
                <FileCheck className="w-4 h-4 text-blue-400" />
                <span>Crystal Clear Exports</span>
              </div>
              <span className="text-slate-700">·</span>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span>Gemini 3.8 Flash Intelligence</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Tools */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tools.map((tool) => (
          <div
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`group relative rounded-xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
              tool.isAi
                ? 'bg-gradient-to-b from-slate-900/90 to-purple-950/20 border-rose-900/30 hover:border-rose-500/60 hover:shadow-lg hover:shadow-rose-950/30'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900 hover:shadow-lg hover:shadow-slate-950/50'
            }`}
          >
            <div>
              {/* Header with Icon and Badge */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                    tool.isAi
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                  }`}
                >
                  <ToolIcon name={tool.icon} className="w-5 h-5" />
                </div>

                {tool.badge && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      tool.isAi
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {tool.badge}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h3 className="text-base font-bold text-white group-hover:text-rose-400 transition-colors mb-1">
                {tool.name}
              </h3>
              <p className="text-xs font-medium text-slate-400 mb-2">{tool.tagline}</p>
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                {tool.description}
              </p>
            </div>

            {/* Bottom Action Hint */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-rose-400 opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
              <span>Open Tool</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        ))}
      </div>

      {tools.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-slate-400 mb-3">No tools found matching your search.</p>
        </div>
      )}
    </div>
  );
};
