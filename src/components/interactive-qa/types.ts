// src/components/interactive-qa/types.ts
// src/features/interactive-qa/types.ts
import { ProjectData, QAData } from '@/pages/Index';

export type AIMessage = {
  id: string;
  type: 'model';
  question: string;
  answerType: 'free_text' | 'multiple_choice';
  choices?: string[];
  timestamp: number;
};

export type UserMessage = {
  id: string;
  type: 'user';
  content: string;
  timestamp: number;
};

export type Message = AIMessage | UserMessage;

export type { QAData };

export interface InteractiveQAProps {
  projectData: ProjectData;
  onComplete: (qaData: QAData) => void;
}
// The value for an answer can be a single string or an array of strings
export type QAAnswer = string | string[];

// Defines the structure for a choice in a question
export interface QAChoiceOption {
  value: string;
  label: string;
}

// Defines a single question in the Q&A session
export interface QAQuestion {
  id: string;
  text: string;
  type: 'text' | 'single-choice' | 'multiple-choice';
  placeholder?: string;
  options?: QAChoiceOption[];
}

// Defines the entire configuration for a Q&A session
export interface QASession {
  id: string;
  title: string;
  description: string;
  questions: QAQuestion[];
}

