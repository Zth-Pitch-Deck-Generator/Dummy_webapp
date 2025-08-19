// src/components/interactive-qa/useQASession.ts
import { useEffect, useRef, useState } from 'react';
import { QAData, ProjectData } from '@/pages/Index';

// Define the shape of a single message for the API
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
}

export default function useQASession(
  projectData: ProjectData,
  onComplete: (qaData: QAData) => void
) {
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<AIQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
        
        const res = await fetch('/api/qa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, messages: [initialMessage] })
        });

        if (!res.ok) {
            const errorBody = await res.json();
            console.error("API Error on first question:", errorBody);
            throw new Error('API error on first question');
        }
        
        const questionData: AIQuestion = await res.json();
        setCurrentQuestion(questionData);

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

  const handleSend = async (answer: string | string[]) => {
    if (!currentQuestion) return;

    const answerContent = Array.isArray(answer) ? answer.join(', ') : answer;
    if (!answerContent.trim()) return;

    setIsLoading(true);

    const updatedMessages: ApiMessage[] = [
      ...messages,
      { role: 'user', content: answerContent }
    ];
    setMessages(updatedMessages);

    try {
      const projectId = localStorage.getItem('projectId');
      if (!projectId) throw new Error('Project ID missing');

      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, messages: updatedMessages })
      });
      if (!res.ok) {
        const errorBody = await res.json();
        console.error("API Error on next question:", errorBody);
        throw new Error('API error on next question');
      }
      
      const nextQuestionData: AIQuestion = await res.json();

      if (nextQuestionData.isComplete) {
        // Pass the final message list to the completion handler
        await handleComplete([...updatedMessages, { role: 'model', content: nextQuestionData.question }]);
      } else {
        setCurrentQuestion(nextQuestionData);
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
      console.log("Attempting to save session...");
      const res = await fetch('/api/qa/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, messages: finalMessages })
      });

      if (!res.ok) {
        const errorBody = await res.json();
        console.error("Failed to save session:", errorBody);
        throw new Error('Failed to save the Q&A session to the database.');
      }

      console.log("Session saved successfully. Proceeding to outline.");
      
      // *** FIX IS HERE ***
      // Transform the final messages into the correct QAData format before calling onComplete.
      const formattedQAData: QAData = finalMessages
        .reduce((acc, msg, i) => {
            if (msg.role === 'user') {
                const questionMsg = finalMessages[i-1];
                if (questionMsg && questionMsg.role === 'model') {
                    acc.push({
                        question: questionMsg.content,
                        answer: msg.content,
                        timestamp: Date.now()
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
                  timestamp: Date.now()
              });
            }
        }
        return acc;
    }, [] as QAData);

  return {
    currentQuestion,
    isLoading,
    handleSend,
    scrollRef,
    history: historyForUI,
    questionCount: historyForUI.length + 1,
  };
}
