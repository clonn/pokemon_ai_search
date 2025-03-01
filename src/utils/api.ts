import { Pokemon, SearchResponse } from '@/types';
import { jsonrepair } from 'jsonrepair'

const POKE_API_BASE_URL = 'https://pokeapi.co/api/v2';

// 用於存儲所有寶可夢資料的緩存
let pokemonCache: Map<string, Pokemon> | null = null;

// 初始化寶可夢資料緩存
async function initPokemonCache() {
  if (pokemonCache !== null) return;
  
  try {
    const response = await fetch(`${POKE_API_BASE_URL}/pokemon?limit=1500`);
    const data = await response.json();
    
    pokemonCache = new Map();
    
    // 將寶可夢列表分批處理，每批 50 個
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < data.results.length; i += batchSize) {
      batches.push(data.results.slice(i, i + batchSize));
    }
    
    // 依次處理每一批
    for (const batch of batches) {
      const pokemonDetails = await Promise.all(
        batch.map(async (pokemon: { name: string; url: string }) => {
          // 添加重試機制
          const maxRetries = 3;
          let lastError;
          
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              // 添加隨機延遲，避免請求過於密集
              const delay = Math.random() * 30 + 50; // 500-30ms
              await new Promise(resolve => setTimeout(resolve, delay));
              
              const detailResponse = await fetch(pokemon.url);
              return await detailResponse.json();
            } catch (error) {
              lastError = error;
              // 如果不是最後一次嘗試，則等待後重試
              if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
              }
            }
          }
          
          console.error(`Failed to fetch pokemon ${pokemon.name} after ${maxRetries} attempts:`, lastError);
          return null;
        })
      );
      
      // 將成功獲取的寶可夢資料存入緩存
      pokemonDetails
        .filter((pokemon): pokemon is Pokemon => pokemon !== null)
        .forEach((pokemon: Pokemon) => {
          pokemonCache?.set(pokemon.name.toLowerCase(), pokemon);
        });
      
      console.log(`Processed batch of ${batchSize} Pokemon, cache size: ${pokemonCache.size}`);
    }
    
    console.log('Pokemon cache initialized with', pokemonCache.size, 'entries');
  } catch (error) {
    console.error('Failed to initialize Pokemon cache:', error);
    throw error;
  }
}

interface PokemonAnalysis {
  types: string[];
  characteristics: string[];
  abilities: string[];
  candidates: Pokemon[];
  name: {
    en: string;
    zh: string;
  };
}

export async function searchPokemon(description: string): Promise<SearchResponse> {
  try {
    // 調用 Gemini API 分析用戶描述
    const analysis = await analyzeDescription(description);
    
    // 根據分析結果搜索匹配的寶可夢
    const matchedPokemon = await fetchMatchingPokemon(analysis);
    
    return {
      results: matchedPokemon.filter((result): result is { pokemon: Pokemon; matchReason: string; confidence: number } => result !== null)
    };
  } catch (error) {
    console.error('Search error:', error);
    return {
      results: [],
      error: '搜索过程中发生错误'
    };
  }
}

async function analyzeDescription(description: string): Promise<PokemonAnalysis> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-pro-exp-02-05' });

  const prompt = `There is the following Pokémon description and very meshing Pokémon descriptions:
${description.slice(0, 999)}

The input may contain a Pokémon’s name, or its characteristics, or a scenario from the Pokémon universe. Your task is to extract key features and provide a structured analysis.

You are as a Pokémon expert, analyze the checking the Pokémon database and check again and again, extracting key characteristics. Your analysis should cover all possible Pokémon, including regular Pokémon, Legendary Pokémon, Mythical Pokémon, Ultra Beasts, and the latest generation of Pokémon. Additionally, consider references from the Pokémon anime, movies, and other media, as the description may include character interactions, battle scenarios, or notable moments from the Pokémon world.

Please return a JSON object with the following fields:
	•	name: have to a real Pokémon name, return a object which is including "en" (English name) and "zh" (Traditional Chinese name).
	•	types: Possible elemental types (such as Fire, Dragon, Psychic, Fairy, etc.), return string array type.
	•	characteristics: Physical appearance and personality traits (such as body shape, colors, behavioral patterns, etc.).
	•	abilities: Possible unique abilities, including signature moves, special traits, and exclusive skill, return string array type.

Ensure your response is as detailed as possible, covering potential evolutionary lines, regional forms, and special mechanics such as Gigantamax, Z-Moves, and Tera Types.

The final response only name must be in Traditional Chinese.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  console.log('----');
  const text = response.text().trim();
  console.log(text);
  
  try {
    // 移除可能存在的 Markdown 程式碼區塊標記
    const parsedData: {
      matches?: {
        types: string[];
        characteristics: string[];
        abilities: string[];
        name: { en: string; zh: string };
      }[];
      types: string[];
      characteristics: string[];
      abilities: string[];
      name: { en: string; zh: string };
    } = JSON.parse(jsonrepair(text));

    console.log(parsedData);

    if (parsedData.matches) {
      return {
        ...parsedData.matches[0],
        candidates: []
      };
    }
    return {
      types: parsedData.types || [],
      characteristics: parsedData.characteristics || [],
      abilities: parsedData.abilities || [],
      candidates: [],
      name: parsedData.name || { en: '', zh: '' }
    };
  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
    return {
      types: [],
      characteristics: [],
      abilities: [],
      candidates: [],
      name: { en: '', zh: '' }
    };
  }
}

async function fetchMatchingPokemon(analysis: PokemonAnalysis) {
  // 確保緩存已初始化
  await initPokemonCache();
  
  if (!pokemonCache) {
    return [];
  }

  try {
    let results: Array<{ pokemon: Pokemon; matchReason: string; confidence: number } | null> = [];

    // 如果有具體的寶可夢名稱，優先搜索這些寶可夢，同時也搜索其他匹配的寶可夢
    if (analysis.name.en) {
      const pokemonNames = Array.isArray(analysis.name.en) 
        ? analysis.name.en 
        : [analysis.name.en];

      // 先處理具體名稱的寶可夢
      const exactMatches = pokemonNames.map(name => {
        const pokemonName = name.toLowerCase();
        const pokemon = pokemonCache?.get(pokemonName);
        console.log('pokemonName ---');
        console.log(pokemon);
        if (!pokemon) {
          return null;
        }

        const confidence = calculateMatchScore(pokemon, analysis);
        return {
          pokemon,
          matchReason: generateMatchReason(pokemon),
          confidence: confidence + 0.5 // 給予具體名稱匹配的額外分數
        };
      }).filter(result => result !== null);

      // 搜索所有匹配度大於 0 的寶可夢
      const similarMatches = Array.from(pokemonCache.values())
        .filter(pokemon => !pokemonNames.includes(pokemon?.name?.toLowerCase())) // 排除已經精確匹配的
        .map(pokemon => {
          const confidence = calculateMatchScore(pokemon, analysis);
          if (confidence > 0) {
            return {
              pokemon,
              matchReason: generateMatchReason(pokemon),
              confidence
            };
          }
          return null;
        })
        .filter(result => result !== null);

      // 合併結果並按照匹配度排序，同時去除重複項
      const uniqueResults = new Map();
      
      // 先加入精確匹配的結果
      exactMatches.forEach(match => {
        if (match) {
          uniqueResults.set(match.pokemon.id, match);
        }
      });
      
      // 再加入相似匹配的結果，但只加入未出現過的
      similarMatches.forEach(match => {
        if (match && !uniqueResults.has(match.pokemon.id)) {
          uniqueResults.set(match.pokemon.id, match);
        }
      });
      
      // 轉換為數組並排序
      results = Array.from(uniqueResults.values())
        .sort((a, b) => b.confidence - a.confidence);
        // .slice(0, 5);

      return results;
    }

    // 如果沒有具體名稱但有類型或特性，根據特徵搜索
    if (analysis.types.length > 0 || analysis.abilities.length > 0) {
      const allResults = Array.from(pokemonCache.values())
        .map(pokemon => {
          const confidence = calculateMatchScore(pokemon, analysis);
          if (confidence > 0) {
            return {
              pokemon,
              matchReason: generateMatchReason(pokemon),
              confidence
            };
          }
          return null;
        })
        .filter(result => result !== null)
        .sort((a, b) => b!.confidence - a!.confidence);
        // .slice(0, 5);

      return allResults;
    }

    // 如果沒有任何匹配條件，返回空數組
    return [];
  } catch (error) {
    console.error('Error fetching Pokemon from cache:', error);
    return [];
  }
}

function calculateMatchScore(pokemon: Pokemon, analysis: PokemonAnalysis): number {
  let score = 0;
  
  // 类型匹配
  if (analysis.types) {
    const pokemonTypes = pokemon.types.map(t => t.type.name);
    const matchingTypes = analysis.types.filter((type: string) =>
      pokemonTypes.includes(type.toLowerCase())
    );
    score += matchingTypes.length * 0.3;
  }
  
  // 特性匹配
  if (analysis.abilities) {
    const pokemonAbilities = pokemon.abilities.map(a => a.ability.name);
    const matchingAbilities = analysis.abilities.filter((ability: string) =>
      pokemonAbilities.some(a => a.includes(ability.toLowerCase()))
    );
    score += matchingAbilities.length * 0.2;
  }
  
  return Math.min(1, score);
}

function generateMatchReason(pokemon: Pokemon): string {
  const reasons = [];
  
  // 添加类型匹配原因
  const types = pokemon.types.map(t => t.type.name).join('、');
  reasons.push(`属性为${types}`);
  
  // 添加特性匹配原因
  const abilities = pokemon.abilities.map(a => a.ability.name).join('、');
  reasons.push(`具有${abilities}等特性`);
  
  return reasons.join('，');
}