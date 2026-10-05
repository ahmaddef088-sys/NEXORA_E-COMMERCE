'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { en, ar, Locale } from './translations';

interface LanguageContextType {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (locale: Locale) => void;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const COOKIE_NAME = 'nexora_locale';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar');

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_NAME) as Locale | null;
    let targetLocale: Locale | null = null;
    if (saved && (saved === 'en' || saved === 'ar')) {
      targetLocale = saved;
    } else {
      const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
      if (match && (match[1] === 'en' || match[1] === 'ar')) {
        targetLocale = match[1] as Locale;
      }
    }

    if (targetLocale && targetLocale !== 'ar') {
      queueMicrotask(() => {
        setLocaleState(targetLocale);
      });
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(COOKIE_NAME, newLocale);
    document.cookie = `${COOKIE_NAME}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLocale;
  };

  useEffect(() => {
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [locale]);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const t = (keyPath: string, params?: Record<string, string | number>): string => {
    const dict = locale === 'ar' ? ar : en;
    const fallbackDict = en;

    const keys = keyPath.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = dict;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fallback: any = fallbackDict;

    for (const key of keys) {
      current = current?.[key];
      fallback = fallback?.[key];
    }

    let result = (typeof current === 'string' ? current : typeof fallback === 'string' ? fallback : keyPath) as string;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      });
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ locale, dir, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
