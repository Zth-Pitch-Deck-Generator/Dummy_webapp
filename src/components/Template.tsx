import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ExternalLink } from 'lucide-react';
import { ProjectData } from '@/pages/Index';

interface TemplateProps {
  onComplete: () => void;
  projectData: ProjectData | null; // Keep projectData for context if needed later
}

const Template = ({ onComplete }: TemplateProps) => {
  // Hardcoded template based on the provided ZTH PDF
  const zthTemplate = {
    id: 'ZTH-template',
    name: 'ZTH - The Perfect Pitch Deck Flow',
    description: 'A proven slide sequence to help you build a compelling narrative for investors and stakeholders. This is the recommended template for all projects.',
    tags: ['Startup Focused', 'Clear Structure', 'Investor Ready'],
    path: '/ZTH.pdf' // Path to the PDF in the public folder
  };

  const handleSelectTemplate = () => {
    // Here you would typically save the template choice.
    // For now, it just moves to the next step.
    console.log(`Selected template: ${zthTemplate.name}`);
    onComplete();
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">Presentation Template</h1>
        <p className="text-lg text-gray-600">
          Your pitch deck will be generated using the ZTH template.
        </p>
      </div>

      {/* Recommended Template Section */}
      <Card className="border-2 border-purple-500 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="text-purple-500" /> {zthTemplate.name}
            </CardTitle>
            <Badge className="bg-purple-500 text-white">Selected</Badge>
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
              <Button onClick={handleSelectTemplate}>
                Continue to Preview
              </Button>
              <Button
                variant="outline"
                asChild
              >
                <a href={zthTemplate.path} target="_blank" rel="noopener noreferrer">
                  View Template PDF <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
          <div className="w-full md:w-1/2 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
            {/* You can place a preview image of the PDF cover here */}
            <p className="text-gray-500">ZTH Template Preview</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Template;