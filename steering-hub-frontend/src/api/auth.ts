import apiClient from './client'

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  username: string
  nickname: string
  role: string
}

export const authApi = {
  login: (params: LoginParams) =>
    apiClient.post<{ data: LoginResult }>('/auth/login', params).then((r) => r.data.data),
}
