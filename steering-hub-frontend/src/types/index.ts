export type SpecStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'deprecated'

export type ReviewAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'activate'
  | 'deprecate'
  | 'rollback'

export interface SpecCategory {
  id: number
  name: string
  code: string
  description?: string
  parentId?: number
  sortOrder: number
  enabled: boolean
}

export interface Spec {
  id: number
  title: string
  content: string
  categoryId: number
  categoryName?: string
  status: SpecStatus
  currentVersion: number
  tags?: string[]
  keywords?: string
  author?: string
  createdAt: string
  updatedAt: string
}

export interface SpecVersion {
  id: number
  specId: number
  version: number
  title: string
  content: string
  changeLog?: string
  createdAt: string
}

export interface SearchResult {
  specId: number
  title: string
  content: string
  categoryId: number
  categoryName?: string
  status: SpecStatus
  currentVersion: number
  tags?: string[]
  keywords?: string
  score: number
  matchType: 'semantic' | 'fulltext' | 'hybrid'
  updatedAt: string
}

export interface Repo {
  id: number
  name: string
  fullName: string
  description?: string
  url?: string
  language?: string
  team?: string
}

export interface ComplianceReport {
  reportId: number
  repoFullName: string
  score: number
  compliant: boolean
  summary: string
  violations?: ViolationDetail[]
  relatedSpecs?: RelatedSpec[]
}

export interface ViolationDetail {
  specId: number
  specTitle: string
  violationType: string
  description: string
  suggestion?: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface RelatedSpec {
  specId: number
  specTitle: string
  specContent: string
  relevanceScore: number
}

export interface PageResult<T> {
  total: number
  pages: number
  current: number
  size: number
  records: T[]
}

export interface ApiResult<T> {
  code: number
  message: string
  data: T
}
