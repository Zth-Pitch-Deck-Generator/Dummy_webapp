// src/components/DeckPreview.tsx
import { useState, useMemo } from 'react';
import { ProjectData, QAData, GeneratedSlide } from '@/pages/Index.tsx';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2, FileText, TrendingUp, Users, Target, Lightbulb, DollarSign, Calendar, AlertTriangle, Trophy } from 'lucide-react';
import AllSlidesTab from './deck-preview-tabs/AllSlidesTab';
import CrucialSlidesTab from './deck-preview-tabs/CrucialSlidesTab';
import NotesFeedbackTab from './deck-preview-tabs/NotesFeedbackTab';

interface DeckPreviewProps {
  projectData: ProjectData | null;
  qaData: QAData;
  generatedSlides: GeneratedSlide[];
  downloadUrl: string | null;
}

export interface SlideData {
  id: string;
  title: string;
  type: 'title' | 'content' | 'data' | 'conclusion';
  icon: React.ElementType;
  isCrucial: boolean;
  content: string[];
  notes?: string;
}

// This function determines if a slide is "crucial" for a VC audience.
const getSlideMetadata = (title: string): { icon: React.ElementType; type: 'title' | 'content' | 'data' | 'conclusion'; isCrucial: boolean } => {
  const lowerCaseTitle = title.toLowerCase();
  // Core narrative slides are crucial
  if (lowerCaseTitle.includes('problem')) return { icon: AlertTriangle, type: 'content', isCrucial: true };
  if (lowerCaseTitle.includes('solution')) return { icon: Lightbulb, type: 'content', isCrucial: true };
  // Financials and the "ask" are crucial
  if (lowerCaseTitle.includes('business model') || lowerCaseTitle.includes('revenue')) return { icon: DollarSign, type: 'content', isCrucial: true };
  if (lowerCaseTitle.includes('financials') || lowerCaseTitle.includes('projections')) return { icon: TrendingUp, type: 'data', isCrucial: true };
  if (lowerCaseTitle.includes('funding') || lowerCaseTitle.includes('ask')) return { icon: DollarSign, type: 'content', isCrucial: true };
  // Team is crucial
  if (lowerCaseTitle.includes('team')) return { icon: Users, type: 'content', isCrucial: true };
  
  // Other slides are important but not marked as "crucial" to keep the focus tight.
  if (lowerCaseTitle.includes('market')) return { icon: Target, type: 'content', isCrucial: false };
  if (lowerCaseTitle.includes('traction')) return { icon: TrendingUp, type: 'data', isCrucial: false };
  if (lowerCaseTitle.includes('competition')) return { icon: Users, type: 'content', isCrucial: false };
  if (lowerCaseTitle.includes('roadmap') || lowerCaseTitle.includes('milestones')) return { icon: Calendar, type: 'content', isCrucial: false };
  if (lowerCaseTitle.includes('conclusion') || lowerCaseTitle.includes('next steps')) return { icon: Trophy, type: 'conclusion', isCrucial: false };
  
  // Default for title slides or others
  return { icon: FileText, type: 'title', isCrucial: false };
};

const DeckPreview = ({ projectData, qaData, generatedSlides, downloadUrl }: DeckPreviewProps) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const slides: SlideData[] = useMemo(() => {
    if (!generatedSlides) return [];
    return generatedSlides.map((slide, index) => {
      const metadata = getSlideMetadata(slide.title);
      return {
        id: slide.title.toLowerCase().replace(/\s+/g, '-') || `slide-${index}`,
        title: slide.title,
        content: slide.content,
        ...metadata,
      };
    });
  }, [generatedSlides]);

  const crucialSlides = slides.filter(slide => slide.isCrucial);

  const handleDownload = async () => {
    if (!downloadUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        console.error("Supabase response error:", await response.text());
        throw new Error("File not found or access denied by storage policy.");
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const fileName = `${projectData?.projectName || 'pitch-deck'}.pptx`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Could not download the file. Please ensure the Supabase bucket policy is set correctly.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!projectData) {
    return <div>Loading project data...</div>;
  }

  const projectId = localStorage.getItem("projectId");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Deck Preview</h1>
            <p className="text-gray-600">
              {projectData.projectName} • {slides.length} slides • {projectData.decktype} template
            </p>
          </div>
          {downloadUrl && (
            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 flex items-center gap-2"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download PPTX
              </Button>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="slides" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="slides">All Slides</TabsTrigger>
          <TabsTrigger value="crucial">Crucial Slides</TabsTrigger>
          <TabsTrigger value="notes">Notes & Feedback</TabsTrigger>
        </TabsList>
        
        <TabsContent value="slides" className="mt-6">
          <AllSlidesTab slides={slides} />
        </TabsContent>
        
        <TabsContent value="crucial" className="mt-6">
          <CrucialSlidesTab crucialSlides={crucialSlides} projectData={projectData} />
        </TabsContent>
        
        <TabsContent value="notes" className="mt-6">
          <NotesFeedbackTab qaData={qaData} projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeckPreview;
