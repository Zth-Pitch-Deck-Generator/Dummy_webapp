import { useEffect, useRef, useState } from 'react';
import { QAData, ProjectData } from '@/pages/Index';

// Define the shape of a single message for the API
interface ApiMessage {
  // --- FIX 1: The 'assistant' role is removed. ---
  // The 'model' role is for responses from the Gemini AI.
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
    // --- FIX 2: The initial message from the AI now uses the 'model' role. ---
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
            // Log the server's response to see the exact validation error
            const errorBody = await res.json();
            console.error("API Error on first question:", errorBody);
            throw new Error('API error on first question');
        }
        
        const questionData: AIQuestion = await res.json();
        setCurrentQuestion(questionData);

        // --- FIX 3: Start the message history using the correct 'model' role. ---
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
    // We update the state immediately for a responsive UI, but will add the AI's response later
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
        await handleComplete(updatedMessages);
      } else {
        setCurrentQuestion(nextQuestionData);
        // --- FIX 4: Add the AI's new question to the history with the correct 'model' role. ---
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
      onComplete(finalMessages as unknown as QAData);

    } catch (err) {
      console.error(err);
      alert("There was an error saving your session. Please try again.");
    }
  };
  
  // This part for the UI can be simplified or adjusted as needed
  const historyForUI: QAData = messages
    .reduce((acc, msg, i) => {
        if (msg.role === 'user') {
            const questionMsg = messages[i-1];
            acc.push({
                question: questionMsg ? questionMsg.content : 'Initial context',
                answer: msg.content,
                timestamp: Date.now()
            });
        }
        return acc;
    }, [] as QAData);

  return {
    currentQuestion,
    isLoading,
    handleSend,
    scrollRef,
    history: historyForUI,
    questionCount: historyForUI.length,
  };
}