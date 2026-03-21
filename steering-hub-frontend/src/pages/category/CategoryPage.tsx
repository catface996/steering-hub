import { useState, useEffect } from 'react';
import { Typography, Button, Input, Card, Flex, Spin, Modal, App } from 'antd';
import { Plus, ChevronRight } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { categoryService } from '../../services/steeringService';
import type { SteeringCategory } from '../../types';

export default function CategoryPage() {
  const { setBreadcrumbs, setActions } = useHeader();
  const { message } = App.useApp();
  const [categories, setCategories] = useState<SteeringCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  useEffect(() => {
    setBreadcrumbs(
      <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>分类管理</Typography.Text>
    );
    setActions(
      <Button type="primary" icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
        新建分类
      </Button>
    );
  }, [setBreadcrumbs, setActions]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryService.list();
      setCategories(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCategories(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await categoryService.create(form);
      message.success('创建成功');
      setModalOpen(false);
      setForm({ name: '', code: '', description: '' });
      loadCategories();
    } catch {
      message.error('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle = { fontSize: 13, color: '#a1a1aa', display: 'block' as const, marginBottom: 4, fontWeight: 500 };

  return (
    <div className="list-page">
      {/* Table Card */}
      <Card
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      >
        {loading ? (
          <Flex justify="center" align="center" style={{ flex: 1, padding: 48 }}>
            <Spin size="large" />
          </Flex>
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            {/* Header */}
            <Flex style={{ padding: '12px 20px', borderBottom: '1px solid #27273a', background: '#1e1e2a' }}>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 60 }}>ID</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 160 }}>分类名称</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 160 }}>编码</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, flex: 1 }}>描述</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 60 }}>操作</Typography.Text>
            </Flex>
            {/* Rows */}
            {categories.map((cat) => (
              <Flex key={cat.id} align="center" style={{ padding: '10px 20px', borderBottom: '1px solid #27273a' }}>
                <Typography.Text style={{ color: '#71717a', fontSize: 13, width: 60 }}>{cat.id}</Typography.Text>
                <Typography.Text style={{ fontSize: 13, fontWeight: 500, width: 160 }}>{cat.name}</Typography.Text>
                <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, width: 160, fontFamily: 'monospace' }}>{cat.code}</Typography.Text>
                <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, flex: 1 }} ellipsis>{cat.description}</Typography.Text>
                <div style={{ width: 60 }}>
                  <ChevronRight size={16} style={{ color: '#71717a', cursor: 'pointer' }} />
                </div>
              </Flex>
            ))}
          </div>
        )}
        <Flex justify="space-between" align="center" style={{ padding: '10px 20px', borderTop: '1px solid #27273a' }}>
          <Typography.Text style={{ color: '#71717a', fontSize: 13 }}>
            共 {categories.length} 个分类
          </Typography.Text>
        </Flex>
      </Card>

      {/* Create Modal */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title="新建分类"
        footer={null}
        width={480}
      >
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          <div>
            <Typography.Text style={labelStyle}>分类名称</Typography.Text>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Typography.Text style={labelStyle}>分类编码</Typography.Text>
            <Input
              required
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </div>
          <div>
            <Typography.Text style={labelStyle}>描述</Typography.Text>
            <Input.TextArea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <Flex justify="flex-end" gap={12}>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>创建</Button>
          </Flex>
        </form>
      </Modal>
    </div>
  );
}
