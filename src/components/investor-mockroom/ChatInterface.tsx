import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Message {
  role: "user" | "model";
  content: string;
}

interface ChatInterfaceProps {
  deckContent: string;
}

export function ChatInterface({ deckContent }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Ref for scrolling to start of latest AI message
  const aiResponseRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: input }
    ];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/investor-mockroom/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckContent, messages: newMessages }),
      });
      const data = await res.json();
      setMessages([
        ...newMessages,
        { role: "model", content: data.answer }
      ]);
    } catch (error) {
      setMessages([
        ...newMessages,
        { role: "model", content: "Sorry, I encountered an error." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  function parseToPoints(text: string): string[] {
    text = text.trim();
    // Remove "User:", "AI:", and repeated chat labels if they sneak in
    text = text.replace(/^(User:|AI:)/gm, "");
    // Split at numbered points: "1. "... "2. "...
    // If no numbers found, fallback to splitting by bullets/dashes/asterisks
    let points = text.split(/\n?\d+\.\s/).map(str => str.trim()).filter(Boolean);
    if (points.length <= 1) {
      // fallback for pure bullet text
      points = text.split(/\n[\-\*]\s/).map(str => str.trim()).filter(Boolean);
    }
    return points;
  }

  // Scroll to start of latest AI reply every time a model reply is added
  useEffect(() => {
    if (!isLoading && messages.length > 0 && messages[messages.length - 1].role === 'model') {
      aiResponseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [messages, isLoading]);

  return (
    <TooltipProvider>
      <div className="mt-10 w-full max-w-2xl mx-auto">
        <h3 className="text-2xl font-bold mb-6 text-blue-700 text-center">Ask a Follow-up Question</h3>
        <ScrollArea className="h-80 border border-blue-200 rounded-2xl bg-gradient-to-t from-blue-50 to-white p-4 mb-4 shadow-inner">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-end mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              ref={msg.role === "model" && idx === messages.length - 1 ? aiResponseRef : undefined}
            >
              <div className="flex items-center gap-2">
                {msg.role === "model" && (
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="inline-flex flex-shrink-0 w-8 h-8 bg-blue-200 text-blue-700 rounded-full items-center justify-center font-bold">S</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Smart Engine Deck response</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <span className={`inline-block px-5 py-3 rounded-2xl shadow font-medium transition-all duration-200 ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-900"
                  }`}>
                  {msg.role === "model"
                    ? (
                      <ul className="list-disc ml-5 space-y-1 text-left">
                        {parseToPoints(msg.content).map((point, pi) => (
                          <li key={pi}>{point}</li>
                        ))}
                      </ul>
                    )
                    : msg.content
                  }
                </span>
                {msg.role === "user" && (
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="inline-flex flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full items-center justify-center font-bold shadow">U</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Your follow up question</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <span className="inline-block px-5 py-3 rounded-2xl shadow bg-blue-100 text-blue-900 animate-pulse">Loading...</span>
            </div>
          )}
        </ScrollArea>
        <form
          className="flex gap-3 items-center"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your pitch..."
            className="border-blue-300 rounded-full bg-blue-50 px-5 py-3 text-blue-800 w-full shadow"
            aria-label="Ask anything about your pitch"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-800 text-white rounded-full px-7 py-3 shadow flex items-center"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </TooltipProvider>
  );
}
