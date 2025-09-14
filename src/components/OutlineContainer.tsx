// src/components/Outline.tsx
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SwotView from "./outline-swot/Swot";
import OutlineView from "./outline-swot/Outline";
import { Loader2 } from "lucide-react";

type Slide = {
  title: string;
  bullet_points?: string[];
  data_needed?: string[];
};

type SWOT = {
  strength: string[];
  weakness: string[];
  opportunities: string[];
  threats: string[];
};

interface OutlineProps {
  onAccept: (outline: Slide[]) => void;
}

const OutlineContainer = ({ onAccept }: OutlineProps) => {
  const [outline, setOutline] = useState<Slide[]>([]);
  const [review, setReview] = useState<SWOT | null>(null);
  const [loading, setLoading] = useState(true);
  const [swotLoading, setSwotLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swotGenerated, setSwotGenerated] = useState(false);
  const [tabValue, setTabValue] = useState<"outline" | "swot">("outline");

  const projectId =
    typeof window !== "undefined" ? localStorage.getItem("projectId") : null;

  useEffect(() => {
    if (!projectId) {
      setError("Project ID missing");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/outline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });

        if (res.status === 404) {
          throw new Error("Run the founder interview first – no transcript found");
        }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server ${res.status}`);
        }

        const json = await res.json();
        const slides = json.outline || json.outline_json || json;

        if (!Array.isArray(slides)) throw new Error("Outline format from API is invalid");
        setOutline(slides as Slide[]);
      } catch (err: any) {
        setError(err.message || "Failed to load outline");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const generateSwot = useCallback(async () => {
    if (!projectId || swotGenerated || swotLoading) return;
    setSwotLoading(true);
    try {
      const res = await fetch("/api/outline/eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        let msg = "Evaluation failed";
        try {
          const errData = await res.json();
          msg = errData.error || msg;
        } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      setReview(data as SWOT);
      setSwotGenerated(true);
    } catch (err) {
      // Keep swotGenerated false so it can retry if user revisits the tab
      console.error(err);
    } finally {
      setSwotLoading(false);
    }
  }, [projectId, swotGenerated, swotLoading]);

  // Trigger SWOT generation automatically when the SWOT tab is selected
  useEffect(() => {
    if (tabValue === "swot") {
      generateSwot();
    }
  }, [tabValue, generateSwot]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-gray-500" />
        <span className="text-gray-600">Loading outline…</span>
      </div>
    );
  }

  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (!outline.length) return <p>No slides returned.</p>;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
      <Tabs
        value={tabValue}
        onValueChange={(v) => setTabValue(v as "outline" | "swot")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="outline">Your Idea Outline</TabsTrigger>
          <TabsTrigger value="swot">Improve Outline (SWOT)</TabsTrigger>
        </TabsList>

        <TabsContent value="outline" className="mt-6">
          <OutlineView slides={outline} />
        </TabsContent>

        <TabsContent value="swot" className="mt-6">
          <SwotView review={review} loading={swotLoading} />
        </TabsContent>
      </Tabs>

      <div className="flex justify-center gap-4 mt-10">
        <Button
          onClick={() => onAccept(outline)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Looks good →
        </Button>
      </div>
    </div>
  );
};

export default OutlineContainer;
