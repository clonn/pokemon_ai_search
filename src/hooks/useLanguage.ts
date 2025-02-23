'use client';

import { useState, useEffect } from 'react';
import { Language } from '@/types';

const getBrowserLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';

  const browserLang = navigator.language.toLowerCase();

  if (browserLang.startsWith('zh-tw') || browserLang.startsWith('zh-hk')) {
    return 'zh-Hant';
  } else if (browserLang.startsWith('zh')) {
    return 'zh-Hans';
  } else if (browserLang.startsWith('ja')) {
    return 'ja';
  }

  return 'en';
};

export const useLanguage = () => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');

  useEffect(() => {
    const storedLang = localStorage.getItem('preferredLanguage') as Language;
    setCurrentLanguage(storedLang || getBrowserLanguage());
  }, []);

  const changeLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
  };

  return {
    currentLanguage,
    changeLanguage,
  };
};