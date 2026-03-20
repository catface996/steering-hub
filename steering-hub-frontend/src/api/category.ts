import apiClient from './client'
import type { SpecCategory } from '@/types'

export const categoryApi = {
  list: () =>
    apiClient.get<{ data: SpecCategory[] }>('/categories').then((r) => r.data.data),
}
