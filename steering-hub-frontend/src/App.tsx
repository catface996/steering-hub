import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '@/components/Layout/MainLayout'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import SpecListPage from '@/pages/spec/SpecListPage'
import SpecDetailPage from '@/pages/spec/SpecDetailPage'
import SpecEditPage from '@/pages/spec/SpecEditPage'
import SearchPage from '@/pages/search/SearchPage'
import CompliancePage from '@/pages/compliance/CompliancePage'
import CategoryPage from '@/pages/category/CategoryPage'
import LoginPage from '@/pages/auth/LoginPage'
import { isLoggedIn } from '@/utils/auth'

// 路由守卫组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="specs" element={<SpecListPage />} />
          <Route path="specs/new" element={<SpecEditPage />} />
          <Route path="specs/:id" element={<SpecDetailPage />} />
          <Route path="specs/:id/edit" element={<SpecEditPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="categories" element={<CategoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
