// src/pages/Index.tsx
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Presentation, Users } from 'lucide-react';

export type ProjectData = {
  projectName: string;
  industry: string;
  stage: string;
  description: string;
  revenue: 'pre-revenue' | 'revenue';
  slide_mode: 'manual' | 'ai';
  slide_count: number;
  decktype: "pitch-deck" | "dataroom";
  deckSubtype: "basic_pitch_deck" | "complete_pitch_deck" | "guided_dataroom" | "direct_dataroom";
};

export type QAData = {
  question: string;
  answer: string;
  timestamp: number;
}[];

export type GeneratedSlide = {
  title: string;
  content: string[];
};

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <Presentation className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            AI-Powered
            <span className="block bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Pitch Decks
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Create professional pitch decks in minutes with our AI-powered platform. 
            Answer smart questions, get tailored suggestions, and build compelling presentations.
          </p>
          <Button asChild size="lg" className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <Link to="/create">
              <Sparkles className="w-5 h-5 mr-2" />
              Start Building Your Deck
            </Link>
          </Button>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardHeader>
                <div className="bg-gradient-to-r from-cyan-500 to-purple-500 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl">AI-Powered Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Our AI asks smart follow-up questions to understand your business and create the perfect pitch deck structure.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardHeader>
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Presentation className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl">Professional Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Choose from curated templates designed for different audiences - from essentials to investor-ready decks.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardHeader>
                <div className="bg-gradient-to-r from-pink-500 to-orange-500 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl">Interactive Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Preview your deck in real-time, make edits, and get AI feedback before finalizing your presentation.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
      </div>
    </div>
  );
};

export default Index;
