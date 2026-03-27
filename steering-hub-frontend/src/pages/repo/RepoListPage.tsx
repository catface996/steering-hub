import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Button, Tag, Flex, Spin, Modal, App, Input, Select, Form, Switch,
} from 'antd';
import { Plus, ExternalLink } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { repoService } from '../../services/repoService';
import type { Repo } from '../../types';
import Pagination from '../../components/Pagination';
import { RequestError } from '../../utils/request';

const PAGE_SIZE = 20;

export default function RepoListPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { setBreadcrumbs, setActions } = useHeader();

  const [repos, setRepos] = useState<Repo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [filterName, setFilterName] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<boolean | undefined>(undefined);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form] = Form.useForm();

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Repo | null>(null);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const data = await repoService.list({
        name: filterName || undefined,
        team: filterTeam || undefined,
        enabled: filterEnabled,
        page: p + 1,
        size: PAGE_SIZE,
      });
      setRepos(data.records);
      setTotal(Number(data.total));
    } catch {
      // ignore; request layer shows toast
    } finally {
      setLoading(false);
    }
  }, [page, filterName, filterTeam, filterEnabled]);

  useEffect(() => {
    load(page);
  }, [page, filterName, filterTeam, filterEnabled]);

  useEffect(() => {
    setBreadcrumbs(
      <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>仓库管理</Typography.Text>
    );
    setActions(
      <Flex gap={12} align="center">
        <Input
          placeholder="搜索仓库名称"
          value={filterName}
          onChange={(e) => { setFilterName(e.target.value); setPage(0); }}
          style={{ width: 200 }}
          allowClear
        />
        <Input
          placeholder="所属团队"
          value={filterTeam}
          onChange={(e) => { setFilterTeam(e.target.value); setPage(0); }}
          style={{ width: 180 }}
          allowClear
        />
        <Select
          placeholder="启用状态"
          value={filterEnabled}
          onChange={(v) => { setFilterEnabled(v); setPage(0); }}
          style={{ width: 130 }}
          allowClear
          options={[
            { label: '已启用', value: true },
            { label: '已停用', value: false },
          ]}
        />
        <Button type="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          新建仓库
        </Button>
      </Flex>
    );
  }, [setBreadcrumbs, setActions, filterName, filterTeam, filterEnabled]);

  const handleCreate = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    setSubmitting(true);
    setCreateError('');
    try {
      await repoService.create(form.getFieldsValue());
      message.success('仓库注册成功');
      setCreateOpen(false);
      form.resetFields();
      setPage(0);
      load(0);
    } catch (e) {
      if (e instanceof RequestError && String(e.code) === '409') {
        setCreateError('仓库 full_name 已存在，请更换');
      }
      // other errors already toasted by request layer
    } finally {
      setSubmitting(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const match = val.match(/([\w.-]+\/[\w.-]+)(?:\.git)?$/);
    if (match) {
      form.setFieldValue('fullName', match[1]);
    }
  };

  const handleToggle = async (repo: Repo) => {
    try {
      await repoService.toggle(repo.id);
      message.success(repo.enabled ? '已停用' : '已启用');
      load(page);
    } catch {
      // toasted
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await repoService.delete(deleteTarget.id);
      message.success('已删除');
      setDeleteTarget(null);
      setPage(0);
      load(0);
    } catch {
      // toasted
    }
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid #1e1e2a',
    fontSize: 14,
    color: '#e4e4e7',
    verticalAlign: 'middle',
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 16px',
    textAlign: 'left',
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: 500,
    background: 'var(--bg-elevated)',
    borderBottom: '1px solid #1e1e2a',
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', borderRadius: 12, border: '1px solid #1e1e2a', background: 'var(--bg-base)' }}>
        {loading ? (
          <Flex justify="center" style={{ padding: 64 }}><Spin /></Flex>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>名称</th>
                <th style={thStyle}>full_name</th>
                <th style={thStyle}>团队</th>
                <th style={thStyle}>语言</th>
                <th style={thStyle}>状态</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>
            <tbody>
              {repos.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#71717a' }}>暂无数据</td>
                </tr>
              ) : repos.map((repo) => (
                <tr key={repo.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/repos/${repo.id}`)}>
                  <td style={tdStyle}>
                    <Typography.Text style={{ fontWeight: 500, color: '#e4e4e7' }}>{repo.name}</Typography.Text>
                  </td>
                  <td style={tdStyle}>
                    <Flex align="center" gap={4}>
                      <Typography.Text style={{ color: '#a1a1aa', fontSize: 13 }}>{repo.fullName}</Typography.Text>
                      {repo.url && (
                        <a href={repo.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink size={12} color="#71717a" />
                        </a>
                      )}
                    </Flex>
                  </td>
                  <td style={tdStyle}><Typography.Text style={{ color: '#a1a1aa' }}>{repo.team || '-'}</Typography.Text></td>
                  <td style={tdStyle}><Typography.Text style={{ color: '#a1a1aa' }}>{repo.language || '-'}</Typography.Text></td>
                  <td style={tdStyle}>
                    <Tag style={{ borderRadius: 100, fontSize: 12 }}
                      color={repo.enabled ? 'success' : 'default'}>
                      {repo.enabled ? '启用' : '停用'}
                    </Tag>
                  </td>
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <Flex gap={8} align="center">
                      <Switch
                        checked={repo.enabled}
                        size="small"
                        onChange={() => handleToggle(repo)}
                      />
                      <Button
                        size="small"
                        danger
                        onClick={() => setDeleteTarget(repo)}
                      >
                        删除
                      </Button>
                    </Flex>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        count={total}
        page={page}
        rowsPerPage={PAGE_SIZE}
        onPageChange={setPage}
        label="个仓库"
      />

      {/* Create modal */}
      <Modal
        open={createOpen}
        onCancel={() => { setCreateOpen(false); setCreateError(''); form.resetFields(); }}
        onOk={handleCreate}
        confirmLoading={submitting}
        okButtonProps={{ disabled: submitting }}
        title="注册仓库"
        okText="注册"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Git URL" name="url">
            <Input placeholder="https://github.com/org/my-service.git" onChange={handleUrlChange} />
          </Form.Item>
          <Form.Item label="full_name" name="fullName" rules={[{ required: true, message: '请填写 full_name' }]}
            validateStatus={createError ? 'error' : undefined}
            help={createError || undefined}>
            <Input placeholder="org/my-service" />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请填写仓库名称' }]}>
            <Input placeholder="my-service" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="语言" name="language">
            <Input placeholder="Java" />
          </Form.Item>
          <Form.Item label="团队" name="team">
            <Input placeholder="order-team" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onOk={handleDelete}
        title="确认删除"
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Typography.Text type="secondary">
          确认删除仓库 <strong>{deleteTarget?.fullName}</strong>？删除后将同步移除该仓库的所有规范绑定关系。
        </Typography.Text>
      </Modal>
    </div>
  );
}
