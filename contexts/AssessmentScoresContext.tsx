'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AssessmentScoresContextType {
  scores: Record<string, string>;
  setScore: (itemKey: string, value: string) => void;
  isSubmitted: boolean;
  setIsSubmitted: (value: boolean) => void;
}

const AssessmentScoresContext = createContext<AssessmentScoresContextType | undefined>(undefined);

export function AssessmentScoresProvider({ children }: { children: ReactNode }) {
  const [scores, setScores] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const setScore = (itemKey: string, value: string) => {
    setScores((prev) => ({ ...prev, [itemKey]: value }));
  };

  return (
    <AssessmentScoresContext.Provider value={{ scores, setScore, isSubmitted, setIsSubmitted }}>
      {children}
    </AssessmentScoresContext.Provider>
  );
}

export function useAssessmentScores() {
  const context = useContext(AssessmentScoresContext);
  if (context === undefined) {
    throw new Error('useAssessmentScores must be used within an AssessmentScoresProvider');
  }
  return context;
}