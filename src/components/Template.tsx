// src/components/Template.tsx
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import { GeneratedSlide } from '@/pages/Index';

interface TemplateProps {
  // Outline is no longer needed here, as the backend will fetch it
  onGenerate: (slides: GeneratedSlide[], url: string) => void;
}

const Template = ({ onGenerate }: TemplateProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const zthTemplate = {
    id: 'ZTH-template',
    name: 'ZTH - The Perfect Pitch Deck Flow',
    description: 'A proven slide sequence to build a compelling narrative for investors. This is the recommended template for all projects.',
    tags: ['Startup Focused', 'Clear Structure', 'Investor Ready'],
    path: '/ZTH.pdf'
  };

  const handleGenerateClick = async () => {
    setIsGenerating(true);
    const projectId = localStorage.getItem("projectId");

    if (!projectId) {
        alert("Error: Project ID is missing. Please start over.");
        setIsGenerating(false);
        return;
    }

    try {
      const response = await fetch('/api/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          templateSlug: 'ZTH-template' // This can be dynamic if you add more templates
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Deck generation failed on the server.');
      }

      const result = await response.json();
      onGenerate(result.slides, result.downloadUrl);

    } catch (error) {
      console.error("Failed to generate deck:", error);
      alert(`An error occurred while generating the deck: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">Final Step: Generate Your Deck</h1>
        <p className="text-lg text-gray-600">
          Your presentation will be created using the official ZTH template.
        </p>
      </div>

      <Card className="border-2 border-purple-500 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="text-purple-500" /> {zthTemplate.name}
            </CardTitle>
            <Badge className="bg-purple-500 text-white">Selected Template</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-8 items-center">
          <div className="w-full md:w-1/2">
            <p className="text-gray-600 mb-4">{zthTemplate.description}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {zthTemplate.tags.map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
            <div className="flex gap-4">
              <Button onClick={handleGenerateClick} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Deck & Go to Preview"
                )}
              </Button>
              <Button variant="outline" asChild>
                <a href={zthTemplate.path} target="_blank" rel="noopener noreferrer">
                  View Template PDF <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
          <div className="w-full md:w-1/2 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">ZTH Template Preview</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Template;
