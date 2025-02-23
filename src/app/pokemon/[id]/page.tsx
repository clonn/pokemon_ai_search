'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Pokemon } from '@/types';
import { useLanguage } from '@/hooks/useLanguage';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface PokemonDetailProps {
  params: {
    id: string;
  };
}

export default function PokemonDetail({ params }: PokemonDetailProps) {
  const { currentLanguage } = useLanguage();
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPokemon = async () => {
      try {
        const [pokemonResponse, speciesResponse] = await Promise.all([
          fetch(`https://pokeapi.co/api/v2/pokemon/${params.id}`),
          fetch(`https://pokeapi.co/api/v2/pokemon-species/${params.id}`)
        ]);

        const pokemonData = await pokemonResponse.json();
        const speciesData = await speciesResponse.json();

        // 獲取各語言名稱
        const name_i18n = {
          'en': pokemonData.name,
          'zh-Hant': speciesData.names.find(
            (name: { language: { name: string } }) => name.language.name === 'zh-Hant'
          )?.name,
          'zh-Hans': speciesData.names.find(
            (name: { language: { name: string } }) => name.language.name === 'zh-Hans'
          )?.name,
          'ja': speciesData.names.find(
            (name: { language: { name: string } }) => name.language.name === 'ja'
          )?.name
        };

        // 合併資料
        setPokemon({
          ...pokemonData,
          name_i18n
        });
      } catch (error) {
        setError(`"取得寶可夢資訊失敗${error}"`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPokemon();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
        <LanguageSwitcher />
        <div className="max-w-4xl mx-auto text-center">載入中...</div>
      </div>
    );
  }

  if (error || !pokemon) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
        <LanguageSwitcher />
        <div className="max-w-4xl mx-auto text-center text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
        <LanguageSwitcher />
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-500 flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            返回搜尋
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative aspect-square">
                <Image
                  src={pokemon.sprites.other['official-artwork'].front_default}
                  alt={pokemon.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1 capitalize">
                  {pokemon.name_i18n[currentLanguage] || pokemon.name.replace(/-/g, ' ')}
                </h1>

                <div className="flex gap-2 mb-6">
                  {pokemon.types.map((type) => (
                    <span
                      key={type.type.name}
                      className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800"
                    >
                      {type.type.name}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500">身高</div>
                    <div className="text-lg font-medium">{pokemon.height / 10} m</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500">體重</div>
                    <div className="text-lg font-medium">{pokemon.weight / 10} kg</div>
                  </div>
                </div>

                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">特性</h2>
                  <div className="flex flex-wrap gap-2">
                    {pokemon.abilities.map((ability) => (
                      <span
                        key={ability.ability.name}
                        className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                      >
                        {ability.ability.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-3">能力值</h2>
                  <div className="space-y-3">
                    {pokemon.stats.map((stat, index) => (
                      <div key={`${stat.stat.name}-${index}`}>
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>{stat.stat.name}</span>
                          <span>{stat.base_stat}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${(stat.base_stat / 255) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={() => {
                      const url = window.location.href;
                      navigator.clipboard.writeText(url);
                      alert('連結已複製到剪貼簿');
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    分享寶可夢
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}