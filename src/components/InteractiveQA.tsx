
import { useState, useRef, useEffect } from 'react';
import { ProjectData, QAData } from '@/pages/Index';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarContent, AvatarFallback } from "@/components/ui/avatar";
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

  const maxQuestions = 8;
  const progress = (questionCount / maxQuestions) * 100;

  // Generate AI questions based on project data and previous answers
  const generateAIQuestion = (context: { projectData: ProjectData; previousMessages: Message[] }) => {
    const questions = [
      "What specific problem does your project solve? Can you give me a concrete example?",
      "Who is your target audience? Describe your ideal customer in detail.",
      "What makes your solution unique compared to existing alternatives?",
      "What's your business model? How do you plan to generate revenue?",
      "What evidence or validation do you have that there's demand for your solution?",
      "What are the biggest risks or challenges you foresee, and how will you address them?",
      "What are your key milestones for the next 12-18 months?",
      "If you need funding, how much are you seeking and what will you use it for?",
    ];

    // Simple logic to select next question
    return questions[context.previousMessages.filter(m => m.type === 'ai').length] || 
           "Is there anything else important about your project that we should include in your pitch deck?";
  };

  // Initialize with first AI question
  useEffect(() => {
    const initialQuestion = `Hi! I'm excited to help you build a compelling pitch deck for "${projectData.projectName}". Let's start with some strategic questions to make sure we cover all the important aspects.\n\n${generateAIQuestion({ projectData, previousMessages: [] })}`;
    
    setMessages([{
      id: 'initial',
      type: 'ai',
      content: initialQuestion,
      timestamp: Date.now(),
    }]);
  }, [projectData]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: currentInput,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsLoading(true);
    setQuestionCount(prev => prev + 1);

    // Simulate AI response delay
    setTimeout(() => {
      const newMessages = [...messages, userMessage];
      
      if (questionCount >= maxQuestions - 1) {
        // Final message
        const finalMessage: Message = {
          id: `ai-final`,
          type: 'ai',
          content: "Perfect! I have all the information I need to create your pitch deck. You've provided excellent insights that will help create a compelling presentation. Let's move on to preview your deck!",
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, finalMessage]);
      } else {
        // Generate next question
        const nextQuestion = generateAIQuestion({ projectData, previousMessages: newMessages });
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: `Great answer! That's really helpful context.\n\n${nextQuestion}`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, aiMessage]);
      }
      
      setIsLoading(false);
    }, 1500);
  };

  const handleComplete = () => {
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
    if (e.key === 'Enter' && !e.shiftKey) {
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
                      <AvatarContent>
                        <Bot className="w-4 h-4 text-white" />
                      </AvatarContent>
                      <AvatarFallback>AI</AvatarFallback>
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
                      <AvatarContent>
                        <User className="w-4 h-4 text-white" />
                      </AvatarContent>
                      <AvatarFallback>You</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500">
                    <AvatarContent>
                      <Bot className="w-4 h-4 text-white" />
                    </AvatarContent>
                    <AvatarFallback>AI</AvatarFallback>
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
