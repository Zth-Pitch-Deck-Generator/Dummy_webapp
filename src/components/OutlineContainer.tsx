// src/components/OutlineContainer.tsx

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

import OutlineView from "./outline-swot/Outline";
import SwotView from "./outline-swot/Swot";

// --- Type Definitions (Define these once, preferably in a shared types.ts file) ---
// If you have a types.ts, import them: import { OutlinePoint, Slide, SWOT } from '@/types';
type OutlinePoint = {
  content: string;
  isUserAdded: boolean;
  tempId?: string;
};

type Slide = {
  title: string;
  bullet_points: OutlinePoint[];
  data_needed?: string[];
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
  const [outlineId, setOutlineId] = useState<string | null>(null);
  const [review, setReview] = useState<SWOT | null>(null);
  const [userEdits, setUserEdits] = useState<Map<number, OutlinePoint[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [swotLoading, setSwotLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swotGenerated, setSwotGenerated] = useState(false);
  const [tabValue, setTabValue] = useState<"outline" | "swot">("outline");
  const [isSaving, setIsSaving] = useState(false);
  // NEW: State for managing input field content across all slides, now in the container
  const [newPointContent, setNewPointContent] = useState<Record<number, string>>({});


  const projectId =
    typeof window !== "undefined" ? localStorage.getItem("projectId") : null;

  // --- Combined Outline for Rendering ---
  const combinedOutline = useMemo(() => {
    return outline.map((aiSlide, slideIndex) => {
      const userPointsForSlide = userEdits.get(slideIndex) || [];
      return {
        ...aiSlide,
        bullet_points: [...aiSlide.bullet_points, ...userPointsForSlide],
      };
    });
  }, [outline, userEdits]);

  // --- Effect to Fetch Outline, User Edits, and Initial SWOT ---
  useEffect(() => {
    if (!projectId) {
      setError("Project ID missing. Please go back to project setup.");
      setLoading(false);
      return;
    }

    const fetchOutlineAndInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Outline and any existing User Edits
        const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
        const token = session?.access_token;
        const outlineRes = await fetch("/api/outline", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
        const slides = outlineJson.outline_json;
        const fetchedOutlineId = outlineJson.id;
        const fetchedUserEdits = outlineJson.user_edits || {};

        if (!Array.isArray(slides)) {
          throw new Error("Outline format from API is invalid.");
        }

        const formattedOutline = (slides as any[]).map((slide) => ({
          ...slide,
          bullet_points: (slide.bullet_points || []).map((content: string) => ({
            content,
            isUserAdded: false,
          })),
        }));

        setOutline(formattedOutline as Slide[]);
        setOutlineId(fetchedOutlineId);

        const initialUserEditsMap = new Map<number, OutlinePoint[]>();
        if (fetchedUserEdits && Object.keys(fetchedUserEdits).length > 0) {
          for (const slideIndexStr in fetchedUserEdits) {
            const slideIndex = parseInt(slideIndexStr, 10);
            if (!isNaN(slideIndex) && Array.isArray(fetchedUserEdits[slideIndexStr])) {
              initialUserEditsMap.set(
                slideIndex,
                fetchedUserEdits[slideIndexStr].map((point: any) => ({
                  content: point.content,
                  isUserAdded: true,
                  tempId: point.tempId || String(Date.now() + Math.random()), // Ensure tempId exists
                }))
              );
            }
          }
        }
        setUserEdits(initialUserEditsMap);

        // 2. Attempt to Fetch Existing SWOT Review
        if (fetchedOutlineId) {
          const swotRes = await fetch("/api/outline/eval", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ outlineId: fetchedOutlineId }),
          });

          if (swotRes.ok) {
            const existingSwot = await swotRes.json();
            if (
              existingSwot &&
              Object.keys(existingSwot).length > 0 &&
              existingSwot.strength &&
              Array.isArray(existingSwot.strength)
            ) {
              setReview(existingSwot);
              setSwotGenerated(true);
            }
          } else if (swotRes.status !== 404) {
            console.error("Failed to fetch existing SWOT:", await swotRes.json());
          }
        }
      } catch (err: any) {
        setError(err.message);
        console.error("Error in OutlineContainer component:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOutlineAndInitialData();
  }, [projectId]);

  // --- Callback to Generate/Regenerate SWOT ---
  const handleGenerateSwot = useCallback(async (forceRegenerate: boolean = false) => {
    if (!outlineId || swotLoading) return;

    if (swotGenerated && !forceRegenerate) {
      setTabValue("swot");
      return;
    }

    setSwotLoading(true);
    setError(null);
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/outline/eval", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ outlineId, regenerate: forceRegenerate }),
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
      setSwotGenerated(true);
      setTabValue("swot");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate SWOT analysis.");
      console.error("Error generating SWOT analysis:", err);
      setSwotGenerated(false);
    } finally {
      setSwotLoading(false);
    }
  }, [outlineId, swotGenerated, swotLoading]);

  // --- Effect to Trigger SWOT Generation when SWOT tab is selected ---
  useEffect(() => {
    if (tabValue === "swot" && outlineId && !swotGenerated && !swotLoading) {
      handleGenerateSwot();
    }
  }, [tabValue, outlineId, swotGenerated, swotLoading, handleGenerateSwot]);

  // --- Callbacks for User Outline Edits ---
  const handleAddPoint = useCallback((slideIndex: number, content: string) => {
    setUserEdits((prevEdits) => {
      const newEdits = new Map(prevEdits);
      const pointsForSlide = newEdits.get(slideIndex) || [];
      newEdits.set(slideIndex, [
        ...pointsForSlide,
        { content, isUserAdded: true, tempId: String(Date.now() + Math.random()) },
      ]);
      return newEdits;
    });
  }, []);

  const handleDeletePoint = useCallback((slideIndex: number, tempId: string) => {
    setUserEdits((prevEdits) => {
      const newEdits = new Map(prevEdits);
      const pointsForSlide = newEdits.get(slideIndex);
      if (pointsForSlide) {
        const updatedPoints = pointsForSlide.filter((point) => point.tempId !== tempId);
        if (updatedPoints.length > 0) {
          newEdits.set(slideIndex, updatedPoints);
        } else {
          newEdits.delete(slideIndex);
        }
      }
      return newEdits;
    });
  }, []);

  // Function to save user edits to the backend
  const saveUserEdits = useCallback(async () => {
    if (!outlineId) {
      setError("Cannot save edits: Outline ID is missing.");
      return false;
    }
    setIsSaving(true);
    setError(null);

    try {
      // Convert Map to a plain object for JSON serialization
      const serializableUserEdits: Record<string, OutlinePoint[]> = {};
      userEdits.forEach((points, index) => {
        serializableUserEdits[String(index)] = points;
      });

      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/outline/edits", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          outlineId,
          userEdits: serializableUserEdits,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Failed to save user edits: Server ${res.status}`);
      }

      console.log("User edits saved successfully!");
      return true;

    } catch (err: any) {
      setError(err.message);
      console.error("Error saving user edits:", err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [outlineId, userEdits]);

  // Handler for the "Accept Outline & Proceed" button
  const handleAcceptAndSave = useCallback(async () => {
      const saved = await saveUserEdits();
      // Even if saving fails, you might want to proceed, or you might want to halt.
      // For now, let's proceed to the next step (onAccept) regardless of save success.
      // You could add a modal or toast here if saved is false.
      onAccept(combinedOutline);
  }, [saveUserEdits, onAccept, combinedOutline]);


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
          if (v === "swot" && !swotGenerated && outlineId) {
            handleGenerateSwot(false);
          }
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="outline">Your Idea Outline</TabsTrigger>
          <TabsTrigger value="swot">Improve Outline (SWOT)</TabsTrigger>
        </TabsList>

        <TabsContent value="outline" className="mt-6">
          <OutlineView
            slides={combinedOutline}
            onAddPoint={handleAddPoint}
            onDeletePoint={handleDeletePoint}
            newPointContent={newPointContent} // NEW: Pass the state for input values
            setNewPointContent={setNewPointContent} // NEW: Pass the setter for input values
          />
        </TabsContent>

        <TabsContent value="swot" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => handleGenerateSwot(true)}
              disabled={!outlineId || swotLoading}
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
          <SwotView review={review} loading={swotLoading} />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-8">
        <Button
          onClick={handleAcceptAndSave}
          size="lg"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            "Accept Outline & Proceed"
          )}
        </Button>
      </div>
    </div>
  );
};

export default OutlineContainer;