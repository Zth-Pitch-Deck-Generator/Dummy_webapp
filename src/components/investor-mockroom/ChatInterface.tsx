import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "model";
  content: string;
};

interface ChatInterfaceProps {
  deckContent: string;
}

export function ChatInterface({ deckContent }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // --- THE FIX: We no longer send the huge `deckContent` on every message ---
      // The backend will rely on the conversation history for context.
      const res = await fetch("/api/investor-mockroom/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages, // Only send the messages
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get a response from the server.");
      }

      const modelMessage: Message = { role: "model", content: data.answer };
      setMessages([...newMessages, modelMessage]);
    } catch (error: any) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        role: "model",
        content: `Sorry, I ran into an error: ${error.message}`,
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6 bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-2xl font-bold text-center text-blue-900 mb-4">Mock Investor Q&A</h3>
      <div className="h-96 overflow-y-auto pr-4 space-y-4 mb-4 border-b pb-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`p-3 rounded-lg max-w-lg ${msg.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"}`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="p-3 rounded-lg bg-gray-200 text-gray-800">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSendMessage()}
          placeholder="Ask a follow-up question..."
          disabled={isLoading}
          className="flex-grow"
        />
        <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}