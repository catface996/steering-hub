import { get, post, put, patch, del } from '../utils/request';
import type { Repo, RepoSteeringBinding, RepoBindingItem, PageResult } from '../types';

export interface CreateRepoParams {
  name: string;
  fullName: string;
  description?: string;
  url?: string;
  language?: string;
  team?: string;
}

export interface UpdateRepoParams {
  name: string;
  description?: string;
  url?: string;
  language?: string;
  team?: string;
}

export interface ListReposParams {
  name?: string;
  team?: string;
  enabled?: boolean;
  page?: number;
  size?: number;
}

export interface BindSteeringParams {
  mandatory?: boolean;
}

export interface BindingResult {
  bindingId: number;
  repoId: number;
  steeringId: number;
  mandatory: boolean;
  warning?: string | null;
}

export const repoService = {
  list: (params: ListReposParams = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.set(k, String(v));
    });
    return get<PageResult<Repo>>(`/api/v1/web/repos?${query}`).then((r) => r.data);
  },

  create: (params: CreateRepoParams) =>
    post<Repo>('/api/v1/web/repos', params).then((r) => r.data),

  get: (id: number) =>
    get<Repo>(`/api/v1/web/repos/${id}`).then((r) => r.data),

  update: (id: number, params: UpdateRepoParams) =>
    put<Repo>(`/api/v1/web/repos/${id}`, params).then((r) => r.data),

  toggle: (id: number) =>
    patch<Repo>(`/api/v1/web/repos/${id}/toggle`).then((r) => r.data),

  delete: (id: number) =>
    del(`/api/v1/web/repos/${id}`),

  // Binding
  listSteeringsByRepo: (repoId: number, page = 1, size = 20) =>
    get<PageResult<RepoSteeringBinding>>(
      `/api/v1/web/repos/${repoId}/steerings?page=${page}&size=${size}`
    ).then((r) => r.data),

  bindSteering: (repoId: number, steeringId: number, params: BindSteeringParams = {}) =>
    put<BindingResult>(
      `/api/v1/web/repos/${repoId}/steerings/${steeringId}`,
      params
    ).then((r) => r.data),

  unbindSteering: (repoId: number, steeringId: number) =>
    del(`/api/v1/web/repos/${repoId}/steerings/${steeringId}`),

  listReposBySteering: (steeringId: number, page = 1, size = 20) =>
    get<PageResult<RepoBindingItem>>(
      `/api/v1/web/steerings/${steeringId}/repos?page=${page}&size=${size}`
    ).then((r) => r.data),
};
