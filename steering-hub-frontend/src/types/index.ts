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
  matchLevel: 'high' | 'good' | 'fair'
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
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface RepoSteeringBinding {
  steeringId: number
  steeringTitle: string
  steeringStatus: string
  mandatory: boolean
  bindingId: number
  createdAt: string
  warning?: string
}

export interface RepoBindingItem {
  bindingId: number
  repoId: number
  repoName: string
  repoFullName: string
  repoEnabled: boolean
  mandatory: boolean
  createdAt: string
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

export interface QueryLog {
  id: number
  queryText: string
  searchMode?: string
  resultCount?: number
  resultSteeringIds?: string
  agentId?: string
  source?: string | null
  repo?: string
  taskDescription?: string
  responseTimeMs?: number
  isEffective?: boolean
  failureReason?: string
  expectedTopic?: string
  createdAt: string
}

export interface HitSteering {
  id: number
  title: string
  contentSummary?: string
  status?: string
  currentVersion?: number
  tags?: string
}

export interface QueryLogDetail extends QueryLog {
  hitSteerings: HitSteering[]
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
