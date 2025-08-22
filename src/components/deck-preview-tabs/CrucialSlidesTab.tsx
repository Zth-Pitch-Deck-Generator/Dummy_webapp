// src/components/deck-preview-tabs/CrucialSlidesTab.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SlideData } from '../DeckPreview';
import { ProjectData } from '@/pages/Index.tsx';

interface CrucialSlidesTabProps {
  crucialSlides: SlideData[];
  projectData: ProjectData | null;
}

const CrucialSlidesTab = ({ crucialSlides, projectData }: CrucialSlidesTabProps) => {
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Crucial Slides ({crucialSlides.length})
        </h3>
        <p className="text-gray-600">
          These slides are essential for your {projectData?.decktype} presentation and should be given extra attention.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {crucialSlides.map((slide) => {
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
                 <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {slide.content.map((bullet, i) => <li key={i}>{bullet}</li>)}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CrucialSlidesTab;
