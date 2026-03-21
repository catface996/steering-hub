import { get, post, del, put } from '../utils/request';

export interface StopWordItem {
  id: number;
  word: string;
  language: string;
  enabled: boolean;
  createdAt: string;
}

export const stopWordApi = {
  list: () =>
    get<StopWordItem[]>('/api/v1/stop-words').then((r) => r.data),

  create: (word: string, language = 'zh') =>
    post('/api/v1/stop-words', { word, language }),

  delete: (id: number) =>
    del(`/api/v1/stop-words/${id}`),

  toggle: (id: number) =>
    put(`/api/v1/stop-words/${id}/toggle`, {}),
};
