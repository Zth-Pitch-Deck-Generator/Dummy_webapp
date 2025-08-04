// src/features/interactive-qa/useQASession.ts
import { useEffect, useRef, useState } from 'react';
import type {
  AIMessage, UserMessage, InteractiveQAProps, Message, QAData
} from './types.ts';

const questionsByDeck = { essentials: 8, matrix: 10, complete_deck: 12 } as const;

export default function useQASession(
  projectData: InteractiveQAProps['projectData'],
  onComplete: InteractiveQAProps['onComplete']
) {
  /* state */
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');          // for InputArea
  const [selectedChoice, setSelectedChoice] = useState<string|null>(null);
  const [showOther, setShowOther] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const maxQuestions = questionsByDeck[projectData.decktype];
  const progress = (questionCount / maxQuestions) * 100;

  /* greet + first question */
  useEffect(() => {
    const firstMsg =
      `Hi there! Let’s understand your idea better to help us build your "${projectData.decktype}" pitch deck.\n` +
      `What problem does your company solve?`;
    setMessages([{
      id: 'greeting',
      type: 'ai',
      question: firstMsg,
      answerType: 'free_text',
      timestamp: Date.now()
    }]);
    setQuestionCount(0);
  }, [projectData]);

  /* auto-scroll */
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  /* helpers */
  function parseAIResponse(raw: string): AIMessage {
    try {
      const cleaned = raw.replace(/``````/gi, '').trim();
      const obj = JSON.parse(cleaned);
      return {
        id: `ai-${Date.now()}`,
        type: 'ai',
        question: obj.question,
        answerType: obj.type,
        choices: obj.choices,
        timestamp: Date.now()
      };
    } catch {
      return {
        id: `ai-${Date.now()}`,
        type: 'ai',
        question: raw,
        answerType: 'free_text',
        timestamp: Date.now()
      };
    }
  }

  /* send message */
  const handleSend = async (content: string) => {
    if (!content.trim()) return;
    const userMsg: UserMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const projectId = localStorage.getItem('projectId');
      if (!projectId) throw new Error('Project ID missing');

      const payload = {
        projectId,
        messages: [...messages, userMsg].map(m =>
          m.type === 'user'
            ? { role: 'user', content: m.content }
            : { role: 'ai', content: (m as AIMessage).question }
        )
      };

      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok || !res.body) throw new Error('API error');

      /* stream */
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let txt = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        txt += decoder.decode(value);
      }

      const aiMsg = parseAIResponse(txt);
      setMessages(prev => [...prev, aiMsg]);
      setQuestionCount(c => c + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  /* complete */
  const handleComplete = async () => {
    const projectId = localStorage.getItem('projectId');
    if (!projectId) return alert('Project ID missing');

    await fetch('/api/qa/session/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        messages: messages.map(m =>
          m.type === 'user'
            ? { role: 'user', content: m.content }
            : { role: 'ai', content: (m as AIMessage).question }
        )
      })
    });

    /* build QAData */
    const qa: QAData = [];
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].type === 'ai') {
        qa.push({
          question: (messages[i] as AIMessage).question,
          answer: messages[i + 1]?.type === 'user'
            ? (messages[i + 1] as UserMessage).content
            : '',
          timestamp: messages[i].timestamp
        });
      }
    }
    onComplete(qa);
  };

  const aiMsgs = messages.filter(m => m.type === 'ai') as AIMessage[];
  const lastAI = aiMsgs[aiMsgs.length - 1];

  return {
    /* state exposed to UI */
    messages, lastAI,
    questionCount, maxQuestions, progress,
    isLoading,

    /* handlers */
    handleSend,
    handleComplete,

    /* refs and helpers the UI might need */
    scrollRef,
    currentInput, setCurrentInput,
    selectedChoice, setSelectedChoice,
    showOther, setShowOther
  };
}
