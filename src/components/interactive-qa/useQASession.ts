// src/components/interactive-qa/useQASession.ts
import { useEffect, useRef, useState } from 'react';
import { QAData, ProjectData } from '@/pages/Index';

interface ApiMessage {
  role: 'user' | 'model';
  content: string;
}

export interface AIQuestion {
  topic: string;
  question: string;
  answerType: 'free_text' | 'multiple_choice' | 'complete';
  choices?: string[] | null;
  explanation?: string | null;
  isComplete: boolean;
  isMetricCalculation: boolean;
}

export default function useQASession(
  projectData: ProjectData,
  onComplete: (qaData: QAData) => void
) {
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<AIQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questionCount, setQuestionCount] = useState(1);
  const [subQuestionCount, setSubQuestionCount] = useState(0);
  const [questionHistory, setQuestionHistory] = useState<AIQuestion[]>([]);
  const [canGoBack, setCanGoBack] = useState(false);
  const [answerHistory, setAnswerHistory] = useState<Map<string, { answer: string | string[], answerType: string }>>(new Map());
  const [fullQuestionHistory, setFullQuestionHistory] = useState<AIQuestion[]>([]); // Track all questions ever seen
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialMessage: ApiMessage = {
      role: 'model',
      content: `Let’s understand your idea better to help us build your "${projectData.decktype}" pitch deck.`
    };

    const fetchFirstQuestion = async () => {
      try {
        const projectId = localStorage.getItem('projectId');
        if (!projectId) throw new Error('Project ID missing');

        const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch('/api/qa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ projectId, messages: [initialMessage] })
        });

        if (!res.ok) {
            const errorBody = await res.json();
            console.error("API Error on first question:", errorBody);
            throw new Error('API error on first question');
        }

        const questionData: AIQuestion = await res.json();
        setCurrentQuestion(questionData);
        setQuestionHistory([questionData]);
        setFullQuestionHistory([questionData]);
        setCurrentQuestionIndex(0);
        setMessages([
            initialMessage,
            { role: 'model', content: questionData.question }
        ]);

      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFirstQuestion();
  }, [projectData]);

  const handlePrevious = () => {
    if (currentQuestionIndex <= 0) return;

    const newIndex = currentQuestionIndex - 1;
    const previousQuestion = fullQuestionHistory[newIndex];

    if (previousQuestion) {
      setCurrentQuestion(previousQuestion);
      setCurrentQuestionIndex(newIndex);

      // Remove the last user answer and model question from messages
      const newMessages = [...messages];
      newMessages.pop(); // Remove user's last answer
      newMessages.pop(); // Remove model's last question
      setMessages(newMessages);

      // Update question count
      if (previousQuestion.isMetricCalculation) {
        setSubQuestionCount(prev => Math.max(0, prev - 1));
      } else {
        setQuestionCount(prev => Math.max(1, prev - 1));
        setSubQuestionCount(0);
      }

      setCanGoBack(newIndex > 0);
    }
  };

  const getPreviousAnswer = (question: string) => {
    return answerHistory.get(question);
  };

  const handleSend = async (answer: string | string[]) => {
    if (!currentQuestion) return;

    const answerContent = Array.isArray(answer) ? answer.join(', ') : answer;
    if (!answerContent.trim()) return;

    // Store the answer for this question
    const questionKey = currentQuestion.question;
    setAnswerHistory(prev => new Map(prev).set(questionKey, {
      answer: answer,
      answerType: currentQuestion.answerType
    }));

    setIsLoading(true);

    const updatedMessages: ApiMessage[] = [
      ...messages,
      { role: 'user', content: answerContent }
    ];
    setMessages(updatedMessages);

    // Check if we're moving forward to a question we've already seen
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < fullQuestionHistory.length) {
      // We're going back to a question we've already seen
      const nextQuestion = fullQuestionHistory[nextIndex];
      setCurrentQuestion(nextQuestion);
      setCurrentQuestionIndex(nextIndex);
      setCanGoBack(true);
      setMessages(prev => [...prev, { role: 'model', content: nextQuestion.question }]);
      setIsLoading(false);
      return;
    }

    try {
      const projectId = localStorage.getItem('projectId');
      if (!projectId) throw new Error('Project ID missing');

      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ projectId, messages: updatedMessages })
      });
      if (!res.ok) {
        const errorBody = await res.json();
        console.error("API Error on next question:", errorBody);
        throw new Error('API error on next question');
      }

      const nextQuestionData: AIQuestion = await res.json();

      if (nextQuestionData.isComplete) {
        await handleComplete([...updatedMessages, { role: 'model', content: nextQuestionData.question }]);
      } else {
        if (nextQuestionData.isMetricCalculation) {
          setSubQuestionCount(prev => prev + 1);
        } else {
          setQuestionCount(prev => prev + 1);
          setSubQuestionCount(0);
        }
        setCurrentQuestion(nextQuestionData);
        setQuestionHistory(prev => [...prev, nextQuestionData]);
        setFullQuestionHistory(prev => [...prev, nextQuestionData]);
        setCurrentQuestionIndex(nextIndex);
        setCanGoBack(true);
        setMessages(prev => [...prev, { role: 'model', content: nextQuestionData.question }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (finalMessages: ApiMessage[]) => {
    const projectId = localStorage.getItem('projectId');
    if (!projectId) {
      alert('Project ID missing. Cannot save session.');
      return;
    }

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/qa/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ projectId, messages: finalMessages })
      });

      if (!res.ok) {
        const errorBody = await res.json();
        throw new Error('Failed to save the Q&A session to the database.');
      }

      const formattedQAData: QAData = finalMessages
        .reduce((acc, msg, i) => {
            if (msg.role === 'user') {
                const questionMsg = finalMessages[i-1];
                if (questionMsg && questionMsg.role === 'model') {
          acc.push({
            question: questionMsg.content,
            answer: msg.content,
          });
                }
            }
            return acc;
        }, [] as QAData);

      onComplete(formattedQAData);

    } catch (err) {
      console.error(err);
      alert("There was an error saving your session. Please try again.");
    }
  };

  const historyForUI: QAData = messages
    .reduce((acc, msg, i) => {
        if (msg.role === 'user') {
            const questionMsg = messages[i-1];
            if (questionMsg) {
        acc.push({
          question: questionMsg.content,
          answer: msg.content,
        });
            }
        }
        return acc;
    }, [] as QAData);

  return {
    currentQuestion,
    isLoading,
    handleSend,
    handlePrevious,
    getPreviousAnswer,
    scrollRef,
    history: historyForUI,
    canGoBack,
    questionCount: subQuestionCount > 0 ? `${questionCount}.${subQuestionCount}` : questionCount.toString(),
  };
}