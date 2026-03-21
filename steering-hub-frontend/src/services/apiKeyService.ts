import { get, post, put, del } from '../utils/request';
import type { ApiKeyItem } from '../types';

export const apiKeyService = {
  list: () =>
    get<ApiKeyItem[]>('/api/v1/api-keys').then((r) => r.data),

  create: (data: { name: string; description: string }) =>
    post<ApiKeyItem & { keyValue: string }>('/api/v1/api-keys', data).then((r) => r.data),

  toggle: (id: number) =>
    put(`/api/v1/api-keys/${id}/toggle`),

  delete: (id: number) =>
    del(`/api/v1/api-keys/${id}`),
};
