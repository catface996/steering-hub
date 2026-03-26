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
      setRoots(data.map(buildRootNode));
    } catch {
      // request layer shows toast
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
        setRoots((prev) =>
          updateNode(prev, node.nodeKey, (n) => ({
            ...n,
            loaded: true,
            expanded: true,
            children: children.map((c) => buildChildNode(c, node.categoryId)),
          }))
        );
      } catch {
        // toast from request layer
      }
    } else {
      setRoots((prev) =>
        updateNode(prev, node.nodeKey, (n) => ({ ...n, expanded: !n.expanded }))
      );
    }
  };

  // ── Create category ───────────────────────────────────────────────────────
  const handleCreateCategory = async (values: {
    name: string;
    code: string;
    description?: string;
    parentId?: number;
  }) => {
    setCreateSubmitting(true);
    try {
      await categoryNavService.createCategory(values);
      message.success('分类创建成功');
      setCreateOpen(false);
      createForm.resetFields();
      setSelectedNode(null);
      loadRoots();
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
      <div key={node.nodeKey}>
        <Flex
          align="center"
          gap={8}
          onClick={() => setSelectedNode(isSelected ? null : node)}
          style={{
            padding: `8px 16px 8px ${16 + depth * 24}px`,
            cursor: 'pointer',
            background: isSelected ? 'rgba(var(--primary-rgb), 0.12)' : 'transparent',
            borderRadius: 8,
            marginBottom: 2,
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.background = '#13131f';
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
          <GitBranch size={15} color="#4ade80" style={{ flexShrink: 0 }} />

          {/* Name + code */}
          <Typography.Text
            style={{ fontWeight: 500, color: isSelected ? '#f4f4f5' : '#e4e4e7', flex: 1 }}
            ellipsis={{ tooltip: node.name }}
          >
            {node.name}
          </Typography.Text>
          <Tag style={{ borderRadius: 100, fontSize: 11, fontFamily: 'monospace' }}>{node.code}</Tag>

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
          background: '#0d0d14',
          padding: '8px 4px',
        }}
      >
        {loading ? (
          <Flex justify="center" style={{ padding: 64 }}><Spin /></Flex>
        ) : roots.length === 0 ? (
          <Flex justify="center" style={{ padding: 64 }}>
            <Typography.Text style={{ color: '#52525b' }}>暂无分类数据</Typography.Text>
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
          <Form.Item
            label="分类代码"
            name="code"
            rules={[
              { required: true, message: '请输入分类代码' },
              { pattern: /^[a-z0-9-]+$/, message: '只允许小写字母、数字和连字符' },
            ]}
          >
            <Input placeholder="例：ai-dev-tools" style={{ fontFamily: 'monospace' }} />
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
                label: `${c.name} (${c.code})`,
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
                label: `${c.name} (${c.code})`,
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
                label: `${c.name} (${c.code})`,
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
