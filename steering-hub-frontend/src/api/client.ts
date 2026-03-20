import axios, { AxiosInstance } from 'axios'
import { message } from 'antd'
import type { ApiResult } from '@/types'
import { getToken, removeToken } from '@/utils/auth'

const apiClient: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器：自动添加 token
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
      message.error(result.message || '操作失败')
      return Promise.reject(new Error(result.message))
    }
    return response
  },
  (error) => {
    // 处理 401 未授权错误
    if (error.response?.status === 401) {
      removeToken()
      window.location.href = '/login'
      message.error('登录已过期，请重新登录')
      return Promise.reject(error)
    }
    const msg = error.response?.data?.message || error.message || '网络错误'
    message.error(msg)
    return Promise.reject(error)
  }
)

export default apiClient
