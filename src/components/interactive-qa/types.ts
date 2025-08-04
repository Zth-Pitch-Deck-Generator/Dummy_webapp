// src/features/interactive-qa/types.ts
import { ProjectData, QAData } from '@/pages/Index';

export type AIMessage = {
  id: string;
  type: 'ai';
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
