// src/features/interactive-qa/ChatWindow.tsx
import { Bot, User } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { AIMessage, Message } from './types.ts';

interface Props {
  messages: Message[];
  isLoading: boolean;
}

const ChatWindow = ({ messages, isLoading }: Props) => (
  <ScrollArea className="flex-1 p-6">
    <div className="space-y-4">
      {messages.map(m => (
        <div key={m.id} className={`flex gap-3 ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
          {m.type === 'model' && (
            <Avatar className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500">
              <Bot className="w-4 h-4 text-white p-1" />
            </Avatar>
          )}
          <div className={`max-w-[80%] p-4 rounded-lg ${
            m.type === 'user'
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}>
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
);

export default ChatWindow;
