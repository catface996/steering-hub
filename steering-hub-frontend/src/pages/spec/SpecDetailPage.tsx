import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button, Tag, Card, Flex, Spin, Modal, App, Progress } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useHeader } from '../../contexts/HeaderContext';
import { specService } from '../../services/specService';
import type { Spec, SpecStatus } from '../../types';

const STATUS_LABEL: Record<SpecStatus, string> = {
  draft: '草稿', pending_review: '待审核', approved: '已通过',
  rejected: '已驳回', active: '已生效', deprecated: '已废弃',
};

const STATUS_CLASS: Record<SpecStatus, string> = {
  draft: 'tag-status-draft', pending_review: 'tag-status-pending', approved: 'tag-status-approved',
  rejected: 'tag-status-rejected', active: 'tag-status-active', deprecated: 'tag-status-deprecated',
};

export default function SpecDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { setBreadcrumbs, setActions } = useHeader();
  const [spec, setSpec] = useState<Spec | null>(null);
  const [loading, setLoading] = useState(true);
  const [deprecateOpen, setDeprecateOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await specService.get(Number(id));
        setSpec(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!spec) return;

    setBreadcrumbs(
      <Flex align="center" gap={8}>
        <Typography.Text
          style={{ color: '#a1a1aa', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
          onClick={() => navigate('/specs')}
        >
          规范管理
        </Typography.Text>
        <Typography.Text style={{ color: '#71717a', fontSize: 20 }}>/</Typography.Text>
        <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>{spec.title}</Typography.Text>
      </Flex>
    );

    const actionButtons = (
      <Flex gap={8}>
        <Button onClick={() => navigate('/specs')}>返回</Button>
        <Button type="primary" onClick={() => navigate(`/specs/${id}/edit`)}>编辑规范</Button>
        {spec.status === 'draft' && (
          <Button type="primary" onClick={() => handleReview('submit')}>提交审核</Button>
        )}
        {spec.status === 'pending_review' && (
          <>
            <Button type="primary" style={{ background: '#32D583' }} onClick={() => handleReview('approve')}>审核通过</Button>
            <Button danger onClick={() => handleReview('reject')}>驳回</Button>
          </>
        )}
        {spec.status === 'approved' && (
          <Button type="primary" onClick={() => handleReview('activate')}>生效</Button>
        )}
        {spec.status === 'active' && (
          <Button danger onClick={() => setDeprecateOpen(true)}>废弃</Button>
        )}
      </Flex>
    );
    setActions(actionButtons);
  }, [spec, setBreadcrumbs, setActions, navigate, id]);

  const handleReview = async (action: string) => {
    try {
      await specService.review(Number(id), action as any);
      message.success('操作成功');
      const data = await specService.get(Number(id));
      setSpec(data);
    } catch {
      message.error('操作失败');
    }
  };

  if (loading) return <Flex justify="center" style={{ padding: 64 }}><Spin size="large" /></Flex>;
  if (!spec) return <Typography.Text type="secondary">规范不存在</Typography.Text>;

  return (
    <div style={{ padding: 24 }}>
      {/* Left-right layout */}
      <Flex gap={20} align="flex-start">
        {/* Left: Content */}
        <div style={{ flex: '0 0 70%' }}>
          <Card style={{ borderRadius: 12 }}>
            <Typography.Text style={{ fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 16 }}>规范内容</Typography.Text>
            <div style={{ borderTop: '1px solid #27273a', paddingTop: 20 }} className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{spec.content}</ReactMarkdown>
            </div>
          </Card>
        </div>

        {/* Right: Metadata */}
        <div style={{ flex: '0 0 calc(30% - 20px)' }}>
          <Card style={{ borderRadius: 12 }}>
            <Typography.Text style={{ fontWeight: 600, fontSize: 16, display: 'block', marginBottom: 16 }}>元信息</Typography.Text>

            {[
              { label: '分类', value: spec.categoryName || '-' },
              { label: '状态', value: <Tag className={`tag-base ${STATUS_CLASS[spec.status]}`}>{STATUS_LABEL[spec.status]}</Tag> },
              { label: '版本', value: `v${spec.currentVersion}` },
              {
                label: '标签',
                value: spec.tags && spec.tags.length > 0
                  ? <Flex wrap="wrap" gap={4}>{spec.tags.map((t) => <Tag key={t} className="tag-base tag-content">{t}</Tag>)}</Flex>
                  : '-'
              },
              { label: '关键词', value: spec.keywords || '-' },
              { label: '作者', value: spec.author || '-' },
              { label: '更新时间', value: spec.updatedAt },
              { label: '创建时间', value: spec.createdAt },
            ].map((item) => (
              <div key={item.label} style={{ marginBottom: 16 }}>
                <Typography.Text style={{ color: '#71717a', fontSize: 12, display: 'block', marginBottom: 4 }}>{item.label}</Typography.Text>
                {typeof item.value === 'string' ? (
                  <Typography.Text style={{ fontSize: 14, fontWeight: 500 }}>{item.value}</Typography.Text>
                ) : (
                  item.value
                )}
              </div>
            ))}
          </Card>

          {/* Quality Score */}
          {spec.qualityScore !== undefined && (
            <Card style={{ borderRadius: 12, marginTop: 16 }}>
              <Typography.Text style={{ fontWeight: 600, fontSize: 16, display: 'block', marginBottom: 12 }}>可检索性评分</Typography.Text>
              <Progress
                percent={(spec.qualityScore ?? 0) * 100}
                strokeColor={
                  (spec.qualityScore ?? 0) >= 0.7 ? '#32D583'
                    : (spec.qualityScore ?? 0) >= 0.4 ? '#FFB547'
                    : '#E85A4F'
                }
                style={{ marginBottom: 8 }}
              />
              <Typography.Text style={{ fontSize: 20, fontWeight: 700 }}>
                {((spec.qualityScore ?? 0) * 100).toFixed(0)}%
              </Typography.Text>
            </Card>
          )}

          {/* Agent Queries */}
          {spec.agentQueries && spec.agentQueries.length > 0 && (
            <Card style={{ borderRadius: 12, marginTop: 16 }}>
              <Typography.Text style={{ fontWeight: 600, fontSize: 16, display: 'block', marginBottom: 4 }}>Agent 测试问题</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, display: 'block', marginBottom: 12 }}>
                AI Coding Agent 可能用以下问题检索到此规范
              </Typography.Text>
              {spec.agentQueries.map((q, i) => (
                <Flex key={i} gap={8} style={{ marginBottom: 10 }} align="flex-start">
                  <Typography.Text style={{ color: 'var(--primary-color)', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                    Q{i + 1}
                  </Typography.Text>
                  <Typography.Text style={{ color: '#a1a1aa', fontSize: 13 }}>{q}</Typography.Text>
                </Flex>
              ))}
            </Card>
          )}
        </div>
      </Flex>

      {/* Deprecate Modal */}
      <Modal
        open={deprecateOpen}
        onCancel={() => setDeprecateOpen(false)}
        onOk={() => { handleReview('deprecate'); setDeprecateOpen(false); }}
        title="确认废弃"
        okText="废弃"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Typography.Text type="secondary">确认废弃此规范？废弃后将无法通过 MCP 工具检索到此规范。</Typography.Text>
      </Modal>
    </div>
  );
}
