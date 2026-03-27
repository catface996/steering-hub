import { useState } from 'react';
import { Layout, Typography, Divider, Flex, Drawer } from 'antd';
import { Check, LogOut, Menu } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { logout, getUser } from '../../utils/auth';
import Sidebar from '../Sidebar';
import { HeaderProvider, useHeader } from '../../contexts/HeaderContext';
import { useThemeColor, THEME_COLORS } from '../../contexts/ThemeColorContext';
import { useIsMobile } from '../../utils/deviceDetect';

interface GlobalHeaderProps {
  isMobile: boolean;
  onHamburgerClick: () => void;
}

function GlobalHeader({ isMobile, onHamburgerClick }: GlobalHeaderProps) {
  const navigate = useNavigate();
  const user = getUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const { breadcrumbs, actions } = useHeader();
  const { primaryColor, setPrimaryColor } = useThemeColor();

  return (
    <>
      <Flex
        align="center"
        style={{ height: 64, padding: isMobile ? '0 12px' : '0 24px', borderBottom: '1px solid #27273a', flexShrink: 0 }}
      >
        {/* Hamburger icon — mobile only */}
        {isMobile && (
          <div
            style={{ marginRight: 12, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={onHamburgerClick}
          >
            <Menu size={22} color="#a1a1aa" />
          </div>
        )}

        {/* Left: Breadcrumbs */}
        <div style={{ flex: '0 0 auto', minWidth: 0, overflow: 'hidden' }}>
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
              width: 260, background: 'var(--bg-overlay)',
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
              <LogOut size={14} color="var(--color-danger)" />
              <Typography.Text style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-danger)' }}>退出登录</Typography.Text>
            </Flex>
          </div>
        </div>
        </>
      )}
    </>
  );
}

export default function MainLayout() {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Layout style={{ height: '100vh' }}>
      {/* PC: fixed sidebar */}
      {!isMobile && <Sidebar />}

      {/* Mobile: Drawer sidebar */}
      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={280}
          styles={{ body: { padding: 0 }, header: { display: 'none' } }}
          style={{ padding: 0 }}
        >
          <Sidebar onMenuClick={() => setDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <HeaderProvider>
          <GlobalHeader isMobile={isMobile} onHamburgerClick={() => setDrawerOpen(true)} />
          <Layout.Content style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Outlet />
          </Layout.Content>
        </HeaderProvider>
      </Layout>
    </Layout>
  );
}
