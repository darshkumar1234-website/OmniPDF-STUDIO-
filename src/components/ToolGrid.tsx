import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, Zap, FileCheck } from 'lucide-react';
import { ToolDef, ToolCategory } from '../types';
import { ToolIcon } from './ToolIcon';

interface ToolGridProps {
  tools: ToolDef[];
  activeCategory: ToolCategory;
  onSelectSample: (type: 'contract' | 'invoice' | 'report') => void;
}

export const ToolGrid: React.FC<ToolGridProps> = ({
  tools,
  activeCategory,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero Banner when viewing all tools */}
      {activeCategory === 'all' && (
        <div className="mb-10 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0c1633] via-[#091126] to-[#070b14] border border-blue-900/40 shadow-2xl relative overflow-hidden">
          {/* Subtle glowing dark blue light circles */}
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-semibold mb-4">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              100% Free · Zero Watermarks · Direct Dedicated URLs
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
              Professional PDF Studio,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300">
                Crafted for Speed & Privacy
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mb-6 leading-relaxed">
              Split, merge, reorganize, convert, sign, and compress documents locally in your browser.
              Unlock next-generation AI OCR text digitization, document summaries, and Q&A powered by Gemini.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero File Uploads For Basic Edits</span>
              </div>
              <span className="text-slate-700">·</span>
              <div className="flex items-center gap-1.5 text-slate-300">
                <FileCheck className="w-4 h-4 text-sky-400" />
                <span>Crystal Clear Exports</span>
              </div>
              <span className="text-slate-700">·</span>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Gemini 3.8 Flash Intelligence</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Tools with dedicated page URLs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            to={tool.path}
            className={`group relative rounded-2xl p-5 border transition-all flex flex-col justify-between cursor-pointer ${
              tool.isAi
                ? 'bg-gradient-to-b from-[#0e172f]/95 to-[#091024]/90 border-blue-900/40 hover:border-blue-500/70 hover:shadow-xl hover:shadow-blue-950/50 hover:-translate-y-0.5'
                : 'bg-[#0b1222]/80 border-slate-800/80 hover:border-blue-700/60 hover:bg-[#0e1830] hover:shadow-xl hover:shadow-blue-950/40 hover:-translate-y-0.5'
            }`}
          >
            <div>
              {/* Header with Icon and Badge */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                    tool.isAi
                      ? 'bg-gradient-to-tr from-blue-600/30 to-cyan-500/20 text-cyan-300 border border-blue-500/30 shadow-md shadow-blue-950/50'
                      : 'bg-slate-800/90 text-sky-300 border border-slate-700'
                  }`}
                >
                  <ToolIcon name={tool.icon} className="w-5 h-5" />
                </div>

                {tool.badge && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      tool.isAi
                        ? 'bg-blue-500/10 text-cyan-300 border border-blue-500/25'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {tool.badge}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors mb-1">
                {tool.name}
              </h3>
              <p className="text-xs font-medium text-slate-400 mb-2">{tool.tagline}</p>
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                {tool.description}
              </p>
            </div>

            {/* Bottom Action Hint */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-400 opacity-90 group-hover:opacity-100 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all">
              <span className="font-mono text-[11px] text-slate-500 group-hover:text-blue-400 transition-colors">
                {tool.path}
              </span>
              <div className="flex items-center gap-1">
                <span>Launch Tool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>
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
