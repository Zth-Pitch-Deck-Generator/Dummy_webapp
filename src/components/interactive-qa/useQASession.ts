// src/components/interactive-qa/useQASession.ts
import { useState, useMemo, useEffect } from 'react';
import { QASession, QAQuestion, QAAnswer, Message } from './types';

export const useQASession = (config: QASession, onComplete: (answers: Record<string, QAAnswer>) => void) => {
  const { questions } = config;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QAAnswer>>({});

  const currentQuestion: QAQuestion | undefined = questions[currentQuestionIndex];
  const isCompleted = currentQuestionIndex >= questions.length;

  const handleSubmit = (answer: QAAnswer) => {
    if (!currentQuestion) return;

    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // This was the last question, call onComplete with the final answers
      const finalAnswers = { ...answers, [currentQuestion.id]: answer };
      onComplete(finalAnswers);
      setCurrentQuestionIndex(prev => prev + 1); // Move past the last question to show completion
    }
  };

  const goBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const canGoBack = currentQuestionIndex > 0 && !isCompleted;

  const messages: Message[] = useMemo(() => {
    const builtMessages: Message[] = [];
    if (!questions || questions.length === 0) return [];
  
    // Loop up to the current question
    for (let i = 0; i <= currentQuestionIndex && i < questions.length; i++) {
      const q = questions[i];
      // Add the question from the model
      builtMessages.push({ id: q.id, role: 'model', content: q.text });
  
      const answer = answers[q.id];
      if (answer) {
        // Format the answer for display
        let answerText: string;
        if (Array.isArray(answer)) {
            answerText = answer.join(', ');
        } else if (typeof answer === 'string') {
            answerText = answer;
        } else {
            answerText = JSON.stringify(answer);
        }
        builtMessages.push({ id: `${q.id}-ans`, role: 'user', content: answerText });
      } else {
        // If there's no answer yet, this is the current question, so we stop.
        break;
      }
    }
    return builtMessages;
  }, [currentQuestionIndex, questions, answers]);

  const progress = useMemo(() => {
    const answeredCount = Object.keys(answers).length;
    return questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
  }, [answers, questions]);

  return {
    messages,
    answers,
    currentQuestion,
    isCompleted,
    progress,
    canGoBack,
    handleSubmit,
    goBack,
  };
};