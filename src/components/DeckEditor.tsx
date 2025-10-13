// src/components/DeckEditor.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Save } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { supabase } from '@/lib/supabase'; // Assuming you have this configured

// For a better experience, you'd use a real code editor like Monaco or CodeMirror
// For simplicity, we'll use a standard textarea here.

interface DeckSlide {
  id: string;
  project_id: string;
  slide_number: number;
  title: string;
  html_content: string;
}

interface DeckEditorProps {
  projectId: string;
  initialSlides: DeckSlide[];
  onDownloadReady: (url: string) => void;
}

const DeckEditor = ({ projectId, initialSlides, onDownloadReady }: DeckEditorProps) => {
  const [slides, setSlides] = useState<DeckSlide[]>(initialSlides);
  const [activeSlide, setActiveSlide] = useState<DeckSlide | null>(initialSlides[0] || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  useEffect(() => {
    setActiveSlide(slides[0] || null);
  }, [slides]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (activeSlide) {
      setActiveSlide({ ...activeSlide, html_content: e.target.value });
    }
  };

  const handleSave = async () => {
    if (!activeSlide) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/slides/${activeSlide.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html_content: activeSlide.html_content }),
      });
      if (!response.ok) throw new Error("Failed to save.");
      
      // Update local state after saving
      setSlides(slides.map(s => s.id === activeSlide.id ? activeSlide : s));
    } catch (error) {
      console.error(error);
      alert("Error saving slide.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompileAndDownload = async () => {
    setIsCompiling(true);
    try {
      const response = await fetch('/api/compile-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!response.ok) throw new Error("Failed to compile deck.");
      const { downloadUrl } = await response.json();
      onDownloadReady(downloadUrl);
    } catch (error) {
      console.error(error);
      alert("Error compiling deck.");
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Slide Navigation */}
      <div className="flex-shrink-0 p-2 border-b flex items-center justify-between">
         <div className="flex space-x-2">
            {slides.map((slide) => (
              <button 
                key={slide.id} 
                onClick={() => setActiveSlide(slide)}
                className={`px-3 py-1 rounded ${activeSlide?.id === slide.id ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
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
            sandbox="allow-scripts"
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default DeckEditor;