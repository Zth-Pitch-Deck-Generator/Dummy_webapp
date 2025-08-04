// src/features/interactive-qa/InputArea.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TextareaAutosize from 'react-textarea-autosize';
import { Send } from 'lucide-react';
import type { AIMessage } from './types.ts';

interface Props {
  lastAI: AIMessage | undefined;
  isLoading: boolean;
  onSend: (content: string) => void;
}

const InputArea = ({ lastAI, isLoading, onSend }: Props) => {
  const [currentInput, setCurrentInput] = useState('');
  const [selectedChoice, setSelectedChoice] = useState<string|null>(null);
  const [showOther, setShowOther] = useState(false);

  if (!lastAI) return null;

  /* multiple-choice */
  if (lastAI.answerType === 'multiple_choice' && lastAI.choices) {
    return (
      <div className="flex flex-wrap gap-2 items-center">
        {lastAI.choices.map(choice =>
          choice.toLowerCase() === 'other' ? (
            <Button
              key={choice}
              variant={showOther ? 'default' : 'outline'}
              onClick={() => setShowOther(v => !v)}
              disabled={isLoading}
            >
              Other
            </Button>
          ) : (
            <Button
              key={choice}
              variant={selectedChoice === choice ? 'default' : 'outline'}
              onClick={() => { setSelectedChoice(choice); onSend(choice); }}
              disabled={isLoading}
            >
              {choice}
            </Button>
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
              onKeyPress={e => e.key === 'Enter' && !isLoading && onSend(currentInput)}
            />
            <Button onClick={() => onSend(currentInput)} disabled={!currentInput.trim() || isLoading}>
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
        maxRows={6}
        value={currentInput}
        onChange={e => setCurrentInput(e.target.value)}
        placeholder="Type your answer here…"
        disabled={isLoading}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
            e.preventDefault();
            onSend(currentInput);
            setCurrentInput('');
          }
        }}
        className="
          flex-1 resize-none rounded-md border px-3 py-2 text-sm
          focus:ring-2 focus:ring-purple-500 focus:border-purple-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
        "
      />
      <Button
        onClick={() => { onSend(currentInput); setCurrentInput(''); }}
        disabled={!currentInput.trim() || isLoading}
        className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default InputArea;
