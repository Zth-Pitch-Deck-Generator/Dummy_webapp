// src/components/interactive-qa/InputArea.tsx
import { useState, useEffect } from 'react';
import { QAQuestion, QAAnswer } from './types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from 'lucide-react';

interface InputAreaProps {
  question: QAQuestion;
  onSubmit: (answer: QAAnswer) => void;
  onBack: () => void;
  canGoBack: boolean;
  previousAnswer: QAAnswer | undefined;
}

const InputArea = ({ question, onSubmit, onBack, canGoBack, previousAnswer }: InputAreaProps) => {
  const [textAnswer, setTextAnswer] = useState('');
  const [choiceAnswer, setChoiceAnswer] = useState('');
  const [multiChoiceAnswer, setMultiChoiceAnswer] = useState<string[]>([]);

  useEffect(() => {
    // When the question changes, populate with the previous answer
    switch(question.type) {
      case 'text':
        setTextAnswer(previousAnswer as string || '');
        break;
      case 'single-choice':
        setChoiceAnswer(previousAnswer as string || '');
        break;
      case 'multiple-choice':
        setMultiChoiceAnswer(previousAnswer as string[] || []);
        break;
    }
  }, [question, previousAnswer]);

  const handleSubmit = () => {
    switch (question.type) {
      case 'text':
        if (textAnswer.trim()) onSubmit(textAnswer.trim());
        break;
      case 'single-choice':
        if (choiceAnswer) onSubmit(choiceAnswer);
        break;
      case 'multiple-choice':
        if (multiChoiceAnswer.length > 0) onSubmit(multiChoiceAnswer);
        break;
    }
  };

  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <Textarea
            placeholder={question.placeholder || 'Type your answer...'}
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            className="flex-grow"
          />
        );
      case 'single-choice':
        return (
            <RadioGroup value={choiceAnswer} onValueChange={setChoiceAnswer} className="space-y-2">
                {question.options?.map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={option.value} />
                        <Label htmlFor={option.value}>{option.label}</Label>
                    </div>
                ))}
            </RadioGroup>
        );
      case 'multiple-choice':
         return (
             <div className="space-y-2">
                {question.options?.map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                            id={option.value}
                            checked={multiChoiceAnswer.includes(option.value)}
                            onCheckedChange={(checked) => {
                                setMultiChoiceAnswer(prev => 
                                    checked
                                        ? [...prev, option.value]
                                        : prev.filter(v => v !== option.value)
                                );
                            }}
                        />
                        <Label htmlFor={option.value}>{option.label}</Label>
                    </div>
                ))}
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 bg-white border-t">
      <div className="mb-4">{renderInput()}</div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={!canGoBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button onClick={handleSubmit}>Next</Button>
      </div>
    </div>
  );
};

export default InputArea;