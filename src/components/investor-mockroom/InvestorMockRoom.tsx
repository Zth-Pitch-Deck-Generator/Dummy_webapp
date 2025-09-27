import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload } from "lucide-react";
import { AnalysisDisplay } from "./AnalysisDisplay";
import { ChatInterface } from "./ChatInterface";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase"; // Make sure you have this file configured
import { v4 as uuidv4 } from "uuid"; // To generate unique file names

export function InvestorMockRoom() {
  const [deckFile, setDeckFile] = useState<File | null>(null);
  const [deckContent, setDeckContent] = useState<string>("");
  const [analysis, setAnalysis] = useState<{
    keyElements: string[];
    potentialQuestions: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB in bytes

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File size exceeds 5MB", {
          description: "Please upload a PDF smaller than 5MB.",
        });
        event.target.value = "";
        return;
      }

      setFileName(file.name);
      setDeckFile(file);
      setAnalysis(null);
      setDeckContent("");
    }
  };

  const handleAnalyze = async () => {
    if (!deckFile) return;

    setIsLoading(true);
    setAnalysis(null);

    try {
      const fileExt = deckFile.name.split(".").pop();
      const newFileName = `${uuidv4()}.${fileExt}`;
      const filePath = `public/${newFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("Investor_mockroom_decks") // Correct bucket name
        .upload(filePath, deckFile);

      if (uploadError) {
        throw new Error(`Supabase upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("Investor_mockroom_decks")
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error("Could not get public URL for the uploaded file.");
      }
      const deckUrl = urlData.publicUrl;

      const res = await fetch("/api/investor-mockroom/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deckUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server responded with ${res.status}`);
      }

      setAnalysis(data);
      setDeckContent(data.deckContent);
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error("Failed to analyze pitch deck:", error);
      toast.error("Analysis Failed", {
        description:
          error.message || "Please check the file or try again later.",
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
          Upload your pitch deck (PDF, max 5MB) to get{" "}
          <span className="font-semibold">AI-powered feedback</span> and
          practice your pitch with a mock investor.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 pb-8">
        <div className="w-full flex flex-col items-center border-4 border-dashed border-blue-300 p-8 rounded-xl bg-white shadow-lg transition duration-300 hover:border-blue-600">
          <Upload className="w-16 h-16 text-blue-400" />
          <label
            htmlFor="deck-upload"
            className="cursor-pointer text-blue-800 font-medium mt-4 hover:underline"
          >
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
            {isLoading ? (
              <span className="animate-spin mr-2 w-5 h-5 rounded-full border-4 border-blue-300 border-t-blue-600" />
            ) : null}
            {isLoading ? "Analyzing..." : "Analyze Deck"}
          </Button>
        </div>

        {analysis && deckContent && (
          <div className="w-full">
            <AnalysisDisplay
              keyElements={analysis.keyElements}
              potentialQuestions={analysis.potentialQuestions}
            />
            <ChatInterface deckContent={deckContent} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}