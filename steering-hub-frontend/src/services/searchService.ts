import { get } from '../utils/request';
import type { SearchResult } from '../types';

const MCP_API_KEY_STORAGE = 'steering_hub_mcp_key';

export interface SearchParams {
  query: string;
  categoryId?: number;
  limit?: number;
  mode?: 'semantic' | 'fulltext' | 'hybrid';
}

export interface SteeringQuality {
  steeringId: number;
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
    // Web 前端用户使用 /api/v1/web/search（JWT 认证）
    // MCP 客户端使用 /api/v1/mcp/search（API Key 认证）
    return get<SearchResult[]>(`/api/v1/web/search?${query}`).then((r) => r.data);
  },
};

export const qualityService = {
  getQuality: (steeringId: number) =>
    get<SteeringQuality>(`/api/v1/web/search/quality/${steeringId}`).then((r) => r.data),

  getBatchQuality: (limit = 20) =>
    get<SteeringQuality[]>(`/api/v1/web/search/quality/batch?limit=${limit}`).then((r) => r.data),
};
