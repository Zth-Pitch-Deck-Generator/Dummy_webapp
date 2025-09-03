// src/components/Template.tsx
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import { GeneratedSlide } from '@/pages/Index.tsx';

interface TemplateProps {
  onGenerate: (slides: GeneratedSlide[], url: string) => void;
}

const templates = [
    { id: 'airbnb-style', name: 'The Airbnb Model', description: 'Clean, simple, and investor-focused, based on the iconic deck.', tags: ['Iconic', 'Story-focused'] },
    { id: 'modern-tech', name: 'Modern Tech', description: 'Sleek and professional, perfect for software and tech startups.', tags: ['SaaS', 'Professional'] },
    { id: 'creative-startup', name: 'Creative Startup', description: 'A vibrant and bold design for creative and consumer brands.', tags: ['B2C', 'Vibrant'] },
    { id: 'business-professional', name: 'Business Professional', description: 'A classic and formal template for serious business presentations.', tags: ['Corporate', 'Formal'] },
    { id: 'minimalist', name: 'Minimalist', description: 'A clean and simple design that lets your content shine.', tags: ['Simple', 'Elegant'] },
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
          Select a design for your presentation. You can preview a sample of the Airbnb style.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {templates.map(template => (
           <Card 
             key={template.id} 
             onClick={() => setSelectedTemplate(template.id)}
             className={`cursor-pointer transition-all duration-200 hover:shadow-xl ${selectedTemplate === template.id ? 'ring-2 ring-blue-500 scale-105' : 'hover:scale-105'}`}
            >
             <CardHeader>
               <CardTitle>{template.name}</CardTitle>
               <div className="flex flex-wrap gap-2 pt-2">
                 {template.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
               </div>
             </CardHeader>
             <CardContent>
               <p className="text-gray-600">{template.description}</p>
             </CardContent>
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
         <Button variant="outline" asChild>
            <a href={'/Air-BnB-Template.pdf'} target="_blank" rel="noopener noreferrer">
              View Airbnb Sample <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
      </div>
    </div>
  );
};

export default Template;
