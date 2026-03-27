import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Spin, Tag, Card, Flex, Empty } from 'antd';
import { BookOpen, ChevronDown, ChevronRight, FolderOpen, Folder } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { categoryNavService } from '../../services/categoryNavService';
import { steeringService } from '../../services/steeringService';
import { useIsMobile } from '../../utils/deviceDetect';
import { formatDate } from '../../utils/formatTime';
import type { CategoryNavItem, Steering } from '../../types';

interface DocTreeNode {
  categoryId: number;
  name: string;
  childCount: number;
  children: DocTreeNode[];
  loaded: boolean;
  expanded: boolean;
}

function buildNode(cat: CategoryNavItem): DocTreeNode {
  return {
    categoryId: cat.id,
    name: cat.name,
    childCount: cat.childCount,
    children: [],
    loaded: false,
    expanded: false,
  };
}

function updateNode(
  nodes: DocTreeNode[],
  targetId: number,
  updater: (n: DocTreeNode) => DocTreeNode,
): DocTreeNode[] {
  return nodes.map((n) => {
    if (n.categoryId === targetId) return updater(n);
    if (n.children.length > 0) {
      return { ...n, children: updateNode(n.children, targetId, updater) };
    }
    return n;
  });
}

const STATUS_COLOR: Record<string, string> = {
  active: 'success',
  draft: 'default',
  deprecated: 'warning',
  withdrawn: 'error',
  pending_review: 'processing',
};

export default function DocsPage() {
  const navigate = useNavigate();
  const { setBreadcrumbs, setActions } = useHeader();
  const isMobile = useIsMobile();

  const [roots, setRoots] = useState<DocTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [steerings, setSteerings] = useState<Steering[]>([]);
  const [steeringsLoading, setSteeringsLoading] = useState(false);

  // ── Header ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setBreadcrumbs(
      <Flex align="center" gap={8}>
        <BookOpen size={18} color="var(--color-primary)" />
        <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>
          文档模式
        </Typography.Text>
      </Flex>
    );
    setActions(null);
  }, [setBreadcrumbs, setActions]);

  // ── Load top-level categories ─────────────────────────────────────────────
  const loadRoots = useCallback(async () => {
    setTreeLoading(true);
    try {
      const data = await categoryNavService.listCategories();
      setRoots(data.map(buildNode));
    } catch {
      // toast from request layer
    } finally {
      setTreeLoading(false);
    }
  }, []);

  useEffect(() => { loadRoots(); }, [loadRoots]);

  // ── Load steerings for selected category ─────────────────────────────────
  const loadSteerings = useCallback(async (categoryId: number) => {
    setSteeringsLoading(true);
    setSteerings([]);
    try {
      const result = await steeringService.page({ categoryId, status: 'active', size: 50 });
      setSteerings(result.records);
    } catch {
      // toast from request layer
    } finally {
      setSteeringsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCategoryId != null) {
      loadSteerings(selectedCategoryId);
    }
  }, [selectedCategoryId, loadSteerings]);

  // ── Expand / lazy-load ────────────────────────────────────────────────────
  const handleToggleExpand = async (node: DocTreeNode) => {
    if (node.childCount === 0) return;

    if (!node.loaded) {
      try {
        const children = await categoryNavService.listCategories(node.categoryId);
        setRoots((prev) =>
          updateNode(prev, node.categoryId, (n) => ({
            ...n,
            loaded: true,
            expanded: true,
            children: children.map(buildNode),
          }))
        );
      } catch {
        // toast from request layer
      }
    } else {
      setRoots((prev) =>
        updateNode(prev, node.categoryId, (n) => ({ ...n, expanded: !n.expanded }))
      );
    }
  };

  // ── Render tree node ──────────────────────────────────────────────────────
  const renderNode = (node: DocTreeNode, depth = 0): React.ReactNode => {
    const isSelected = selectedCategoryId === node.categoryId;
    const hasChildren = node.childCount > 0;

    return (
      <div key={node.categoryId}>
        <Flex
          align="center"
          gap={6}
          style={{
            padding: `7px 12px 7px ${12 + depth * 20}px`,
            cursor: 'pointer',
            background: isSelected ? 'rgba(var(--primary-rgb), 0.15)' : 'transparent',
            borderRadius: 6,
            marginBottom: 2,
            transition: 'background 0.15s',
          }}
          onClick={() => {
            setSelectedCategoryId(node.categoryId);
            setSelectedCategoryName(node.name);
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.background = 'var(--bg-surface)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isSelected
              ? 'rgba(var(--primary-rgb), 0.15)'
              : 'transparent';
          }}
        >
          <span
            style={{ width: 14, flexShrink: 0, color: '#71717a', display: 'flex', alignItems: 'center' }}
            onClick={(e) => { e.stopPropagation(); handleToggleExpand(node); }}
          >
            {hasChildren
              ? (node.expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)
              : null}
          </span>
          {hasChildren
            ? <FolderOpen size={14} color={isSelected ? 'var(--color-primary)' : '#a1a1aa'} style={{ flexShrink: 0 }} />
            : <Folder size={14} color={isSelected ? 'var(--color-primary)' : '#71717a'} style={{ flexShrink: 0 }} />
          }
          <Typography.Text
            ellipsis={{ tooltip: node.name }}
            style={{ fontSize: 13, flex: 1, color: isSelected ? '#f4f4f5' : '#d4d4d8' }}
          >
            {node.name}
          </Typography.Text>
          {node.childCount > 0 && (
            <Typography.Text style={{ fontSize: 11, color: '#71717a', flexShrink: 0 }}>
              {node.childCount}
            </Typography.Text>
          )}
        </Flex>

        {node.expanded && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  // ── Steering card ─────────────────────────────────────────────────────────
  const renderCard = (s: Steering) => {
    const excerpt = s.content ? s.content.replace(/[#*`>\-]/g, '').trim().slice(0, 100) : '-';
    return (
      <Card
        key={s.id}
        hoverable
        onClick={() => navigate(`/steerings/${s.id}`)}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid #1e1e2a',
          borderRadius: 10,
          cursor: 'pointer',
          marginBottom: 12,
        }}
        bodyStyle={{ padding: '14px 16px' }}
      >
        <Flex vertical gap={6}>
          <Flex align="center" gap={8} justify="space-between">
            <Typography.Text
              strong
              style={{ fontSize: 14, color: '#f4f4f5', flex: 1 }}
              ellipsis={{ tooltip: s.title }}
            >
              {s.title}
            </Typography.Text>
            <Tag color={STATUS_COLOR[s.status] ?? 'default'} style={{ flexShrink: 0 }}>
              {s.status}
            </Tag>
          </Flex>

          {s.tags && s.tags.length > 0 && (
            <Flex gap={4} wrap="wrap">
              {s.tags.map((tag) => (
                <Tag key={tag} color="blue" style={{ fontSize: 11, margin: 0 }}>{tag}</Tag>
              ))}
            </Flex>
          )}

          <Typography.Text style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>
            {excerpt}
            {s.content && s.content.replace(/[#*`>\-]/g, '').trim().length > 100 ? '…' : ''}
          </Typography.Text>

          <Typography.Text style={{ fontSize: 11, color: '#52525b' }}>
            更新于 {formatDate(s.updatedAt)}
          </Typography.Text>
        </Flex>
      </Card>
    );
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', gap: 0, overflow: 'hidden' }}>
      {/* Left: category outline */}
      {!isMobile && (
        <div
          style={{
            width: 240,
            flexShrink: 0,
            borderRight: '1px solid #1e1e2a',
            overflowY: 'auto',
            padding: '12px 8px',
            background: 'var(--bg-base)',
          }}
        >
          <Typography.Text style={{ fontSize: 11, color: '#52525b', padding: '0 8px 8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            分类大纲
          </Typography.Text>
          {treeLoading ? (
            <Flex justify="center" style={{ paddingTop: 32 }}><Spin size="small" /></Flex>
          ) : roots.length === 0 ? (
            <Typography.Text style={{ fontSize: 12, color: '#52525b', padding: '0 8px' }}>暂无分类</Typography.Text>
          ) : (
            roots.map((node) => renderNode(node))
          )}
        </div>
      )}

      {/* Right: steering cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: 'var(--bg-base)' }}>
        {selectedCategoryId == null ? (
          <Flex vertical align="center" justify="center" style={{ height: '100%', minHeight: 300 }}>
            <BookOpen size={40} color="#3f3f46" />
            <Typography.Text style={{ color: 'var(--text-dimmed)', marginTop: 12 }}>
              {isMobile ? '暂无选中分类' : '← 请从左侧选择一个分类'}
            </Typography.Text>
          </Flex>
        ) : (
          <>
            <Typography.Title level={5} style={{ color: '#e4e4e7', marginTop: 0, marginBottom: 16 }}>
              {selectedCategoryName}
            </Typography.Title>
            {steeringsLoading ? (
              <Flex justify="center" style={{ paddingTop: 48 }}><Spin /></Flex>
            ) : steerings.length === 0 ? (
              <Empty description={<span style={{ color: 'var(--text-dimmed)' }}>该分类下暂无 active 规范</span>} />
            ) : (
              steerings.map(renderCard)
            )}
          </>
        )}
      </div>
    </div>
  );
}
