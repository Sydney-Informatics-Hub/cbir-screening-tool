'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface TermsContextType {
  hasAcceptedTerms: boolean;
  acceptTerms: () => void;
}

const TermsContext = createContext<TermsContextType | undefined>(undefined);

export function TermsProvider({ children }: { children: ReactNode }) {
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  const acceptTerms = () => {
    setHasAcceptedTerms(true);
  };

  return (
    <TermsContext.Provider value={{ hasAcceptedTerms, acceptTerms }}>
      {children}
    </TermsContext.Provider>
  );
}

export function useTerms() {
  const context = useContext(TermsContext);
  if (context === undefined) {
    throw new Error('useTerms must be used within a TermsProvider');
  }
  return context;
}