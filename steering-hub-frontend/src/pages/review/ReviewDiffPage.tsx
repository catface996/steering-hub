import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Flex, Spin, Card, Button, Input, App, Tag } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useHeader } from '../../contexts/HeaderContext';
import { steeringService } from '../../services/steeringService';
import type { DiffVO } from '../../types';
import { formatDateTime } from '../../utils/formatTime';

/** 将逗号分隔的 tag 字符串转为数组 */
const parseTags = (s?: string): string[] =>
  s ? s.split(',').map((t) => t.trim()).filter(Boolean) : [];

/** 渲染 tag 列表，changed=true 时高亮 */
const TagList = ({ tags, changed }: { tags: string[]; changed: boolean }) => {
  if (tags.length === 0) return <Typography.Text style={{ color: '#52525b', fontSize: 13 }}>-</Typography.Text>;
  return (
    <Flex wrap="wrap" gap={4}>
      {tags.map((t, i) => (
        <Tag
          key={t}
          className={`tag-base tag-color-${i % 7}`}
          style={changed ? { outline: '1px solid #f59e0b', outlineOffset: 1 } : undefined}
        >
          {t}
        </Tag>
      ))}
    </Flex>
  );
};

/** 单个元数据行 */
const MetaRow = ({
  label,
  left,
  right,
  changed,
}: {
  label: string;
  left: React.ReactNode;
  right: React.ReactNode;
  changed: boolean;
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '80px 1fr 1fr',
      gap: 12,
      alignItems: 'flex-start',
      padding: '8px 0',
      borderBottom: '1px solid #1e1e2a',
      background: changed ? 'rgba(245,158,11,0.06)' : undefined,
      borderRadius: 4,
    }}
  >
    <Typography.Text style={{ color: '#71717a', fontSize: 12, paddingTop: 2 }}>{label}</Typography.Text>
    <div>{left}</div>
    <div>{right}</div>
  </div>
);

export default function ReviewDiffPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { setBreadcrumbs, setActions } = useHeader();
  const [diff, setDiff] = useState<DiffVO | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setBreadcrumbs(
      <Flex align="center" gap={8}>
        <Typography.Text
          style={{ fontSize: 14, color: '#a1a1aa', cursor: 'pointer' }}
          onClick={() => navigate('/review')}
        >
          审批队列
        </Typography.Text>
        <Typography.Text style={{ color: '#71717a' }}>/</Typography.Text>
        <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>版本对比</Typography.Text>
      </Flex>
    );
    setActions(null);
  }, [setBreadcrumbs, setActions, navigate]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const result = await steeringService.getVersionDiff(Number(id));
        setDiff(result);
      } catch {
        message.error('加载对比数据失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!id) return;
    setSubmitting(true);
    try {
      await steeringService.review(Number(id), action, comment || (action === 'approve' ? '审批通过' : '审批驳回'));
      message.success(action === 'approve' ? '已通过' : '已驳回');
      navigate('/review');
    } catch {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAndActivate = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      await steeringService.review(Number(id), 'approve', comment || '审批通过并生效');
      await steeringService.review(Number(id), 'activate', '审批后自动生效');
      message.success('已通过并生效');
      navigate('/review');
    } catch {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ flex: 1, padding: 48 }}>
        <Spin size="large" />
      </Flex>
    );
  }

  if (!diff) {
    return (
      <Flex justify="center" align="center" style={{ flex: 1, padding: 48 }}>
        <Typography.Text style={{ color: '#71717a' }}>未找到对比数据</Typography.Text>
      </Flex>
    );
  }

  const activeTitle = diff.activeVersion?.title ?? '';
  const pendingTitle = diff.pendingVersion.title;
  const activeTags = parseTags(diff.activeVersion?.tags);
  const pendingTags = parseTags(diff.pendingVersion.tags);
  const activeKeywords = diff.activeVersion?.keywords ?? '';
  const pendingKeywords = diff.pendingVersion.keywords ?? '';

  const titleChanged = activeTitle !== pendingTitle;
  const tagsChanged = JSON.stringify([...activeTags].sort()) !== JSON.stringify([...pendingTags].sort());
  const keywordsChanged = activeKeywords !== pendingKeywords;
  const hasMetaChange = titleChanged || tagsChanged || keywordsChanged;

  return (
    <div className="list-page" style={{ gap: 16 }}>

      {/* Metadata diff */}
      <Card
        title={
          <Flex align="center" gap={8}>
            <Typography.Text style={{ fontWeight: 600 }}>元数据对比</Typography.Text>
            {hasMetaChange && (
              <Tag style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11 }}>
                有变更
              </Tag>
            )}
          </Flex>
        }
        style={{ flexShrink: 0 }}
      >
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 12, marginBottom: 4 }}>
          <div />
          <Flex align="center" gap={6}>
            <Typography.Text style={{ fontSize: 12, color: '#71717a' }}>
              当前生效版 {diff.activeVersion ? `(v${diff.activeVersion.versionNumber})` : ''}
            </Typography.Text>
            {diff.activeVersion && <Tag className="tag-base tag-status-active" style={{ fontSize: 11 }}>active</Tag>}
          </Flex>
          <Flex align="center" gap={6}>
            <Typography.Text style={{ fontSize: 12, color: '#71717a' }}>
              待审版 (v{diff.pendingVersion.versionNumber})
            </Typography.Text>
            <Tag className="tag-base tag-status-pending" style={{ fontSize: 11 }}>pending_review</Tag>
          </Flex>
        </div>

        <MetaRow
          label="标题"
          changed={titleChanged}
          left={
            <Typography.Text style={{ fontSize: 14, fontWeight: 500, color: diff.activeVersion ? '#f4f4f5' : '#52525b' }}>
              {activeTitle || '（新建规范）'}
            </Typography.Text>
          }
          right={
            <Typography.Text style={{ fontSize: 14, fontWeight: 500, color: titleChanged ? '#f59e0b' : '#f4f4f5' }}>
              {pendingTitle}
            </Typography.Text>
          }
        />

        <MetaRow
          label="标签"
          changed={tagsChanged}
          left={<TagList tags={activeTags} changed={false} />}
          right={<TagList tags={pendingTags} changed={tagsChanged} />}
        />

        <MetaRow
          label="关键词"
          changed={keywordsChanged}
          left={
            <Typography.Text style={{ fontSize: 13, color: '#d4d4d8' }}>
              {activeKeywords || '-'}
            </Typography.Text>
          }
          right={
            <Typography.Text style={{ fontSize: 13, color: keywordsChanged ? '#f59e0b' : '#d4d4d8' }}>
              {pendingKeywords || '-'}
            </Typography.Text>
          }
        />
      </Card>

      {/* Side-by-side content diff */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Active version (left) */}
        <Card
          title={
            <Flex align="center" gap={8}>
              <Typography.Text style={{ fontWeight: 600 }}>
                当前生效版 {diff.activeVersion ? `(v${diff.activeVersion.versionNumber})` : ''}
              </Typography.Text>
              {diff.activeVersion && (
                <Tag className="tag-base tag-status-active">active</Tag>
              )}
            </Flex>
          }
          style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          styles={{ body: { flex: 1, overflow: 'auto', padding: 20 } }}
        >
          {diff.activeVersion ? (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{diff.activeVersion.content}</ReactMarkdown>
            </div>
          ) : (
            <Typography.Text style={{ color: '#71717a' }}>新建规范，无历史版本</Typography.Text>
          )}
        </Card>

        {/* Pending version (right) */}
        <Card
          title={
            <Flex align="center" gap={8}>
              <Typography.Text style={{ fontWeight: 600 }}>
                待审版 (v{diff.pendingVersion.versionNumber})
              </Typography.Text>
              <Tag className="tag-base tag-status-pending">pending_review</Tag>
            </Flex>
          }
          style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          styles={{ body: { flex: 1, overflow: 'auto', padding: 20 } }}
        >
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{diff.pendingVersion.content}</ReactMarkdown>
          </div>
        </Card>
      </div>

      {/* Bottom action bar */}
      <Card style={{ flexShrink: 0 }}>
        <Flex vertical gap={12}>
          <Flex gap={24} wrap="wrap">
            <div>
              <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>修改说明</Typography.Text>
              <Typography.Text style={{ display: 'block', fontSize: 13 }}>{diff.pendingVersion.changeLog || '-'}</Typography.Text>
            </div>
            <div>
              <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>提交时间</Typography.Text>
              <Typography.Text style={{ display: 'block', fontSize: 13 }}>{formatDateTime(diff.pendingVersion.createdAt)}</Typography.Text>
            </div>
          </Flex>

          <Flex gap={12} align="end">
            <Input.TextArea
              placeholder="审批意见（可选）"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              autoSize={{ minRows: 1, maxRows: 3 }}
              style={{ flex: 1 }}
            />
            <Flex gap={8}>
              <Button danger onClick={() => handleAction('reject')} loading={submitting}>
                驳回
              </Button>
              <Button onClick={() => handleAction('approve')} loading={submitting}>
                通过
              </Button>
              <Button type="primary" onClick={handleApproveAndActivate} loading={submitting}>
                通过并生效
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    </div>
  );
}
