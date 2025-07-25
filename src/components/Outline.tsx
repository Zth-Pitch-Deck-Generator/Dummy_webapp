import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Slide = {
  title: string;
  bullet_points?: string[];   // may be absent → guarded below
  data_needed?: string[];
};

const Outline = ({ onAccept }: { onAccept: () => void }) => {
  const [outline, setOutline] = useState<Slide[]>([]);
  const [review,  setReview]  = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const projectId = localStorage.getItem("projectId");

  /* ───────── fetch outline on mount ───────── */
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
        if (!res.ok) throw new Error(`Server ${res.status}`);

        const json   = await res.json();
        const slides = json.outline || json.outline_json || json; // accept any shape

        if (!Array.isArray(slides)) throw new Error("Outline format invalid");
        setOutline(slides as Slide[]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  /* ───────── run evaluation ───────── */
  const handleImprove = async () => {
    try {
      const res = await fetch("/api/outline/eval", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ projectId })
      });
      if (!res.ok) throw new Error();
      setReview(await res.json());
    } catch {
      alert("Evaluation failed");
    }
  };

  /* ───────── render ───────── */
  if (loading) return <p>Loading outline…</p>;
  if (error)   return <p className="text-red-500">Error: {error}</p>;
  if (!outline.length) return <p>No slides returned.</p>;

  return (
    <div className="space-y-6">
      {outline.map((s, i) => (
        <div key={i} className="border p-4 rounded">
          <h3 className="font-semibold">{i + 1}. {s.title}</h3>

          <ul className="list-disc pl-6 text-sm">
            {(s.bullet_points ?? []).map(bp => <li key={bp}>{bp}</li>)}
          </ul>
        </div>
      ))}

      <div className="flex gap-4">
        <Button onClick={handleImprove}>Improve Outline</Button>
        <Button variant="secondary" onClick={onAccept}>Looks good →</Button>
      </div>

      {review && (
        <div className="border rounded p-4 bg-gray-50">
          <h4 className="font-medium mb-2">Coach feedback</h4>
          <p className="mb-2">{review.summary}</p>
          <ul className="list-disc pl-6 text-sm space-y-1">
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
