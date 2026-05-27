'use client';

import { ReactNode } from 'react';
import { PatientScoresProvider } from './PatientScoresContext';
import { TermsProvider } from './TermsContext';
import { AssessmentScoresProvider } from './AssessmentScoresContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TermsProvider>
      <AssessmentScoresProvider>
        <PatientScoresProvider>
          {children}
        </PatientScoresProvider>
      </AssessmentScoresProvider>
    </TermsProvider>
  );
}