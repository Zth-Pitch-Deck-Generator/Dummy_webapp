import { useEffect, useRef, useState } from 'react';
import { QAData, ProjectData } from '@/pages/Index';

export interface AIQuestion {
  topic: string;
  question: string;
  answerType: 'free_text' | 'multiple_choice' | 'complete';
  choices?: string[] | null;
  explanation?: string | null;
  isComplete: boolean;
}

export default function useQASession(
  projectData: ProjectData,
  onComplete: (qaData: QAData) => void
) {
  const [history, setHistory] = useState<QAData>([]);
  const [currentQuestion, setCurrentQuestion] = useState<AIQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialMessage = {
      role: 'ai' as const,
      content: `Let’s understand your idea better to help us build your "${projectData.decktype}" pitch deck.`
    };
    
    const fetchFirstQuestion = async () => {
      try {
        const projectId = localStorage.getItem('projectId');
        if (!projectId) throw new Error('Project ID missing');
        
        const res = await fetch('/api/qa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, messages: [initialMessage] })
        });

        if (!res.ok) throw new Error('API error on first question');
        
        const questionData: AIQuestion = await res.json();
        setCurrentQuestion(questionData);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFirstQuestion();
  }, [projectData]);

  const handleSend = async (answer: string | string[]) => {
    if (!currentQuestion) return;

    const answerContent = Array.isArray(answer) ? answer.join(', ') : answer;
    if (!answerContent.trim()) return;

    setIsLoading(true);

    const newHistoryEntry = {
      question: currentQuestion.question,
      answer: answerContent,
      timestamp: Date.now()
    };
    const updatedHistory = [...history, newHistoryEntry];
    setHistory(updatedHistory);

    const messagesForApi = [
        { role: 'ai' as const, content: `Let’s understand your idea better...` },
        ...updatedHistory.flatMap(h => [
            { role: 'ai' as const, content: h.question },
            { role: 'user' as const, content: h.answer }
        ])
    ];

    try {
      const projectId = localStorage.getItem('projectId');
      if (!projectId) throw new Error('Project ID missing');

      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, messages: messagesForApi })
      });
      if (!res.ok) throw new Error('API error on next question');
      
      const nextQuestionData: AIQuestion = await res.json();

      if (nextQuestionData.isComplete) {
        await handleComplete(updatedHistory);
      } else {
        setCurrentQuestion(nextQuestionData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (finalHistory: QAData) => {
    const projectId = localStorage.getItem('projectId');
    if (!projectId) {
      alert('Project ID missing');
      return;
    }
    
    const messagesForApi = finalHistory.flatMap(h => [
        { role: 'ai' as const, content: h.question },
        { role: 'user' as const, content: h.answer }
    ]);

    await fetch('/api/qa/session/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, messages: messagesForApi })
    });

    onComplete(finalHistory);
  };
  
  return {
    currentQuestion,
    isLoading,
    handleSend,
    scrollRef,
    history,
    questionCount: history.length + 1,
  };
}