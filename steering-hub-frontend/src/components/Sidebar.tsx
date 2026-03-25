import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Typography, Divider, Flex } from 'antd';
import {
  LayoutDashboard,
  FileText,
  Search,
  ShieldCheck,
  Tag,
  Key,
  ChevronDown,
  ChevronRight,
  Compass,
  Filter,
  BarChart3,
  Heart,
  Database,
  ScrollText,
} from 'lucide-react';

const drawerWidth = 280;

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  iconColor?: string;
}

const mainItems: NavItem[] = [
  { icon: <LayoutDashboard size={20} />, label: '概览', path: '/dashboard', iconColor: '#a78bfa' },
  { icon: <FileText size={20} />, label: '规范管理', path: '/steerings', iconColor: '#818cf8' },
  { icon: <Search size={20} />, label: '规范检索', path: '/search', iconColor: '#22d3ee' },
  { icon: <ShieldCheck size={20} />, label: '合规审查', path: '/compliance', iconColor: '#f59e0b' },
  { icon: <Tag size={20} />, label: '分类管理', path: '/categories', iconColor: '#4ade80' },
  { icon: <BarChart3 size={20} />, label: '使用分析', path: '/analytics', iconColor: '#f472b6' },
  { icon: <Heart size={20} />, label: '规范健康度', path: '/health', iconColor: '#fb7185' },
  { icon: <ScrollText size={20} />, label: '检索日志', path: '/query-logs', iconColor: '#fb923c' },
  { icon: <Database size={20} />, label: '仓库管理', path: '/repos', iconColor: '#38bdf8' },
];

const settingsItems: NavItem[] = [
  { icon: <Key size={20} />, label: 'API Keys', path: '/settings/api-keys', iconColor: '#fbbf24' },
  { icon: <Filter size={20} />, label: '停用词', path: '/settings/stop-words', iconColor: '#fb923c' },
];

type SectionKey = 'main' | 'settings';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    main: true,
    settings: true,
  });

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isSelected = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const renderNavItems = (items: NavItem[]) => (
    <div style={{ padding: '0 4px' }}>
      {items.map((item) => (
        <Flex
          key={item.label}
          align="center"
          gap={12}
          onClick={() => navigate(item.path)}
          style={{
            padding: '8px 16px',
            borderRadius: 100,
            cursor: 'pointer',
            background: isSelected(item.path) ? 'rgba(var(--primary-rgb), 0.12)' : 'transparent',
            color: isSelected(item.path) ? '#f4f4f5' : '#a1a1aa',
            marginBottom: 2,
          }}
        >
          <span style={{ fontSize: 18, display: 'flex', alignItems: 'center', color: item.iconColor || 'inherit', filter: isSelected(item.path) ? 'brightness(1.4) drop-shadow(0 0 4px currentColor)' : 'none' }}>
            {item.icon}
          </span>
          <Typography.Text style={{ fontSize: 14, color: 'inherit' }}>{item.label}</Typography.Text>
        </Flex>
      ))}
    </div>
  );

  const renderSection = (title: string, key: SectionKey, items: NavItem[]) => (
    <div>
      <Flex
        align="center"
        onClick={() => toggleSection(key)}
        style={{ padding: '8px 16px', cursor: 'pointer' }}
      >
        <Typography.Text style={{ flex: 1, fontSize: 12, color: '#a1a1aa', letterSpacing: 0.5 }}>
          {title}
        </Typography.Text>
        {openSections[key] ? <ChevronDown size={14} color="#a1a1aa" /> : <ChevronRight size={14} color="#a1a1aa" />}
      </Flex>
      {openSections[key] && renderNavItems(items)}
    </div>
  );

  return (
    <Layout.Sider
      width={drawerWidth}
      style={{
        background: '#0d0d14',
        borderRight: '1px solid #1e1e2a',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Flex align="center" gap={10} style={{ height: 64, flexShrink: 0, borderBottom: '1px solid #1e1e2a', padding: '0 20px' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'var(--primary-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Compass size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <Typography.Text style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e4e4e7' }}>Steering Hub</Typography.Text>
        </Flex>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 8px' }}>
          {renderSection('导航', 'main', mainItems)}
          {renderSection('设置', 'settings', settingsItems)}
        </div>

      </div>
    </Layout.Sider>
  );
}
