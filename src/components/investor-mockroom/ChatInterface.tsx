import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils"; // Assuming you have a utility for classnames

type Message = {
  role: "user" | "model";
  content: string;
};

interface ChatInterfaceProps {
  deckContent: string;
}

export function ChatInterface({ deckContent }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      content: "I have analyzed your pitch deck. Feel free to ask me any questions an investor might have."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/investor-mockroom/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, deckContent }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to get a response from the server.");
      }
      setMessages([...newMessages, { role: "model", content: data.answer }]);
    } catch (error: any) {
      setMessages([...newMessages, { role: "model", content: `Sorry, I ran into an error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const Avatar = ({ role }: { role: "user" | "model" }) => (
    <div className={cn("w-8 h-8 flex items-center justify-center rounded-full shadow-inner", 
      role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
    )}>
      {role === "user" ? <User size={16} /> : <Bot size={16} />}
    </div>
  );

  return (
    <div className="mt-8 w-full max-w-3xl mx-auto bg-card p-6 rounded-xl shadow-lg border">
      <h3 className="text-2xl font-bold text-center text-card-foreground mb-4">Ask a Follow-up Question</h3>
      <div className="h-[50vh] overflow-y-auto pr-4 space-y-4 mb-4 border-b pb-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex items-start gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role !== "user" && <Avatar role="model" />}
            <div className={cn("max-w-xl px-4 py-2.5 rounded-xl prose prose-sm", 
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
              )}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
            {msg.role === "user" && <Avatar role="user" />}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 justify-start">
            <Avatar role="model" />
            <div className="max-w-xl px-4 py-2.5 rounded-xl bg-muted flex items-center gap-2 text-muted-foreground">
              <Loader2 className="animate-spin w-4 h-4" />
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form
        className="flex gap-2"
        onSubmit={e => {
          e.preventDefault();
          handleSendMessage();
        }}
        aria-label="Ask a follow-up question"
      >
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="e.g., What is your customer acquisition cost?"
          disabled={isLoading}
          aria-label="Enter your question"
          className="flex-grow"
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
          size="icon"
          className="flex-shrink-0"
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
}