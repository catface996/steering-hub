import apiClient from './client'
import type { ComplianceReport } from '@/types'

export interface ComplianceCheckParams {
  codeSnippet: string
  repoFullName: string
  taskDescription?: string
  categoryId?: number
}

export const complianceApi = {
  check: (params: ComplianceCheckParams) =>
    apiClient.post<{ data: ComplianceReport }>('/compliance/check', params).then((r) => r.data.data),

  listReports: (repoFullName: string, limit = 20) =>
    apiClient
      .get<{ data: ComplianceReport[] }>('/compliance/reports', { params: { repoFullName, limit } })
      .then((r) => r.data.data),

  getReport: (reportId: number) =>
    apiClient.get<{ data: ComplianceReport }>(`/compliance/reports/${reportId}`).then((r) => r.data.data),
}
