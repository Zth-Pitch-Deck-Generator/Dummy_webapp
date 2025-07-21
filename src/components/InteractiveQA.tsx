/* ------------------------------------------------------------------
   InteractiveQA.tsx  –  Chat component that consumes SSE stream
   ------------------------------------------------------------------ */
import { useState, useRef, useEffect } from 'react';
import { ProjectData, QAData } from '@/pages/Index';

import { Button }  from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input }   from '@/components/ui/input';
import { Badge }   from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar }  from '@/components/ui/avatar';
import { Send, Bot, User, Sparkles, ArrowRight } from 'lucide-react';

/* ---------- props & helpers ------------------------------------ */
interface InteractiveQAProps {
  projectData: ProjectData;
  onComplete: (qaData: QAData) => void;
}

interface Message {
  id: string;
  type: 'ai' | 'user';
  content: string;
  timestamp: number;
}

/* ---------- component ------------------------------------------ */
const InteractiveQA = ({ projectData, onComplete }: InteractiveQAProps) => {
  /* state */
  const [messages, setMessages]   = useState<Message[]>([]);
  const [current,  setCurrent]    = useState('');
  const [loading,  setLoading]    = useState(false);
  const [count,    setCount]      = useState(0);
  const [error,    setError]      = useState<string|null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* max questions by deck type */
  const max = {
    essentials:     7,
    matrix:         10,
    complete_deck:  12
  }[projectData.decktype] || 8;

  /* intro message (once) */
  useEffect(() => {
    const intro =
      projectData.decktype === 'essentials'
        ? "We'll focus on your core narrative."
        : projectData.decktype === 'matrix'
        ? "We'll dig into the key metrics and competitive landscape."
        : "We'll combine story and data for a complete deck.";

    setMessages([{
      id: 'ai-hello',
      type: 'ai',
      content:
        `Hi! I'm ready to build your "${projectData.decktype}" deck. ${intro}\n\n` +
        `Let's start: What is the most important problem your project solves?`,
      timestamp: Date.now()
    }]);
  }, [projectData]);

  /* auto-scroll on new message */
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  /* ---------- send/receive  (SSE version) ---------------------- */
  const handleSend = async () => {
    if (!current.trim() || loading) return;

    const userMsg: Message = {
      id:        `u-${Date.now()}`,
      type:      'user',
      content:   current,
      timestamp: Date.now()
    };
    const chat = [...messages, userMsg];
    setMessages(chat);
    setCurrent('');
    setLoading(true);
    setError(null);

    try {
      const projectId = localStorage.getItem('projectId');
      if (!projectId) throw new Error('projectId missing in localStorage');

      const res = await fetch('http://localhost:3000/api/qa', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          projectId,
          messages: chat.map(m => ({ role: m.type, content: m.content }))
        })
      });

      /* handle HTTP error quickly */
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'API error');
      }

      /* ---------- read the SSE stream ---------- */
      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      const aiId    = `ai-${Date.now()}`;

      /* create empty AI bubble first */
      setMessages(prev => [
        ...prev,
        { id: aiId, type: 'ai', content: '', timestamp: Date.now() }
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setMessages(prev =>
          prev.map(m =>
            m.id === aiId ? { ...m, content: m.content + chunk } : m
          )
        );
      }

      setCount(c => c + 1);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- finish session ---------------------------------- */
  const finish = async () => {
    const projectId = localStorage.getItem('projectId');
    if (!projectId) {
      setError('projectId missing');
      return;
    }

    await fetch('http://localhost:3000/api/qa/session/complete', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        projectId,
        messages: messages.map(m => ({ role: m.type, content: m.content }))
      })
    });

    const qaData: QAData = messages
      .filter(m => m.type === 'ai')
      .map(m => ({
        question : m.content,
        answer   : messages.find(u => u.type === 'user' && u.timestamp > m.timestamp)?.content || '',
        timestamp: m.timestamp
      }));

    onComplete(qaData);
  };

  /* ---------- render ------------------------------------------ */
  return (
    <div className="max-w-4xl mx-auto">
      {/* header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Interactive Q&A</h1>
          <Badge variant="outline">
            Question {Math.min(count + 1, max)} / {max}
          </Badge>
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div
            className="h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
            style={{ width: `${(count / max) * 100}%` }}
          />
        </div>
        {error && (
          <p className="mt-3 p-2 bg-red-100 text-red-700 rounded">{error}</p>
        )}
      </div>

      {/* chat card */}
      <Card className="h-[600px] flex flex-col shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Assistant
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 p-0 flex flex-col">
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map(m => (
                <div key={m.id}
                     className={`flex gap-3 ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.type === 'ai' && (
                    <Avatar className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500">
                      <Bot className="w-4 h-4 text-white p-1" />
                    </Avatar>
                  )}
                  <div className={`
                        max-w-[80%] p-4 rounded-lg whitespace-pre-wrap
                        ${m.type === 'user'
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'}
                      `}>
                    {m.content}
                  </div>
                  {m.type === 'user' && (
                    <Avatar className="w-8 h-8 bg-gray-600">
                      <User className="w-4 h-4 text-white p-1" />
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* input bar */}
          <div className="border-t p-4">
            {count >= max ? (
              <div className="flex justify-center">
                <Button onClick={finish} disabled={loading}>
                  Preview Your Deck
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={current}
                  onChange={e => setCurrent(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type your answer..."
                  disabled={loading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!current.trim() || loading}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InteractiveQA;
