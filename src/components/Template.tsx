import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExternalLink, Loader2 } from 'lucide-react';
import { GeneratedSlide } from '@/pages/Index.tsx';
import { supabase } from '@/lib/supabase';

interface TemplateProps {
  onGenerate: (slides: GeneratedSlide[], url: string) => void;
  industry: string;
  productDescription?: string;   // <-- Accept as prop for Gemini
}

interface Template {
  id: string;
  industry: string;
  name: string;
  description: string;
  tags: string[];
  file_path: string;
  preview_url?: string;
}

const Template = ({ onGenerate, industry, productDescription }: TemplateProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const normalizeIndustry = (selectedIndustry: string): string => {
    const industryMap: Record<string, string> = {
      'Technology': 'technology',
      'Startup': 'startup',
      'FinTech': 'fintech',
      'Edtech': 'edtech',
      'Ecommerce': 'e-commerce',
      'General': 'general'
    };
    return industryMap[selectedIndustry] || 'general';
  };

  useEffect(() => {
    const fetchTemplates = async (normalizedIndustry: string) => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('templates')
          .select('*')
          .eq('industry', normalizedIndustry)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching templates:', error);
          if (normalizedIndustry !== 'general') {
            await fetchTemplates('general');
          }
          return;
        }

        if (data && data.length > 0) {
          setTemplates(data);
        } else if (normalizedIndustry !== 'general') {
          await fetchTemplates('general');
        }
      } catch (error) {
        console.error('Unexpected error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const normalizedIndustry = normalizeIndustry(industry);
    fetchTemplates(normalizedIndustry);
  }, [industry]);

  const getTemplateUrl = (filePath: string): string => {
    const { data } = supabase.storage
      .from('deck-templates')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleGenerateClick = async () => {
    if (!selectedTemplate) {
      alert("Please select a template to continue.");
      return;
    }

    setIsGenerating(true);
    const projectId = localStorage.getItem("projectId");

    if (!projectId) {
      alert("Error: Project ID is missing. Please start over.");
      setIsGenerating(false);
      return;
    }

    try {
      // Step 1: Save the selected template to the project
      const updateResponse = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplate }),
      });

      if (!updateResponse.ok) {
        throw new Error('Could not save your template selection. Please try again.');
      }

      // Step 2: Trigger deck generation (sending product description)
      const generateResponse = await fetch('/api/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          productDescription: productDescription || ""
        }),
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(errorData.error || 'Deck generation failed on the server.');
      }

      const result = await generateResponse.json();
      // If backend returns { slides, downloadUrl }
      onGenerate(result.slides, result.downloadUrl);

    } catch (error) {
      console.error("Failed during generation process:", error);
      alert(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">Choose Your Template</h1>
          <p className="text-lg text-gray-600">Loading templates...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-64 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">Choose Your Template</h1>
        <div className="text-lg text-gray-600 flex items-center gap-1 justify-center">
          You've selected the <Badge className="text-lg mx-1">{industry}</Badge> industry.
          Select a design for your presentation below.
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {templates.map(template => {
          const templateUrl = getTemplateUrl(template.file_path);
          return (
            <Card
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`cursor-pointer transition-all duration-200 hover:shadow-xl flex flex-col justify-between ${selectedTemplate === template.id ? 'ring-2 ring-blue-500 scale-105' : 'hover:scale-105'
                }`}
            >
              <div>
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {template.tags?.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{template.description}</p>
                </CardContent>
              </div>
              <div className="p-4 pt-0">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Sample <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>{template.name} - Sample Preview</DialogTitle>
                    </DialogHeader>
                    <div className="flex-grow border rounded-md overflow-hidden">
                      <iframe
                        src={templateUrl}
                        className="h-full w-full"
                        title={`${template.name} Preview`}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center items-center gap-4 mt-10 border-t pt-8">
        <Button
          onClick={handleGenerateClick}
          disabled={isGenerating || !selectedTemplate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate & Preview Deck"
          )}
        </Button>
      </div>
    </div>
  );
};

export default Template;
