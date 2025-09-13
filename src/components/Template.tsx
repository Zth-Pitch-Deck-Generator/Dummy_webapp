// src/components/Template.tsx
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExternalLink, Loader2 } from 'lucide-react';
import { GeneratedSlide } from '@/pages/Index.tsx';

interface TemplateProps {
  onGenerate: (slides: GeneratedSlide[], url: string) => void;
}

// Updated templates to match the backend slugs and add PDF URLs
const templates = [
    { id: 'technology', name: 'Technology Pitch Deck', description: 'A sleek design for software, hardware, and tech companies.', tags: ['Technology', 'SaaS'], url: '/Technology Pitch Deck Template.pdf' },
    { id: 'startup', name: 'Startup Pitch Deck', description: 'A modern and clean template perfect for early-stage startups.', tags: ['Startup', 'VC'], url: '/Startup Pitch Deck Template.pdf' },
    { id: 'ecommerce', name: 'E-commerce Pitch Deck', description: 'A template for e-commerce businesses to showcase products and growth.', tags: ['E-commerce', 'Retail'], url: '/E-commerce Pitch Deck Template.pdf' },
    { id: 'fintech', name: 'FinTech Pitch Deck', description: 'A professional template for financial technology companies.', tags: ['FinTech', 'Finance'], url: '/FinTech Pitch Deck Template.pdf' },
    { id: 'general', name: 'General Pitch Deck', description: 'A versatile and classic template for any business presentation.', tags: ['General', 'Corporate'], url: '/General Pitch Deck Template.pdf' },
];

const Template = ({ onGenerate }: TemplateProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

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
      const response = await fetch('/api/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          templateSlug: selectedTemplate
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
    <div className="max-w-5xl mx-auto p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">Choose Your Template</h1>
        <p className="text-lg text-gray-600">
          Select a design for your presentation. You can preview a sample of each style.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {templates.map(template => (
           <Card 
             key={template.id} 
             onClick={() => setSelectedTemplate(template.id)}
             className={`cursor-pointer transition-all duration-200 hover:shadow-xl flex flex-col justify-between ${selectedTemplate === template.id ? 'ring-2 ring-blue-500 scale-105' : 'hover:scale-105'}`}
            >
             <div>
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {template.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{template.description}</p>
                </CardContent>
             </div>
             <div className="p-4 pt-0">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full" onClick={(e) => e.stopPropagation()}>
                      View Sample <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>{template.name} - Sample Preview</DialogTitle>
                    </DialogHeader>
                    <div className="flex-grow border rounded-md overflow-hidden">
                      <iframe src={template.url} className="h-full w-full" title={`${template.name} Preview`} />
                    </div>
                  </DialogContent>
                </Dialog>
             </div>
           </Card>
        ))}
      </div>
      
      <div className="flex justify-center items-center gap-4 mt-10 border-t pt-8">
        <Button onClick={handleGenerateClick} disabled={isGenerating || !selectedTemplate} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
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