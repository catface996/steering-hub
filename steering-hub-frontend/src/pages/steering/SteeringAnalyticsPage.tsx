import { useEffect, useState } from 'react';
import { Typography, Button, Card, Flex, Tag, Select, Table, Statistic, Empty } from 'antd';
import { BarChart3, TrendingUp, AlertCircle, Clock, Download } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import { useHeader } from '../../contexts/HeaderContext';
import { get } from '../../utils/request';
import { formatDateTime } from '../../utils/formatTime';

interface AnalyticsData {
  totalQueries: number;
  effectiveQueries: number;
  ineffectiveQueries: number;
  pendingQueries: number;
  topQueries: { query_text: string; count: number }[];
  activeAgents: { agent_id: string; count: number }[];
  avgResponseTimeMs: number;
}

interface FailureLog {
  id: number;
  queryText: string;
  failureReason: string;
  expectedTopic: string;
  agentName: string;
  createdAt: string;
}

const TAG_COLORS = ['#818CF8', '#32D583', 'var(--accent-cyan)', 'var(--accent-orange)', '#E85A4F', 'var(--accent-purple)', 'var(--accent-pink)'];

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  no_results:   { label: '零结果',    color: 'tag-status-rejected' },
  irrelevant:   { label: '不相关',    color: 'tag-status-deprecated' },
  missing_spec: { label: '规范缺失',  color: 'tag-status-pending' },
  other:        { label: '其他',      color: 'tag-status-draft' },
};

export default function SteeringAnalyticsPage() {
  const { setBreadcrumbs, setActions } = useHeader();
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [failures, setFailures] = useState<FailureLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBreadcrumbs(
      <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>规范使用分析</Typography.Text>
    );
    setActions(
      <Select value={days} onChange={setDays} style={{ width: 120 }} options={[
        { label: '近7天', value: 7 },
        { label: '近30天', value: 30 },
        { label: '近90天', value: 90 },
      ]} />
    );
  }, [setBreadcrumbs, setActions, days]);

  useEffect(() => {
    setLoading(true);
    get<AnalyticsData>(`/api/v1/web/search/analytics/queries?days=${days}`)
      .then(r => setAnalytics(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    // 获取无效查询列表
    get<FailureLog[]>(`/api/v1/web/search/log/failures?days=${days}&limit=50`)
      .then(r => setFailures(r.data || []))
      .catch(() => setFailures([]));
  }, [days]);

  const stats = [
    { label: '总查询次数', value: analytics?.totalQueries ?? '--', icon: <BarChart3 size={20} />, color: 'var(--primary-color)', bg: 'rgba(var(--primary-rgb), 0.1)' },
    { label: '有效查询', value: analytics?.effectiveQueries ?? '--', icon: <TrendingUp size={20} />, color: '#32D583', bg: 'rgba(50,213,131,0.12)' },
    { label: '无效查询', value: analytics?.ineffectiveQueries ?? '--', icon: <AlertCircle size={20} />, color: '#E85A4F', bg: 'rgba(232,90,79,0.12)' },
    { label: '待分析', value: analytics?.pendingQueries ?? '--', icon: <Clock size={20} />, color: '#FFB547', bg: 'rgba(255,181,71,0.12)' },
  ];

  const failureColumns = [
    { title: '查询词', dataIndex: 'queryText', key: 'queryText', ellipsis: true },
    {
      title: '失败原因', dataIndex: 'failureReason', key: 'failureReason', width: 110,
      render: (r: string) => {
        const info = REASON_LABELS[r] || { label: r, color: 'tag-status-draft' };
        return <Tag className={`tag-base ${info.color}`}>{info.label}</Tag>;
      }
    },
    { title: '期望找到的规范', dataIndex: 'expectedTopic', key: 'expectedTopic', ellipsis: true },
    { title: 'Agent', dataIndex: 'agentName', key: 'agentName', width: 140, ellipsis: true },
    {
      title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 180,
      render: (t: string) => formatDateTime(t)
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ borderRadius: 12 }}>
            <Flex align="center" gap={12} style={{ marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: s.color, flexShrink: 0 }}>
                {s.icon}
              </div>
              <Typography.Text style={{ fontSize: 32, fontWeight: 700, color: '#f4f4f5', lineHeight: 1 }}>
                {s.value}
              </Typography.Text>
            </Flex>
            <Typography.Text style={{ fontSize: 13, color: '#a1a1aa', display: 'block' }}>
              {s.label}
            </Typography.Text>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* 热门查询词 */}
        <Card title={<Typography.Text style={{ color: '#f4f4f5' }}>热门查询词 Top 10</Typography.Text>} style={{ borderRadius: 12 }}>
          {analytics?.topQueries?.length ? (
            <ReactECharts
              option={{
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                grid: { left: '3%', right: '10%', top: '3%', bottom: '3%', containLabel: true },
                xAxis: {
                  type: 'value',
                  axisLabel: { color: '#a1a1aa' },
                  splitLine: { lineStyle: { color: '#27273a' } }
                },
                yAxis: {
                  type: 'category',
                  inverse: true,
                  data: analytics.topQueries.slice(0, 10).map(q => q.query_text),
                  axisLabel: { color: '#f4f4f5', fontSize: 12, width: 200, overflow: 'truncate' },
                },
                series: [{
                  type: 'bar',
                  data: analytics.topQueries.slice(0, 10).map((q, i) => ({
                    value: q.count,
                    itemStyle: { color: TAG_COLORS[i % 7], borderRadius: [0, 4, 4, 0] }
                  })),
                  label: { show: true, position: 'right', color: '#a1a1aa', fontSize: 11 }
                }]
              }}
              style={{ height: 300 }}
            />
          ) : <Empty description="暂无数据" />}
        </Card>

        {/* 活跃 Agent */}
        <Card title={<Typography.Text style={{ color: '#f4f4f5' }}>活跃 Agent Top 10</Typography.Text>} style={{ borderRadius: 12 }}>
          {analytics?.activeAgents?.length ? (
            <ReactECharts
              option={{
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                grid: { left: '3%', right: '10%', top: '3%', bottom: '3%', containLabel: true },
                xAxis: {
                  type: 'value',
                  axisLabel: { color: '#a1a1aa' },
                  splitLine: { lineStyle: { color: '#27273a' } }
                },
                yAxis: {
                  type: 'category',
                  inverse: true,
                  data: analytics.activeAgents.slice(0, 10).map(a => a.agent_id || '未知'),
                  axisLabel: { color: '#f4f4f5', fontSize: 12 },
                },
                series: [{
                  type: 'bar',
                  data: analytics.activeAgents.slice(0, 10).map((a, i) => ({
                    value: a.count,
                    itemStyle: { color: TAG_COLORS[i % 7], borderRadius: [0, 4, 4, 0] }
                  })),
                  label: { show: true, position: 'right', color: '#a1a1aa', fontSize: 11 }
                }]
              }}
              style={{ height: 300 }}
            />
          ) : <Empty description="暂无数据" />}
        </Card>
      </div>

      {/* 无效查询列表 */}
      <Card
        title={<Typography.Text style={{ color: '#f4f4f5' }}>无效查询记录</Typography.Text>}
        style={{ borderRadius: 12 }}
        extra={
          <Flex align="center" gap={12}>
            <Typography.Text style={{ color: '#a1a1aa', fontSize: 12 }}>Agent 上报的无效检索，帮助改进规范系统</Typography.Text>
            <Button type="link" size="small" onClick={() => navigate('/analytics/failures')}>
              查看全部 →
            </Button>
          </Flex>
        }
      >
        {failures.length > 0 ? (
          <Table
            dataSource={failures}
            columns={failureColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 20 }}
          />
        ) : (
          <Flex vertical align="center" gap={8} style={{ padding: 40 }}>
            <AlertCircle size={40} color="#27273a" />
            <Typography.Text style={{ color: '#71717a' }}>暂无无效查询记录</Typography.Text>
            <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>当 MCP Agent 调用 report_search_failure 后将在此显示</Typography.Text>
          </Flex>
        )}
      </Card>
    </div>
  );
}
