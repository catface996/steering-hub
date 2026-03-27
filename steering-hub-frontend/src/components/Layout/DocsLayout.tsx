import { Typography, Flex } from 'antd';
import { BookOpen } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { HeaderProvider, useHeader } from '../../contexts/HeaderContext';

function DocsHeader() {
  const { breadcrumbs, actions } = useHeader();

  return (
    <Flex
      align="center"
      style={{ height: 52, padding: '0 20px', borderBottom: '1px solid #1e1e2a', flexShrink: 0 }}
    >
      <Flex align="center" gap={10}>
        <BookOpen size={18} color="var(--color-primary)" />
        <Typography.Text style={{ fontSize: 16, fontWeight: 700, color: '#f4f4f5' }}>文档模式</Typography.Text>
      </Flex>

      {breadcrumbs && (
        <>
          <div style={{ width: 1, height: 16, background: '#27273a', margin: '0 12px' }} />
          {breadcrumbs}
        </>
      )}

      <div style={{ flex: 1 }} />

      {actions && (
        <Flex align="center" gap={12}>
          {actions}
        </Flex>
      )}
    </Flex>
  );
}

export default function DocsLayout() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <HeaderProvider>
        <DocsHeader />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </div>
      </HeaderProvider>
    </div>
  );
}
