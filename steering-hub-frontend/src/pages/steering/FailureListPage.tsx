import { useEffect, useState } from 'react';
import { Typography, Card, Tag, Select, Table, Flex, Spin, Empty, Button } from 'antd';
import { AlertCircle } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { get } from '../../utils/request';
import Pagination from '../../components/Pagination';

interface FailureLog {
  id: number;
  queryText: string;
  failureReason: string;
  expectedTopic: string;
  agentId: string;
  createdAt: string;
}

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  no_results:   { label: '零结果',    color: 'tag-status-rejected' },
  irrelevant:   { label: '不相关',    color: 'tag-status-deprecated' },
  missing_spec: { label: '规范缺失',  color: 'tag-status-pending' },
  other:        { label: '其他',      color: 'tag-status-draft' },
};

export default function FailureListPage() {
  const { setBreadcrumbs, setActions } = useHeader();
  const [days, setDays] = useState(30);
  const [failures, setFailures] = useState<FailureLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [reason, setReason] = useState<string>('all');

  useEffect(() => {
    setBreadcrumbs(
      <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>
        无效查询记录
      </Typography.Text>
    );
    setActions(
      <Flex gap={8}>
        <Select
          value={reason}
          onChange={(val) => { setReason(val); setPage(0); }}
          style={{ width: 130 }}
          options={[
            { label: '全部原因', value: 'all' },
            { label: '零结果', value: 'no_results' },
            { label: '不相关', value: 'irrelevant' },
            { label: '规范缺失', value: 'missing_spec' },
            { label: '其他', value: 'other' },
          ]}
        />
        <Select
          value={days}
          onChange={(val) => {
            setDays(val);
            setPage(0);
          }}
          style={{ width: 120 }}
          options={[
            { label: '近7天', value: 7 },
            { label: '近30天', value: 30 },
            { label: '近90天', value: 90 },
          ]}
        />
      </Flex>
    );
  }, [setBreadcrumbs, setActions, days, reason]);

  useEffect(() => {
    setLoading(true);
    get<FailureLog[]>(`/api/v1/search/log/failures?days=${days}&limit=200`)
      .then(r => setFailures(r.data || []))
      .catch(() => setFailures([]))
      .finally(() => setLoading(false));
  }, [days]);

  const columns = [
    {
      title: '查询词',
      dataIndex: 'queryText',
      key: 'queryText',
      width: 240,
      ellipsis: true,
      render: (text: string) => (
        <Typography.Text style={{ color: '#f4f4f5' }}>{text}</Typography.Text>
      ),
    },
    {
      title: '失败原因',
      dataIndex: 'failureReason',
      key: 'failureReason',
      width: 120,
      render: (r: string) => {
        const info = REASON_LABELS[r] || { label: r, color: 'tag-status-draft' };
        return <Tag className={`tag-base ${info.color}`}>{info.label}</Tag>;
      },
    },
    {
      title: '期望找到的规范',
      dataIndex: 'expectedTopic',
      key: 'expectedTopic',
      ellipsis: true,
      render: (text: string) => (
        <Typography.Text style={{ color: '#a1a1aa' }}>{text || '--'}</Typography.Text>
      ),
    },
    {
      title: 'Agent',
      dataIndex: 'agentId',
      key: 'agentId',
      width: 180,
      ellipsis: true,
      render: (text: string) => (
        <Typography.Text style={{ color: '#a1a1aa', fontFamily: 'monospace', fontSize: 12 }}>
          {text || '--'}
        </Typography.Text>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (t: string) => (
        <Typography.Text style={{ color: '#a1a1aa', fontSize: 12 }}>
          {t ? new Date(t).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }) : '--'}
        </Typography.Text>
      ),
    },
  ];

  const filtered = reason === 'all' ? failures : failures.filter(f => f.failureReason === reason);
  const paginatedData = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card
        style={{
          borderRadius: 12,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' } }}
      >
        {filtered.length > 0 ? (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <Table
                dataSource={paginatedData}
                columns={columns}
                rowKey="id"
                size="small"
                loading={loading}
                pagination={false}
                style={{ minHeight: '100%' }}
              />
            </div>
            <Pagination
              count={filtered.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={(val) => {
                setRowsPerPage(val);
                setPage(0);
              }}
              label="条记录"
              rowsPerPageOptions={[10, 20, 50]}
            />
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 40,
            }}
          >
            <AlertCircle size={40} color="#27273a" />
            <Typography.Text style={{ color: '#71717a' }}>暂无无效查询记录</Typography.Text>
            <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>
              当 MCP Agent 调用 report_search_failure 后将在此显示
            </Typography.Text>
          </div>
        )}
      </Card>
    </div>
  );
}
