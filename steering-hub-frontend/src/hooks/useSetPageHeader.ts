import { useEffect } from 'react'
import { usePageHeader } from '../contexts/PageHeaderContext'
import type { ReactNode } from 'react'

export function useSetPageHeader(config: {
  title?: string
  breadcrumbs?: string[]
  onBreadcrumbClick?: (index: number) => void
  actions?: ReactNode
}, deps?: any[]) {
  const { setHeader } = usePageHeader()
  useEffect(() => {
    setHeader(config)
    return () => setHeader({})  // 离开时清空
  }, deps ?? [])
}
