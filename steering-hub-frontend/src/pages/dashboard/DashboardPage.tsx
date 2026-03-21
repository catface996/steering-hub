import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Card, Button, Tag, Flex, Spin } from 'antd';
import { FileText, CheckCircle, Search, ShieldCheck, Plus, Tag as TagIcon } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { steeringService } from '../../services/steeringService';
import type { Steering, SteeringStatus } from '../../types';

const STATUS_LABEL: Record<SteeringStatus, string> = {
  draft: '草稿', pending_review: '待审核', approved: '已通过',
  rejected: '已驳回', active: '已生效', deprecated: '已废弃',
};

const STATUS_CLASS: Record<SteeringStatus, string> = {
  draft: 'tag-status-draft', pending_review: 'tag-status-pending', approved: 'tag-status-approved',
  rejected: 'tag-status-rejected', active: 'tag-status-active', deprecated: 'tag-status-deprecated',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useHeader();
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [recentSteerings, setRecentSteerings] = useState<Steering[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setBreadcrumbs(
      <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>平台概览</Typography.Text>
    );
  }, [setBreadcrumbs]);

  useEffect(() => {
    const load = async () => {
      try {
        const [total, active, recent] = await Promise.all([
          steeringService.page({ current: 1, size: 1 }),
          steeringService.page({ current: 1, size: 1, status: 'active' }),
          steeringService.page({ current: 1, size: 5 }),
        ]);
        setTotalCount(total.total);
        setActiveCount(active.total);
        setRecentSteerings(recent.records);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = [
    { label: '规范总数', value: totalCount, icon: <FileText size={20} />, color: 'var(--primary-color)', bgColor: 'rgba(var(--primary-rgb), 0.1)' },
    { label: '已生效规范', value: activeCount, icon: <CheckCircle size={20} />, color: '#32D583', bgColor: 'rgba(50, 213, 131, 0.12)' },
    { label: '本周检索次数', value: '--', icon: <Search size={20} />, color: '#FFB547', bgColor: 'rgba(255, 181, 71, 0.12)' },
    { label: '合规检查次数', value: '--', icon: <ShieldCheck size={20} />, color: '#E85A4F', bgColor: 'rgba(232, 90, 79, 0.12)' },
  ];

  const quickActions = [
    { label: '新建规范', icon: <Plus size={16} />, onClick: () => navigate('/steerings/new'), color: 'var(--primary-color)', bgColor: 'rgba(var(--primary-rgb), 0.1)' },
    { label: '搜索规范', icon: <Search size={16} />, onClick: () => navigate('/search'), color: '#32D583', bgColor: 'rgba(50, 213, 131, 0.12)' },
    { label: '合规检查', icon: <ShieldCheck size={16} />, onClick: () => navigate('/compliance'), color: '#FFB547', bgColor: 'rgba(255, 181, 71, 0.12)' },
    { label: '分类管理', icon: <TagIcon size={16} />, onClick: () => navigate('/categories'), color: '#E85A4F', bgColor: 'rgba(232, 90, 79, 0.12)' },
  ];

  if (loading) {
    return <Flex justify="center" align="center" style={{ flex: 1, padding: 48 }}><Spin size="large" /></Flex>;
  }

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

      {/* Bottom Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* Recent Updates */}
        <Card
          title={
            <Flex justify="space-between" align="center">
              <Typography.Text style={{ fontWeight: 600, fontSize: 16 }}>最近更新</Typography.Text>
              <Button type="link" onClick={() => navigate('/steerings')} style={{ fontSize: 13 }}>查看全部</Button>
            </Flex>
          }
          styles={{ body: { padding: 0 } }}
          style={{ borderRadius: 12 }}
        >
          {/* Header */}
          <Flex style={{ padding: '12px 20px', borderBottom: '1px solid #27273a' }}>
            <Typography.Text style={{ color: '#71717a', fontSize: 12, fontWeight: 600, width: '35%' }}>标题</Typography.Text>
            <Typography.Text style={{ color: '#71717a', fontSize: 12, fontWeight: 600, width: '20%' }}>分类</Typography.Text>
            <Typography.Text style={{ color: '#71717a', fontSize: 12, fontWeight: 600, width: '15%' }}>版本</Typography.Text>
            <Typography.Text style={{ color: '#71717a', fontSize: 12, fontWeight: 600, width: '15%' }}>状态</Typography.Text>
            <Typography.Text style={{ color: '#71717a', fontSize: 12, fontWeight: 600, width: '15%' }}>更新时间</Typography.Text>
          </Flex>
          {recentSteerings.map((steering) => (
            <Flex
              key={steering.id}
              align="center"
              onClick={() => navigate(`/steerings/${steering.id}`)}
              style={{ padding: '10px 20px', borderBottom: '1px solid #27273a', cursor: 'pointer' }}
            >
              <div style={{ width: '35%', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Typography.Text style={{ fontSize: 13, fontWeight: 500 }} ellipsis>{steering.title}</Typography.Text>
              </div>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, width: '20%' }} ellipsis>{steering.categoryName}</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, width: '15%' }}>v{steering.currentVersion}</Typography.Text>
              <div style={{ width: '15%' }}>
                <Tag className={`tag-base ${STATUS_CLASS[steering.status]}`}>{STATUS_LABEL[steering.status]}</Tag>
              </div>
              <Typography.Text style={{ color: '#71717a', fontSize: 12, width: '15%' }}>{steering.updatedAt?.slice(0, 10)}</Typography.Text>
            </Flex>
          ))}
        </Card>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card title={<Typography.Text style={{ fontWeight: 600, fontSize: 16 }}>快速操作</Typography.Text>} style={{ borderRadius: 12 }}>
            <Flex vertical gap={10}>
              {quickActions.map((action) => (
                <div
                  key={action.label}
                  onClick={action.onClick}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 10,
                    background: action.bgColor, color: action.color,
                    cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  }}
                >
                  {action.icon}
                  {action.label}
                </div>
              ))}
            </Flex>
          </Card>

          <Card title={<Typography.Text style={{ fontWeight: 600, fontSize: 16 }}>系统状态</Typography.Text>} style={{ borderRadius: 12 }}>
            <Flex vertical gap={10}>
              {[
                { label: 'API 状态', status: '正常运行', color: '#32D583' },
                { label: '向量数据库', status: '已连接', color: '#32D583' },
                { label: '全文索引', status: '运行中', color: 'var(--primary-color)' },
                { label: '缓存服务', status: '正常', color: '#32D583' },
              ].map((item) => (
                <Flex key={item.label} justify="space-between" align="center" style={{ padding: '4px 0' }}>
                  <Typography.Text style={{ color: '#a1a1aa', fontSize: 13 }}>{item.label}</Typography.Text>
                  <Tag className="tag-base tag-system" style={{ border: `1px solid ${item.color}`, color: item.color }}>{item.status}</Tag>
                </Flex>
              ))}
            </Flex>
          </Card>
        </div>
      </div>
    </div>
  );
}
