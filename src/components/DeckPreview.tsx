// src/components/DeckPreview.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, FileText } from 'lucide-react';
import { GeneratedSlide } from '@/pages/Index';

interface DeckPreviewProps {
  generatedSlides: GeneratedSlide[];
  downloadUrl: string | null;
}

const DeckPreview = ({ generatedSlides, downloadUrl }: DeckPreviewProps) => {

  if (!generatedSlides.length) {
    return (
        <div className="text-center">
            <h1 className="text-2xl font-bold">No slides to display.</h1>
            <p className="text-gray-500">Something went wrong during generation.</p>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deck Preview</h1>
          <p className="text-gray-600">Review your generated slides below.</p>
        </div>
        {downloadUrl && (
          <Button asChild className="bg-green-600 hover:bg-green-700">
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4 mr-2" />
              Download PPTX
            </a>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {generatedSlides.map((slide, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                <CardTitle className="text-lg leading-tight">{slide.title}</CardTitle>
              </div>
               <p className="text-sm text-gray-400 pt-1">Slide {index + 1}</p>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                {slide.content.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DeckPreview;
