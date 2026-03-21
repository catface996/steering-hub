import apiClient from './client'
import type { ApiKeyItem } from '@/types'

export const apiKeyApi = {
  list: () =>
    apiClient.get<{ data: ApiKeyItem[] }>('/api-keys').then((r) => r.data.data),

  create: (data: { name: string; description: string }) =>
    apiClient.post<{ data: ApiKeyItem & { keyValue: string } }>('/api-keys', data).then((r) => r.data.data),

  toggle: (id: number) =>
    apiClient.put(`/api-keys/${id}/toggle`),

  delete: (id: number) =>
    apiClient.delete(`/api-keys/${id}`),
}
