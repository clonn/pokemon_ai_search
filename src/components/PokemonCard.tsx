import Image from 'next/image';
import Link from 'next/link';
import { SearchResult } from '@/types';
import { useLanguage } from '@/hooks/useLanguage';

interface PokemonCardProps {
  result: SearchResult;
}

const HISTORY_KEY = 'pokemon_search_history';
const HISTORY_EXPIRY_DAYS = 60;

const addToSearchHistory = (pokemon: SearchResult) => {
  if (typeof window === 'undefined') return;
  
  try {
    const historyStr = localStorage.getItem(HISTORY_KEY);
    const history = historyStr ? JSON.parse(historyStr) : [];
    const now = Date.now();
    
    // 過濾掉超過 60 天的記錄
    const validHistory = history.filter(
      (item: { pokemon: SearchResult; timestamp: number }) =>
        now - item.timestamp < HISTORY_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );
    
    // 確保同一個寶可夢不會重複出現，如果已存在則更新時間戳
    const newEntry = {
      pokemon,
      timestamp: now,
    };
    
    const updatedHistory = [
      newEntry,
      ...validHistory.filter((item: { pokemon: SearchResult; timestamp: number }) => item.pokemon.pokemon.id !== pokemon.pokemon.id),
    ];
    
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (setError) {
      // 如果設置失敗，先清除 localStorage 再重試
      console.error('Failed to set localStorage, clearing and retrying:', setError);
      localStorage.removeItem(HISTORY_KEY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    }
  } catch (error) {
    console.error('Failed to update search history:', error);
  }
};

export default function PokemonCard({ result }: PokemonCardProps) {
  const { pokemon, matchReason, confidence } = result;
  const { currentLanguage } = useLanguage();

  const handleClick = () => {
    addToSearchHistory(result);
  };

  return (
    <Link
      href={`/pokemon/${pokemon.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
      onClick={handleClick}
    >
      <div className="p-4">
        <div className="relative w-full aspect-square mb-4">
          <Image
            src={pokemon.sprites.other['official-artwork'].front_default}
            alt={pokemon.name}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-1 capitalize">
          {pokemon.name.replace(/-/g, ' ')}
        </h3>
        {pokemon.name_i18n?.[currentLanguage] && (
          <div className="text-sm text-gray-600 mb-2">
            {pokemon.name_i18n[currentLanguage]}
          </div>
        )}

        <div className="flex gap-2 mb-3">
          {pokemon.types.map((type) => (
            <span
              key={type.type.name}
              className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-800"
            >
              {type.type.name}
            </span>
          ))}
        </div>

        <p className="text-sm text-gray-600 mb-2">{matchReason}</p>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>匹配度</span>
          <span>{Math.round(confidence * 100)}%</span>
        </div>
      </div>
    </Link>
  );
}