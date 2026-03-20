import apiClient from './client'
import type { Spec, SpecVersion, PageResult, ReviewAction } from '@/types'

export interface CreateSpecParams {
  title: string
  content: string
  categoryId: number
  tags?: string[]
  keywords?: string
  author?: string
}

export interface UpdateSpecParams {
  title: string
  content: string
  categoryId?: number
  tags?: string[]
  keywords?: string
  changeLog?: string
}

export const specApi = {
  create: (params: CreateSpecParams) =>
    apiClient.post<{ data: Spec }>('/specs', params).then((r) => r.data.data),

  update: (id: number, params: UpdateSpecParams) =>
    apiClient.put<{ data: Spec }>(`/specs/${id}`, params).then((r) => r.data.data),

  get: (id: number) =>
    apiClient.get<{ data: Spec }>(`/specs/${id}`).then((r) => r.data.data),

  page: (params: {
    current?: number
    size?: number
    categoryId?: number
    status?: string
    keyword?: string
  }) =>
    apiClient
      .get<{ data: PageResult<Spec> }>('/specs', { params })
      .then((r) => r.data.data),

  review: (id: number, action: ReviewAction, comment?: string) =>
    apiClient.post(`/specs/${id}/review`, { action, comment }),

  rollback: (id: number, version: number) =>
    apiClient.post<{ data: Spec }>(`/specs/${id}/rollback/${version}`).then((r) => r.data.data),

  delete: (id: number) => apiClient.delete(`/specs/${id}`),

  getVersions: (id: number) =>
    apiClient.get<{ data: SpecVersion[] }>(`/specs/${id}/versions`).then((r) => r.data.data),
}
