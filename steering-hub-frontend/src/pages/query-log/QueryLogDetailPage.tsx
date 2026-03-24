import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button, Tag, Flex, Spin, Card, Descriptions } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { queryLogService } from '../../services/queryLogService';
import type { QueryLogDetail, HitSteering } from '../../types';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  PENDING_REVIEW: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  ACTIVE: '已生效',
  DEPRECATED: '已废弃',
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#71717a',
  PENDING_REVIEW: '#f59e0b',
  APPROVED: '#818cf8',
  REJECTED: '#ef4444',
  ACTIVE: '#32D583',
  DEPRECATED: '#f97316',
};

function SourceTag({ source }: { source?: string | null }) {
  if (source === 'MCP') return <Tag color="blue" style={{ borderRadius: 100 }}>MCP</Tag>;
  if (source === 'WEB' || source === 'Web') return <Tag color="green" style={{ borderRadius: 100 }}>Web</Tag>;
  return <Tag color="default" style={{ borderRadius: 100 }}>未知</Tag>;
}

function SteeringCard({ s }: { s: HitSteering }) {
  const navigate = useNavigate();
  const statusKey = s.status?.toUpperCase() ?? '';
  const tags: string[] = s.tags ? s.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  return (
    <Card
      className="glow-card"
      style={{ borderRadius: 10, cursor: 'pointer' }}
      hoverable
      onClick={() => navigate(`/steerings/${s.id}`)}
    >
      <Flex justify="space-between" align="flex-start" gap={8}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" gap={8} style={{ marginBottom: 6 }}>
            <Typography.Text style={{ fontWeight: 600, fontSize: 14, color: '#e4e4e7' }}>
              {s.title}
            </Typography.Text>
            <Tag
              style={{
                borderRadius: 100, fontSize: 11, flexShrink: 0,
                color: STATUS_COLOR[statusKey] || '#a1a1aa',
                borderColor: STATUS_COLOR[statusKey] || '#a1a1aa',
                background: 'transparent',
              }}
            >
              {STATUS_LABEL[statusKey] || s.status || '-'}
            </Tag>
          </Flex>
          {s.contentSummary && (
            <Typography.Text
              style={{ fontSize: 13, color: '#71717a', display: 'block', lineHeight: 1.6 }}
            >
              {s.contentSummary}
            </Typography.Text>
          )}
          {tags.length > 0 && (
            <Flex gap={4} wrap style={{ marginTop: 8 }}>
              {tags.map((t) => (
                <Tag key={t} style={{ borderRadius: 100, fontSize: 11 }}>{t}</Tag>
              ))}
            </Flex>
          )}
        </div>
        <Flex vertical align="flex-end" gap={4} style={{ flexShrink: 0 }}>
          <Typography.Text style={{ fontSize: 11, color: '#52525b' }}>ID: {s.id}</Typography.Text>
          <Typography.Text style={{ fontSize: 11, color: '#52525b' }}>v{s.currentVersion}</Typography.Text>
        </Flex>
      </Flex>
    </Card>
  );
}

export default function QueryLogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs, setActions } = useHeader();

  const [detail, setDetail] = useState<QueryLogDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    queryLogService.getById(Number(id)).then((data) => {
      setDetail(data);
    }).catch(() => {
      // toasted by request layer
    }).finally(() => {
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    setBreadcrumbs(
      <Flex align="center" gap={8}>
        <Typography.Text
          style={{ color: '#a1a1aa', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
          onClick={() => navigate('/query-logs')}
        >
          检索日志
        </Typography.Text>
        <Typography.Text style={{ color: '#71717a', fontSize: 20 }}>/</Typography.Text>
        <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>
          详情 #{id}
        </Typography.Text>
      </Flex>
    );
    setActions(
      <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/query-logs')}>返回</Button>
    );
  }, [id, setBreadcrumbs, setActions, navigate]);

  if (loading) {
    return <Flex justify="center" style={{ padding: 64 }}><Spin size="large" /></Flex>;
  }
  if (!detail) {
    return <Typography.Text style={{ padding: 24, display: 'block', color: '#71717a' }}>日志不存在</Typography.Text>;
  }

  return (
    <div style={{ padding: 24 }}>
      <Flex gap={20} align="flex-start">
        {/* Left: meta info */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <Card style={{ borderRadius: 12 }}>
            <Typography.Text style={{ fontWeight: 600, fontSize: 15, display: 'block', marginBottom: 16 }}>
              基本信息
            </Typography.Text>
            <Descriptions column={1} size="small" labelStyle={{ color: '#71717a', width: 90 }} contentStyle={{ color: '#e4e4e7' }}>
              <Descriptions.Item label="ID">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="来源"><SourceTag source={detail.source} /></Descriptions.Item>
              <Descriptions.Item label="查询时间">
                <span style={{ fontSize: 12 }}>
                  {detail.createdAt ? new Date(detail.createdAt).toLocaleString('zh-CN', { hour12: false }) : '-'}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="命中数量">
                <Tag color={detail.resultCount === 0 ? 'error' : 'success'} style={{ borderRadius: 100 }}>
                  {detail.resultCount ?? '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="响应时间">
                {detail.responseTimeMs != null ? `${detail.responseTimeMs} ms` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="检索模式">{detail.searchMode || '-'}</Descriptions.Item>
              <Descriptions.Item label="Agent 名称">
                {detail.agentName
                  ? <Tag style={{ borderRadius: 100, fontSize: 11 }}>{detail.agentName}</Tag>
                  : <span style={{ color: '#52525b' }}>-</span>}
              </Descriptions.Item>
              {detail.modelName && (
                <Descriptions.Item label="模型名称">
                  <Tag color="purple" style={{ borderRadius: 100, fontSize: 11 }}>{detail.modelName}</Tag>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="仓库">
                <span style={{ wordBreak: 'break-all', fontSize: 12 }}>{detail.repo || '-'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="是否有效">
                {detail.isEffective == null ? (
                  <Tag color="default" style={{ borderRadius: 100 }}>待评估</Tag>
                ) : detail.isEffective ? (
                  <Tag color="success" style={{ borderRadius: 100 }}>有效</Tag>
                ) : (
                  <Tag color="error" style={{ borderRadius: 100 }}>无效</Tag>
                )}
              </Descriptions.Item>
              {detail.failureReason && (
                <Descriptions.Item label="失败原因">
                  <span style={{ color: '#f87171', fontSize: 12 }}>{detail.failureReason}</span>
                </Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <Typography.Text style={{ color: '#71717a', fontSize: 12, display: 'block', marginBottom: 6 }}>
                查询内容
              </Typography.Text>
              <div style={{ background: '#12121c', border: '1px solid #1e1e2a', borderRadius: 8, padding: '8px 12px', color: '#e4e4e7', fontSize: 13, lineHeight: 1.6, wordBreak: 'break-all' }}>
                {detail.queryText}
              </div>
            </div>

            {detail.taskDescription && (
              <div style={{ marginTop: 12 }}>
                <Typography.Text style={{ color: '#71717a', fontSize: 12, display: 'block', marginBottom: 6 }}>
                  任务描述
                </Typography.Text>
                <div style={{ background: '#12121c', border: '1px solid #1e1e2a', borderRadius: 8, padding: '8px 12px', color: '#a1a1aa', fontSize: 12, lineHeight: 1.6 }}>
                  {detail.taskDescription}
                </div>
              </div>
            )}

            {detail.expectedTopic && (
              <div style={{ marginTop: 12 }}>
                <Typography.Text style={{ color: '#71717a', fontSize: 12, display: 'block', marginBottom: 6 }}>
                  期望话题
                </Typography.Text>
                <div style={{ background: '#12121c', border: '1px solid #1e1e2a', borderRadius: 8, padding: '8px 12px', color: '#a1a1aa', fontSize: 12 }}>
                  {detail.expectedTopic}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right: hit steerings */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Card style={{ borderRadius: 12, padding: 0, overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e1e2a' }}>
              <Typography.Text style={{ fontWeight: 600, fontSize: 15 }}>
                命中规范
                <Tag style={{ marginLeft: 8, borderRadius: 100, fontSize: 12 }}>{detail.hitSteerings?.length ?? 0}</Tag>
              </Typography.Text>
            </div>
            <div style={{ padding: 16 }}>
              {!detail.hitSteerings || detail.hitSteerings.length === 0 ? (
                <Typography.Text style={{ color: '#52525b', fontSize: 13 }}>
                  无命中规范记录
                </Typography.Text>
              ) : (
                <Flex vertical gap={12}>
                  {detail.hitSteerings.map((s) => (
                    <SteeringCard key={s.id} s={s} />
                  ))}
                </Flex>
              )}
            </div>
          </Card>
        </div>
      </Flex>
    </div>
  );
}
