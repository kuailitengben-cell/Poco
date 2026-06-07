import React, { createContext, useContext, useState } from 'react';

export type Language = 'ja' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (jaText: string, enText: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('jimicchi_language');
    return (saved === 'en' || saved === 'ja') ? saved : 'ja';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('jimicchi_language', lang);
  };

  const t = (jaText: string, enText: string) => {
    return language === 'en' ? enText : jaText;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return a fallback if context isn't ready
    return {
      language: 'ja' as Language,
      setLanguage: () => {},
      t: (jaText: string) => jaText,
    };
  }
  return context;
}
