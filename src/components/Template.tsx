// src/components/Template.tsx
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import { GeneratedSlide } from '@/pages/Index.tsx';

interface TemplateProps {
  onGenerate: (slides: GeneratedSlide[], url: string) => void;
}

const Template = ({ onGenerate }: TemplateProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Updated to the AirBnB Template
  const airbnbTemplate = {
    id: 'Air-BnB-template',
    name: 'The Airbnb Pitch Deck Model',
    description: 'Based on the iconic deck that helped launch a generation of startups. Clean, simple, and investor-focused.',
    tags: ['Iconic Design', 'Investor-Proven', 'Story-focused'],
    path: '/Air-BnB-Template.pdf' // Path to the new PDF in the public folder
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
          templateSlug: airbnbTemplate.id // Send the new template slug
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
        <h1 className="text-4xl font-bold mb-2">Final Step: Choose Your Template</h1>
        <p className="text-lg text-gray-600">
          Your presentation will be generated using one of our professional templates.
        </p>
      </div>

      <Card className="border-2 border-pink-500 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="text-pink-500" /> {airbnbTemplate.name}
            </CardTitle>
            <Badge className="bg-pink-500 text-white">Recommended</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-8 items-center">
          <div className="w-full md:w-1/2">
            <p className="text-gray-600 mb-4">{airbnbTemplate.description}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {airbnbTemplate.tags.map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
            <div className="flex gap-4">
              <Button onClick={handleGenerateClick} disabled={isGenerating} className="bg-pink-600 hover:bg-pink-700 text-white">
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Use This Template & Preview"
                )}
              </Button>
              <Button variant="outline" asChild>
                <a href={airbnbTemplate.path} target="_blank" rel="noopener noreferrer">
                  View Template PDF <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
          <div className="w-full md:w-1/2 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Airbnb Template Preview</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Template;