import { get, post, put, del } from '../utils/request';
import type { Spec, SpecVersion, PageResult, ReviewAction, SpecCategory } from '../types';

export interface CreateSpecParams {
  title: string;
  content: string;
  categoryId: number;
  tags?: string[];
  keywords?: string;
  author?: string;
}

export interface UpdateSpecParams {
  title: string;
  content: string;
  categoryId?: number;
  tags?: string[];
  keywords?: string;
  changeLog?: string;
}

export const specService = {
  create: (params: CreateSpecParams) =>
    post<Spec>('/api/v1/specs', params).then((r) => r.data),

  update: (id: number, params: UpdateSpecParams) =>
    put<Spec>(`/api/v1/specs/${id}`, params).then((r) => r.data),

  get: (id: number) =>
    get<Spec>(`/api/v1/specs/${id}`).then((r) => r.data),

  page: (params: {
    current?: number;
    size?: number;
    categoryId?: number;
    status?: string;
    keyword?: string;
  }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.set(k, String(v));
    });
    return get<PageResult<Spec>>(`/api/v1/specs?${query}`).then((r) => r.data);
  },

  review: (id: number, action: ReviewAction, comment?: string) =>
    post(`/api/v1/specs/${id}/review`, { action, comment }),

  rollback: (id: number, version: number) =>
    post<Spec>(`/api/v1/specs/${id}/rollback/${version}`).then((r) => r.data),

  delete: (id: number) => del(`/api/v1/specs/${id}`),

  getVersions: (id: number) =>
    get<SpecVersion[]>(`/api/v1/specs/${id}/versions`).then((r) => r.data),
};

export const categoryService = {
  list: () =>
    get<SpecCategory[]>('/api/v1/categories').then((r) => r.data),

  create: (params: { name: string; code: string; description: string }) => {
    const query = new URLSearchParams(params);
    return post(`/api/v1/categories?${query}`);
  },
};
