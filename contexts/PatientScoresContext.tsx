'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface PatientScores {
  memoryOrientation: number | null;
  everydaySkills: number | null;
  selfCare: number | null;
  abnormalBehaviour: number | null;
  mood: number | null;
  beliefs: number | null;
  eatingHabits: number | null;
  sleep: number | null;
  stereotypicMotor: number | null;
  motivation: number | null;
}

export interface PatientMinimumData {
  memoryOrientation: boolean | null;
  everydaySkills: boolean | null;
  selfCare: boolean | null;
  abnormalBehaviour: boolean | null;
  mood: boolean | null;
  beliefs: boolean | null;
  eatingHabits: boolean | null;
  sleep: boolean | null;
  stereotypicMotor: boolean | null;
  motivation: boolean | null;
}

interface PatientScoresContextType {
  scores: PatientScores | null;
  setScores: (scores: PatientScores | null) => void;
  minimumData: PatientMinimumData | null;
  setMinimumData: (data: PatientMinimumData | null) => void;
}

const PatientScoresContext = createContext<PatientScoresContextType | undefined>(undefined);

export function PatientScoresProvider({ children }: { children: ReactNode }) {
  const [scores, setScores] = useState<PatientScores | null>(null);
  const [minimumData, setMinimumData] = useState<PatientMinimumData | null>(null);

  return (
    <PatientScoresContext.Provider value={{ scores, setScores, minimumData, setMinimumData }}>
      {children}
    </PatientScoresContext.Provider>
  );
}

export function usePatientScores(): PatientScores | null {
  const context = useContext(PatientScoresContext);
  if (context === undefined) {
    throw new Error('usePatientScores must be used within a PatientScoresProvider');
  }
  return context.scores;
}

export function useSetPatientScores(): (scores: PatientScores | null) => void {
  const context = useContext(PatientScoresContext);
  if (context === undefined) {
    throw new Error('useSetPatientScores must be used within a PatientScoresProvider');
  }
  return context.setScores;
}

export function usePatientMinimumData(): PatientMinimumData | null {
  const context = useContext(PatientScoresContext);
  if (context === undefined) {
    throw new Error('usePatientMinimumData must be used within a PatientScoresProvider');
  }
  return context.minimumData;
}

export function useSetPatientMinimumData(): (data: PatientMinimumData | null) => void {
  const context = useContext(PatientScoresContext);
  if (context === undefined) {
    throw new Error('useSetPatientMinimumData must be used within a PatientScoresProvider');
  }
  return context.setMinimumData;
}