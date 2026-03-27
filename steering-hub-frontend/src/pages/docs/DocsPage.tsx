import { useState, useCallback, useEffect } from 'react';
import { Typography, Spin, Tag, Card, Flex, Empty, Button, Input } from 'antd';
import { BookOpen, ChevronDown, ChevronRight, FolderOpen, Folder, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { categoryNavService } from '../../services/categoryNavService';
import { steeringService } from '../../services/steeringService';
import { useIsMobile } from '../../utils/deviceDetect';
import { useHeader } from '../../contexts/HeaderContext';
import { formatDate, formatDateTime } from '../../utils/formatTime';
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

type RightPanel =
  | { kind: 'empty' }
  | { kind: 'list'; categoryId: number; categoryName: string; steerings: Steering[]; loading: boolean }
  | { kind: 'detail'; steering: Steering; fromCategoryId: number; fromCategoryName: string; backPanel?: RightPanel }
  | { kind: 'search'; query: string; results: Steering[]; loading: boolean };

export default function DocsPage() {
  const isMobile = useIsMobile();
  const { setBreadcrumbs, setActions } = useHeader();

  const [roots, setRoots] = useState<DocTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [rightPanel, setRightPanel] = useState<RightPanel>({ kind: 'empty' });
  

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

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setRightPanel({ kind: 'search', query: value, results: [], loading: true });
    try {
      const result = await steeringService.page({ keyword: value, status: 'active', size: 20, current: 1 });
      setRightPanel({ kind: 'search', query: value, results: result.records, loading: false });
    } catch {
      setRightPanel({ kind: 'search', query: value, results: [], loading: false });
    }
  }, []);

  useEffect(() => {
    if (rightPanel.kind === 'list') {
      setBreadcrumbs(
        <Typography.Text style={{ fontSize: 13, color: '#a1a1aa' }}>{rightPanel.categoryName}</Typography.Text>
      );
    } else if (rightPanel.kind === 'detail') {
      setBreadcrumbs(
        <Typography.Text style={{ fontSize: 13, color: '#a1a1aa' }}>{rightPanel.steering.title}</Typography.Text>
      );
    } else if (rightPanel.kind === 'search') {
      setBreadcrumbs(
        <Typography.Text style={{ fontSize: 13, color: '#a1a1aa' }}>搜索："{rightPanel.query}"</Typography.Text>
      );
    } else {
      setBreadcrumbs(null);
    }
  }, [rightPanel, setBreadcrumbs]);

  useEffect(() => {
    setActions(
      <Input.Search
        placeholder="搜索规范..."
        allowClear
        style={{ width: isMobile ? 160 : 280 }}
        onSearch={handleSearch}
      />
    );
    return () => setActions(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // ── Load steerings for selected category ─────────────────────────────────
  const handleSelectCategory = useCallback(async (categoryId: number, categoryName: string) => {
    setRightPanel({ kind: 'list', categoryId, categoryName, steerings: [], loading: true });
    try {
      const result = await steeringService.page({ categoryId, status: 'active', size: 50 });
      setRightPanel({ kind: 'list', categoryId, categoryName, steerings: result.records, loading: false });
    } catch {
      setRightPanel({ kind: 'list', categoryId, categoryName, steerings: [], loading: false });
    }
  }, []);

  // ── Load steering detail ──────────────────────────────────────────────────
  const handleSelectSteering = useCallback(async (steeringId: number, fromCategoryId: number, fromCategoryName: string, backPanel?: RightPanel) => {
    try {
      const data = await steeringService.get(steeringId);
      setRightPanel({ kind: 'detail', steering: data, fromCategoryId, fromCategoryName, backPanel });
    } catch {
      // toast from request layer
    }
  }, []);

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
    const isSelected =
      (rightPanel.kind === 'list' && rightPanel.categoryId === node.categoryId) ||
      (rightPanel.kind === 'detail' && rightPanel.fromCategoryId === node.categoryId);
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
          onClick={() => handleSelectCategory(node.categoryId, node.name)}
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
  const renderCard = (s: Steering, fromCategoryId: number, fromCategoryName: string, backPanel?: RightPanel) => {
    const excerpt = s.content ? s.content.replace(/[#*`>\-]/g, '').trim().slice(0, 100) : '-';
    return (
      <Card
        key={s.id}
        hoverable
        onClick={() => handleSelectSteering(s.id, fromCategoryId, fromCategoryName, backPanel)}
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

  // ── Detail view ───────────────────────────────────────────────────────────
  const renderDetail = (steering: Steering, fromCategoryId: number, fromCategoryName: string, backPanel?: RightPanel) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Back bar */}
      <Flex align="center" gap={8} style={{ padding: '12px 20px', borderBottom: '1px solid #1e1e2a', flexShrink: 0 }}>
        <Button
          type="text"
          icon={<ArrowLeft size={14} />}
          style={{ color: '#a1a1aa', paddingLeft: 0 }}
          onClick={() => backPanel ? setRightPanel(backPanel) : handleSelectCategory(fromCategoryId, fromCategoryName)}
        >
          {backPanel?.kind === 'search' ? '返回搜索结果' : '返回列表'}
        </Button>
        <Typography.Text style={{ color: '#52525b' }}>/</Typography.Text>
        <Typography.Text style={{ color: '#e4e4e7', fontWeight: 600, fontSize: 14 }} ellipsis>
          {steering.title}
        </Typography.Text>
        <Tag color={STATUS_COLOR[steering.status] ?? 'default'} style={{ marginLeft: 4 }}>
          {steering.status}
        </Tag>
      </Flex>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {/* Tags */}
        {steering.tags && steering.tags.length > 0 && (
          <Flex gap={4} wrap="wrap" style={{ marginBottom: 12 }}>
            {steering.tags.map((tag) => (
              <Tag key={tag} color="blue" style={{ fontSize: 11, margin: 0 }}>{tag}</Tag>
            ))}
          </Flex>
        )}

        {/* Meta */}
        <Flex gap={16} style={{ marginBottom: 20, flexWrap: 'wrap' }}>
          {steering.categoryName && (
            <Typography.Text style={{ fontSize: 12, color: '#71717a' }}>分类：{steering.categoryName}</Typography.Text>
          )}
          <Typography.Text style={{ fontSize: 12, color: '#71717a' }}>版本：v{steering.currentVersion}</Typography.Text>
          <Typography.Text style={{ fontSize: 12, color: '#71717a' }}>更新于 {formatDateTime(steering.updatedAt)}</Typography.Text>
        </Flex>

        {/* Markdown content */}
        <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{steering.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );

  // ── Layout ────────────────────────────────────────────────────────────────
  const showSidebar = !isMobile || rightPanel.kind === 'empty';

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: 'var(--bg-base)' }}>
      {/* Left: category outline */}
      {showSidebar && (
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

      {/* Right: dynamic panel */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
        {rightPanel.kind === 'empty' && (
          <Flex vertical align="center" justify="center" style={{ height: '100%', minHeight: 300 }}>
            <BookOpen size={40} color="#3f3f46" />
            <Typography.Text style={{ color: 'var(--text-dimmed)', marginTop: 12 }}>
              {isMobile ? '暂无选中分类' : '← 请从左侧选择一个分类'}
            </Typography.Text>
          </Flex>
        )}

        {rightPanel.kind === 'list' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <Typography.Title level={5} style={{ color: '#e4e4e7', marginTop: 0, marginBottom: 16 }}>
              {rightPanel.categoryName}
            </Typography.Title>
            {rightPanel.loading ? (
              <Flex justify="center" style={{ paddingTop: 48 }}><Spin /></Flex>
            ) : rightPanel.steerings.length === 0 ? (
              <Empty description={<span style={{ color: 'var(--text-dimmed)' }}>该分类下暂无 active 规范</span>} />
            ) : (
              rightPanel.steerings.map((s) => renderCard(s, rightPanel.categoryId, rightPanel.categoryName))
            )}
          </div>
        )}

        {rightPanel.kind === 'detail' && renderDetail(
          rightPanel.steering,
          rightPanel.fromCategoryId,
          rightPanel.fromCategoryName,
          rightPanel.backPanel,
        )}

        {rightPanel.kind === 'search' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, display: 'block', marginBottom: 16 }}>
              搜索："{rightPanel.query}"，共 {rightPanel.results.length} 条结果
            </Typography.Text>
            {rightPanel.loading ? (
              <Flex justify="center" style={{ paddingTop: 48 }}><Spin /></Flex>
            ) : rightPanel.results.length === 0 ? (
              <Empty description={<span style={{ color: 'var(--text-dimmed)' }}>未找到相关规范</span>} />
            ) : (
              rightPanel.results.map((s) =>
                renderCard(s, 0, '', { kind: 'search', query: rightPanel.query, results: rightPanel.results, loading: false })
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
