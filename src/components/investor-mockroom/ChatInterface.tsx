import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";

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

  return (
    <div className="mt-10">
      <h3 className="text-xl font-semibold mb-6 text-blue-700">Ask a Follow-up Question</h3>
      <ScrollArea className="h-72 border border-blue-200 rounded-xl bg-white p-4 mb-4 shadow">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex items-end mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-center gap-2`}>
              {msg.role === "model" && (
                <span className="inline-flex w-8 h-8 bg-blue-200 text-blue-700 rounded-full items-center justify-center font-bold">A</span>
              )}
              <span className={`inline-block px-4 py-2 rounded-2xl shadow-sm ${msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 text-blue-900"
                }`}>
                {msg.content}
              </span>
              {msg.role === "user" && (
                <span className="inline-flex w-8 h-8 bg-blue-600 text-white rounded-full items-center justify-center font-bold">U</span>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <span className="inline-block px-4 py-2 rounded-2xl shadow-sm bg-blue-100 text-blue-900 animate-pulse">Loading...</span>
          </div>
        )}
      </ScrollArea>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your pitch..."
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          className="border-blue-300 rounded-full bg-blue-50 px-4 py-2 text-blue-800"
        />
        <Button
          onClick={handleSendMessage}
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-800 text-white rounded-full px-6 py-2 flex items-center"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
