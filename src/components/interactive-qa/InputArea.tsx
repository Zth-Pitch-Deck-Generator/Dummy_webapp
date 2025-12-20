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
  onSend: (content: string | string[]) => void;
}

const InputArea = ({ lastAI, isLoading, onSend }: Props) => {
  const [currentInput, setCurrentInput] = useState('');
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [showOther, setShowOther] = useState(false);

  if (!lastAI) return null;

  const handleChoiceClick = (choice: string) => {
    if (choice.toLowerCase() === 'other') {
      setShowOther(v => !v);
      // Remove "Other" from selections if it's there
      setSelectedChoices(prev => prev.filter(c => c.toLowerCase() !== 'other'));
    } else {
      setSelectedChoices(prev =>
        prev.includes(choice)
          ? prev.filter(c => c !== choice)
          : [...prev, choice]
      );
    }
  };

  const handleSubmitMultipleChoice = () => {
    const finalChoices = [...selectedChoices];
    if (showOther && currentInput.trim()) {
      finalChoices.push(currentInput.trim());
    }
    if (finalChoices.length > 0) {
      onSend(finalChoices);
      setSelectedChoices([]);
      setCurrentInput('');
      setShowOther(false);
    }
  };

  /* multiple-choice */
  if (lastAI.answerType === 'multiple_choice' && lastAI.choices) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2 items-center">
          {lastAI.choices.map(choice => (
            <Button
              key={choice}
              variant={selectedChoices.includes(choice) || (choice.toLowerCase() === 'other' && showOther) ? 'default' : 'outline'}
              onClick={() => handleChoiceClick(choice)}
              disabled={isLoading}
            >
              {choice}
            </Button>
          ))}
        </div>

        {showOther && (
          <div className="flex gap-2 items-center">
            <Input
              value={currentInput}
              onChange={e => setCurrentInput(e.target.value)}
              placeholder="Enter your answer…"
              disabled={isLoading}
              className="min-w-[180px]"
            />
          </div>
        )}
        <Button onClick={handleSubmitMultipleChoice} disabled={selectedChoices.length === 0 && !currentInput.trim() || isLoading}>
          Submit
        </Button>
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