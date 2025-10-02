// src/components/OutlineContainer.tsx
// This component orchestrates the fetching of outline and SWOT data,
// manages their states, and renders the OutlineView and SwotView components.

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button"; // Assuming shadcn/ui
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Assuming shadcn/ui
import { Loader2 } from "lucide-react"; // Assuming lucide-react for loading spinner

// Import your presentational components
import OutlineView from "./outline-swot/Outline"; // Correct path to your OutlineView
import SwotView from "./outline-swot/Swot";     // Correct path to your SwotView

// --- Type Definitions (can be moved to a shared types file if preferred) ---
type Slide = {
  title: string;
  bullet_points?: string[];
  data_needed?: string[]; // Only present for non-basic deck types
};

type SWOT = {
  strength: string[];
  weakness: string[];
  opportunities: string[];
  threats: string[];
};

interface OutlineContainerProps {
  onAccept: (outline: Slide[]) => void;
}

const OutlineContainer = ({ onAccept }: OutlineContainerProps) => {
  const [outline, setOutline] = useState<Slide[]>([]);
  const [outlineId, setOutlineId] = useState<string | null>(null); // State to store the outline ID
  const [review, setReview] = useState<SWOT | null>(null);
  const [loading, setLoading] = useState(true); // For initial outline loading
  const [swotLoading, setSwotLoading] = useState(false); // For SWOT specific loading
  const [error, setError] = useState<string | null>(null);
  const [swotGenerated, setSwotGenerated] = useState(false); // Tracks if SWOT has been generated/fetched
  const [tabValue, setTabValue] = useState<"outline" | "swot">("outline"); // For tab control

  // Retrieve projectId from localStorage (assuming it's set upstream)
  const projectId =
    typeof window !== "undefined" ? localStorage.getItem("projectId") : null;

  // --- Effect to Fetch Outline and Initial SWOT ---
  useEffect(() => {
    if (!projectId) {
      setError("Project ID missing. Please go back to project setup.");
      setLoading(false);
      return;
    }

    const fetchOutlineAndInitialSwot = async () => {
      try {
        setLoading(true); // Start loading for outline fetch
        setError(null);

        // 1. Fetch Outline
        const outlineRes = await fetch("/api/outline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });

        if (outlineRes.status === 404) {
          throw new Error("Run the founder interview first – no transcript found.");
        }
        if (!outlineRes.ok) {
            const errData = await outlineRes.json();
            throw new Error(errData.error || `Failed to fetch outline: Server ${outlineRes.status}`);
        }

        const outlineJson = await outlineRes.json();
        // The backend now returns { id: uuid, outline_json: Slide[] }
        const slides = outlineJson.outline_json;
        const fetchedOutlineId = outlineJson.id; // Capture the outline ID

        if (!Array.isArray(slides)) {
          throw new Error("Outline format from API is invalid.");
        }
        
        setOutline(slides as Slide[]);
        setOutlineId(fetchedOutlineId); // Store the fetched outline ID

        // 2. Attempt to Fetch Existing SWOT Review for the fetched outlineId
        if (fetchedOutlineId) { 
            const swotRes = await fetch("/api/outline/eval", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ outlineId: fetchedOutlineId }), // Pass outlineId to /eval
            });

            if (swotRes.ok) {
                const existingSwot = await swotRes.json();
                // Ensure review data is not empty or malformed
                if (existingSwot && Object.keys(existingSwot).length > 0 && 
                    existingSwot.strength && Array.isArray(existingSwot.strength)) { 
                    setReview(existingSwot);
                    setSwotGenerated(true); // Mark SWOT as generated/found
                }
            } else if (swotRes.status !== 404) { // 404 means no SWOT found, which is fine, don't show error
                console.error("Failed to fetch existing SWOT:", await swotRes.json());
                // Optionally set an error here if you want to display it specifically for SWOT fetch issues
            }
        }

      } catch (err: any) {
        setError(err.message);
        console.error("Error in OutlineContainer component:", err);
      } finally {
        setLoading(false); // Stop loading regardless of success/failure
      }
    };

    fetchOutlineAndInitialSwot();
  }, [projectId]); // Depend on projectId for effect re-run

  // --- Callback to Generate/Regenerate SWOT ---
  const handleGenerateSwot = useCallback(async (forceRegenerate: boolean = false) => {
    if (!outlineId || swotLoading) return; // Need outlineId to proceed, prevent re-trigger if already loading

    // If SWOT is already generated and we're not forcing a regeneration, do nothing.
    if (swotGenerated && !forceRegenerate) {
        setTabValue("swot"); // Switch to SWOT tab if it's already there and user might have clicked "Generate"
        return;
    }

    setSwotLoading(true); // Start SWOT generation loading
    setError(null); // Clear previous errors
    try {
      const res = await fetch("/api/outline/eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlineId, regenerate: forceRegenerate }), // Pass outlineId and regenerate flag
      });
      if (!res.ok) {
        let msg = "SWOT evaluation failed";
        try {
          const errData = await res.json();
          msg = errData.error || msg;
        } catch {}
        throw new Error(msg);
      }
      setReview(await res.json());
      setSwotGenerated(true); // Mark SWOT as successfully generated
      setTabValue("swot"); // Switch to SWOT tab after generation
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate SWOT analysis.");
      console.error("Error generating SWOT analysis:", err);
      setSwotGenerated(false); // Generation failed, so reset this flag
    } finally {
      setSwotLoading(false); // Stop SWOT generation loading
    }
  }, [outlineId, swotGenerated, swotLoading]); // Dependencies for useCallback

  // --- Effect to Trigger SWOT Generation when SWOT tab is selected ---
  useEffect(() => {
    // Only attempt to generate if the tab is 'swot', we have an outlineId,
    // SWOT hasn't been generated yet, and we're not currently loading it.
    if (tabValue === "swot" && outlineId && !swotGenerated && !swotLoading) {
      handleGenerateSwot(); // Automatically trigger generation (not forced regeneration)
    }
  }, [tabValue, outlineId, swotGenerated, swotLoading, handleGenerateSwot]);

  // --- Loading and Error States for the Main Container ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-gray-500" />
        <span className="text-gray-600">Loading outline…</span>
      </div>
    );
  }

  if (error) return <p className="text-red-500 text-center py-20">Error: {error}</p>;
  if (!outline.length) return <p className="text-center py-20">No slides returned for the outline.</p>;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Pitch Deck Outline & Analysis</h1>

      <Tabs
        value={tabValue}
        onValueChange={(v) => {
            setTabValue(v as "outline" | "swot");
            // If switching to SWOT tab and it's not generated, trigger generation
            if (v === "swot" && !swotGenerated && outlineId) {
                handleGenerateSwot(false); // No explicit force regenerate, just initial fetch
            }
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="outline">Your Idea Outline</TabsTrigger>
          <TabsTrigger value="swot">Improve Outline (SWOT)</TabsTrigger>
        </TabsList>

        <TabsContent value="outline" className="mt-6">
          <OutlineView slides={outline} /> {/* Renders your OutlineView */}
        </TabsContent>

        <TabsContent value="swot" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => handleGenerateSwot(true)} // Force regeneration on button click
              disabled={!outlineId || swotLoading} // Disable if no outlineId or already loading
            >
              {swotLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                swotGenerated ? "Regenerate SWOT" : "Generate SWOT"
              )}
            </Button>
          </div>
          <SwotView review={review} loading={swotLoading} /> {/* Renders your SwotView */}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-8">
        <Button onClick={() => onAccept(outline)} size="lg">
          Accept Outline & Proceed
        </Button>
      </div>
    </div>
  );
};

export default OutlineContainer;