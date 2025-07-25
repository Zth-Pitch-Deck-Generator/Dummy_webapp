import { useState, useRef, useEffect } from 'react';
import { ProjectData, QAData } from '@/pages/Index';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Send, Bot, User, Sparkles, ArrowRight } from 'lucide-react';

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

const InteractiveQA = ({ projectData, onComplete }: InteractiveQAProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. MAKE maxQuestions DYNAMIC
  const getMaxQuestions = (
  decktype: ProjectData['decktype'],
  slideCount: ProjectData['slideCount']                // <── comes from ProjectSetup
) => {
  /*
    Baseline rule:
      questions ≈ 60 % of requested slides (rounded)

    Deck-type adjustment:
      essentials      → -1 question
      matrix          →   0
      complete_deck   → +1 question

    Finally clamp to [5 … 12]
  */
  let q = Math.round(slideCount * 0.9);

  if (decktype === 'essentials')     q -= 1;
  if (decktype === 'complete_deck')  q += 1;

  return Math.min(12, Math.max(5, q));
};

/* compute once at render */
const maxQuestions = getMaxQuestions(projectData.decktype, projectData.slideCount);
const progress     = (questionCount / maxQuestions) * 100;

  // 2. MAKE THE INITIAL QUESTION MORE CONTEXTUAL
  useEffect(() => {
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

    setMessages([{
      id: 'initial',
      type: 'ai',
      content: `Hi! I'm ready to build your "${projectData.decktype}" deck for "${projectData.projectName}". ${introText}\n\nLet's start with the first question: What is the single most important problem your project solves?`,
      timestamp: Date.now(),
    }]);
  }, [projectData]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 3. USE REAL API CALL INSTEAD OF SIMULATION
  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;

    // Part 1: Optimistic UI updates
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: currentInput,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setCurrentInput('');
    setIsLoading(true);

    // Part 2: Real API call
    try {
      const projectId = localStorage.getItem("projectId");
      if (!projectId) {
        alert("Error: Project ID not found. Please start over.");
        setIsLoading(false);
        return;
      }

      const payload = {
        projectId,
        messages: newMessages.map(m => ({ role: m.type, content: m.content })),
      };

      const response = await fetch('http://localhost:3000/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error('API request failed');
      }

      // Part 3: Handle the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const aiResponseId = `ai-${Date.now()}`;
      setMessages(prev => [...prev, { id: aiResponseId, type: 'ai', content: '', timestamp: Date.now() }]);
      setQuestionCount(prev => prev + 1);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        setMessages(prev => prev.map(m => 
          m.id === aiResponseId ? { ...m, content: m.content + chunk } : m
        ));
      }

    } catch (error) {
      console.error("Failed to get AI response:", error);
      // Optional: Add an error message to the chat UI
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    const projectId = localStorage.getItem("projectId");
    if (!projectId) return alert("Project ID is missing!");

    // Tell the backend the session is complete and save the transcript
    await fetch('http://localhost:3000/api/qa/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            projectId,
            messages: messages.map(m => ({ role: m.type, content: m.content }))
        })
    });

    // Format the data for the next step in the UI
    const qaData: QAData = messages
      .filter(m => m.type === 'ai' && !m.content.includes("Perfect! I have all"))
      .map(m => ({
        question: m.content,
        answer: messages.find(msg => msg.type === 'user' && msg.timestamp > m.timestamp)?.content || '',
        timestamp: m.timestamp,
      }));

    onComplete(qaData);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
                    className={`max-w-[80%] p-4 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
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
              <div className="flex gap-2">
                <Input
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your answer here..."
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!currentInput.trim() || isLoading}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
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