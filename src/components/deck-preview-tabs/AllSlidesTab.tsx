// src/components/deck-preview-tabs/AllSlidesTab.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Star } from 'lucide-react';
import { SlideData } from '../DeckPreview';

interface AllSlidesTabProps {
  slides: SlideData[];
}

const AllSlidesTab = ({ slides }: AllSlidesTabProps) => {
  const [selectedSlide, setSelectedSlide] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');

  const handleSlideClick = (slideId: string) => {
    setSelectedSlide(slideId === selectedSlide ? null : slideId);
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {slides.map((slide, index) => {
        const Icon = slide.icon;
        const isSelected = selectedSlide === slide.id;
        
        return (
          <Card
            key={slide.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              isSelected ? 'ring-2 ring-purple-500' : ''
            } ${slide.isCrucial ? 'border-orange-200 bg-orange-50' : ''}`}
            onClick={() => handleSlideClick(slide.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-600">
                    Slide {index + 1}
                  </span>
                </div>
                {slide.isCrucial && (
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    <Star className="w-3 h-3 mr-1" />
                    Crucial
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg leading-tight">
                {slide.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {slide.content.map((bullet, i) => <li key={i}>{bullet}</li>)}
              </ul>
              {isSelected && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Edit className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">
                      Quick Notes
                    </span>
                  </div>
                  <textarea
                    className="w-full text-sm p-2 border rounded resize-none"
                    rows={3}
                    placeholder="Add notes or ideas for this slide..."
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AllSlidesTab;
