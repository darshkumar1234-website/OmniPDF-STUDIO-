import React, { useState, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { TOOLS } from './data/tools';
import { ToolCategory, ToolId, ToolDef } from './types';
import { Header } from './components/Header';
import { ToolGrid } from './components/ToolGrid';
import { FeaturePageLayout } from './components/FeaturePageLayout';
import { SeoHead } from './components/SeoHead';
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
import { HistoryModal } from './components/modals/HistoryModal';
import { ShieldCheck, Zap, Sparkles } from 'lucide-react';

export default function App() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

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

  // Quick lookup helper
  const getTool = (id: ToolId): ToolDef => {
    return TOOLS.find((t) => t.id === id) || TOOLS[0];
  };

  // Handler for loading a sample PDF document and directing user to relevant tool page
  const handleSelectSample = async (type: 'contract' | 'invoice' | 'report') => {
    try {
      await createSamplePdf(type);
      if (type === 'invoice') {
        navigate('/tablespdf');
      } else if (type === 'contract') {
        navigate('/redactpdf');
      } else {
        navigate('/ocrpdf');
      }
    } catch (err) {
      console.error('Failed to create sample PDF:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-blue-600/30 selection:text-blue-200">
      <Header
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectSample={handleSelectSample}
      />

      {/* Main Multi-page Routes */}
      <main className="flex-1 pb-16">
        <Routes>
          {/* Home Catalog */}
          <Route
            path="/"
            element={
              <>
                <SeoHead
                  title="OmniPDF Studio – 100% Free AI PDF Suite & Tools"
                  description="All-in-one 100% free PDF toolkit: merge, split, convert without watermarks, OCR text extraction, visual editor, page organizer, and AI document intelligence."
                  path="/"
                  keywords={[
                    'pdf tools',
                    'free pdf editor',
                    'merge pdf',
                    'split pdf',
                    'ai ocr',
                    'omni ai pdf',
                    'convert pdf online',
                  ]}
                  isAi
                />
                <ToolGrid
                  tools={filteredTools}
                  activeCategory={activeCategory}
                  onSelectSample={handleSelectSample}
                />
              </>
            }
          />

          {/* Dedicated Web Pages for Every PDF & AI Feature */}
          <Route
            path="/mergepdf"
            element={
              <FeaturePageLayout tool={getTool('merge')}>
                <MergeTool onSelectSample={handleSelectSample} />
              </FeaturePageLayout>
            }
          />
          <Route
            path="/splitpdf"
            element={
              <FeaturePageLayout tool={getTool('split')}>
                <SplitTool onSelectSample={handleSelectSample} />
              </FeaturePageLayout>
            }
          />
          <Route
            path="/organizepdf"
            element={
              <FeaturePageLayout tool={getTool('organize')}>
                <OrganizeTool onSelectSample={handleSelectSample} />
              </FeaturePageLayout>
            }
          />
          <Route
            path="/pagenumbers"
            element={
              <FeaturePageLayout tool={getTool('page-numbers')}>
                <PageNumbersTool onSelectSample={handleSelectSample} />
              </FeaturePageLayout>
            }
          />
          <Route
            path="/compresspdf"
            element={
              <FeaturePageLayout tool={getTool('compress')}>
                <CompressTool onSelectSample={handleSelectSample} />
              </FeaturePageLayout>
            }
          />
          <Route
            path="/imagestopdf"
            element={
              <FeaturePageLayout tool={getTool('images-to-pdf')}>
                <ImagesToPdfTool />
              </FeaturePageLayout>
            }
          />
          <Route
            path="/pdftoimages"
            element={
              <FeaturePageLayout tool={getTool('pdf-to-images')}>
                <PdfToImagesTool onSelectSample={handleSelectSample} />
              </FeaturePageLayout>
            }
          />
          <Route
            path="/pdftotext"
            element={
              <FeaturePageLayout tool={getTool('pdf-to-text')}>
                <PdfToTextTool onSelectSample={handleSelectSample} />
              </FeaturePageLayout>
            }
          />
          <Route
            path="/texttopdf"
            element={
              <FeaturePageLayout tool={getTool('text-to-pdf')}>
                <TextToPdfTool />
              </FeaturePageLayout>
            }
          />
          <Route
            path="/annotatepdf"
            element={
              <FeaturePageLayout tool={getTool('annotate')}>
                <AnnotateTool onSelectSample={handleSelectSample} />
              </FeaturePageLayout>
            }
          />
          <Route
            path="/ocrpdf"
            element={
              <FeaturePageLayout tool={getTool('ocr')}>
                <OcrTool onSelectSample={handleSelectSample} />
              </FeaturePageLayout>
            }
          />
          <Route
            path="/chatpdf"
            element={
              <FeaturePageLayout tool={getTool('ai-chat')}>
                <AiChatTool onSelectSample={handleSelectSample} />
              </FeaturePageLayout>
            }
          />
          <Route
            path="/summarizepdf"
            element={
              <FeaturePageLayout tool={getTool('ai-summarize')}>
                <AiSummarizeTool onSelectSample={handleSelectSample} />
              </FeaturePageLayout>
            }
          />
          <Route
            path="/redactpdf"
            element={
              <FeaturePageLayout tool={getTool('ai-redact')}>
                <AiRedactTool onSelectSample={handleSelectSample} />
              </FeaturePageLayout>
            }
          />
          <Route
            path="/tablespdf"
            element={
              <FeaturePageLayout tool={getTool('ai-tables')}>
                <AiTablesTool onSelectSample={handleSelectSample} />
              </FeaturePageLayout>
            }
          />
          <Route
            path="/translatepdf"
            element={
              <FeaturePageLayout tool={getTool('ai-translate')}>
                <AiTranslateTool onSelectSample={handleSelectSample} />
              </FeaturePageLayout>
            }
          />
          <Route
            path="/studypdf"
            element={
              <FeaturePageLayout tool={getTool('ai-study')}>
                <AiStudyTool onSelectSample={handleSelectSample} />
              </FeaturePageLayout>
            }
          />

          {/* Convenient Direct Aliases */}
          <Route path="/merge" element={<Navigate to="/mergepdf" replace />} />
          <Route path="/split" element={<Navigate to="/splitpdf" replace />} />
          <Route path="/organize" element={<Navigate to="/organizepdf" replace />} />
          <Route path="/compress" element={<Navigate to="/compresspdf" replace />} />
          <Route path="/annotate" element={<Navigate to="/annotatepdf" replace />} />
          <Route path="/ocr" element={<Navigate to="/ocrpdf" replace />} />
          <Route path="/chat" element={<Navigate to="/chatpdf" replace />} />
          <Route path="/summarize" element={<Navigate to="/summarizepdf" replace />} />
          <Route path="/redact" element={<Navigate to="/redactpdf" replace />} />
          <Route path="/tables" element={<Navigate to="/tablespdf" replace />} />
          <Route path="/translate" element={<Navigate to="/translatepdf" replace />} />
          <Route path="/study" element={<Navigate to="/studypdf" replace />} />

          {/* Catch-all redirect to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-blue-950/70 bg-[#070b14] py-10 px-4 sm:px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <span className="font-extrabold text-sm text-white tracking-tight">OmniPDF Studio</span>
            <span className="hidden sm:inline text-slate-700">·</span>
            <span className="text-slate-400">
              100% Free · Zero Watermarks · Direct URLs for Every Feature
            </span>
          </div>

          <div className="flex items-center gap-6 text-slate-400 text-xs">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>In-Browser Privacy</span>
            </div>
            <span>·</span>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Omni AI OCR</span>
            </div>
            <span>·</span>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-400" />
              <span>Instant Exports</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <AuthModal />
      <HistoryModal />
    </div>
  );
}
