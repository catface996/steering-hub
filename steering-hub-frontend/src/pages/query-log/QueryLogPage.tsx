import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Input, Button, Tag, Flex, Spin, DatePicker } from 'antd';
import { Search } from 'lucide-react';
import dayjs from 'dayjs';
import { useHeader } from '../../contexts/HeaderContext';
import { queryLogService } from '../../services/queryLogService';
import type { QueryLog } from '../../types';
import Pagination from '../../components/Pagination';
import { formatDateTime } from '../../utils/formatTime';

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

export default function QueryLogPage() {
  const { setBreadcrumbs, setActions } = useHeader();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const [inputKeyword, setInputKeyword] = useState('');
  const [inputDates, setInputDates] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterDates, setFilterDates] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [searchTrigger, setSearchTrigger] = useState(0);

  const handleSearch = () => {
    setFilterKeyword(inputKeyword);
    setFilterDates(inputDates);
    setPage(0);
    setSearchTrigger(t => t + 1);
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
  }, [page, filterKeyword, filterDates, searchTrigger]);

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
    whiteSpace: 'nowrap',
  };

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
                <th style={{ ...thStyle, minWidth: 200 }}>查询内容</th>
                <th style={{ ...thStyle, width: 120 }}>Agent 名称</th>
                <th style={{ ...thStyle, width: 160 }}>模型名称</th>
                <th style={{ ...thStyle }}>代码仓库</th>
                <th style={{ ...thStyle, width: 90 }}>命中数量</th>
                <th style={{ ...thStyle, width: 180 }}>查询时间</th>
                <th style={{ ...thStyle, width: 90 }}>来源</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#71717a' }}>暂无数据</td>
                </tr>
              ) : logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => navigate(`/query-logs/${log.id}`)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#13131f')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td style={{ ...tdStyle, color: '#71717a', fontSize: 13 }}>{log.id}</td>
                  <td style={{ ...tdStyle, width: '100%' }}>
                    <Typography.Text
                      ellipsis
                      style={{ color: '#e4e4e7', display: 'block' }}
                      title={log.queryText}
                    >
                      {highlight(log.queryText, filterKeyword)}
                    </Typography.Text>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>
                    {log.agentName
                      ? <Tag style={{ borderRadius: 100, fontSize: 11 }}>{log.agentName}</Tag>
                      : <span style={{ color: '#52525b' }}>-</span>}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>
                    {log.modelName
                      ? <Tag color="purple" style={{ borderRadius: 100, fontSize: 11 }}>{log.modelName}</Tag>
                      : <span style={{ color: '#52525b' }}>-</span>}
                  </td>
                  <td style={{ ...tdStyle, color: '#a1a1aa', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {log.repo || '-'}
                  </td>
                  <td style={tdStyle}>
                    <Tag
                      color={log.resultCount === 0 ? 'error' : 'success'}
                      style={{ borderRadius: 100, fontSize: 12 }}
                    >
                      {log.resultCount ?? '-'}
                    </Tag>
                  </td>
                  <td style={{ ...tdStyle, color: '#a1a1aa', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td style={tdStyle}>
                    {log.source === 'MCP' ? (
                      <Tag color="blue" style={{ borderRadius: 100, fontSize: 12 }}>MCP</Tag>
                    ) : log.source === 'WEB' || log.source === 'Web' ? (
                      <Tag color="green" style={{ borderRadius: 100, fontSize: 12 }}>Web</Tag>
                    ) : (
                      <Tag color="default" style={{ borderRadius: 100, fontSize: 12 }}>未知</Tag>
                    )}
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
    </div>
  );
}
