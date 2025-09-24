import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { AnalysisDisplay } from "./AnalysisDisplay";
import { ChatInterface } from "./ChatInterface";
import { Input } from "@/components/ui/input";
import { toast } from "sonner"; // Import the toast component

export function InvestorMockRoom() {
  const [deckFile, setDeckFile] = useState<File | null>(null);
  const [deckContent, setDeckContent] = useState<string>("");
  const [analysis, setAnalysis] = useState<{ keyElements: string[], potentialQuestions: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setDeckFile(file);
      // Reset previous analysis when a new file is selected
      setAnalysis(null);
      setDeckContent("");
    }
  };

  const handleAnalyze = async () => {
    if (!deckFile) return;

    setIsLoading(true);
    setAnalysis(null);

    const formData = new FormData();
    formData.append("deck", deckFile);

    try {
      const res = await fetch("/api/investor-mockroom/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        // Use the error message from the backend if available
        throw new Error(data.error || `Server responded with ${res.status}`);
      }
      
      setAnalysis(data);
      setDeckContent(data.deckContent); 
      toast.success("Analysis complete!");

    } catch (error: any) {
      console.error("Failed to analyze pitch deck:", error);
      // Display a user-friendly error toast
      toast.error("Analysis Failed", {
        description: error.message || "Please check the file or try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investor Mock Room</CardTitle>
        <CardDescription>
          Upload your pitch deck (PDF) to get AI-powered feedback and practice your pitch.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center border-2 border-dashed border-gray-300 p-8 rounded-lg">
          <Upload className="w-12 h-12 text-gray-400" />
          <p className="mt-4 text-sm text-gray-600">
            {fileName || "Click to browse and upload your pitch deck."}
          </p>
          <Input id="deck-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf" />
          <Button asChild className="mt-4">
            <label htmlFor="deck-upload">Browse File</label>
          </Button>
        </div>
        <Button onClick={handleAnalyze} disabled={!deckFile || isLoading} className="w-full mt-4">
          {isLoading ? "Analyzing..." : "Analyze Deck"}
        </Button>
        {analysis && deckContent && (
          <>
            <AnalysisDisplay keyElements={analysis.keyElements} potentialQuestions={analysis.potentialQuestions} />
            <ChatInterface deckContent={deckContent} />
          </>
        )}
      </CardContent>
    </Card>
  );
}