import { useState } from 'react';
import { Layout, Typography, Divider, Flex } from 'antd';
import { Check, LogOut } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { logout, getUser } from '../../utils/auth';
import Sidebar from '../Sidebar';
import { HeaderProvider, useHeader } from '../../contexts/HeaderContext';
import { useThemeColor, THEME_COLORS } from '../../contexts/ThemeColorContext';

function GlobalHeader() {
  const navigate = useNavigate();
  const user = getUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const { breadcrumbs, actions } = useHeader();
  const { primaryColor, setPrimaryColor } = useThemeColor();

  return (
    <>
      <Flex
        align="center"
        style={{ height: 64, padding: '0 24px', borderBottom: '1px solid #27273a', flexShrink: 0 }}
      >
        {/* Left: Breadcrumbs */}
        <div style={{ flex: '0 0 auto' }}>
          {breadcrumbs}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right: Page Actions + Settings + User */}
        <Flex align="center" gap={12}>
          {actions}

          {actions && <div style={{ width: 1, height: 24, background: '#27273a', margin: '0 4px' }} />}

          {/* User Avatar */}
          <div
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--primary-color)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <Typography.Text style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
              {user?.nickname?.[0] || user?.username?.[0] || 'A'}
            </Typography.Text>
          </div>
        </Flex>
      </Flex>

      {/* Dropdown Menu */}
      {menuOpen && (
        <>
          {/* Backdrop - click anywhere to close */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 1299 }}
            onClick={() => setMenuOpen(false)}
          />
          <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute', top: 0, right: 24, zIndex: 1300,
              width: 260, background: '#1a1a24',
              border: '1px solid #27273a', borderRadius: 12, padding: '8px 0',
            }}
          >
            {/* User Info */}
            <Flex align="center" gap={12} style={{ padding: '12px 16px' }}>
              <div
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--primary-color)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <Typography.Text style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                  {user?.nickname?.[0] || user?.username?.[0] || 'A'}
                </Typography.Text>
              </div>
              <div>
                <Typography.Text style={{ fontSize: 14, fontWeight: 500, display: 'block' }}>
                  {user?.nickname || user?.username || 'Admin'}
                </Typography.Text>
                <Typography.Text style={{ fontSize: 12, color: '#a1a1aa', display: 'block' }}>
                  {user?.username || 'admin'}
                </Typography.Text>
              </div>
            </Flex>
            <Divider style={{ margin: '0 8px' }} />

            {/* Theme Color */}
            <div style={{ padding: '8px 16px' }}>
              <Typography.Text style={{ fontSize: 12, color: '#71717a', display: 'block', marginBottom: 8 }}>
                主题色
              </Typography.Text>
              <Flex wrap="wrap" gap={8}>
                {THEME_COLORS.map((c) => (
                  <div
                    key={c}
                    onClick={() => setPrimaryColor(c)}
                    style={{
                      width: 22, height: 22, borderRadius: '50%',
                      backgroundColor: c, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      outline: primaryColor === c ? '2px solid #fff' : 'none',
                      outlineOffset: 2,
                    }}
                  >
                    {primaryColor === c && <Check size={10} color="#fff" />}
                  </div>
                ))}
              </Flex>
            </div>
            <Divider style={{ margin: '0 8px' }} />

            {/* Logout */}
            <Flex
              align="center"
              gap={12}
              onClick={() => { void logout().then(() => navigate('/login')); }}
              style={{
                padding: '8px 16px', margin: '0 8px', borderRadius: 8, cursor: 'pointer',
              }}
            >
              <LogOut size={14} color="#f87171" />
              <Typography.Text style={{ fontSize: 13, fontWeight: 500, color: '#f87171' }}>退出登录</Typography.Text>
            </Flex>
          </div>
        </div>
        </>
      )}
    </>
  );
}

export default function MainLayout() {
  return (
    <Layout style={{ height: '100vh' }}>
      <Sidebar />
      <Layout style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <HeaderProvider>
          <GlobalHeader />
          <Layout.Content style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Outlet />
          </Layout.Content>
        </HeaderProvider>
      </Layout>
    </Layout>
  );
}
