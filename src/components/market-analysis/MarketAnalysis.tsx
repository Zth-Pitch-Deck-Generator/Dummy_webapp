// src/components/market-analysis/MarketAnalysis.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface MarketAnalysisProps {
  projectId: string;
  onComplete: () => void;
}

export default function MarketAnalysis({ projectId, onComplete }: MarketAnalysisProps) {
  const [mode, setMode] = useState<'initial' | 'manual' | 'ai'>('initial');
  const [loading, setLoading] = useState(false);
  
  const [metrics, setMetrics] = useState({
    tam: '',
    sam: '',
    som: ''
  });
  const [region, setRegion] = useState('Global');
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  const handleEstimate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/qa/market-analysis/estimate', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ projectId, region })
      });
      const data = await res.json();
      
      setMetrics({
        tam: data.tam,
        sam: data.sam,
        som: data.som
      });
      setAiReasoning(data.reasoning);
      setMode('manual'); // Switch to manual so they can edit the AI estimation
    } catch (e) {
      toast.error("Failed to generate estimates");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!metrics.tam || !metrics.sam || !metrics.som) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await fetch('/api/qa/market-analysis/save', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ projectId, ...metrics })
      });
      toast.success("Market Analysis Saved");
      onComplete(); // Triggers redirect to Outline
    } catch (e) {
      toast.error("Failed to save data");
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'initial') {
    return (
      <div className="max-w-2xl mx-auto p-6 animate-in fade-in zoom-in">
        <Card className="text-center py-10">
          <CardHeader>
            <CardTitle className="text-3xl">Market Space Analysis</CardTitle>
            <CardDescription className="text-lg mt-2">
              Do you already know your TAM, SAM, and SOM numbers?
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-6 mt-4">
            <Button 
              size="lg" 
              variant="outline" 
              className="w-40 h-16 text-lg border-2"
              onClick={() => setMode('manual')}
            >
              Yes, I do
            </Button>
            <Button 
              size="lg" 
              className="w-40 h-16 text-lg bg-blue-600 hover:bg-blue-700"
              onClick={() => setMode('ai')}
            >
              No, help me
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === 'ai') {
    return (
      <div className="max-w-xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>AI Market Estimator</CardTitle>
            <CardDescription>
              We'll use your pitch data to estimate the market size.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target Region</Label>
              <Input 
                value={region} 
                onChange={(e) => setRegion(e.target.value)} 
                placeholder="e.g. United States, Global, Southeast Asia"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleEstimate} disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              Generate Estimates
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Market Sizing (TAM / SAM / SOM)</CardTitle>
          <CardDescription>
            Verify or edit the numbers below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {aiReasoning && (
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-6">
              <strong>AI Insight:</strong> {aiReasoning}
            </div>
          )}

          <div className="grid gap-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-bold text-lg">TAM</Label>
              <div className="col-span-3">
                <Input 
                  value={metrics.tam} 
                  onChange={(e) => setMetrics({...metrics, tam: e.target.value})}
                  placeholder="$10B (Total Addressable Market)"
                />
                <p className="text-xs text-gray-500 mt-1">Total market demand for your product.</p>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-bold text-lg">SAM</Label>
              <div className="col-span-3">
                <Input 
                  value={metrics.sam} 
                  onChange={(e) => setMetrics({...metrics, sam: e.target.value})}
                  placeholder="$1B (Serviceable Available Market)"
                />
                <p className="text-xs text-gray-500 mt-1">Segment of TAM within your reach.</p>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-bold text-lg">SOM</Label>
              <div className="col-span-3">
                <Input 
                  value={metrics.som} 
                  onChange={(e) => setMetrics({...metrics, som: e.target.value})}
                  placeholder="$100M (Serviceable Obtainable Market)"
                />
                <p className="text-xs text-gray-500 mt-1">Portion of SAM you can realistically capture.</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSave} disabled={loading} size="lg" className="bg-green-600 hover:bg-green-700">
            {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
            Save & Finish
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}