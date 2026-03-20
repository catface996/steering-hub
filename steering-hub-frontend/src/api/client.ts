import axios, { AxiosInstance } from 'axios'
import { message } from 'antd'
import type { ApiResult } from '@/types'

const apiClient: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

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
    const msg = error.response?.data?.message || error.message || '网络错误'
    message.error(msg)
    return Promise.reject(error)
  }
)

export default apiClient
