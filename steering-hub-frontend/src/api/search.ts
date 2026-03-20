import apiClient from './client'
import type { SearchResult } from '@/types'

export interface SearchParams {
  query: string
  categoryId?: number
  limit?: number
  mode?: 'semantic' | 'fulltext' | 'hybrid'
}

export interface SpecQuality {
  specId: number
  title: string
  scores: {
    selfRetrievalRank: number
    selfRetrievalScore: number
    tagCount: number
    keywordCount: number
    overallScore: number
  }
  suggestions: string[]
}

export const searchApi = {
  search: (params: SearchParams) =>
    apiClient.get<{ data: SearchResult[] }>('/search', { params }).then((r) => r.data.data),
}

export const qualityApi = {
  getQuality: (specId: number) =>
    apiClient.get<{ data: SpecQuality }>(`/search/quality/${specId}`).then(r => r.data.data),
  getBatchQuality: (limit = 20) =>
    apiClient.get<{ data: SpecQuality[] }>(`/search/quality/batch?limit=${limit}`).then(r => r.data.data),
}
