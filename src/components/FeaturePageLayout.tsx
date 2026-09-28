import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ToolDef } from '../types';
import { TOOLS } from '../data/tools';
import { ToolIcon } from './ToolIcon';
import {
  ChevronRight,
  ShieldCheck,
  Zap,
  Lock,
  ArrowLeft,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

interface FeaturePageLayoutProps {
  tool: ToolDef;
  children: React.ReactNode;
}

export const FeaturePageLayout: React.FC<FeaturePageLayoutProps> = ({ tool, children }) => {
  // Update document title for this specific web page
  useEffect(() => {
    document.title = `${tool.name} - 100% Free Online | OmniPDF Studio`;
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [tool]);

  // Related tools from the same category
  const relatedTools = TOOLS.filter((t) => t.category === tool.category && t.id !== tool.id).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Page Meta */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-blue-950/60 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link to="/" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="capitalize text-slate-400">{tool.category}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-white font-medium">{tool.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-800/40 text-sky-300">
            {tool.path}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 text-[11px] font-medium flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Zero Watermark
          </span>
        </div>
      </div>

      {/* Feature Header Banner */}
      <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-[#0c1633] via-[#091126] to-[#070b14] border border-blue-900/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              tool.isAi
                ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white shadow-blue-950/60'
                : 'bg-gradient-to-tr from-blue-600 to-sky-500 text-white shadow-blue-950/50'
            }`}
          >
            <ToolIcon name={tool.icon} className="w-7 h-7" />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {tool.name}
              </h1>
              {tool.badge && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-cyan-300 border border-blue-500/25 font-semibold">
                  {tool.badge}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-sky-200/90 mb-1">{tool.tagline}</p>
            <p className="text-xs text-slate-400 max-w-2xl">{tool.description}</p>
          </div>
        </div>

        {/* Quick Jump to Other Tools in Category */}
        {relatedTools.length > 0 && (
          <div className="shrink-0 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <p className="text-[11px] font-semibold text-slate-400 mb-2">Also in {tool.category}:</p>
            <div className="flex flex-wrap md:flex-col gap-1.5">
              {relatedTools.map((rel) => (
                <Link
                  key={rel.id}
                  to={rel.path}
                  className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-blue-900/40 border border-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <ToolIcon name={rel.icon} className="w-3.5 h-3.5 text-blue-400" />
                  <span>{rel.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Tool Interactive Surface */}
      <div className="min-h-[460px]">{children}</div>

      {/* Trust & Feature Highlights Footer Banner */}
      <div className="mt-14 pt-8 border-t border-blue-950/60 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400">
        <div className="p-5 rounded-2xl bg-[#0b1222]/80 border border-slate-800/80">
          <div className="flex items-center gap-2.5 text-white font-semibold text-sm mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span>100% Client-Side Privacy</span>
          </div>
          <p className="leading-relaxed">
            Your documents are processed securely in your browser using WebAssembly and memory buffers. Your data never leaves your computer for local operations.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0b1222]/80 border border-slate-800/80">
          <div className="flex items-center gap-2.5 text-white font-semibold text-sm mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <span>No Limits & Zero Watermarks</span>
          </div>
          <p className="leading-relaxed">
            Unlimited file sizes, unlimited pages, zero annoying watermarks, and zero paywalls. Everything is 100% free and ready for production use.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0b1222]/80 border border-slate-800/80">
          <div className="flex items-center gap-2.5 text-white font-semibold text-sm mb-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>Direct Instant Download</span>
          </div>
          <p className="leading-relaxed">
            All files download straight to your computer's Downloads folder instantly. No waiting in server conversion queues or signing up for accounts.
          </p>
        </div>
      </div>
    </div>
  );
};
