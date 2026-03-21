export type SteeringStatus =
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

export interface SteeringCategory {
  id: number
  name: string
  code: string
  description?: string
  parentId?: number
  sortOrder: number
  enabled: boolean
}

export interface Steering {
  id: number
  title: string
  content: string
  categoryId: number
  categoryName?: string
  status: SteeringStatus
  currentVersion: number
  tags?: string[]
  keywords?: string
  author?: string
  qualityScore?: number
  agentQueries?: string[]
  createdAt: string
  updatedAt: string
}

export interface SteeringVersion {
  id: number
  steeringId: number
  version: number
  title: string
  content: string
  changeLog?: string
  createdAt: string
}

export interface SearchResult {
  steeringId: number
  title: string
  content: string
  categoryId: number
  categoryName?: string
  status: SteeringStatus
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
  relatedSteerings?: RelatedSteering[]
}

export interface ViolationDetail {
  steeringId: number
  steeringTitle: string
  violationType: string
  description: string
  suggestion?: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface RelatedSteering {
  steeringId: number
  steeringTitle: string
  steeringContent: string
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

export interface ApiKeyItem {
  id: number
  name: string
  keyValue: string
  description: string
  enabled: boolean
  lastUsedAt: string | null
  createdAt: string
}
