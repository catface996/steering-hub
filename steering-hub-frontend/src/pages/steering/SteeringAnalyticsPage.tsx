import { useEffect } from 'react';
import { Typography, Button, Card, Flex } from 'antd';
import { BarChart3, TrendingUp, Clock, Gauge, Download, Inbox } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';

export default function SteeringAnalyticsPage() {
  const { setBreadcrumbs, setActions } = useHeader();

  useEffect(() => {
    setBreadcrumbs(
      <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>规范使用分析</Typography.Text>
    );
    setActions(
      <Button icon={<Download size={14} />} disabled>导出</Button>
    );
  }, [setBreadcrumbs, setActions]);

  const stats = [
    { label: '总查询次数', value: '--', icon: <BarChart3 size={20} />, color: 'var(--primary-color)', bgColor: 'rgba(var(--primary-rgb), 0.1)' },
    { label: '本月查询', value: '--', icon: <TrendingUp size={20} />, color: '#32D583', bgColor: 'rgba(50, 213, 131, 0.12)' },
    { label: '活跃规范数', value: '--', icon: <Clock size={20} />, color: '#FFB547', bgColor: 'rgba(255, 181, 71, 0.12)' },
    { label: '平均响应时间', value: '--', icon: <Gauge size={20} />, color: '#E85A4F', bgColor: 'rgba(232, 90, 79, 0.12)' },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map((stat) => (
          <Card key={stat.label} style={{ borderRadius: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: stat.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, marginBottom: 12 }}>
              {stat.icon}
            </div>
            <Typography.Text style={{ fontSize: 13, color: '#a1a1aa', display: 'block' }}>{stat.label}</Typography.Text>
            <Typography.Text style={{ fontSize: 28, fontWeight: 700, color: '#f4f4f5' }}>{stat.value}</Typography.Text>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      <Card style={{ borderRadius: 12 }}>
        <Flex vertical align="center" gap={12} style={{ padding: 48 }}>
          <Inbox size={48} color="#27273a" />
          <Typography.Text style={{ color: '#71717a', fontSize: 15 }}>暂无分析数据</Typography.Text>
          <Typography.Text style={{ color: '#71717a', fontSize: 13 }}>后端统计接口就绪后将自动展示使用分析</Typography.Text>
        </Flex>
      </Card>
    </div>
  );
}
