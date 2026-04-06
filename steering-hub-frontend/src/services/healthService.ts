import { get, post } from '../utils/request';

export interface HealthCheckTaskVO {
  taskId: number;
  status: 'running' | 'completed' | 'failed';
  similarPairCount: number;
  activeSpecCount: number;
  startedAt: string;
  completedAt: string | null;
  isExpired: boolean;
}

export interface SimilarSpecInfo {
  id: number;
  title: string;
  tags: string;
  status: string;
  categoryId: number | null;
  categoryName: string | null;
}

export interface SimilarPairVO {
  id: number;
  specA: SimilarSpecInfo;
  specB: SimilarSpecInfo;
  overallScore: number;
  vectorScore: number | null;
  titleScore: number | null;
  tagsScore: number | null;
  keywordsScore: number | null;
  reasonTags: string[];
}

export interface SpecDetailVO {
  id: number;
  title: string;
  tags: string;
  keywords: string;
  content: string;
  status: string;
  updatedAt: string;
}

export interface CompareVO {
  specA: SpecDetailVO | null;
  specB: SpecDetailVO | null;
}

export interface PageResult<T> {
  total: number;
  pages: number;
  current: number;
  size: number;
  records: T[];
}

export const healthService = {
  triggerCheck: () =>
    post<{ taskId: number; status: string }>('/api/v1/health-check/trigger').then((r) => r.data),

  getLatestTask: () =>
    get<HealthCheckTaskVO | null>('/api/v1/health-check/latest').then((r) => r.data),

  getSimilarPairs: (
    taskId: number,
    page: number,
    pageSize: number,
    specTitle?: string,
    categoryId?: number | null,
  ) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (specTitle) params.set('specTitle', specTitle);
    if (categoryId != null) params.set('categoryId', String(categoryId));
    return get<PageResult<SimilarPairVO>>(
      `/api/v1/health-check/${taskId}/similar-pairs?${params.toString()}`,
    ).then((r) => r.data);
  },

  compareSpecs: (idA: number, idB: number) =>
    get<CompareVO>(`/api/v1/web/steerings/compare?idA=${idA}&idB=${idB}`).then((r) => r.data),

  dismissPair: (pairId: number) =>
    post<void>(`/api/v1/health-check/pairs/${pairId}/dismiss`).then(() => undefined),
};
