import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExternalLink, Loader2 } from 'lucide-react';
import { GeneratedSlide } from '@/pages/Index.tsx';

interface TemplateProps {
  onGenerate: (slides: GeneratedSlide[], url: string) => void;
  industry: string; // We'll receive the selected industry as a prop
}

// A more detailed data structure for all templates, grouped by industry
const industryTemplates = {
  Ecommerce: [
    { id: 'ecom-1', name: 'E-commerce Brand Pitch', description: 'Showcase your brand and products with this vibrant template.', tags: ['E-commerce', 'Retail'], url: '/EcommerceTemplates/Template1_Ecommerce.pdf' },
    { id: 'ecom-2', name: 'Digital Commerce Growth', description: 'Focus on scalability and customer-driven metrics.', tags: ['E-commerce', 'Growth'], url: '/EcommerceTemplates/Template2_Ecommerce.pdf' },
    { id: 'ecom-3', name: 'Artisan Marketplace Deck', description: 'A template for platforms supporting local and artisan creators.', tags: ['E-commerce', 'Marketplace'], url: '/EcommerceTemplates/Template3_Ecommerce.pdf' },
    { id: 'ecom-4', name: 'E-commerce Evolution', description: 'Highlight brand building in the digital age.', tags: ['E-commerce', 'Brand'], url: '/EcommerceTemplates/Template4_Ecommerce.pdf' },
    { id: 'ecom-5', name: 'Future of Shopping', description: 'Discuss emerging e-commerce trends and sustainability.', tags: ['E-commerce', 'Trends'], url: '/EcommerceTemplates/Template5_Ecommerce.pdf' },
  ],
  Edtech: [
    { id: 'Edtech-default', name: 'Edtech Pitch Deck', description: 'A sleek, professional design for Edtech companies.', tags: ['Edtech'], url: '/Edtech Pitch Deck Template.pdf' },
  ],
  FinTech: [
    { id: 'fintech-1', name: 'Classic FinTech Pitch', description: 'A clean and professional template for financial services.', tags: ['FinTech', 'Finance'], url: '/FintechTemplates/Template1_Fintech.pdf' },
    { id: 'fintech-2', name: 'Modern FinTech Solutions', description: 'Discussing how technology has impacted financial dealings.', tags: ['FinTech', 'Payments'], url: '/FintechTemplates/Template2_Fintech.pdf' },
    { id: 'fintech-3', name: 'SME Lending Deck', description: 'Focus on empowering SMEs with Al-driven lending.', tags: ['FinTech', 'Lending'], url: '/FintechTemplates/Template3_Fintech.pdf' },
    { id: 'fintech-4', name: 'Data-Driven Financing', description: 'A deck for showcasing proprietary AI models and scalability.', tags: ['FinTech', 'AI'], url: '/FintechTemplates/Template4_Fintech.pdf' },
    { id: 'fintech-5', name: 'Fintech Revolution', description: 'A template to discuss key areas and benefits of your FinTech solution.', tags: ['FinTech', 'Innovation'], url: '/FintechTemplates/Template5_Fintech.pdf' },
    { id: 'fintech-6', name: 'General FinTech Overview', description: 'A versatile template for a high-level FinTech presentation.', tags: ['FinTech', 'Corporate'], url: '/FintechTemplates/Template6_Fintech.pdf' },
  ],
  General: [
      { id: 'general-1', name: 'General Pitch Deck', description: 'A versatile and classic template for any business presentation.', tags: ['General', 'Corporate'], url: '/General Pitch Deck Template.pdf' }
  ],
  Startup: [
      { id: 'startup-1', name: 'Startup Pitch Deck', description: 'A modern template for showcasing your startup vision.', tags: ['Startup', 'Pitch'], url: '/Startup Pitch Deck Template.pdf' }
  ],
  Technology: [
    { id: 'tech-default', name: 'Modern Tech Pitch Deck', description: 'A sleek, professional design for software and SaaS companies.', tags: ['Technology', 'SaaS'], url: '/Technology Pitch Deck Template.pdf' },
  ]
};

const Template = ({ onGenerate, industry }: TemplateProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // --- THE FIX ---
  // Select the templates for the chosen industry. Fallback to "General" if the industry doesn't exist.
  const templatesToShow = industryTemplates[industry] || industryTemplates['General'];

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
          You've selected the <Badge className="text-lg mx-1">{industry}</Badge> industry. 
          Select a design for your presentation below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {templatesToShow.map(template => (
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