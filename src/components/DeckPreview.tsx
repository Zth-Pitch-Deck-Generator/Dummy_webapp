
import { useState } from 'react';
import { ProjectData, QAData } from '@/pages/Index';
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
  projectData: ProjectData;
  qaData: QAData;
}

interface SlideData {
  id: string;
  title: string;
  type: 'title' | 'content' | 'data' | 'conclusion';
  icon: any;
  isCrucial: boolean;
  content: string;
  notes?: string;
}

const DeckPreview = ({ projectData, qaData }: DeckPreviewProps) => {
  const [selectedSlide, setSelectedSlide] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');

  // Generate slides based on template and Q&A data
  const generateSlides = (): SlideData[] => {
    const baseSlides: SlideData[] = [
      {
        id: 'title',
        title: projectData.projectName,
        type: 'title',
        icon: FileText,
        isCrucial: true,
        content: `${projectData.projectName}\n${projectData.industry} Solution`,
      },
      {
        id: 'problem',
        title: 'Problem Statement',
        type: 'content',
        icon: AlertTriangle,
        isCrucial: true,
        content: 'The specific problem your solution addresses',
      },
      {
        id: 'solution',
        title: 'Our Solution',
        type: 'content',
        icon: Lightbulb,
        isCrucial: true,
        content: 'How your product/service solves the problem',
      },
      {
        id: 'market',
        title: 'Target Market',
        type: 'content',
        icon: Target,
        isCrucial: true,
        content: 'Your target audience and market size',
      },
      {
        id: 'business-model',
        title: 'Business Model',
        type: 'content',
        icon: DollarSign,
        isCrucial: true,
        content: 'How you generate revenue',
      },
      {
        id: 'traction',
        title: 'Traction & Validation',
        type: 'data',
        icon: TrendingUp,
        isCrucial: false,
        content: 'Evidence of market demand and early success',
      },
      {
        id: 'competition',
        title: 'Competitive Analysis',
        type: 'content',
        icon: Users,
        isCrucial: false,
        content: 'How you compare to existing solutions',
      },
      {
        id: 'roadmap',
        title: 'Roadmap & Milestones',
        type: 'content',
        icon: Calendar,
        isCrucial: false,
        content: 'Key milestones and future plans',
      },
    ];

    // Add template-specific slides
    if (projectData.template === 'investor') {
      baseSlides.push(
        {
          id: 'financials',
          title: 'Financial Projections',
          type: 'data',
          icon: TrendingUp,
          isCrucial: true,
          content: 'Revenue projections and key metrics',
        },
        {
          id: 'funding',
          title: 'Funding Request',
          type: 'content',
          icon: DollarSign,
          isCrucial: true,
          content: 'Investment needed and use of funds',
        }
      );
    }

    if (projectData.template === 'matrix') {
      baseSlides.push(
        {
          id: 'swot',
          title: 'SWOT Analysis',
          type: 'content',
          icon: Target,
          isCrucial: false,
          content: 'Strengths, weaknesses, opportunities, threats',
        }
      );
    }

    baseSlides.push({
      id: 'conclusion',
      title: 'Next Steps',
      type: 'conclusion',
      icon: Trophy,
      isCrucial: true,
      content: 'Call to action and next steps',
    });

    return baseSlides.slice(0, projectData.slideCount);
  };

  const slides = generateSlides();
  const crucialSlides = slides.filter(slide => slide.isCrucial);

  const handleExport = (format: 'pdf' | 'pptx') => {
    // Placeholder for export functionality
    alert(`Export to ${format.toUpperCase()} functionality would be implemented here!`);
  };

  const handleSlideClick = (slideId: string) => {
    setSelectedSlide(slideId === selectedSlide ? null : slideId);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Deck Preview</h1>
            <p className="text-gray-600">
              {projectData.projectName} • {slides.length} slides • {projectData.template} template
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            <Button
              onClick={() => handleExport('pptx')}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export PPTX
            </Button>
          </div>
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
                    <CardDescription className="text-sm">
                      {slide.content}
                    </CardDescription>
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
              These slides are essential for your {projectData.template} presentation and should be given extra attention.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {crucialSlides.map((slide, index) => {
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
                    <CardDescription className="text-gray-700">
                      {slide.content}
                    </CardDescription>
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
