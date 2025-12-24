// backend/types/qa.ts

export interface QuestionState {
  id: string;
  question: string;
  answer: string | string[] | null;
  choices?: string[]; // For multiple choice
  isOther?: boolean; // If "Other" was selected
}

export interface SectionState {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed';
  questions: QuestionState[];
}

export interface MarketAnalysisState {
  tam: string | null;
  sam: string | null;
  som: string | null;
  isComplete: boolean;
}

export interface QASessionState {
  projectId: string;
  currentSectionIndex: number;
  currentQuestionIndex: number;
  sections: SectionState[];
  marketAnalysis: MarketAnalysisState;
  lastUpdated: number;
}