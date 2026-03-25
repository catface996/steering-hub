import { useEffect, useState } from 'react';
import { Typography, Card, Tag, Select, Flex, Spin } from 'antd';
import { AlertCircle } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { get } from '../../utils/request';
import { formatDateTime } from '../../utils/formatTime';
import Pagination from '../../components/Pagination';

interface FailureLog {
  id: number;
  queryText: string;
  failureReason: string;
  expectedTopic: string;
  agentName: string;
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
          onChange={(val) => { setDays(val); setPage(0); }}
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
    get<FailureLog[]>(`/api/v1/web/search/log/failures?days=${days}&limit=200`)
      .then(r => setFailures(r.data || []))
      .catch(() => setFailures([]))
      .finally(() => setLoading(false));
  }, [days]);

  const filtered = reason === 'all' ? failures : failures.filter(f => f.failureReason === reason);
  const paginatedData = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card
        style={{ borderRadius: 12, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' } }}
      >
        {loading ? (
          <Flex justify="center" align="center" style={{ flex: 1 }}>
            <Spin size="large" />
          </Flex>
        ) : filtered.length > 0 ? (
          <>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {/* Header */}
              <Flex style={{ padding: '12px 20px', borderBottom: '1px solid #27273a', background: '#1e1e2a', position: 'sticky', top: 0, zIndex: 10 }}>
                <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 40 }}>#</Typography.Text>
                <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 260 }}>查询词</Typography.Text>
                <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 110 }}>失败原因</Typography.Text>
                <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, flex: 1 }}>期望找到的规范</Typography.Text>
                <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 180 }}>Agent</Typography.Text>
                <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 130 }}>时间</Typography.Text>
              </Flex>
              {/* Rows */}
              {paginatedData.map((item) => {
                const reasonInfo = REASON_LABELS[item.failureReason] || { label: item.failureReason, color: 'tag-status-draft' };
                return (
                  <Flex key={item.id} align="center" style={{ padding: '10px 20px', borderBottom: '1px solid #27273a' }}>
                    <Typography.Text style={{ color: '#71717a', fontSize: 13, width: 40 }}>{item.id}</Typography.Text>
                    <Typography.Text
                      ellipsis={{ tooltip: true }}
                      style={{ color: '#f4f4f5', fontSize: 13, fontWeight: 500, width: 260, paddingRight: 8 }}
                    >
                      {item.queryText}
                    </Typography.Text>
                    <div style={{ width: 110 }}>
                      <Tag className={`tag-base ${reasonInfo.color}`}>{reasonInfo.label}</Tag>
                    </div>
                    <Typography.Text
                      ellipsis={{ tooltip: true }}
                      style={{ color: '#a1a1aa', fontSize: 13, flex: 1, paddingRight: 8 }}
                    >
                      {item.expectedTopic || '-'}
                    </Typography.Text>
                    <Typography.Text
                      ellipsis={{ tooltip: true }}
                      style={{ color: '#a1a1aa', fontFamily: 'monospace', fontSize: 12, width: 180 }}
                    >
                      {item.agentName || '-'}
                    </Typography.Text>
                    <Typography.Text style={{ color: '#71717a', fontSize: 12, width: 130 }}>
                      {formatDateTime(item.createdAt)}
                    </Typography.Text>
                  </Flex>
                );
              })}
            </div>
            <Pagination
              count={filtered.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={(val) => { setRowsPerPage(val); setPage(0); }}
              label="条记录"
              rowsPerPageOptions={[10, 20, 50]}
            />
          </>
        ) : (
          <Flex vertical align="center" justify="center" gap={8} style={{ flex: 1, padding: 40 }}>
            <AlertCircle size={40} color="#27273a" />
            <Typography.Text style={{ color: '#71717a' }}>暂无无效查询记录</Typography.Text>
            <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>
              当 MCP Agent 调用 report_search_failure 后将在此显示
            </Typography.Text>
          </Flex>
        )}
      </Card>
    </div>
  );
}
