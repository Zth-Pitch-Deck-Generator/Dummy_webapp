import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const Outline = ({ onAccept }: { onAccept: () => void }) => {
  const [outline, setOutline] = useState<any[] | null>(null);
  const [review, setReview] = useState<any | null>(null);
  const projectId = localStorage.getItem("projectId");

  /* fetch or generate outline on mount */
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
       const json = await res.json();
      // json can be either the pure array OR { id, outline }
      setOutline(Array.isArray(json) ? json : json.outline);
    })();
  }, [projectId]);

  const handleImprove = async () => {
    const res = await fetch("/api/outline/eval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId })
    });
    if (res.ok) setReview(await res.json());
    else alert("Evaluation failed");
  };

  if (!outline) return <p>Loading outline…</p>;

  return (
    <div className="space-y-6">
      {outline.map((s, i) => (
        <div key={i} className="border p-4 rounded">
          <h3 className="font-semibold">{i + 1}. {s.title}</h3>
          <ul className="list-disc pl-6 text-sm">
            {s.bullet_points.map((b: string) => <li key={b}>{b}</li>)}
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
            {review.missing_slides.map((m: string) => <li key={m}>{m}</li>)}
            {review.clarity_issues.map((m: string) => <li key={m}>{m}</li>)}
            {review.data_gaps.map((m: string) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Outline;
