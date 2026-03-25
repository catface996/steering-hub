import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Tag, Flex, Spin, App } from 'antd';
import { useHeader } from '../../contexts/HeaderContext';
import { categoryNavService } from '../../services/categoryNavService';
import { categoryService } from '../../services/steeringService';
import type { SteeringNavItem } from '../../types';
import { formatDateTime } from '../../utils/formatTime';

// Spec [229]: Tag color mapping
function statusColor(status: string | undefined) {
  switch (status) {
    case 'active': return 'success';
    case 'draft': return 'default';
    case 'deprecated': return 'warning';
    case 'pending_review': return 'processing';
    default: return 'default';
  }
}

// Parse tags string (could be comma-separated or PostgreSQL array format {a,b,c})
function parseTags(raw?: string): string[] {
  if (!raw) return [];
  // PostgreSQL array format: {tag1,tag2}
  if (raw.startsWith('{') && raw.endsWith('}')) {
    return raw.slice(1, -1).split(',').map((t) => t.trim()).filter(Boolean);
  }
  // Comma-separated
  return raw.split(',').map((t) => t.trim()).filter(Boolean);
}

export default function CategorySteeringsPage() {
  const { id } = useParams<{ id: string }>();
  const categoryId = Number(id);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { setBreadcrumbs, setActions } = useHeader();

  const [items, setItems] = useState<SteeringNavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState<string>('-');

  // Resolve category name from id
  useEffect(() => {
    categoryService.list().then((cats) => {
      const cat = cats.find((c) => c.id === categoryId);
      setCategoryName(cat?.name ?? String(categoryId));
    }).catch(() => {});
  }, [categoryId]);

  useEffect(() => {
    setLoading(true);
    categoryNavService.listSteerings(categoryId, 50)
      .then(setItems)
      .catch(() => { message.error('加载失败'); })
      .finally(() => setLoading(false));
  }, [categoryId, message]);

  useEffect(() => {
    setBreadcrumbs(
      <Flex align="center" gap={8}>
        <Typography.Text
          style={{ fontSize: 16, color: '#a1a1aa', cursor: 'pointer' }}
          onClick={() => navigate('/categories')}
        >
          分类导航
        </Typography.Text>
        <Typography.Text style={{ color: '#52525b' }}>/</Typography.Text>
        <Typography.Text style={{ fontSize: 16, fontWeight: 700, color: '#f4f4f5' }}>
          {categoryName}
        </Typography.Text>
      </Flex>
    );
    setActions(null);
  }, [setBreadcrumbs, setActions, categoryName, navigate]);

  const thStyle: React.CSSProperties = {
    padding: '10px 16px',
    textAlign: 'left',
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: 500,
    background: '#12121c',
    borderBottom: '1px solid #1e1e2a',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid #1e1e2a',
    fontSize: 14,
    color: '#e4e4e7',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          borderRadius: 12,
          border: '1px solid #1e1e2a',
          background: '#0d0d14',
        }}
      >
        {loading ? (
          <Flex justify="center" style={{ padding: 64 }}><Spin /></Flex>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 72 }}>ID</th>
                <th style={{ ...thStyle, minWidth: 240 }}>标题</th>
                <th style={{ ...thStyle, minWidth: 200 }}>标签</th>
                <th style={{ ...thStyle, width: 180 }}>更新时间</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: '#71717a' }}>
                    暂无 active 规范
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const tags = parseTags(item.tags);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/steerings/${item.id}`)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#13131f')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      <td style={{ ...tdStyle, color: '#71717a', fontSize: 13 }}>{item.id}</td>
                      <td style={{ ...tdStyle }}>
                        {/* Spec [229]: ellipsis must use title for tooltip */}
                        <Typography.Text
                          ellipsis={{ tooltip: item.title }}
                          style={{ color: '#e4e4e7', display: 'block', maxWidth: 400 }}
                        >
                          {item.title}
                        </Typography.Text>
                      </td>
                      <td style={{ ...tdStyle }}>
                        {tags.length > 0 ? (
                          <Flex gap={4} wrap="wrap">
                            {tags.map((t) => (
                              <Tag key={t} style={{ borderRadius: 100, fontSize: 11, margin: 0 }}>{t}</Tag>
                            ))}
                          </Flex>
                        ) : (
                          /* Spec [229]: empty value → '-' */
                          <span style={{ color: '#52525b' }}>-</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, color: '#a1a1aa', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {/* Spec [229]: formatDateTime */}
                        {formatDateTime(item.updatedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      <Flex justify="flex-start" style={{ padding: '10px 0' }}>
        <Typography.Text style={{ color: '#71717a', fontSize: 13 }}>
          共 {items.length} 条 active 规范
        </Typography.Text>
      </Flex>
    </div>
  );
}
