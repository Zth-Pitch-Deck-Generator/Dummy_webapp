// src/components/Outline.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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
}

// The onAccept prop now expects the outline data as an argument
interface OutlineProps {
  onAccept: (outline: Slide[]) => void;
}

const Outline = ({ onAccept }: OutlineProps) => {
  const [outline, setOutline] = useState<Slide[]>([]);
  const [review, setReview] = useState<SWOT | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swotGenerated, setSwotGenerated] = useState(false);

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
          throw new Error(
            "Run the founder interview first – no transcript found"
          );
        }
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || `Server ${res.status}`);
        }

        const json = await res.json();
        const slides = json.outline || json.outline_json || json;

        if (!Array.isArray(slides))
          throw new Error("Outline format from API is invalid");
        setOutline(slides as Slide[]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const handleImprove = async () => {
    if (!projectId) {
      alert("Project ID missing. Cannot generate SWOT analysis.");
      return;
    }
    if (swotGenerated) return;
    try {
      const res = await fetch("/api/outline/eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) {
        // Show backend error message if available
        let msg = "Evaluation failed";
        try {
          const errData = await res.json();
          msg = errData.error || msg;
        } catch {}
        throw new Error(msg);
      }
      setReview(await res.json());
      setSwotGenerated(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Evaluation failed");
      // Do not set swotGenerated so user can retry
    }
  };

  if (loading) return <p>Loading outline…</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (!outline.length) return <p>No slides returned.</p>;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Your Outline</h1>
      {outline.map((slide, i) => (
        <div key={i} className="border rounded-xl shadow-md p-6">
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100
                            text-blue-700 font-semibold flex items-center
                            justify-center"
            >
              {i + 1}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {slide.title}
              </h3>

              {!!slide.bullet_points?.length && (
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  {slide.bullet_points.map((bp) => (
                    <li key={bp}>{bp}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-center gap-4 mt-10">
        <Button
          onClick={handleImprove}
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 border"
          disabled={swotGenerated}
        >
          {swotGenerated ? "SWOT Analysis Generated" : "Improve Outline (SWOT)"}
        </Button>

        {/* The onClick handler now passes the outline state up to the parent */}
        <Button
          onClick={() => onAccept(outline)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Looks good →
        </Button>
      </div>

      {review && (
        <div className="mt-10 border rounded-xl shadow-sm p-6 bg-gray-50 space-y-6">
            <h4 className="text-xl font-semibold text-center">SWOT Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-green-50 rounded-lg">
                    <h5 className="font-bold text-green-800 mb-2">Strengths</h5>
                    <ul className="list-disc pl-5 text-sm space-y-1 text-green-700">
                        {review.strength?.map((item: string) => <li key={item}>{item}</li>)}
                    </ul>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                    <h5 className="font-bold text-red-800 mb-2">Weaknesses</h5>
                    <ul className="list-disc pl-5 text-sm space-y-1 text-red-700">
                        {review.weakness?.map((item: string) => <li key={item}>{item}</li>)}
                    </ul>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-bold text-blue-800 mb-2">Opportunities</h5>
                    <ul className="list-disc pl-5 text-sm space-y-1 text-blue-700">
                        {review.opportunities?.map((item: string) => <li key={item}>{item}</li>)}
                    </ul>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                    <h5 className="font-bold text-yellow-800 mb-2">Threats</h5>
                    <ul className="list-disc pl-5 text-sm space-y-1 text-yellow-700">
                        {review.threats?.map((item: string) => <li key={item}>{item}</li>)}
                    </ul>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Outline;