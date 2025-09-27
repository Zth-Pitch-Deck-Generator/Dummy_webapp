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
    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-xl rounded-2xl">
      <CardHeader className="text-center space-y-2 py-8">
        <CardTitle className="font-bold text-3xl text-blue-900 tracking-tight">
          Investor Mock Room
        </CardTitle>
        <CardDescription className="text-blue-700 text-lg">
          Upload your pitch deck (PDF) to get <span className="font-semibold">AI-powered feedback</span> and practice your pitch with a mock investor.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 pb-8">
        <div className="w-full flex flex-col items-center border-4 border-dashed border-blue-300 p-8 rounded-xl bg-white shadow-lg transition duration-300 hover:border-blue-600">
          <Upload className="w-16 h-16 text-blue-400" />
          <label htmlFor="deck-upload" className="cursor-pointer text-blue-800 font-medium mt-4 hover:underline">
            {fileName || "Click to browse and upload your pitch deck."}
            <Input
              id="deck-upload"
              type="file"
              className="sr-only"
              onChange={handleFileChange}
              accept=".pdf"
            />
          </label>
          <Button
            onClick={handleAnalyze}
            disabled={!deckFile || isLoading}
            className="mt-8 w-52 text-lg bg-blue-600 hover:bg-blue-700 transition duration-200 rounded-full shadow flex items-center justify-center"
          >
            {isLoading ? <span className="animate-spin mr-2 w-5 h-5 rounded-full border-4 border-blue-300 border-t-blue-600" /> : null}
            {isLoading ? "Analyzing..." : "Analyze Deck"}
          </Button>
        </div>

        {analysis && deckContent && (
          <div className="w-full">
            <AnalysisDisplay keyElements={analysis.keyElements} potentialQuestions={analysis.potentialQuestions} />
            <ChatInterface deckContent={deckContent} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}