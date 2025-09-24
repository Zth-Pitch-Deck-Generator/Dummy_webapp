import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, HelpCircle } from "lucide-react";

interface AnalysisDisplayProps {
  keyElements?: string[];
  potentialQuestions?: string[];
}

export function AnalysisDisplay({
  keyElements = [],
  potentialQuestions = []
}: AnalysisDisplayProps) {
  return (
    <div className="grid md:grid-cols-2 gap-8 mt-8">
      <Card className="bg-white border-2 border-blue-100 rounded-xl shadow hover:shadow-lg transition">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Lightbulb className="text-yellow-400" />
            Key Elements for Investors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 text-blue-900">
            {keyElements.length
              ? keyElements.map((element, idx) => <li key={idx}>{element}</li>)
              : <li className="text-gray-400">No key elements found.</li>
            }
          </ul>
        </CardContent>
      </Card>
      <Card className="bg-white border-2 border-blue-100 rounded-xl shadow hover:shadow-lg transition">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <HelpCircle className="text-blue-400" />
            Potential Investor Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 text-blue-900">
            {potentialQuestions.length
              ? potentialQuestions.map((question, idx) => <li key={idx}>{question}</li>)
              : <li className="text-gray-400">No potential questions found.</li>
            }
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
