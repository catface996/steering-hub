import { useMemo } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import createTheme from './theme';
import { ThemeColorProvider, useThemeColor } from './contexts/ThemeColorContext';
import { ModalProvider } from './contexts/ModalContext';
import RequireAuth from './components/RequireAuth';
import MainLayout from './components/Layout/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import SteeringListPage from './pages/steering/SteeringListPage';
import SteeringDetailPage from './pages/steering/SteeringDetailPage';
import SteeringEditPage from './pages/steering/SteeringEditPage';
import SteeringAnalyticsPage from './pages/steering/SteeringAnalyticsPage';
import SearchPage from './pages/search/SearchPage';
import CompliancePage from './pages/compliance/CompliancePage';
import CategoryPage from './pages/category/CategoryPage';
import ApiKeyPage from './pages/settings/ApiKeyPage';

function ThemedApp() {
  const { primaryColor } = useThemeColor();
  const appTheme = useMemo(() => createTheme(primaryColor), [primaryColor]);

  return (
    <ConfigProvider theme={appTheme}>
      <AntApp>
      <ModalProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="steerings" element={<SteeringListPage />} />
            <Route path="steerings/new" element={<SteeringEditPage />} />
            <Route path="steerings/:id" element={<SteeringDetailPage />} />
            <Route path="steerings/:id/edit" element={<SteeringEditPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="compliance" element={<CompliancePage />} />
            <Route path="categories" element={<CategoryPage />} />
            <Route path="analytics" element={<SteeringAnalyticsPage />} />
            <Route path="settings/api-keys" element={<ApiKeyPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </ModalProvider>
      </AntApp>
    </ConfigProvider>
  );
}

function App() {
  return (
    <ThemeColorProvider>
      <ThemedApp />
    </ThemeColorProvider>
  );
}

export default App;
