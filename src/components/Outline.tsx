import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/* ─── Types ────────────────────────────────────────────────────── */
type Slide = {
  title: string;
  bullet_points?: string[];
  data_needed?: string[];
};

/* ─── Component ───────────────────────────────────────────────── */
const Outline = ({ onAccept }: { onAccept: () => void }) => {
  const [outline, setOutline] = useState<Slide[]>([]);
  const [review,  setReview ] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError  ] = useState<string | null>(null);

  const projectId = typeof window !== "undefined"
    ? localStorage.getItem("projectId")
    : null;

  /* ── Fetch outline on mount ── */
  useEffect(() => {
    if (!projectId) {
      setError("Project ID missing");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/outline", {
          method : "POST",
          headers: { "Content-Type": "application/json" },
          body   : JSON.stringify({ projectId })
        });

        if (res.status === 404) {
          throw new Error("Run the founder interview first – no transcript found");
        }
        if (!res.ok) throw new Error(`Server ${res.status}`);

        const json   = await res.json();
        const slides = json.outline || json.outline_json || json;

        if (!Array.isArray(slides)) throw new Error("Outline format invalid");
        setOutline(slides as Slide[]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  /* ── Trigger Gemini review ── */
  const handleImprove = async () => {
    if (!projectId) return;
    try {
      const res = await fetch("/api/outline/eval", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ projectId })
      });
      if (!res.ok) throw new Error("Evaluation failed");
      setReview(await res.json());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Evaluation failed");
    }
  };

  /* ── Render ── */
  if (loading)          return <p>Loading outline…</p>;
  if (error)            return <p className="text-red-500">Error: {error}</p>;
  if (!outline.length)  return <p>No slides returned.</p>;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
      {outline.map((slide, i) => (
        <div key={i} className="border rounded-xl shadow-md p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100
                            text-blue-700 font-semibold flex items-center
                            justify-center">
              {i + 1}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {slide.title}
              </h3>

              {!!slide.bullet_points?.length && (
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  {slide.bullet_points.map(bp => <li key={bp}>{bp}</li>)}
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
        >
          Improve Outline
        </Button>

        <Button
          variant="secondary"
          onClick={onAccept}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Looks good →
        </Button>
      </div>

      {review && (
        <div className="border rounded-xl shadow-sm p-6 bg-gray-50">
          <h4 className="font-medium mb-2">Coach feedback</h4>
          <p className="mb-2 text-sm text-gray-700">{review.summary}</p>
          <ul className="list-disc pl-6 text-sm space-y-1 text-gray-700">
            {review.missing_slides?.map((m: string)  => <li key={m}>{m}</li>)}
            {review.clarity_issues?.map((m: string)  => <li key={m}>{m}</li>)}
            {review.data_gaps?.map((m: string)       => <li key={m}>{m}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Outline;
