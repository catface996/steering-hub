import { get, post } from '../utils/request';
import type { ComplianceReport } from '../types';

export interface ComplianceCheckParams {
  codeSnippet: string;
  repoFullName: string;
  taskDescription?: string;
  categoryId?: number;
}

export const complianceService = {
  check: (params: ComplianceCheckParams) =>
    post<ComplianceReport>('/api/v1/compliance/check', params).then((r) => r.data),

  listReports: (repoFullName: string, limit = 20) =>
    get<ComplianceReport[]>(`/api/v1/compliance/reports?repoFullName=${encodeURIComponent(repoFullName)}&limit=${limit}`).then((r) => r.data),

  getReport: (reportId: number) =>
    get<ComplianceReport>(`/api/v1/compliance/reports/${reportId}`).then((r) => r.data),
};
