import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { AnalysisDisplay } from "./AnalysisDisplay";
import { ChatInterface } from "./ChatInterface";
import { Input } from "@/components/ui/input";

export function InvestorMockRoom() {
  const [deckContent, setDeckContent] = useState<string>("");
  const [analysis, setAnalysis] = useState<{ keyElements: string[], potentialQuestions: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Helper: estimate slides/pages from .txt/.md using "Slide"/"---" as separator
  const countSlides = (content: string) => {
    // For .txt/.md, e.g. "Slide 1", "---", or "\n#"
    const matches = content.match(/(Slide |\n#|\n---)/gi);
    return matches ? matches.length : 1;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError("File is too large. Maximum size is 10MB.");
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Estimate slides/pages
      const slideCount = countSlides(text);

      if (slideCount > 15) {
        setError(`Pitch deck has ${slideCount} slides/pages. Maximum allowed is 15.`);
        setDeckContent(""); // prevent upload
        return;
      }
      setError(null);
      setDeckContent(text); // valid
    };
    reader.readAsText(file); // For PDF, you'll need pdf-parse!
  };

  const handleAnalyze = async () => {
    if (!deckContent) return;
    setIsLoading(true);
    setAnalysis(null);
    setError(null);
    try {
      const res = await fetch("/api/investor-mockroom/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckContent }),
      });
      const data = await res.json();
      if (data.keyElements === undefined || data.potentialQuestions === undefined || data.error) {
        setError(data.error || "Unexpected analysis response.");
        return;
      }
      setAnalysis({ keyElements: data.keyElements, potentialQuestions: data.potentialQuestions });
    } catch (err) {
      setError("Failed to analyze pitch deck.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-white border-2 border-blue-100 rounded-2xl shadow-lg p-8">
      <CardHeader>
        <CardTitle className="text-blue-700 text-2xl">Investor Mock Room</CardTitle>
        <CardDescription className="text-blue-500">
          Upload your pitch deck (up to 10MB, 15 slides/pages) for instant AI feedback and interactive pitch Q&A.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center border-2 border-dashed border-blue-300 p-8 rounded-lg bg-blue-50 hover:border-blue-500 transition group">
          <Upload className="w-12 h-12 text-blue-500 group-hover:text-blue-700" />
          <p className="mt-4 text-blue-700 text-sm">{fileName || "Drag & drop your pitch deck or click Browse"}</p>
          <Input id="deck-upload" type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md" />
          <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full px-6 py-2">
            <label htmlFor="deck-upload" style={{ cursor: "pointer" }}>Browse File</label>
          </Button>
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={!deckContent || isLoading}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-800 text-white rounded-full font-bold text-lg py-3 transition"
        >
          {isLoading ? "Analyzing..." : "Analyze Deck"}
        </Button>
        {error && <div className="mt-4 text-red-600 font-semibold">{error}</div>}
        {analysis && (
          <>
            <AnalysisDisplay keyElements={analysis.keyElements} potentialQuestions={analysis.potentialQuestions} />
            <ChatInterface deckContent={deckContent} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
