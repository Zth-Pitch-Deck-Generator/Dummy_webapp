import { useState, useRef, useEffect } from 'react';
import { ProjectData, QAData } from '@/pages/Index';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Send, Bot, User, Sparkles, ArrowRight } from 'lucide-react';

// --- UPDATED: New types for AI messages ---
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

const InteractiveQA = ({ projectData, onComplete }: InteractiveQAProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showOther, setShowOther] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Utility functions and setup ---

  const autoSlideCount = (
    decktype: 'essentials' | 'matrix' | 'complete_deck',
    revenue: 'pre-revenue' | 'revenue'
  ) => {
    switch (decktype) {
      case 'essentials': return revenue === 'revenue' ? 8 : 6;
      case 'matrix': return revenue === 'revenue' ? 10 : 8;
      case 'complete_deck': return revenue === 'revenue' ? 13 : 12;
      default: return 10;
    }
  };

  const resolveSlideCount = (
    mode: 'manual' | 'ai',
    raw: number,
    decktype: 'essentials' | 'matrix' | 'complete_deck',
    revenue: 'pre-revenue' | 'revenue'
  ) => (mode === 'manual' ? raw : autoSlideCount(decktype, revenue));

  const getMaxQuestions = (
    decktype: ProjectData['decktype'],
    slide_count: number
  ) => {
    let q = Math.round(slide_count * 0.9);
    if (decktype === 'essentials') q -= 1;
    if (decktype === 'complete_deck') q += 1;
    return Math.min(12, Math.max(5, q));
  };

  const effectiveSlideCount = resolveSlideCount(
    projectData.slide_mode,
    projectData.slide_count,
    projectData.decktype,
    projectData.revenue
  );

  const maxQuestions = getMaxQuestions(
    projectData.decktype,
    effectiveSlideCount
  );

  const progress = (questionCount / maxQuestions) * 100;

  // --- Modified: Initial greeting + first question fetch ---
  useEffect(() => {
    // Only set the greeting; let the backend provide the first question (of AI JSON shape) after user responds
    let introText = '';
    switch (projectData.decktype) {
      case 'essentials':
        introText = "We'll focus on the core narrative of your business.";
        break;
      case 'matrix':
        introText = "We'll be diving deep into the key metrics and competitive landscape.";
        break;
      case 'complete_deck':
        introText = "We'll cover both your story and the data that backs it up for a comprehensive deck.";
        break;
    }
    setMessages([
      {
        id: 'greeting',
        type: 'ai',
        question: `Hi! I'm ready to build your "${projectData.decktype}" deck for "${projectData.projectName}". ${introText}\nLet's get started!`,
        answerType: "free_text",
        timestamp: Date.now(),
      }
    ]);
    setQuestionCount(0);
  }, [projectData]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // --- Helper: Parse streamed AI JSON response ---
function parseAIResponse(raw: string): AIMessage {
  try {

const withoutFences = raw
  .replace(/```json\s*/gi, '')
  .replace(/```/g, '')
  .trim();

    // 2. extract the first {...} block
    const firstCurly = withoutFences.indexOf('{');
    const lastCurly  = withoutFences.lastIndexOf('}');
    if (firstCurly === -1 || lastCurly === -1) {
      throw new Error('No JSON found');
    }

    const jsonString = withoutFences.slice(firstCurly, lastCurly + 1);
    const obj = JSON.parse(jsonString);

    return {
      id: `ai-${Date.now()}`,
      type: 'ai',
      question: obj.question,
      answerType: obj.type as 'free_text' | 'multiple_choice',
      choices: obj.choices,
      timestamp: Date.now()
    };
  } catch (err) {
    console.error('✗ Could not parse AI JSON → falling back to free-text', err);
    return {
      id: `ai-${Date.now()}`,
      type: 'ai',
      question: raw,
      answerType: 'free_text',
      timestamp: Date.now()
    };
  }
}


  // --- UPDATED: Send message (supports both text and choice) ---
  const handleSendMessage = async (choiceOverride?: string) => {
    // Find the latest AI question
    const aiMessages = messages.filter(m => m.type === 'ai') as AIMessage[];
    const latestAI = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1] : undefined;

    let toSend = choiceOverride ?? currentInput.trim();
    if (!toSend && !showOther) return;

    // Add user message
    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        type: 'user',
        content: toSend,
        timestamp: Date.now(),
      }
    ]);
    setCurrentInput('');
    setSelectedChoice(null);
    setShowOther(false);
    setIsLoading(true);

    try {
      const projectId = localStorage.getItem("projectId");
      if (!projectId) {
        alert("Error: Project ID not found. Please start over.");
        setIsLoading(false);
        return;
      }
      // Prepare chat history as per backend requirement
      const payload = {
        projectId,
        messages: [...messages, {
          id: `user-${Date.now()}`,
          type: 'user',
          content: toSend,
          timestamp: Date.now()
        }].filter(m => m.type === 'user' || (m.type === 'ai' && (m as AIMessage).question)).map(m =>
          m.type === 'user'
            ? { role: 'user', content: m.content }
            : { role: 'ai', content: (m as AIMessage).question }
        ),
      };

      const response = await fetch('http://localhost:3000/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error('API request failed');
      }

      // Read full stream & parse as JSON
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let resultText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resultText += decoder.decode(value);
      }

      // Final AI question (parsed as JSON)
      const aiMsg = parseAIResponse(resultText);

      setMessages(prev => [...prev, aiMsg]);
      setQuestionCount(prev => prev + 1);

    } catch (error) {
      console.error("Failed to get AI response:", error);
      // Optionally, show error message in chat
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handle session completion as before ---
  const handleComplete = async () => {
    const projectId = localStorage.getItem("projectId");
    if (!projectId) return alert("Project ID is missing!");
    await fetch('http://localhost:3000/api/qa/session/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        messages: messages.map(m =>
          m.type === 'user'
            ? { role: m.type, content: m.content }
            : { role: m.type, content: (m as AIMessage).question }
        )
      })
    });
    const qaData: QAData = [];
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].type === 'ai') {
        qaData.push({
          question: (messages[i] as AIMessage).question,
          answer: messages[i + 1]?.type === 'user' ? (messages[i + 1] as UserMessage).content : '',
          timestamp: messages[i].timestamp,
        });
      }
    }
    onComplete(qaData);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --- NEW: Render answer area dynamically ---
  function renderInputArea() {
    // Find the latest AI question message (skip greeting)
    const aiMessages = messages.filter(m => m.type === 'ai') as AIMessage[];
    const latestAI = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1] : undefined;
    if (!latestAI) return null;

    // multiple_choice: show buttons
    if (latestAI.answerType === 'multiple_choice' && Array.isArray(latestAI.choices)) {
      return (
        <div className="flex flex-wrap gap-2 items-center">
          {latestAI.choices.map(choice =>
            // If user picks "Other", show text input
            choice.toLowerCase() === "other" ? (
              <Button
                key={choice}
                variant={showOther ? "default" : "outline"}
                onClick={() => setShowOther(!showOther)}
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
                onKeyPress={handleKeyPress}
                placeholder="Enter your answer..."
                disabled={isLoading}
                className="min-w-[180px]"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!currentInput.trim() || isLoading}
              ><Send className="w-4 h-4" /></Button>
            </>
          )}
        </div>
      );
    }
    // default: free_text
    return (
      <div className="flex gap-2">
        <Input
          value={currentInput}
          onChange={e => setCurrentInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your answer here..."
          disabled={isLoading}
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
  }

  // --- UPDATED: Render messages: AI using .question; User as .content ---
  function renderMessageText(m: Message) {
    if (m.type === 'user') return m.content;
    return (m as AIMessage).question;
  }

  // --- Main JSX ---
  return (
    <div className="max-w-4xl mx-auto">
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
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type === 'ai' && (
                    <Avatar className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500">
                      <Bot className="w-4 h-4 text-white p-1" />
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[80%] p-4 rounded-lg ${message.type === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                      }`}
                  >
                    <p className="whitespace-pre-wrap">{renderMessageText(message)}</p>
                  </div>
                  {message.type === 'user' && (
                    <Avatar className="w-8 h-8 bg-gray-600">
                      <User className="w-4 h-4 text-white p-1" />
                    </Avatar>
                  )}
                </div>
              ))}
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
          <div className="border-t p-4">
            {questionCount >= maxQuestions ? (
              <div className="flex justify-center">
                <Button
                  onClick={handleComplete}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  Preview Your Deck
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              renderInputArea()
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InteractiveQA;
