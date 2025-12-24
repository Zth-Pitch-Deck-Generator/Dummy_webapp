// src/components/interactive-qa/types.ts

export interface QuestionState {
  id: string;
  question: string;
  answer: string | string[] | null;
  choices?: string[];
  isOther?: boolean;
  tooltip?: string;
  answerType?: 'free_text' | 'multiple_choice';
}

export interface SectionState {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed';
  questions: QuestionState[];
}

export interface QASessionState {
  projectId: string;
  currentSectionIndex: number;
  currentQuestionIndex: number;
  sections: SectionState[];
  marketAnalysis: {
    tam: string | null;
    sam: string | null;
    som: string | null;
    isComplete: boolean;
  };
}

export interface InteractiveQAProps {
  projectId: string; // Changed from projectData to just ID for fetching
  onComplete: () => void;
}