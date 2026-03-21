import { get, post, put, del } from '../utils/request';
import type { Steering, SteeringVersion, PageResult, ReviewAction, SteeringCategory } from '../types';

export interface CreateSteeringParams {
  title: string;
  content: string;
  categoryId: number;
  tags?: string[];
  keywords?: string;
  author?: string;
}

export interface UpdateSteeringParams {
  title: string;
  content: string;
  categoryId?: number;
  tags?: string[];
  keywords?: string;
  changeLog?: string;
}

export const steeringService = {
  create: (params: CreateSteeringParams) =>
    post<Steering>('/api/v1/web/steerings', params).then((r) => r.data),

  update: (id: number, params: UpdateSteeringParams) =>
    put<Steering>(`/api/v1/web/steerings/${id}`, params).then((r) => r.data),

  get: (id: number) =>
    get<Steering>(`/api/v1/web/steerings/${id}`).then((r) => r.data),

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
    return get<PageResult<Steering>>(`/api/v1/web/steerings?${query}`).then((r) => r.data);
  },

  review: (id: number, action: ReviewAction, comment?: string) =>
    post(`/api/v1/web/steerings/${id}/review`, { action, comment }),

  rollback: (id: number, version: number) =>
    post<Steering>(`/api/v1/web/steerings/${id}/rollback/${version}`).then((r) => r.data),

  delete: (id: number) => del(`/api/v1/web/steerings/${id}`),

  getVersions: (id: number) =>
    get<SteeringVersion[]>(`/api/v1/web/steerings/${id}/versions`).then((r) => r.data),
};

export const categoryService = {
  list: () =>
    get<SteeringCategory[]>('/api/v1/web/categories').then((r) => r.data),

  create: (params: { name: string; code: string; description: string }) => {
    const query = new URLSearchParams(params);
    return post(`/api/v1/web/categories?${query}`);
  },
};
