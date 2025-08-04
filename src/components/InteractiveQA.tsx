import { useState, useRef, useEffect } from 'react';
import { ProjectData, QAData } from '@/pages/Index';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Send, Bot, User, Sparkles, ArrowRight } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';

/* ---------- types ---------- */
type AIMessage = {
  id: string;
  type: 'ai';
  question: string;
  answerType: 'free_text' | 'multiple_choice';
  choices?: string[];
  timestamp: number;
};

type UserMessage = {
  id: string;
  type: 'user';
  content: string;
  timestamp: number;
};

type Message = AIMessage | UserMessage;

interface InteractiveQAProps {
  projectData: ProjectData;
  onComplete: (qaData: QAData) => void;
}

/* ---------- constants ---------- */
const questionsByDeck = { essentials: 8, matrix: 10, complete_deck: 12 } as const;

/* =================================================================== */
const InteractiveQA = ({ projectData, onComplete }: InteractiveQAProps) => {
  /* -------- state -------- */
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showOther, setShowOther] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const maxQuestions = questionsByDeck[projectData.decktype];
  const progress = (questionCount / maxQuestions) * 100;

  /* -------- initial greeting + Q1 -------- */
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

  /* -------- auto-scroll -------- */
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  /* -------- helpers -------- */
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

  /* -------- send message -------- */
  const handleSendMessage = async (choiceOverride?: string) => {
    const content = choiceOverride ?? currentInput.trim();

    /* garbage check */
    if (/^(idk|n\/?a|🤷|[\s\?]{0,3})$/i.test(content))
      return alert("Let’s stay focused so I can help you generate a great pitch deck! Please answer the question.");

    if (!content && !showOther) return;

    const userMsg: UserMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setCurrentInput('');
    setSelectedChoice(null);
    setShowOther(false);
    setIsLoading(true);

    try {
      const projectId = localStorage.getItem("projectId");
      if (!projectId) throw new Error("Project ID missing");

const payload = {
  projectId,
  messages: [...messages, userMsg]             // ⬅️ keep every turn
    .map(m =>
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
      if (!res.ok || !res.body) throw new Error("API error");

      /* read stream */
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

  /* -------- complete session -------- */
  const handleComplete = async () => {
    const projectId = localStorage.getItem("projectId");
    if (!projectId) return alert("Project ID missing");

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

  /* -------- input area renderer -------- */
  const renderInputArea = () => {
    const aiMsgs = messages.filter(m => m.type === 'ai') as AIMessage[];
    const latest = aiMsgs[aiMsgs.length - 1];
    if (!latest) return null;

    /* multiple-choice */
    if (latest.answerType === 'multiple_choice' && latest.choices) {
      return (
        <div className="flex flex-wrap gap-2 items-center">
          {latest.choices.map(choice =>
            choice.toLowerCase() === 'other' ? (
              <Button
                key={choice}
                variant={showOther ? "default" : "outline"}
                onClick={() => setShowOther(v => !v)}
                disabled={isLoading}
              >Other</Button>
            ) : (
              <Button
                key={choice}
                variant={selectedChoice === choice ? "default" : "outline"}
                onClick={() => { setSelectedChoice(choice); handleSendMessage(choice); }}
                disabled={isLoading}
              >{choice}</Button>
            )
          )}

          {showOther && (
            <>
              <Input
                value={currentInput}
                onChange={e => setCurrentInput(e.target.value)}
                placeholder="Enter your answer…"
                disabled={isLoading}
                className="min-w-[180px]"
                onKeyPress={e => e.key === 'Enter' && !isLoading && handleSendMessage()}
              />
              <Button onClick={() => handleSendMessage()} disabled={!currentInput.trim() || isLoading}>
                <Send className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      );
    }

    /* free-text */
    return (
      <div className="flex gap-2">
    <TextareaAutosize
      minRows={1}
      maxRows={6}// stop growing after 6 lines
      value={currentInput}
      onChange={e => setCurrentInput(e.target.value)}
      placeholder="Type your answer here…"
      disabled={isLoading}
      onKeyDown={e => {
        if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
          e.preventDefault();// allow Shift+Enter for newline
          handleSendMessage();
        }
      }}
      className="
        flex-1 resize-none rounded-md border px-3 py-2 text-sm
        focus:ring-2 focus:ring-purple-500 focus:border-purple-500
        disabled:bg-gray-100 disabled:cursor-not-allowed
      "
    />
    <Button
      onClick={() => handleSendMessage()}
      disabled={!currentInput.trim() || isLoading}
      className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
    >
      <Send className="w-4 h-4" />
    </Button>
  </div>
);
  };

  /* ================================================================= */
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
            AI Assistant
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 p-0 flex flex-col">
          {/* messages */}
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.type === 'ai' && (
                    <Avatar className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500">
                      <Bot className="w-4 h-4 text-white p-1" />
                    </Avatar>
                  )}
                  <div className={`max-w-[80%] p-4 rounded-lg ${m.type === 'user'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'}`}>
                    <p className="whitespace-pre-wrap">
                      {m.type === 'user' ? m.content : (m as AIMessage).question}
                    </p>
                  </div>
                  {m.type === 'user' && (
                    <Avatar className="w-8 h-8 bg-gray-600">
                      <User className="w-4 h-4 text-white p-1" />
                    </Avatar>
                  )}
                </div>
              ))}

              {/* typing dots */}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500">
                    <Bot className="w-4 h-4 text-white p-1" />
                  </Avatar>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* footer input */}
          <div className="border-t p-4">
            {questionCount >= maxQuestions ? (
              <div className="flex justify-center">
                <Button
                  onClick={handleComplete}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  Preview Your Deck <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : renderInputArea()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InteractiveQA;
