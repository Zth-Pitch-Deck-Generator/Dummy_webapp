// src/components/DeckPreview.tsx
import { useState, useMemo } from 'react';
import { ProjectData, QAData, GeneratedSlide } from '@/pages/Index';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  Edit, 
  Star, 
  FileText, 
  TrendingUp, 
  Users, 
  Target, 
  Lightbulb,
  DollarSign,
  Calendar,
  AlertTriangle,
  Trophy
} from 'lucide-react';

interface DeckPreviewProps {
  projectData: ProjectData | null;
  qaData: QAData;
  generatedSlides: GeneratedSlide[];
  downloadUrl: string | null;
}

interface SlideData {
  id: string;
  title: string;
  type: 'title' | 'content' | 'data' | 'conclusion';
  icon: React.ElementType;
  isCrucial: boolean;
  content: string[];
  notes?: string;
}

// A helper to map slide titles to icons and metadata
const getSlideMetadata = (title: string): { icon: React.ElementType; type: 'title' | 'content' | 'data' | 'conclusion'; isCrucial: boolean } => {
  const lowerCaseTitle = title.toLowerCase();
  if (lowerCaseTitle.includes('problem')) return { icon: AlertTriangle, type: 'content', isCrucial: true };
  if (lowerCaseTitle.includes('solution')) return { icon: Lightbulb, type: 'content', isCrucial: true };
  if (lowerCaseTitle.includes('market')) return { icon: Target, type: 'content', isCrucial: true };
  if (lowerCaseTitle.includes('business model') || lowerCaseTitle.includes('revenue')) return { icon: DollarSign, type: 'content', isCrucial: true };
  if (lowerCaseTitle.includes('traction')) return { icon: TrendingUp, type: 'data', isCrucial: false };
  if (lowerCaseTitle.includes('competition')) return { icon: Users, type: 'content', isCrucial: false };
  if (lowerCaseTitle.includes('roadmap') || lowerCaseTitle.includes('milestones')) return { icon: Calendar, type: 'content', isCrucial: false };
  if (lowerCaseTitle.includes('financials') || lowerCaseTitle.includes('projections')) return { icon: TrendingUp, type: 'data', isCrucial: true };
  if (lowerCaseTitle.includes('funding') || lowerCaseTitle.includes('ask')) return { icon: DollarSign, type: 'content', isCrucial: true };
  if (lowerCaseTitle.includes('team')) return { icon: Users, type: 'content', isCrucial: true };
  if (lowerCaseTitle.includes('conclusion') || lowerCaseTitle.includes('next steps')) return { icon: Trophy, type: 'conclusion', isCrucial: true };
  return { icon: FileText, type: 'title', isCrucial: true }; // Default for title slide or others
};


const DeckPreview = ({ projectData, qaData, generatedSlides, downloadUrl }: DeckPreviewProps) => {
  const [selectedSlide, setSelectedSlide] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');

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

  const handleSlideClick = (slideId: string) => {
    setSelectedSlide(slideId === selectedSlide ? null : slideId);
  };

  if (!projectData) {
    return <div>Loading project data...</div>;
  }

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
                asChild
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 flex items-center gap-2"
              >
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4" />
                  Download PPTX
                </a>
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slides.map((slide, index) => {
              const Icon = slide.icon;
              const isSelected = selectedSlide === slide.id;
              
              return (
                <Card
                  key={slide.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    isSelected ? 'ring-2 ring-purple-500' : ''
                  } ${slide.isCrucial ? 'border-orange-200 bg-orange-50' : ''}`}
                  onClick={() => handleSlideClick(slide.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5 text-gray-600" />
                        <span className="text-sm font-medium text-gray-600">
                          Slide {index + 1}
                        </span>
                      </div>
                      {slide.isCrucial && (
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                          <Star className="w-3 h-3 mr-1" />
                          Crucial
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg leading-tight">
                      {slide.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {slide.content.map((bullet, i) => <li key={i}>{bullet}</li>)}
                    </ul>
                    {isSelected && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Edit className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-600">
                            Quick Notes
                          </span>
                        </div>
                        <textarea
                          className="w-full text-sm p-2 border rounded resize-none"
                          rows={3}
                          placeholder="Add notes or ideas for this slide..."
                          value={editingNotes}
                          onChange={(e) => setEditingNotes(e.target.value)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        
        <TabsContent value="crucial" className="mt-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Crucial Slides ({crucialSlides.length})
            </h3>
            <p className="text-gray-600">
              These slides are essential for your {projectData.decktype} presentation and should be given extra attention.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {crucialSlides.map((slide) => {
              const Icon = slide.icon;
              
              return (
                <Card key={slide.id} className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-orange-600" />
                      <CardTitle className="text-lg">{slide.title}</CardTitle>
                      <Badge className="ml-auto bg-orange-100 text-orange-800">
                        Priority
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                     <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {slide.content.map((bullet, i) => <li key={i}>{bullet}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        
        <TabsContent value="notes" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
                <CardDescription>
                  Based on your Q&A responses, here are some suggestions for your pitch deck.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-1">Strong Problem Definition</h4>
                      <p className="text-sm text-blue-700">
                        Your problem statement is clear and specific. Make sure to include concrete examples or statistics to strengthen your case.
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-1">Target Audience Clarity</h4>
                      <p className="text-sm text-green-700">
                        You've identified a specific target market. Consider adding persona details or market size data to your target market slide.
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-1">Business Model Focus</h4>
                      <p className="text-sm text-purple-700">
                        Your revenue model is well-defined. Include pricing tiers or financial projections to make it more compelling.
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Q&A Summary</CardTitle>
                <CardDescription>
                  Key insights from your interactive session.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {qaData.slice(0, 4).map((qa, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          Q: {qa.question.slice(0, 80)}...
                        </p>
                        <p className="text-sm text-gray-600">
                          A: {qa.answer.slice(0, 100)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeckPreview;
