import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  FileText,
  Search,
  ShieldCheck,
  Zap,
  History,
  LogOut,
  LogIn,
  ArrowLeft,
} from 'lucide-react';
import { ToolCategory } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeCategory: ToolCategory;
  onSelectCategory: (category: ToolCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectSample: (type: 'contract' | 'invoice' | 'report') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onSelectSample,
}) => {
  const { user, operations, setIsAuthModalOpen, setIsHistoryOpen, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const handleLogoClick = () => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryClick = (cat: ToolCategory) => {
    onSelectCategory(cat);
    if (!isHomePage) {
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-blue-950/70 bg-[#070b14]/90 backdrop-blur-md">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/50 border-b border-blue-900/25 px-4 py-1.5 text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Free & No Watermarks
            </span>
            <span className="hidden sm:inline text-slate-700">·</span>
            <span className="hidden sm:inline text-slate-400">
              Private Client-Side Processing & Activity Log
            </span>
            <span className="hidden md:inline text-slate-700">·</span>
            <span className="hidden md:inline text-cyan-300 flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" />
              Gemini 3.8 Flash Document AI
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs hidden sm:inline">Quick sample:</span>
            <button
              onClick={() => onSelectSample('contract')}
              className="px-2 py-0.5 text-xs bg-slate-900 hover:bg-blue-900/40 text-slate-300 hover:text-white border border-slate-800 rounded transition-colors"
            >
              Contract
            </button>
            <button
              onClick={() => onSelectSample('invoice')}
              className="px-2 py-0.5 text-xs bg-slate-900 hover:bg-blue-900/40 text-slate-300 hover:text-white border border-slate-800 rounded transition-colors"
            >
              Invoice
            </button>
            <button
              onClick={() => onSelectSample('report')}
              className="px-2 py-0.5 text-xs bg-slate-900 hover:bg-blue-900/40 text-slate-300 hover:text-white border border-slate-800 rounded transition-colors"
            >
              Research Paper
            </button>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-3 text-left group focus:outline-none cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-950/60 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white group-hover:text-blue-400 transition-colors">
                OmniPDF
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/25">
                PRO FREE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Merge, Split, Convert & AI Document Suite
            </p>
          </div>
        </button>

        {/* Quick Search */}
        <div className="flex-1 max-w-sm relative hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (!isHomePage) navigate('/');
            }}
            placeholder="Search tools (e.g. split, merge, ocr, chat, compress)..."
            className="w-full bg-slate-900/90 text-sm text-slate-200 placeholder-slate-500 rounded-xl pl-9 pr-4 py-2 border border-slate-800 focus:border-blue-500/70 focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Auth & Navigation Actions */}
        <div className="flex items-center gap-2">
          {!isHomePage && (
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">All Tools</span>
            </button>
          )}

          {/* Operation History Button */}
          <button
            onClick={() => {
              if (!user) setIsAuthModalOpen(true);
              else setIsHistoryOpen(true);
            }}
            className="relative px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="PDF Operations History"
          >
            <History className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">History</span>
            {user && operations.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-[10px] text-white font-bold">
                {operations.length}
              </span>
            )}
          </button>

          {/* Auth Button */}
          {user ? (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
              <div
                className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[10px]"
                title={user.email || 'Authenticated User'}
              >
                {(user.email?.[0] || 'U').toUpperCase()}
              </div>
              <span className="text-[11px] text-slate-300 max-w-[90px] truncate hidden md:inline px-1">
                {user.isAnonymous ? 'Guest' : user.email?.split('@')[0]}
              </span>
              <button
                onClick={logout}
                title="Log Out"
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-950/50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Category Segmented Tabs (shown on home page) */}
      {isHomePage && (
        <div className="border-t border-blue-950/60 px-4 sm:px-6 bg-[#070b14]/70">
          <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-2 no-scrollbar">
            {(
              [
                { id: 'all', label: 'All 17 Tools' },
                { id: 'organize', label: 'Organize & Pages' },
                { id: 'convert', label: 'Convert' },
                { id: 'edit', label: 'Annotate & Sign' },
                { id: 'ai', label: 'AI Intelligence & OCR', isAi: true },
              ] as { id: ToolCategory; label: string; isAi?: boolean }[]
            ).map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {cat.isAi && <Sparkles className="w-3.5 h-3.5 text-cyan-300" />}
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
