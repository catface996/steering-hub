import { get } from '../utils/request';
import type { SearchResult } from '../types';

export interface SearchParams {
  query: string;
  categoryId?: number;
  limit?: number;
  mode?: 'semantic' | 'fulltext' | 'hybrid';
}

export interface SpecQuality {
  specId: number;
  title: string;
  scores: {
    selfRetrievalRank: number;
    selfRetrievalScore: number;
    tagCount: number;
    keywordCount: number;
    overallScore: number;
  };
  suggestions: string[];
}

export const searchService = {
  search: (params: SearchParams) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.set(k, String(v));
    });
    return get<SearchResult[]>(`/api/v1/search?${query}`).then((r) => r.data);
  },
};

export const qualityService = {
  getQuality: (specId: number) =>
    get<SpecQuality>(`/api/v1/search/quality/${specId}`).then((r) => r.data),

  getBatchQuality: (limit = 20) =>
    get<SpecQuality[]>(`/api/v1/search/quality/batch?limit=${limit}`).then((r) => r.data),
};
