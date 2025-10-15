import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Save } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { supabase } from '@/lib/supabase';

interface DeckSlide {
  id: string;
  project_id: string;
  slide_number: number;
  title: string;
  html_content: string;
}

interface DeckEditorProps {
  projectId: string;
  templateInfo?: { name: string; description: string }; // Optionally pass selected template
  outline?: any; // Optionally pass generated outline
  onDownloadReady?: (url: string) => void;
}

const DeckEditor = ({
  projectId,
  templateInfo,
  outline,
  onDownloadReady,
}: DeckEditorProps) => {
  const [slides, setSlides] = useState<DeckSlide[]>([]);
  const [activeSlide, setActiveSlide] = useState<DeckSlide | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // new: track slide gen
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Only generate slides if not present, and both template+outline given
  const handleGenerateSlides = async () => {
    if (!projectId || !templateInfo || !outline) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      if (!res.ok) throw new Error('Failed to generate slides.');
      const generatedSlides = await res.json();
      setSlides(generatedSlides);
      setActiveSlide(generatedSlides[0] || null);
    } catch (err) {
      alert("Slide generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch slides from DB if already generated or after an edit
  useEffect(() => {
    if (!projectId) return;
    const fetchSlides = async () => {
      const { data } = await supabase
        .from('deck_slides')
        .select('*')
        .eq('project_id', projectId)
        .order('slide_number');
      setSlides(data || []);
      setActiveSlide((data && data[0]) || null);
    };
    fetchSlides();
  }, [projectId]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (activeSlide) {
      setActiveSlide({ ...activeSlide, html_content: e.target.value });
    }
  };

  // Save slide
  const handleSave = async () => {
    if (!activeSlide) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/slides/${activeSlide.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html_content: activeSlide.html_content }),
      });
      if (!res.ok) throw new Error('Failed to save.');
      // Fetch updated slides after save to refresh DB content
      const { data } = await supabase
        .from('deck_slides')
        .select('*')
        .eq('project_id', projectId)
        .order('slide_number');
      setSlides(data || []);
      setActiveSlide((data && data.find(s => s.id === activeSlide.id)) || null);
    } finally {
      setIsSaving(false);
    }
  };

  // Compile & download PPTX
  const handleCompileAndDownload = async () => {
    setIsCompiling(true);
    try {
      const res = await fetch('/api/compile-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error('Compile failed.');
      const { downloadUrl } = await res.json();
      setDownloadUrl(downloadUrl);
      if (onDownloadReady) onDownloadReady(downloadUrl);
    } finally {
      setIsCompiling(false);
    }
  };

  // UI: Slide nav, editor, preview, generation, download button
  return (
    <div className="h-full flex flex-col">
      {/* Slide Generation */}
      {!slides.length && templateInfo && outline && (
        <div className="my-4">
          <Button onClick={handleGenerateSlides} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>Generate Slides</span>
            )}
          </Button>
        </div>
      )}
      {/* Slide Navigation */}
      {slides.length > 0 && (
        <>
          <div className="flex-shrink-0 p-2 border-b flex items-center justify-between">
            <div className="flex space-x-2">
              {slides.map((slide) => (
                <button
                  key={slide.id}
                  onClick={() => setActiveSlide(slide)}
                  className={`px-3 py-1 rounded ${
                    activeSlide?.id === slide.id ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  {slide.slide_number}
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="ml-2">Save Slide</span>
              </Button>
              <Button onClick={handleCompileAndDownload} disabled={isCompiling}>
                {isCompiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span className="ml-2">Download PPTX</span>
              </Button>
            </div>
          </div>

          {/* Editor and Preview */}
          <ResizablePanelGroup direction="horizontal" className="flex-grow">
            <ResizablePanel defaultSize={50}>
              <textarea
                value={activeSlide?.html_content || ''}
                onChange={handleCodeChange}
                className="w-full h-full p-4 font-mono text-sm resize-none border-0 focus:ring-0"
                placeholder="Loading slide code..."
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50}>
              <iframe
                srcDoc={activeSlide?.html_content || ''}
                title="Slide Preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            </ResizablePanel>
          </ResizablePanelGroup>

          {/* Final download link */}
          {downloadUrl && (
            <div className="mt-6">
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                Download Pitch Deck
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DeckEditor;
