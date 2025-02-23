export type Language = 'en' | 'zh-Hant' | 'zh-Hans' | 'ja';

export interface I18nContent {
  [key: string]: {
    [lang in Language]?: string;
  };
}

export interface Pokemon {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  types: {
    type: {
      name: string;
    };
  }[];
  height: number;
  weight: number;
  abilities: {
    ability: {
      name: string;
    };
  }[];
  stats: {
    base_stat: number;
    stat: {
      name: string;
    };
  }[];
  name_i18n: {
    [lang in Language]?: string;
  };
}

export interface SearchResult {
  pokemon: Pokemon;
  matchReason: string;
  confidence: number;
}

export interface SearchResponse {
  results: SearchResult[];
  error?: string;
}