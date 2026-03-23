import { useState, useEffect } from 'react';
import { Typography, Input, Button, Tag, Flex, Spin, DatePicker, Drawer, Descriptions } from 'antd';
import { Search } from 'lucide-react';
import dayjs from 'dayjs';
import { useHeader } from '../../contexts/HeaderContext';
import { queryLogService } from '../../services/queryLogService';
import type { QueryLog } from '../../types';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 20;

function highlight(text: string, keyword: string) {
  if (!keyword.trim()) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={i} style={{ background: 'rgba(167,139,250,0.35)', color: '#e4e4e7', borderRadius: 2, padding: '0 1px' }}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function SourceTag({ source }: { source?: string | null }) {
  if (source === 'MCP') return <Tag color="blue" style={{ borderRadius: 100, fontSize: 12 }}>MCP</Tag>;
  if (source === 'WEB' || source === 'Web') return <Tag color="green" style={{ borderRadius: 100, fontSize: 12 }}>Web</Tag>;
  return <Tag color="default" style={{ borderRadius: 100, fontSize: 12 }}>未知</Tag>;
}

export default function QueryLogPage() {
  const { setBreadcrumbs, setActions } = useHeader();

  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const [inputKeyword, setInputKeyword] = useState('');
  const [inputDates, setInputDates] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterDates, setFilterDates] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<QueryLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleSearch = () => {
    setFilterKeyword(inputKeyword);
    setFilterDates(inputDates);
    setPage(0);
  };

  const handleRowClick = (log: QueryLog) => {
    setDrawerOpen(true);
    setDetailLog(log);
    setDetailLoading(true);
    queryLogService.getById(log.id).then((data) => {
      setDetailLog(data);
    }).catch(() => {
      // keep whatever we already have from the list
    }).finally(() => {
      setDetailLoading(false);
    });
  };

  useEffect(() => {
    setLoading(true);
    queryLogService.list({
      query: filterKeyword || undefined,
      startDate: filterDates[0] ? filterDates[0].format('YYYY-MM-DD') : undefined,
      endDate: filterDates[1] ? filterDates[1].format('YYYY-MM-DD') : undefined,
      page: page + 1,
      size: PAGE_SIZE,
    }).then((data) => {
      setLogs(data.records);
      setTotal(Number(data.total));
    }).catch(() => {
      // toasted by request layer
    }).finally(() => {
      setLoading(false);
    });
  }, [page, filterKeyword, filterDates]);

  useEffect(() => {
    setBreadcrumbs(
      <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>检索日志</Typography.Text>
    );
    setActions(
      <Flex gap={12} align="center">
        <Input
          placeholder="关键词搜索"
          value={inputKeyword}
          onChange={(e) => setInputKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 200 }}
          allowClear
        />
        <DatePicker.RangePicker
          value={inputDates}
          onChange={(dates) => setInputDates(dates ? [dates[0], dates[1]] : [null, null])}
          style={{ width: 240 }}
          placeholder={['开始日期', '结束日期']}
        />
        <Button type="primary" icon={<Search size={16} />} onClick={handleSearch}>
          查询
        </Button>
      </Flex>
    );
  }, [setBreadcrumbs, setActions, inputKeyword, inputDates]);

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
    background: '#12121c',
    borderBottom: '1px solid #1e1e2a',
  };

  const resultSteeringIds: number[] = (() => {
    if (!detailLog?.resultSteeringIds) return [];
    try { return JSON.parse(detailLog.resultSteeringIds); } catch { return []; }
  })();

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto', borderRadius: 12, border: '1px solid #1e1e2a', background: '#0d0d14' }}>
        {loading ? (
          <Flex justify="center" style={{ padding: 64 }}><Spin /></Flex>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 72 }}>ID</th>
                <th style={thStyle}>查询内容</th>
                <th style={{ ...thStyle, width: 90 }}>命中数量</th>
                <th style={{ ...thStyle, width: 180 }}>查询时间</th>
                <th style={{ ...thStyle, width: 90 }}>来源</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#71717a' }}>暂无数据</td>
                </tr>
              ) : logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => handleRowClick(log)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#13131f')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td style={{ ...tdStyle, color: '#71717a', fontSize: 13 }}>{log.id}</td>
                  <td style={tdStyle}>
                    <Typography.Text style={{ color: '#e4e4e7' }}>
                      {highlight(log.queryText, filterKeyword)}
                    </Typography.Text>
                  </td>
                  <td style={tdStyle}>
                    <Tag
                      color={log.resultCount === 0 ? 'error' : 'success'}
                      style={{ borderRadius: 100, fontSize: 12 }}
                    >
                      {log.resultCount ?? '-'}
                    </Tag>
                  </td>
                  <td style={{ ...tdStyle, color: '#a1a1aa', fontSize: 13 }}>
                    {log.createdAt ? new Date(log.createdAt).toLocaleString('zh-CN', { hour12: false }) : '-'}
                  </td>
                  <td style={tdStyle}>
                    <SourceTag source={log.source} />
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
        label="条日志"
      />

      <Drawer
        title={<span style={{ color: '#f4f4f5' }}>检索日志详情</span>}
        placement="right"
        width={640}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{
          header: { background: '#0d0d14', borderBottom: '1px solid #1e1e2a' },
          body: { background: '#0d0d14', padding: 24 },
          mask: { background: 'rgba(0,0,0,0.6)' },
        }}
      >
        {detailLoading ? (
          <Flex justify="center" style={{ padding: 48 }}><Spin /></Flex>
        ) : detailLog ? (
          <Flex vertical gap={24}>
            <Descriptions
              column={1}
              size="small"
              labelStyle={{ color: '#71717a', width: 120 }}
              contentStyle={{ color: '#e4e4e7' }}
            >
              <Descriptions.Item label="ID">{detailLog.id}</Descriptions.Item>
              <Descriptions.Item label="来源"><SourceTag source={detailLog.source} /></Descriptions.Item>
              <Descriptions.Item label="查询时间">
                {detailLog.createdAt ? new Date(detailLog.createdAt).toLocaleString('zh-CN', { hour12: false }) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="命中数量">
                <Tag color={detailLog.resultCount === 0 ? 'error' : 'success'} style={{ borderRadius: 100 }}>
                  {detailLog.resultCount ?? '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="响应时间">
                {detailLog.responseTimeMs != null ? `${detailLog.responseTimeMs} ms` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="检索模式">{detailLog.searchMode || '-'}</Descriptions.Item>
              <Descriptions.Item label="Agent ID">{detailLog.agentId || '-'}</Descriptions.Item>
              <Descriptions.Item label="仓库">{detailLog.repo || '-'}</Descriptions.Item>
              <Descriptions.Item label="是否有效">
                {detailLog.isEffective == null ? (
                  <Tag color="default" style={{ borderRadius: 100 }}>待评估</Tag>
                ) : detailLog.isEffective ? (
                  <Tag color="success" style={{ borderRadius: 100 }}>有效</Tag>
                ) : (
                  <Tag color="error" style={{ borderRadius: 100 }}>无效</Tag>
                )}
              </Descriptions.Item>
              {detailLog.failureReason && (
                <Descriptions.Item label="失败原因">
                  <span style={{ color: '#f87171' }}>{detailLog.failureReason}</span>
                </Descriptions.Item>
              )}
            </Descriptions>

            <div>
              <div style={{ color: '#71717a', fontSize: 12, marginBottom: 8 }}>查询内容</div>
              <div style={{ background: '#12121c', border: '1px solid #1e1e2a', borderRadius: 8, padding: '10px 14px', color: '#e4e4e7', fontSize: 14, lineHeight: 1.6, wordBreak: 'break-all' }}>
                {detailLog.queryText}
              </div>
            </div>

            {detailLog.taskDescription && (
              <div>
                <div style={{ color: '#71717a', fontSize: 12, marginBottom: 8 }}>任务描述</div>
                <div style={{ background: '#12121c', border: '1px solid #1e1e2a', borderRadius: 8, padding: '10px 14px', color: '#a1a1aa', fontSize: 13, lineHeight: 1.6 }}>
                  {detailLog.taskDescription}
                </div>
              </div>
            )}

            {detailLog.expectedTopic && (
              <div>
                <div style={{ color: '#71717a', fontSize: 12, marginBottom: 8 }}>期望话题</div>
                <div style={{ background: '#12121c', border: '1px solid #1e1e2a', borderRadius: 8, padding: '10px 14px', color: '#a1a1aa', fontSize: 13 }}>
                  {detailLog.expectedTopic}
                </div>
              </div>
            )}

            <div>
              <div style={{ color: '#71717a', fontSize: 12, marginBottom: 8 }}>检索结果</div>
              {resultSteeringIds.length > 0 ? (
                <Flex wrap gap={8}>
                  {resultSteeringIds.map((sid) => (
                    <Tag key={sid} color="purple" style={{ borderRadius: 100, fontSize: 12 }}>ID: {sid}</Tag>
                  ))}
                </Flex>
              ) : (
                <span style={{ color: '#52525b', fontSize: 13 }}>结果未持久化，仅记录元数据</span>
              )}
            </div>
          </Flex>
        ) : null}
      </Drawer>
    </div>
  );
}
