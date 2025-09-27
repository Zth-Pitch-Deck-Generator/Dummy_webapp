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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
      {/* Key Elements */}
      <Card className="bg-gradient-to-t from-blue-50 to-white border-0 rounded-2xl shadow-lg hover:shadow-2xl transition">
        <CardHeader className="flex items-center gap-3">
          <Lightbulb className="text-yellow-400 w-7 h-7" />
          <CardTitle className="text-blue-900 text-xl font-bold">
            Key Elements for Investors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 list-disc ml-6 text-blue-800 text-lg">
            {keyElements.length
              ? keyElements.map((element, idx) => (
                  <li key={idx} className="pl-2">{element}</li>
                ))
              : <li className="text-gray-400">No key elements found.</li>
            }
          </ul>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card className="bg-gradient-to-t from-blue-50 to-white border-0 rounded-2xl shadow-lg hover:shadow-2xl transition">
        <CardHeader className="flex items-center gap-3">
          <HelpCircle className="text-blue-400 w-7 h-7" />
          <CardTitle className="text-blue-900 text-xl font-bold">
            Potential Investor Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 list-disc ml-6 text-blue-800 text-lg">
            {potentialQuestions.length
              ? potentialQuestions.map((question, idx) => (
                  <li key={idx} className="pl-2">{question}</li>
                ))
              : <li className="text-gray-400">No potential questions found.</li>
            }
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
