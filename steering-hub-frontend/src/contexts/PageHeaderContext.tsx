import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface PageHeaderConfig {
  title?: string
  breadcrumbs?: string[]  // ['规范管理', '规范名称']
  onBreadcrumbClick?: (index: number) => void
  actions?: ReactNode
}

interface PageHeaderContextValue {
  config: PageHeaderConfig
  setHeader: (config: PageHeaderConfig) => void
}

const PageHeaderContext = createContext<PageHeaderContextValue>({
  config: {},
  setHeader: () => {},
})

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PageHeaderConfig>({})
  const setHeader = useCallback((c: PageHeaderConfig) => setConfig(c), [])
  return (
    <PageHeaderContext.Provider value={{ config, setHeader }}>
      {children}
    </PageHeaderContext.Provider>
  )
}

export function usePageHeader(config?: PageHeaderConfig) {
  const ctx = useContext(PageHeaderContext)
  // 如果传入 config，设置 header（在 useEffect 中调用）
  return { setHeader: ctx.setHeader, config: ctx.config }
}
