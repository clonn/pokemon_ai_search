'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { Language } from '@/types';

const languageLabels: Record<Language, string> = {
  'en': 'English',
  'zh-Hant': '繁體中文',
  'zh-Hans': '简体中文',
  'ja': '日本語'
};

export default function LanguageSwitcher() {
  const { currentLanguage, changeLanguage } = useLanguage();

  return (
    <div className="absolute top-4 right-4 flex gap-2">
      {Object.entries(languageLabels).map(([lang, label]) => (
        <button
          key={lang}
          onClick={() => changeLanguage(lang as Language)}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${currentLanguage === lang
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}