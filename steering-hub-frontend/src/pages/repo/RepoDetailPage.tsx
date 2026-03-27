import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Button, Tag, Flex, Spin, Modal, App, Alert, Switch, Card,
} from 'antd';
import { AlertTriangle } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { repoService } from '../../services/repoService';
import { steeringService } from '../../services/steeringService';
import type { Repo, RepoSteeringBinding, Steering } from '../../types';
import Pagination from '../../components/Pagination';
import { formatDateTime } from '../../utils/formatTime';

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  pending_review: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  active: '已生效',
  deprecated: '已废弃',
};

const STATUS_ANT_COLOR: Record<string, string> = {
  draft: 'default',
  pending_review: 'warning',
  approved: 'geekblue',
  rejected: 'error',
  active: 'success',
  deprecated: 'orange',
};

const PAGE_SIZE = 20;

export default function RepoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { setBreadcrumbs, setActions } = useHeader();

  const [repo, setRepo] = useState<Repo | null>(null);
  const [repoLoading, setRepoLoading] = useState(true);

  // Bindings
  const [bindings, setBindings] = useState<RepoSteeringBinding[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [bindingsLoading, setBindingsLoading] = useState(false);

  // Bind section
  const [steeringSearch, setSteeringSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Steering[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedSteering, setSelectedSteering] = useState<Steering | null>(null);
  const [mandatory, setMandatory] = useState(false);
  const [binding, setBinding] = useState(false);
  const [bindWarning, setBindWarning] = useState('');

  // Unbind confirm
  const [unbindTarget, setUnbindTarget] = useState<RepoSteeringBinding | null>(null);

  const loadRepo = useCallback(async () => {
    try {
      const data = await repoService.get(Number(id));
      setRepo(data);
    } catch {
      // toasted
    } finally {
      setRepoLoading(false);
    }
  }, [id]);

  const loadBindings = useCallback(async (p = page) => {
    setBindingsLoading(true);
    try {
      const data = await repoService.listSteeringsByRepo(Number(id), p + 1, PAGE_SIZE);
      setBindings(data.records);
      setTotal(Number(data.total));
    } catch {
      // toasted
    } finally {
      setBindingsLoading(false);
    }
  }, [id, page]);

  useEffect(() => { loadRepo(); }, [loadRepo]);
  useEffect(() => { loadBindings(page); }, [page]);

  useEffect(() => {
    if (!repo) return;
    setBreadcrumbs(
      <Flex align="center" gap={8}>
        <Typography.Text
          style={{ color: '#a1a1aa', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
          onClick={() => navigate('/repos')}
        >
          仓库管理
        </Typography.Text>
        <Typography.Text style={{ color: '#71717a', fontSize: 20 }}>/</Typography.Text>
        <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>{repo.name}</Typography.Text>
      </Flex>
    );
    setActions(
      <Button onClick={() => navigate('/repos')}>返回</Button>
    );
  }, [repo, setBreadcrumbs, setActions, navigate]);

  const handleSearchSteerings = async () => {
    if (!steeringSearch.trim()) return;
    setSearchLoading(true);
    try {
      const data = await steeringService.page({ keyword: steeringSearch, size: 10 });
      setSearchResults(data.records);
    } catch {
      // toasted
    } finally {
      setSearchLoading(false);
    }
  };

  const handleBind = async () => {
    if (!selectedSteering) return;
    setBinding(true);
    setBindWarning('');
    try {
      const result = await repoService.bindSteering(Number(id), selectedSteering.id, { mandatory });
      if (result.warning) {
        setBindWarning(result.warning);
      } else {
        message.success('绑定成功');
      }
      setSelectedSteering(null);
      setSteeringSearch('');
      setSearchResults([]);
      setMandatory(false);
      setPage(0);
      loadBindings(0);
    } catch {
      // toasted
    } finally {
      setBinding(false);
    }
  };

  const handleUnbind = async () => {
    if (!unbindTarget) return;
    try {
      await repoService.unbindSteering(Number(id), unbindTarget.steeringId);
      message.success('解绑成功');
      setUnbindTarget(null);
      loadBindings(page);
    } catch {
      // toasted
    }
  };

  if (repoLoading) {
    return <Flex justify="center" style={{ padding: 64 }}><Spin size="large" /></Flex>;
  }
  if (!repo) {
    return <Typography.Text type="secondary" style={{ padding: 24, display: 'block' }}>仓库不存在</Typography.Text>;
  }

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
    <div style={{ padding: 24 }}>
      {/* Repo info card */}
      <Card style={{ borderRadius: 12, marginBottom: 20 }}>
        <Typography.Text style={{ fontWeight: 600, fontSize: 16, display: 'block', marginBottom: 16 }}>
          仓库信息
        </Typography.Text>
        <Flex wrap="wrap" gap={32}>
          {[
            { label: 'full_name', value: repo.fullName },
            { label: '状态', value: <Tag color={repo.enabled ? 'success' : 'default'}>{repo.enabled ? '启用' : '停用'}</Tag> },
            { label: '团队', value: repo.team || '-' },
            { label: '语言', value: repo.language || '-' },
            { label: '描述', value: repo.description || '-' },
          ].map((item) => (
            <div key={item.label}>
              <Typography.Text style={{ color: '#71717a', fontSize: 12, display: 'block', marginBottom: 2 }}>{item.label}</Typography.Text>
              {typeof item.value === 'string'
                ? <Typography.Text style={{ fontSize: 14 }}>{item.value}</Typography.Text>
                : item.value}
            </div>
          ))}
        </Flex>
      </Card>

      {/* Bind section */}
      <Card style={{ borderRadius: 12, marginBottom: 20 }}>
        <Typography.Text style={{ fontWeight: 600, fontSize: 16, display: 'block', marginBottom: 12 }}>
          添加规范绑定
        </Typography.Text>
        <Flex gap={12} align="center" wrap="wrap">
          <input
            placeholder="搜索规范名称..."
            value={steeringSearch}
            onChange={(e) => setSteeringSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSteerings()}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid #27273a', borderRadius: 8,
              padding: '6px 12px', color: '#e4e4e7', fontSize: 14, width: 260,
            }}
          />
          <Button size="small" loading={searchLoading} onClick={handleSearchSteerings}>搜索</Button>
          {searchResults.length > 0 && (
            <select
              value={selectedSteering?.id ?? ''}
              onChange={(e) => {
                const s = searchResults.find((r) => r.id === Number(e.target.value));
                setSelectedSteering(s ?? null);
              }}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid #27273a', borderRadius: 8,
                padding: '6px 12px', color: '#e4e4e7', fontSize: 14,
              }}
            >
              <option value="">选择规范...</option>
              {searchResults.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          )}
          <Flex align="center" gap={6}>
            <Switch checked={mandatory} onChange={setMandatory} size="small" />
            <Typography.Text style={{ fontSize: 13, color: '#a1a1aa' }}>强制</Typography.Text>
          </Flex>
          <Button
            type="primary"
            loading={binding}
            disabled={!selectedSteering}
            onClick={handleBind}
          >
            绑定
          </Button>
        </Flex>
        {bindWarning && (
          <Alert
            type="warning"
            message={bindWarning}
            style={{ marginTop: 12, borderRadius: 8 }}
            closable
            onClose={() => setBindWarning('')}
          />
        )}
      </Card>

      {/* Bindings table */}
      <Card style={{ borderRadius: 12, padding: 0, overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e1e2a' }}>
          <Typography.Text style={{ fontWeight: 600, fontSize: 16 }}>已绑定规范</Typography.Text>
        </div>
        {bindingsLoading ? (
          <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>规范名称</th>
                <th style={thStyle}>状态</th>
                <th style={thStyle}>强制</th>
                <th style={thStyle}>绑定时间</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>
            <tbody>
              {bindings.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#71717a' }}>暂无绑定规范</td>
                </tr>
              ) : bindings.map((b) => (
                <tr key={b.bindingId}>
                  <td style={tdStyle}>
                    <Flex align="center" gap={8}>
                      <Typography.Text
                        style={{ color: '#818CF8', cursor: 'pointer' }}
                        onClick={() => navigate(`/steerings/${b.steeringId}`)}
                      >
                        {b.steeringTitle}
                      </Typography.Text>
                      {(b.steeringStatus === 'deprecated' || b.steeringStatus === 'draft') && (
                        <AlertTriangle size={14} color="#f59e0b" />
                      )}
                    </Flex>
                    {(b.steeringStatus === 'deprecated' || b.steeringStatus === 'draft') && (
                      <Alert
                        type="warning"
                        message={`该规范状态为 ${STATUS_LABEL[b.steeringStatus] || b.steeringStatus}，不参与 MCP boost`}
                        style={{ marginTop: 4, borderRadius: 6, fontSize: 12 }}
                      />
                    )}
                  </td>
                  <td style={tdStyle}>
                    <Tag color={STATUS_ANT_COLOR[b.steeringStatus] || 'default'} style={{ borderRadius: 100 }}>
                      {STATUS_LABEL[b.steeringStatus] || b.steeringStatus}
                    </Tag>
                  </td>
                  <td style={tdStyle}>
                    {b.mandatory
                      ? <Tag color="blue" style={{ borderRadius: 100 }}>强制</Tag>
                      : <Typography.Text style={{ color: '#71717a' }}>-</Typography.Text>}
                  </td>
                  <td style={tdStyle}>
                    <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>{formatDateTime(b.createdAt)}</Typography.Text>
                  </td>
                  <td style={tdStyle}>
                    <Button size="small" danger onClick={() => setUnbindTarget(b)}>解绑</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          count={total}
          page={page}
          rowsPerPage={PAGE_SIZE}
          onPageChange={setPage}
          label="条绑定"
        />
      </Card>

      {/* Unbind confirm */}
      <Modal
        open={!!unbindTarget}
        onCancel={() => setUnbindTarget(null)}
        onOk={handleUnbind}
        title="确认解绑"
        okText="解绑"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Typography.Text type="secondary">
          确认解除仓库与规范 <strong>{unbindTarget?.steeringTitle}</strong> 的绑定关系？
        </Typography.Text>
      </Modal>
    </div>
  );
}
