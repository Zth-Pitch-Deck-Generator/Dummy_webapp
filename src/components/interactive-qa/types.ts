// src/components/interactive-qa/types.ts

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

// Defines the structure for a single chat message in the UI
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'model'; // This adds the missing 'role' property
}