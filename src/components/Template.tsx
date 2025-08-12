import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';

interface TemplateProps {
  onComplete: () => void;
}

const Template = ({ onComplete }: TemplateProps) => {
  const [loading, setLoading] = useState(true);
  const [recommended, setRecommended] = useState<string | null>(null);

  useEffect(() => {
    // Simulate fetching an AI recommendation
    const timer = setTimeout(() => {
      setRecommended('Modern');
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const templates = [
    { id: 'Modern', name: 'Modern', tags: ['Clean layouts', 'Data visualization', 'Modern look', 'Purple accent'] },
    { id: 'Modern Tech', name: 'Modern Tech', tags: ['Clean layouts', 'Data visualization', 'Modern look', 'Purple accent'] },
    { id: 'Business Professional', name: 'Business Professional', tags: ['Professional layouts', 'Chart & graphs', 'Corporate colors', 'Conservative design'] },
    { id: 'Creative Startup', name: 'Creative Startup', tags: ['Vibrant colors', 'Creative graphics', 'Dynamic layouts'] },
    { id: 'Minimalist', name: 'Minimalist', tags: ['Simple', 'Text-focused', 'Elegant'] },
    { id: 'Bold', name: 'Bold', tags: ['High contrast', 'Impactful', 'Strong typography'] },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">Choose Your Presentation Template</h1>
        <p className="text-lg text-gray-600">Select a design that best fits your industry and presentation style.</p>
        <Badge variant="outline" className="mt-4">Feature Coming Soon: This is a placeholder UI.</Badge>
      </div>

      {loading ? (
        <div className="space-y-8">
            <Skeleton className="h-64 w-full" />
            <div className="grid md:grid-cols-3 gap-8">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Recommended Template */}
          <Card className="border-2 border-purple-500 shadow-lg">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-2xl flex items-center gap-2"><Sparkles className="text-purple-500" /> AI Recommended Template</CardTitle>
                    <Badge className="bg-purple-500 text-white">Recommended</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-8 items-center">
              <div className="w-full md:w-1/2">
                <h3 className="text-xl font-semibold mb-2">{templates.find(t => t.id === recommended)?.name}</h3>
                <p className="text-gray-600 mb-4">Perfect for SaaS, tech startups, and digital. Based on your tech-focused solution and target audience, this template emphasizes innovation and scalability while maintaining professional credibility.</p>
                <div className="flex flex-wrap gap-2 mb-4">
                    {templates.find(t => t.id === recommended)?.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                </div>
                <Button onClick={onComplete}>Use This Template</Button>
              </div>
              <div className="w-full md:w-1/2 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Template Preview</p>
              </div>
            </CardContent>
          </Card>

          {/* Other Templates */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {templates.filter(t => t.id !== recommended).map(template => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                        <p className="text-gray-500">Template Preview</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {template.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
                    </div>
                  <Button variant="outline" className="w-full" onClick={onComplete}>Use This Template</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Template;