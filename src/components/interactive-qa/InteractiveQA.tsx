// src/components/interactive-qa/InteractiveQA.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info, ArrowLeft } from 'lucide-react';
import useQASession from './useQASession';
import type { InteractiveQAProps } from './types';
import { Skeleton } from '../ui/skeleton';
import qaConfig from '../../../backend/qa-configs/basic_pitch_deck.json';

const InteractiveQA = ({ projectData, onComplete }: InteractiveQAProps) => {
  const { currentQuestion, isLoading, handleSend, handlePrevious, getPreviousAnswer, questionCount, history, canGoBack } = useQASession(projectData, onComplete);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);

  // Always restore previous answer for the current question
  useEffect(() => {
    if (currentQuestion) {
      const previousAnswer = getPreviousAnswer(currentQuestion.question);
      if (previousAnswer) {
        if (currentQuestion.answerType === 'multiple_choice') {
          const choices = Array.isArray(previousAnswer.answer) ? previousAnswer.answer : [previousAnswer.answer];
          const regularChoices = choices.filter(choice =>
            currentQuestion.choices?.includes(choice) || choice === 'Other'
          );
          const otherChoices = choices.filter(choice =>
            !currentQuestion.choices?.includes(choice) && choice !== 'Other'
          );

          setSelectedChoices(regularChoices.length > 0 ? regularChoices : []);

          // If there are custom choices, select "Other" and set the custom text
          if (otherChoices.length > 0) {
            setSelectedChoices(prev => [...prev, 'Other']);
            setCurrentAnswer(otherChoices.join(', '));
          } else {
            setCurrentAnswer('');
          }
        } else {
          // For free text questions
          const answerText = Array.isArray(previousAnswer.answer)
            ? previousAnswer.answer.join(', ')
            : previousAnswer.answer;
          setCurrentAnswer(answerText);
          setSelectedChoices([]);
        }
      } else {
        // No previous answer, clear form
        setCurrentAnswer('');
        setSelectedChoices([]);
      }
    }
  }, [currentQuestion?.question]);

  // Return true only when current question index equals maxQuestions from config
  const isLikelyLastQuestion = () => {
    const maxq = Number(qaConfig?.maxQuestions ?? 0);
    const current = parseInt(String(questionCount).match(/\d+/)?.[0] ?? '0', 10);
    return current === maxq && maxq > 0;
  };

  const handleSubmit = () => {
    if (isLoading) return;

    if (currentQuestion?.answerType === 'multiple_choice') {
      const otherChoiceSelected = selectedChoices.includes('Other');
      let finalChoices = selectedChoices.filter(c => c !== 'Other');

      if (otherChoiceSelected && currentAnswer.trim()) {
        finalChoices.push(currentAnswer.trim());
      }

      if (finalChoices.length > 0) {
        handleSend(finalChoices);
        setSelectedChoices([]);
        setCurrentAnswer('');
      }
    } else {
      if (currentAnswer.trim()) {
        handleSend(currentAnswer);
        setCurrentAnswer('');
      }
    }
  };

  const handleChoiceClick = (choice: string) => {
    setSelectedChoices(prev =>
      prev.includes(choice)
        ? prev.filter(c => c !== choice)
        : [...prev, choice]
    );
  };

  const renderInput = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.answerType) {
      case 'multiple_choice':
        const otherSelected = selectedChoices.includes('Other');
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {currentQuestion.choices?.map(choice => (
                <Button
                  key={choice}
                  variant={selectedChoices.includes(choice) ? 'default' : 'outline'}
                  onClick={() => handleChoiceClick(choice)}
                >
                  {choice}
                </Button>
              ))}
            </div>
            {otherSelected && (
              <Input
                placeholder="Please specify"
                value={currentAnswer}
                onChange={e => setCurrentAnswer(e.target.value)}
              />
            )}
          </div>
        );
      case 'free_text':
      default:
        return (
          <Textarea
            placeholder="Your answer..."
            value={currentAnswer}
            onChange={e => setCurrentAnswer(e.target.value)}
            rows={4}
          />
        );
    }
  };

  const isSubmitDisabled = () => {
    if (isLoading) return true;
    if (currentQuestion?.answerType === 'multiple_choice') {
      const otherSelected = selectedChoices.includes('Other');
      if (otherSelected) {
        return currentAnswer.trim() === '' && selectedChoices.length === 1;
      }
      return selectedChoices.length === 0;
    }
    return currentAnswer.trim() === '';
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Interactive Q&amp;A Session</h1>
        <p className="text-gray-500 mt-2">The AI will ask questions to understand your venture. This session won't exceed 20 questions.</p>
      </div>

      <Card className="shadow-lg">
        {isLoading && !currentQuestion ? (
          <CardContent className="p-6">
            <Skeleton className="h-8 w-1/2 mb-4" />
            <Skeleton className="h-6 w-full mb-6" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        ) : currentQuestion && (
          <>
            <CardHeader>
              <Label className="text-sm text-gray-500">Question {questionCount}</Label>
              <CardTitle className="text-2xl">{currentQuestion.topic}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentQuestion.explanation && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Quick Explanation</AlertTitle>
                  <AlertDescription>{currentQuestion.explanation}</AlertDescription>
                </Alert>
              )}
              <p className="text-gray-700 text-lg">{currentQuestion.question}</p>
              <div className="mt-4">
                {renderInput()}
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <Button
                variant="ghost"
                disabled={!canGoBack}
                onClick={handlePrevious}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>

              <Button onClick={handleSubmit} disabled={isSubmitDisabled()}>
                {isLikelyLastQuestion() ? 'Submit Answer' : 'Next'}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
};

export default InteractiveQA;
