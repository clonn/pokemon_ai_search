'use client';

import { useState, useEffect } from 'react';
import { SearchResult } from '@/types';
import PokemonCard from '@/components/PokemonCard';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface SearchHistory {
  pokemon: SearchResult;
  timestamp: number;
}

const HISTORY_KEY = 'pokemon_search_history';
const HISTORY_EXPIRY_DAYS = 60;

const getSearchHistory = (): SearchHistory[] => {
  if (typeof window === 'undefined') return [];
  
  const history = localStorage.getItem(HISTORY_KEY);
  if (!history) return [];
  
  try {
    const parsedHistory = JSON.parse(history);
    const now = Date.now();
    const validHistory = parsedHistory.filter(
      (item: SearchHistory) =>
        now - item.timestamp < HISTORY_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );
    
    if (validHistory.length !== parsedHistory.length) {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(validHistory));
      } catch (setError) {
        console.error('Failed to update localStorage, clearing and retrying:', setError);
        localStorage.removeItem(HISTORY_KEY);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(validHistory));
        } catch (retryError) {
          console.error('Still failed after clearing localStorage:', retryError);
        }
      }
    }
    
    return validHistory;
  } catch {
    return [];
  }
};

const addToSearchHistory = (pokemon: SearchResult): void => {
  if (typeof window === 'undefined') return;
  
  const history = getSearchHistory();
  const newEntry: SearchHistory = {
    pokemon,
    timestamp: Date.now(),
  };
  
  const updatedHistory = [
    newEntry,
    ...history.filter(item => item.pokemon.pokemon.id !== pokemon.pokemon.id),
  ];
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
};

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: {
    length: number;
    item(index: number): {
      length: number;
      item(index: number): {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface Window {
  SpeechRecognition: {
    new(): SpeechRecognition;
  };
  webkitSpeechRecognition: {
    new(): SpeechRecognition;
  };
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeRecognition = () => {
      if (typeof window === 'undefined') return;

      const SpeechRecognition = (window as unknown as Window).SpeechRecognition || (window as unknown as Window).webkitSpeechRecognition;
      if (SpeechRecognition && mounted) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'zh-TW';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          if (event.results.length > 0 && event.results.item(0).length > 0) {
            const transcript = event.results.item(0).item(0).transcript;
            setSearchQuery(transcript);
            setIsListening(false);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        setRecognition(recognition);
      }
    };

    initializeRecognition();

    return () => {
      mounted = false;
      if (recognition) {
        recognition.abort();
      }
    };
  }, [recognition]);

  const toggleListening = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadSearchHistory = () => {
      if (typeof window !== 'undefined' && mounted) {
        setSearchHistory(getSearchHistory());
      }
    };

    loadSearchHistory();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
  
    setIsSearching(true);
    setError(null);
  
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });
  
      const data = await response.json();
  
      if (data.error) {
        setError(data.error);
        return;
      }
  
      setSearchResults(data.results);
      if (data.results.length > 0) {
        addToSearchHistory(data.results[0]);
      }
    } catch (err) {
      console.error(err);
      setError('搜尋過程中發生錯誤');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      <LanguageSwitcher />
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Pokemon AI Search</h1>
          <p className="text-xl text-gray-600 mb-12">描述你想要的寶可夢特徵，讓 AI 幫你找到最匹配的精靈</p>
        </div>

        <form onSubmit={handleSearch} className="mb-12">
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="例如：一隻可愛的、會飛的、粉色的寶可夢..."
              className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={toggleListening}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isListening ? 'text-white bg-red-600 hover:bg-red-700' : 'text-white bg-gray-600 hover:bg-gray-700'}`}
              title={isListening ? '點擊停止語音輸入' : '點擊開始語音輸入'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              type="submit"
              disabled={isSearching}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSearching ? '搜尋中...' : '搜尋'}
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {error ? (
            <div className="col-span-full text-center text-red-600">{error}</div>
          ) : searchResults.length > 0 ? (
            searchResults.map((result) => (
              <PokemonCard key={result.pokemon.id} result={result} />
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500">
              {isSearching ? '正在搜尋中...' : '暫無搜尋結果'}
            </div>
          )}
        </div>

        {searchHistory.length > 0 && (
          <div className="mt-12">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 transform transition-transform ${showHistory ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              歷史搜尋記錄
            </button>
            {showHistory && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {searchHistory.map((item) => (
                  <div key={`${item.pokemon.pokemon.id}-${item.timestamp}`} className="relative">
                    <PokemonCard result={item.pokemon} />
                    <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
