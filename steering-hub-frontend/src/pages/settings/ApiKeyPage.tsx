import { useState, useEffect } from 'react';
import { Typography, Button, Input, Card, Flex, Spin, Modal, Switch, Tag, Tooltip, App } from 'antd';
import { Plus, Trash2, Copy, Check, AlertTriangle } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { apiKeyService } from '../../services/apiKeyService';
import type { ApiKeyItem } from '../../types';
import { formatDate } from '../../utils/formatTime';

export default function ApiKeyPage() {
  const { setBreadcrumbs, setActions } = useHeader();
  const { message } = App.useApp();
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [keyDisplayModal, setKeyDisplayModal] = useState<{ open: boolean; key: string; name: string }>({
    open: false, key: '', name: '',
  });
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    setBreadcrumbs(
      <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>API Keys</Typography.Text>
    );
    setActions(
      <Button type="primary" icon={<Plus size={14} />} onClick={() => setCreateModalOpen(true)}>
        创建 API Key
      </Button>
    );
  }, [setBreadcrumbs, setActions]);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const data = await apiKeyService.list();
      setApiKeys(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadKeys(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await apiKeyService.create(form);
      setCreateModalOpen(false);
      setForm({ name: '', description: '' });
      setKeyDisplayModal({ open: true, key: data.keyValue, name: data.name });
      loadKeys();
    } catch {
      message.error('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await apiKeyService.toggle(id);
      message.success('状态更新成功');
      loadKeys();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (item: ApiKeyItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除 API Key "${item.name}" 吗？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await apiKeyService.delete(item.id);
          message.success('删除成功');
          loadKeys();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleCopy = (id: number, keyValue: string) => {
    navigator.clipboard.writeText(keyValue);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(keyDisplayModal.key);
    message.success('API Key 已复制到剪贴板');
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
            <Flex style={{ padding: '12px 20px', borderBottom: '1px solid #27273a', background: '#1e1e2a', position: 'sticky', top: 0, zIndex: 10 }}>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 180 }}>名称</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 260 }}>Key 值</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, flex: 1 }}>描述</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 80, textAlign: 'center' }}>状态</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 120, textAlign: 'center' }}>最后使用</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 120, textAlign: 'center' }}>创建时间</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 100, textAlign: 'center' }}>操作</Typography.Text>
            </Flex>
            {/* Rows */}
            {apiKeys.length > 0 ? (
              apiKeys.map((item) => (
                <Flex key={item.id} align="center" style={{ padding: '10px 20px', borderBottom: '1px solid #27273a' }}>
                  <Typography.Text style={{ fontSize: 13, fontWeight: 500, width: 180 }} ellipsis={{ tooltip: true }}>{item.name}</Typography.Text>
                  <Flex gap={8} align="center" style={{ width: 260 }}>
                    <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, fontFamily: 'monospace', flex: 1 }} ellipsis={{ tooltip: true }}>{item.keyValue}</Typography.Text>
                    <Button
                      type="text"
                      size="small"
                      icon={copiedId === item.id ? <Check size={14} color="#32D583" /> : <Copy size={14} color="#a1a1aa" />}
                      onClick={() => handleCopy(item.id, item.keyValue)}
                      style={{ padding: '0 4px' }}
                    />
                  </Flex>
                  <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, flex: 1 }} ellipsis={{ tooltip: true }}>{item.description || '-'}</Typography.Text>
                  <div style={{ width: 80, textAlign: 'center' }}>
                    <Tag
                      className={`tag-base ${item.enabled ? 'tag-enabled' : 'tag-disabled'}`}
                    >
                      {item.enabled ? '已启用' : '已禁用'}
                    </Tag>
                  </div>
                  <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, width: 120, textAlign: 'center' }}>
                    {formatDate(item.lastUsedAt)}
                  </Typography.Text>
                  <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, width: 120, textAlign: 'center' }}>
                    {formatDate(item.createdAt)}
                  </Typography.Text>
                  <Flex gap={8} justify="center" style={{ width: 100 }}>
                    <Tooltip title={item.enabled ? '禁用' : '启用'}>
                      <Switch
                        checked={item.enabled}
                        onChange={() => handleToggle(item.id)}
                        size="small"
                      />
                    </Tooltip>
                    <Tooltip title="删除">
                      <Trash2
                        size={16}
                        style={{ color: '#71717a', cursor: 'pointer' }}
                        onClick={() => handleDelete(item)}
                      />
                    </Tooltip>
                  </Flex>
                </Flex>
              ))
            ) : (
              <Flex justify="center" style={{ padding: 48 }}>
                <Typography.Text style={{ color: '#71717a', fontSize: 14 }}>暂无 API Key</Typography.Text>
              </Flex>
            )}
          </div>
        )}
        <Flex justify="space-between" align="center" style={{ padding: '10px 20px', borderTop: '1px solid #27273a' }}>
          <Typography.Text style={{ color: '#71717a', fontSize: 13 }}>
            共 {apiKeys.length} 个 API Key
          </Typography.Text>
        </Flex>
      </Card>

      {/* Create Modal */}
      <Modal
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        title="创建 API Key"
        footer={null}
        width={480}
      >
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          <div>
            <Typography.Text style={labelStyle}>名称</Typography.Text>
            <Input
              required
              placeholder="例如：Production API"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Typography.Text style={labelStyle}>描述</Typography.Text>
            <Input.TextArea
              rows={3}
              placeholder="描述此 API Key 的用途"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <Flex justify="flex-end" gap={12}>
            <Button onClick={() => setCreateModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>创建</Button>
          </Flex>
        </form>
      </Modal>

      {/* Key Display Modal */}
      <Modal
        open={keyDisplayModal.open}
        onCancel={() => setKeyDisplayModal({ open: false, key: '', name: '' })}
        title="API Key 创建成功"
        footer={
          <Button type="primary" block onClick={() => setKeyDisplayModal({ open: false, key: '', name: '' })}>
            我已安全保存
          </Button>
        }
        width={520}
      >
        <Flex vertical gap={16} style={{ paddingTop: 8 }}>
          <div style={{ background: 'rgba(255, 181, 71, 0.08)', borderRadius: 8, padding: 12, border: '1px solid rgba(255, 181, 71, 0.2)' }}>
            <Flex gap={8} align="flex-start">
              <AlertTriangle size={16} color="#FFB547" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <Typography.Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>重要提示</Typography.Text>
                <Typography.Text style={{ color: '#a1a1aa', fontSize: 12 }}>
                  请立即复制并妥善保存此 API Key。出于安全考虑，关闭此窗口后将无法再次查看完整密钥。
                </Typography.Text>
              </div>
            </Flex>
          </div>
          <div>
            <Typography.Text style={labelStyle}>名称</Typography.Text>
            <Typography.Text style={{ fontSize: 14, fontWeight: 500 }}>{keyDisplayModal.name}</Typography.Text>
          </div>
          <div>
            <Typography.Text style={labelStyle}>API Key</Typography.Text>
            <Flex
              align="center"
              gap={12}
              style={{ background: '#1e1e2a', border: '1px solid #27273a', borderRadius: 8, padding: 12 }}
            >
              <Typography.Text
                style={{ fontSize: 13, fontFamily: 'monospace', letterSpacing: '0.5px', flex: 1, wordBreak: 'break-all' }}
              >
                {keyDisplayModal.key}
              </Typography.Text>
              <Tooltip title="复制">
                <Copy size={16} style={{ color: 'var(--primary-color)', cursor: 'pointer', flexShrink: 0 }} onClick={handleCopyKey} />
              </Tooltip>
            </Flex>
          </div>
        </Flex>
      </Modal>
    </div>
  );
}
