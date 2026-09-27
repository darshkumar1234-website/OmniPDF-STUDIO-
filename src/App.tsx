import React, { useState, useMemo } from 'react';
import { TOOLS } from './data/tools';
import { ToolCategory, ToolId } from './types';
import { Header } from './components/Header';
import { ToolGrid } from './components/ToolGrid';
import { createSamplePdf } from './utils/samplePdfs';

// Tools
import { MergeTool } from './components/tools/MergeTool';
import { SplitTool } from './components/tools/SplitTool';
import { OrganizeTool } from './components/tools/OrganizeTool';
import { ImagesToPdfTool } from './components/tools/ImagesToPdfTool';
import { PdfToImagesTool } from './components/tools/PdfToImagesTool';
import { PageNumbersTool } from './components/tools/PageNumbersTool';
import { CompressTool } from './components/tools/CompressTool';
import { PdfToTextTool } from './components/tools/PdfToTextTool';
import { TextToPdfTool } from './components/tools/TextToPdfTool';
import { AnnotateTool } from './components/tools/AnnotateTool';
import { OcrTool } from './components/tools/OcrTool';
import { AiChatTool } from './components/tools/AiChatTool';
import { AiSummarizeTool } from './components/tools/AiSummarizeTool';
import { AiRedactTool } from './components/tools/AiRedactTool';
import { AiTablesTool } from './components/tools/AiTablesTool';
import { AiTranslateTool } from './components/tools/AiTranslateTool';
import { AiStudyTool } from './components/tools/AiStudyTool';
import { AuthModal } from './components/modals/AuthModal';
import { VaultModal } from './components/modals/VaultModal';
import { HistoryModal } from './components/modals/HistoryModal';
import { ShieldCheck, Heart, Zap, Sparkles } from 'lucide-react';

export default function App() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('all');
  const [selectedToolId, setSelectedToolId] = useState<ToolId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered tools based on category and search query
  const filteredTools = useMemo(() => {
    return TOOLS.filter((tool) => {
      const matchesCategory =
        activeCategory === 'all' ? true : tool.category === activeCategory;
      const matchesSearch =
        searchQuery === ''
          ? true
          : tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // Handler for loading a sample PDF document
  const handleSelectSample = async (type: 'contract' | 'invoice' | 'report') => {
    try {
      const sample = await createSamplePdf(type);
      // If no tool is currently open, open a high-value tool by default (e.g. OCR or AI Chat)
      if (!selectedToolId) {
        if (type === 'invoice') setSelectedToolId('ai-tables');
        else if (type === 'contract') setSelectedToolId('ai-redact');
        else setSelectedToolId('ocr');
      }
    } catch (err) {
      console.error('Failed to create sample PDF:', err);
    }
  };

  const handleToolSelect = (id: string) => {
    setSelectedToolId(id as ToolId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setSelectedToolId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500/30 selection:text-rose-200">
      <Header
        activeCategory={activeCategory}
        onSelectCategory={(cat) => {
          setActiveCategory(cat);
          setSelectedToolId(null);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectSample={handleSelectSample}
        currentToolId={selectedToolId}
        onBackToHome={handleBackToHome}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 pb-16">
        {!selectedToolId ? (
          <ToolGrid
            tools={filteredTools}
            activeCategory={activeCategory}
            onSelectTool={handleToolSelect}
            onSelectSample={handleSelectSample}
          />
        ) : (
          <div className="animate-in fade-in duration-200">
            {selectedToolId === 'merge' && <MergeTool onSelectSample={handleSelectSample} />}
            {selectedToolId === 'split' && <SplitTool onSelectSample={handleSelectSample} />}
            {selectedToolId === 'organize' && <OrganizeTool onSelectSample={handleSelectSample} />}
            {selectedToolId === 'images-to-pdf' && <ImagesToPdfTool />}
            {selectedToolId === 'pdf-to-images' && <PdfToImagesTool onSelectSample={handleSelectSample} />}
            {selectedToolId === 'page-numbers' && <PageNumbersTool onSelectSample={handleSelectSample} />}
            {selectedToolId === 'compress' && <CompressTool onSelectSample={handleSelectSample} />}
            {selectedToolId === 'pdf-to-text' && <PdfToTextTool onSelectSample={handleSelectSample} />}
            {selectedToolId === 'text-to-pdf' && <TextToPdfTool />}
            {selectedToolId === 'annotate' && <AnnotateTool onSelectSample={handleSelectSample} />}
            {selectedToolId === 'ocr' && <OcrTool onSelectSample={handleSelectSample} />}
            {selectedToolId === 'ai-chat' && <AiChatTool onSelectSample={handleSelectSample} />}
            {selectedToolId === 'ai-summarize' && <AiSummarizeTool onSelectSample={handleSelectSample} />}
            {selectedToolId === 'ai-redact' && <AiRedactTool onSelectSample={handleSelectSample} />}
            {selectedToolId === 'ai-tables' && <AiTablesTool onSelectSample={handleSelectSample} />}
            {selectedToolId === 'ai-translate' && <AiTranslateTool onSelectSample={handleSelectSample} />}
            {selectedToolId === 'ai-study' && <AiStudyTool onSelectSample={handleSelectSample} />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10 px-4 sm:px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <span className="font-extrabold text-sm text-white tracking-tight">OmniPDF Studio</span>
            <span className="hidden sm:inline text-slate-700">·</span>
            <span className="text-slate-400">
              100% Free · Zero Watermarks · Client-Side Private Processing
            </span>
          </div>

          <div className="flex items-center gap-6 text-slate-400 text-xs">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>In-Browser Privacy</span>
            </div>
            <span>·</span>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span>Gemini 3.8 Flash OCR</span>
            </div>
            <span>·</span>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>Instant Exports</span>
            </div>
          </div>
        </div>
      </footer>
      {/* Modals */}
      <AuthModal />
      <VaultModal onOpenToolWithFile={(toolId) => setSelectedToolId(toolId)} />
      <HistoryModal />
    </div>
  );
}
