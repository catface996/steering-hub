import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Button, Flex, Spin, Tag, App, Modal, Select, Form, Input, InputNumber,
} from 'antd';
import { GitBranch, Plus, Trash2, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { categoryNavService } from '../../services/categoryNavService';
import { categoryService } from '../../services/steeringService';
import type { CategoryNavItem, SteeringCategory } from '../../types';
import ConfirmModal from '../../components/ConfirmModal';

// Tree node data (supports DAG — same category can appear under multiple parents)
interface TreeNode {
  categoryId: number;
  parentCategoryId?: number;
  nodeKey: string;      // "root::{id}" for top-level, "{parentId}::{childId}" for children
  name: string;
  code: string;
  description?: string;
  childCount: number;
  sortOrder: number;
  children: TreeNode[];
  loaded: boolean;
  expanded: boolean;
}

function buildRootNode(cat: CategoryNavItem): TreeNode {
  return {
    categoryId: cat.id,
    nodeKey: `root::${cat.id}`,
    name: cat.name,
    code: cat.code,
    description: cat.description,
    childCount: cat.childCount,
    sortOrder: cat.sortOrder,
    children: [],
    loaded: false,
    expanded: false,
  };
}

function buildChildNode(cat: CategoryNavItem, parentId: number): TreeNode {
  return {
    categoryId: cat.id,
    parentCategoryId: parentId,
    nodeKey: `${parentId}::${cat.id}`,
    name: cat.name,
    code: cat.code,
    description: cat.description,
    childCount: cat.childCount,
    sortOrder: cat.sortOrder,
    children: [],
    loaded: false,
    expanded: false,
  };
}

function updateNode(
  nodes: TreeNode[],
  targetKey: string,
  updater: (n: TreeNode) => TreeNode,
): TreeNode[] {
  return nodes.map((n) => {
    if (n.nodeKey === targetKey) return updater(n);
    if (n.children.length > 0) {
      return { ...n, children: updateNode(n.children, targetKey, updater) };
    }
    return n;
  });
}

// ── localStorage persistence ──────────────────────────────────────────────
const STORAGE_EXPANDED_KEYS = 'steering-hub:category-expanded-keys';
const STORAGE_SELECTED = 'steering-hub:category-selected-key';

function collectExpandedKeys(nodes: TreeNode[]): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    if (node.expanded) {
      keys.push(node.nodeKey);
      keys.push(...collectExpandedKeys(node.children));
    }
  }
  return keys;
}
function saveExpandedKeys(nodes: TreeNode[]) {
  localStorage.setItem(STORAGE_EXPANDED_KEYS, JSON.stringify(collectExpandedKeys(nodes)));
}
function saveSelectedKey(node: TreeNode | null) {
  if (node) localStorage.setItem(STORAGE_SELECTED, node.nodeKey);
  else localStorage.removeItem(STORAGE_SELECTED);
}
function loadExpandedKeys(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_EXPANDED_KEYS) || '[]'); } catch { return []; }
}
function loadSelectedKey(): string | null {
  return localStorage.getItem(STORAGE_SELECTED);
}
function findNodeByKey(nodes: TreeNode[], key: string): TreeNode | null {
  for (const node of nodes) {
    if (node.nodeKey === key) return node;
    const found = findNodeByKey(node.children, key);
    if (found) return found;
  }
  return null;
}

export default function CategoryNavPage() {
  const { setBreadcrumbs, setActions } = useHeader();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [roots, setRoots] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  // All categories (for the add-hierarchy selects)
  const [allCategories, setAllCategories] = useState<SteeringCategory[]>([]);

  // Create category modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm] = Form.useForm();

  // Add hierarchy modal
  const [addOpen, setAddOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addForm] = Form.useForm();

  // Delete hierarchy modal (rule 230: use ConfirmModal, no Modal.confirm)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Load top-level categories ──────────────────────────────────────────────
  const loadRoots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await categoryNavService.listCategories();
      const rawRoots = data.map(buildRootNode);
      const savedKeys = new Set(loadExpandedKeys());

      // Recursively restore expanded nodes
      const restore = async (nodes: TreeNode[]): Promise<TreeNode[]> =>
        Promise.all(nodes.map(async (node) => {
          if (savedKeys.has(node.nodeKey) && node.childCount > 0) {
            try {
              const children = await categoryNavService.listCategories(node.categoryId);
              const childNodes = children.map(c => buildChildNode(c, node.categoryId));
              return { ...node, loaded: true, expanded: true, children: await restore(childNodes) };
            } catch { return node; }
          }
          return node;
        }));

      const restoredRoots = savedKeys.size > 0 ? await restore(rawRoots) : rawRoots;
      setRoots(restoredRoots);

      // Restore selected node
      const savedKey = loadSelectedKey();
      if (savedKey) {
        const found = findNodeByKey(restoredRoots, savedKey);
        if (found) setSelectedNode(found);
      }
    } catch {
      // request layer shows toast
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload roots then select & scroll to the newly created node (preserving expand state)
  const loadRootsAndSelect = useCallback(async (newId: number, parentId?: number) => {
    setLoading(true);
    try {
      const data = await categoryNavService.listCategories();
      const rawRoots = data.map(buildRootNode);

      // Read previously persisted expanded keys and add the parent of the new node
      const savedKeys = new Set(loadExpandedKeys());
      if (parentId) {
        // Ensure the parent path is expanded so the new node is visible
        const parentRootKey = `root::${parentId}`;
        savedKeys.add(parentRootKey);
        // Also add nested parent key pattern — if parent is itself a child node,
        // its nodeKey would be "{grandparentId}::{parentId}"; we don't know the
        // grandparent here, but any key ending with ::parentId will be picked up
        // during recursive restore because we match by nodeKey which is built from
        // the tree structure itself.
      }

      // Recursively restore expanded nodes (same logic as loadRoots)
      const restore = async (nodes: TreeNode[]): Promise<TreeNode[]> =>
        Promise.all(nodes.map(async (node) => {
          if (savedKeys.has(node.nodeKey) && node.childCount > 0) {
            try {
              const children = await categoryNavService.listCategories(node.categoryId);
              const childNodes = children.map(c => buildChildNode(c, node.categoryId));
              return { ...node, loaded: true, expanded: true, children: await restore(childNodes) };
            } catch { return node; }
          }
          return node;
        }));

      const restoredRoots = savedKeys.size > 0 ? await restore(rawRoots) : rawRoots;

      // For nested parents not covered by root-level keys, ensure they are expanded
      let finalRoots = restoredRoots;
      if (parentId) {
        const parentNode = findNodeByKey(restoredRoots, `root::${parentId}`);
        if (!parentNode) {
          // Parent is a nested node — find and expand it by scanning all possible nodeKeys
          const nestedKey = (() => {
            const found = findNodeByKey(restoredRoots, `root::${parentId}`);
            if (found) return found.nodeKey;
            // Search for any key matching "X::parentId"
            const search = (nodes: TreeNode[]): string | null => {
              for (const n of nodes) {
                if (n.categoryId === parentId) return n.nodeKey;
                const r = search(n.children);
                if (r) return r;
              }
              return null;
            };
            return search(restoredRoots);
          })();
          if (nestedKey) {
            // Load children for the nested parent and expand it
            const children = await categoryNavService.listCategories(parentId);
            const childNodes = children.map(c => buildChildNode(c, parentId));
            finalRoots = updateNode(restoredRoots, nestedKey, (n) => ({
              ...n, loaded: true, expanded: true, children: childNodes,
            }));
          }
        }
      }

      setRoots(finalRoots);
      saveExpandedKeys(finalRoots);

      // Select and scroll to the new node
      const newNodeKey = parentId ? `${parentId}::${newId}` : `root::${newId}`;
      const newNode = findNodeByKey(finalRoots, newNodeKey);
      if (newNode) {
        setSelectedNode(newNode);
        saveSelectedKey(newNode);
        setTimeout(() => {
          document.querySelector(`[data-node-id="${newNode.nodeKey}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    } catch {
      // toast from request layer
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRoots(); }, [loadRoots]);

  // Load all categories for dropdown
  useEffect(() => {
    categoryService.list().then(setAllCategories).catch(() => {});
  }, []);

  // ── Header ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setBreadcrumbs(
      <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>分类导航</Typography.Text>
    );
    setActions(
      <Flex gap={8}>
        {selectedNode?.parentCategoryId != null && (
          <Button
            danger
            icon={<Trash2 size={14} />}
            onClick={() => setDeleteConfirmOpen(true)}
          >
            删除关系
          </Button>
        )}
        <Button icon={<Plus size={14} />} onClick={() => {
            if (selectedNode) {
              createForm.setFieldValue('parentId', selectedNode.categoryId);
            }
            setCreateOpen(true);
          }}>新建分类
        </Button>
        <Button type="primary" icon={<Plus size={14} />} onClick={() => {
            if (selectedNode) {
              addForm.setFieldValue('parentCategoryId', selectedNode.categoryId);
            }
            setAddOpen(true);
          }}>添加子分类关系
        </Button>
      </Flex>
    );
  }, [setBreadcrumbs, setActions, selectedNode]);

  // ── Expand / Lazy-load ────────────────────────────────────────────────────
  const handleToggleExpand = async (node: TreeNode) => {
    if (node.childCount === 0) return;

    if (!node.loaded) {
      try {
        const children = await categoryNavService.listCategories(node.categoryId);
        setRoots((prev) => {
          const updated = updateNode(prev, node.nodeKey, (n) => ({
            ...n,
            loaded: true,
            expanded: true,
            children: children.map((c) => buildChildNode(c, node.categoryId)),
          }));
          saveExpandedKeys(updated);
          return updated;
        });
      } catch {
        // toast from request layer
      }
    } else {
      setRoots((prev) => {
        const updated = updateNode(prev, node.nodeKey, (n) => ({ ...n, expanded: !n.expanded }));
        saveExpandedKeys(updated);
        return updated;
      });
    }
  };

  // ── Create category ───────────────────────────────────────────────────────
  const handleCreateCategory = async (values: {
    name: string;
    description?: string;
    parentId?: number;
  }) => {
    setCreateSubmitting(true);
    try {
      const newCategory = await categoryNavService.createCategory(values);
      message.success('分类创建成功');
      setCreateOpen(false);
      createForm.resetFields();
      await loadRootsAndSelect(newCategory.id, values.parentId);
      categoryService.list().then(setAllCategories).catch(() => {});
    } catch {
      // toast from request layer
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ── Add hierarchy ─────────────────────────────────────────────────────────
  const handleAddHierarchy = async (values: {
    parentCategoryId: number;
    childCategoryId: number;
    sortOrder: number;
  }) => {
    setAddSubmitting(true);
    try {
      await categoryNavService.addHierarchy(
        values.parentCategoryId,
        values.childCategoryId,
        values.sortOrder ?? 0
      );
      message.success('关系添加成功');
      setAddOpen(false);
      addForm.resetFields();
      setSelectedNode(null);
      saveSelectedKey(null);
      loadRoots();
    } catch {
      // toast from request layer; CYCLE_DETECTED will show the backend message
    } finally {
      setAddSubmitting(false);
    }
  };

  // ── Delete hierarchy ──────────────────────────────────────────────────────
  const handleDeleteHierarchy = async () => {
    if (!selectedNode || selectedNode.parentCategoryId == null) return;
    setDeleting(true);
    try {
      await categoryNavService.removeHierarchy(
        selectedNode.parentCategoryId,
        selectedNode.categoryId
      );
      message.success('关系已删除');
      setDeleteConfirmOpen(false);
      setSelectedNode(null);
      saveSelectedKey(null);
      loadRoots();
    } catch {
      // toast from request layer
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const renderNode = (node: TreeNode, depth = 0) => {
    const isSelected = selectedNode?.nodeKey === node.nodeKey;
    const hasChildren = node.childCount > 0;

    return (
      <div key={node.nodeKey} data-node-id={node.nodeKey}>
        <Flex
          align="center"
          gap={8}
          onClick={() => { const next = isSelected ? null : node; setSelectedNode(next); saveSelectedKey(next); }}
          style={{
            padding: `8px 16px 8px ${16 + depth * 24}px`,
            cursor: 'pointer',
            background: isSelected ? 'rgba(var(--primary-rgb), 0.12)' : 'transparent',
            borderRadius: 8,
            marginBottom: 2,
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.background = 'var(--bg-surface)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isSelected ? 'rgba(var(--primary-rgb), 0.12)' : 'transparent';
          }}
        >
          {/* Expand toggle */}
          <span
            style={{ width: 16, flexShrink: 0, color: '#71717a', display: 'flex', alignItems: 'center' }}
            onClick={(e) => { e.stopPropagation(); handleToggleExpand(node); }}
          >
            {hasChildren
              ? (node.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)
              : null}
          </span>

          {/* Icon */}
          <GitBranch size={15} color="var(--color-success-light)" style={{ flexShrink: 0 }} />

          {/* Name + code */}
          <Typography.Text
            style={{ fontWeight: 500, color: isSelected ? '#f4f4f5' : '#e4e4e7', flex: 1 }}
            ellipsis={{ tooltip: node.name }}
          >
            {node.name}
          </Typography.Text>

          {/* childCount badge */}
          {node.childCount > 0 && (
            <Tag color="default" style={{ borderRadius: 100, fontSize: 11 }}>
              {node.childCount} 子分类
            </Tag>
          )}

          {/* View steerings */}
          <Button
            size="small"
            icon={<FileText size={12} />}
            style={{ fontSize: 12 }}
            onClick={(e) => { e.stopPropagation(); navigate(`/categories/${node.categoryId}/steerings`); }}
          >
            查看规范
          </Button>
        </Flex>

        {/* Children */}
        {node.expanded && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          borderRadius: 12,
          border: '1px solid #1e1e2a',
          background: 'var(--bg-base)',
          padding: '8px 4px',
        }}
      >
        {loading ? (
          <Flex justify="center" style={{ padding: 64 }}><Spin /></Flex>
        ) : roots.length === 0 ? (
          <Flex justify="center" style={{ padding: 64 }}>
            <Typography.Text style={{ color: 'var(--text-dimmed)' }}>暂无分类数据</Typography.Text>
          </Flex>
        ) : (
          roots.map((node) => renderNode(node))
        )}
      </div>

      {/* Create category modal */}
      <Modal
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
        title="新建分类"
        footer={null}
        width={480}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateCategory}
          style={{ paddingTop: 8 }}
        >
          <Form.Item
            label="分类名称"
            name="name"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="例：AI 开发工具" />
          </Form.Item>
<Form.Item label="描述" name="description">
            <Input.TextArea placeholder="选填" rows={3} />
          </Form.Item>
          <Form.Item label="父分类" name="parentId">
            <Select
              placeholder="不选则创建为一级分类"
              showSearch
              allowClear
              optionFilterProp="label"
              options={allCategories.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </Form.Item>
          <Flex justify="flex-end" gap={12}>
            <Button onClick={() => { setCreateOpen(false); createForm.resetFields(); }}>取消</Button>
            <Button type="primary" htmlType="submit" loading={createSubmitting}>创建</Button>
          </Flex>
        </Form>
      </Modal>

      {/* Add hierarchy modal */}
      <Modal
        open={addOpen}
        onCancel={() => { setAddOpen(false); addForm.resetFields(); }}
        title="添加子分类关系"
        footer={null}
        width={480}
      >
        <Form
          form={addForm}
          layout="vertical"
          onFinish={handleAddHierarchy}
          style={{ paddingTop: 8 }}
        >
          <Form.Item
            label="父分类"
            name="parentCategoryId"
            rules={[{ required: true, message: '请选择父分类' }]}
          >
            <Select
              placeholder="选择父分类"
              showSearch
              optionFilterProp="label"
              options={allCategories.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="子分类"
            name="childCategoryId"
            rules={[{ required: true, message: '请选择子分类' }]}
          >
            <Select
              placeholder="选择子分类"
              showSearch
              optionFilterProp="label"
              options={allCategories.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </Form.Item>
          <Form.Item label="排序权重" name="sortOrder" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Flex justify="flex-end" gap={12}>
            <Button onClick={() => { setAddOpen(false); addForm.resetFields(); }}>取消</Button>
            <Button type="primary" htmlType="submit" loading={addSubmitting}>确定添加</Button>
          </Flex>
        </Form>
      </Modal>

      {/* Delete relation confirm (spec 230: ConfirmModal, no Modal.confirm) */}
      <ConfirmModal
        open={deleteConfirmOpen}
        title="确认删除关系"
        content={
          selectedNode
            ? `确定要删除「${allCategories.find((c) => c.id === selectedNode.parentCategoryId)?.name ?? '-'} → ${selectedNode.name}」的父子关系吗？此操作不删除分类本身。`
            : ''
        }
        okText="确认删除"
        loading={deleting}
        onConfirm={handleDeleteHierarchy}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}
