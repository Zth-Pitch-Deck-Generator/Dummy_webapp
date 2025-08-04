// src/features/interactive-qa/InteractiveQA.tsx
import { ArrowRight, Sparkles } from 'lucide-react';

import {
  Card, CardHeader, CardTitle, CardContent
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import ChatWindow from './ChatWindow';
import InputArea from './InputArea';
import useQASession from './useQASession';

import type { InteractiveQAProps } from './types';

const InteractiveQA = ({ projectData, onComplete }: InteractiveQAProps) => {
  const {
    messages, lastAI,
    questionCount, maxQuestions, progress,
    isLoading, handleSend, handleComplete
  } = useQASession(projectData, onComplete);

  return (
    <div className="max-w-4xl mx-auto">
      {/* header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Interactive Q&A Session</h1>
          <Badge variant="outline" className="text-sm">
            Question {Math.min(questionCount + 1, maxQuestions)} of {maxQuestions}
          </Badge>
        </div>
        <div className="bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* chat card */}
      <Card className="shadow-lg h-[600px] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 w-8 h-8 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            Smart Deck Engine
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 p-0 flex flex-col">
          <ChatWindow messages={messages} isLoading={isLoading} />

          {/* footer */}
          <div className="border-t p-4">
            {questionCount >= maxQuestions ? (
              <div className="flex justify-center">
                <Button
                  onClick={handleComplete}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  Next<ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              <InputArea
                lastAI={lastAI}
                isLoading={isLoading}
                onSend={handleSend}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InteractiveQA;
