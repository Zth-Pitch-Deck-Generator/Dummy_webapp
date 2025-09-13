// src/components/interactive-qa/InteractiveQA.tsx
import { QASession } from './types';
import { useQASession } from './useQASession';
import ChatWindow from './ChatWindow';
import InputArea from './InputArea';
import { Progress } from '@/components/ui/progress';
import { CheckCircle } from 'lucide-react';

interface InteractiveQAProps {
  config: QASession;
  onComplete: (answers: Record<string, any>) => void; // Updated onComplete to pass answers up
}

const InteractiveQA = ({ config, onComplete }: InteractiveQAProps) => {
  const { 
    messages,
    answers,
    currentQuestion,
    isCompleted,
    progress,
    handleSubmit,
    goBack,
    canGoBack,
  } = useQASession(config, onComplete);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-semibold">{config.title}</h2>
        <p className="text-sm text-gray-500">{config.description}</p>
        <Progress value={progress} className="mt-2" />
      </div>

      {/* Pass the required 'isLoading' prop to ChatWindow */}
      <ChatWindow messages={messages} isLoading={false} />

      {isCompleted ? (
        <div className="p-4 text-center bg-white border-t">
          <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
          <h3 className="font-semibold">Session Complete!</h3>
          <p className="text-sm text-gray-600">You've answered all the questions.</p>
        </div>
      ) : currentQuestion ? (
        <InputArea
          question={currentQuestion}
          onSubmit={handleSubmit}
          onBack={goBack}
          canGoBack={canGoBack}
          previousAnswer={answers[currentQuestion.id]}
        />
      ) : null}
    </div>
  );
};

export default InteractiveQA;