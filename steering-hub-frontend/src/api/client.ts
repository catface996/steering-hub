import axios, { AxiosInstance } from 'axios'
import type { ApiResult } from '@/types'
import { getToken, removeToken } from '@/utils/auth'

const apiClient: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => {
    const result: ApiResult<unknown> = response.data
    if (result.code !== 200) {
      return Promise.reject(new Error(result.message))
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      removeToken()
      window.location.href = '/login'
      return Promise.reject(error)
    }
    return Promise.reject(error)
  }
)

export default apiClient
