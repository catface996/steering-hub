import { useState, useEffect } from 'react';
import { Typography, Button, Input, Card, Flex, Spin, Modal, Switch, Tag, Tooltip, App, Select } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { stopWordApi, type StopWordItem } from '../../api/stopWord';
import Pagination from '../../components/Pagination';
import { formatDate } from '../../utils/formatTime';
import ConfirmModal from '../../components/ConfirmModal';

const PAGE_SIZE = 20;

export default function StopWordPage() {
  const { setBreadcrumbs, setActions } = useHeader();
  const { message } = App.useApp();
  const [stopWords, setStopWords] = useState<StopWordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ words: '', language: 'zh' });
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<StopWordItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setBreadcrumbs(
      <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>停用词管理</Typography.Text>
    );
    setActions(
      <Button type="primary" icon={<Plus size={14} />} onClick={() => setCreateModalOpen(true)}>
        添加停用词
      </Button>
    );
  }, [setBreadcrumbs, setActions]);

  const loadStopWords = async () => {
    setLoading(true);
    try {
      const data = await stopWordApi.list();
      setStopWords(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStopWords(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.words.trim()) return;

    setSubmitting(true);
    try {
      // 支持逗号分隔批量添加
      const wordList = form.words.split(/[,，]/).map(w => w.trim()).filter(Boolean);

      for (const word of wordList) {
        await stopWordApi.create(word, form.language);
      }

      message.success(`成功添加 ${wordList.length} 个停用词`);
      setCreateModalOpen(false);
      setForm({ words: '', language: 'zh' });
      loadStopWords();
    } catch {
      message.error('添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await stopWordApi.toggle(id);
      message.success('状态更新成功');
      loadStopWords();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = (item: StopWordItem) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await stopWordApi.delete(deleteTarget.id);
      message.success('删除成功');
      setDeleteTarget(null);
      loadStopWords();
    } catch {
      message.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const labelStyle = { fontSize: 13, color: '#a1a1aa', display: 'block' as const, marginBottom: 4, fontWeight: 500 };

  // 分页数据
  const pagedStopWords = stopWords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="list-page">
      {/* Table Card */}
      <Card
        style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      >
        {loading ? (
          <Flex justify="center" align="center" style={{ flex: 1, padding: 48 }}>
            <Spin size="large" />
          </Flex>
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            {/* Header */}
            <Flex style={{ padding: '12px 20px', borderBottom: '1px solid #27273a', background: '#1e1e2a', position: 'sticky', top: 0, zIndex: 10 }}>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 200 }}>词汇</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 120 }}>语言</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 100, textAlign: 'center' }}>状态</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, flex: 1 }}>创建时间</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 100, textAlign: 'center' }}>操作</Typography.Text>
            </Flex>
            {/* Rows */}
            {stopWords.length > 0 ? (
              pagedStopWords.map((item) => (
                <Flex key={item.id} align="center" style={{ padding: '10px 20px', borderBottom: '1px solid #27273a' }}>
                  <Typography.Text style={{ fontSize: 13, fontWeight: 500, width: 200 }} ellipsis={{ tooltip: true }}>{item.word}</Typography.Text>
                  <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, width: 120 }}>
                    {item.language === 'zh' ? '中文' : item.language === 'en' ? '英文' : item.language}
                  </Typography.Text>
                  <div style={{ width: 100, textAlign: 'center' }}>
                    <Tag
                      className={`tag-base ${item.enabled ? 'tag-enabled' : 'tag-disabled'}`}
                    >
                      {item.enabled ? '已启用' : '已禁用'}
                    </Tag>
                  </div>
                  <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, flex: 1 }}>
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
                <Typography.Text style={{ color: '#71717a', fontSize: 14 }}>暂无停用词</Typography.Text>
              </Flex>
            )}
          </div>
        )}
        {stopWords.length > PAGE_SIZE && (
          <Pagination
            count={stopWords.length}
            page={page}
            rowsPerPage={PAGE_SIZE}
            onPageChange={setPage}
            label="个停用词"
          />
        )}
      </Card>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={deleteTarget !== null}
        title="确认删除"
        content={`确定要删除停用词 "${deleteTarget?.word}" 吗？`}
        okText="删除"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Create Modal */}
      <Modal
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        title="添加停用词"
        footer={null}
        width={480}
      >
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          <div>
            <Typography.Text style={labelStyle}>词汇</Typography.Text>
            <Input.TextArea
              required
              rows={3}
              placeholder="输入停用词，支持逗号分隔批量添加，例如：规范,标准,指南"
              value={form.words}
              onChange={(e) => setForm((f) => ({ ...f, words: e.target.value }))}
            />
            <Typography.Text style={{ fontSize: 12, color: '#71717a', marginTop: 4, display: 'block' }}>
              支持中文逗号（，）或英文逗号（,）分隔
            </Typography.Text>
          </div>
          <div>
            <Typography.Text style={labelStyle}>语言</Typography.Text>
            <Select
              value={form.language}
              onChange={(value) => setForm((f) => ({ ...f, language: value }))}
              style={{ width: '100%' }}
              options={[
                { label: '中文', value: 'zh' },
                { label: '英文', value: 'en' },
              ]}
            />
          </div>
          <Flex justify="flex-end" gap={12}>
            <Button onClick={() => setCreateModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>添加</Button>
          </Flex>
        </form>
      </Modal>
    </div>
  );
}
