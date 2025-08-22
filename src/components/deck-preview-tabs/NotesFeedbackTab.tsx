// src/components/deck-preview-tabs/NotesFeedbackTab.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QAData } from '@/pages/Index.tsx';
import { Skeleton } from '../ui/skeleton';

interface NotesFeedbackTabProps {
  qaData: QAData;
  projectId: string | null;
}

interface Recommendation {
    title: string;
    description: string;
    type: 'positive' | 'suggestion' | 'critical';
}

const NotesFeedbackTab = ({ qaData, projectId }: NotesFeedbackTabProps) => {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchFeedback = async () => {
            if (!projectId) {
                setIsLoading(false);
                return;
            };

            try {
                const response = await fetch('/api/deck/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId }),
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch AI recommendations');
                }
                const data = await response.json();
                setRecommendations(data.recommendations);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFeedback();
    }, [projectId]);

    const getRecommendationColor = (type: Recommendation['type']) => {
        switch (type) {
            case 'positive':
                return 'bg-green-50 text-green-900 border-green-200';
            case 'suggestion':
                return 'bg-blue-50 text-blue-900 border-blue-200';
            case 'critical':
                return 'bg-yellow-50 text-yellow-900 border-yellow-200';
            default:
                return 'bg-gray-50 text-gray-900 border-gray-200';
        }
    }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Smart Engine Deck Recommendations</CardTitle>
          <CardDescription>
            Based on your Q&A responses, here are some suggestions for your pitch deck.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-4">
              {isLoading ? (
                <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </>
              ) : recommendations.length > 0 ? (
                recommendations.map((rec, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${getRecommendationColor(rec.type)}`}>
                    <h4 className="font-medium mb-1">{rec.title}</h4>
                    <p className="text-sm">{rec.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No recommendations available at the moment.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
    </div>
  );
};

export default NotesFeedbackTab;
