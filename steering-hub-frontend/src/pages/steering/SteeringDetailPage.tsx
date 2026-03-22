import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button, Tag, Card, Flex, Spin, Modal, App, Progress, Tabs, Table, Alert } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useHeader } from '../../contexts/HeaderContext';
import { steeringService } from '../../services/steeringService';
import type { Steering, SteeringStatus, SteeringVersionVO, SteeringVersionDetailVO } from '../../types';
import Pagination from '../../components/Pagination';

const STATUS_LABEL: Record<SteeringStatus, string> = {
  draft: '草稿', pending_review: '待审核', approved: '已通过',
  rejected: '已驳回', active: '已生效', superseded: '已被取代', deprecated: '已废弃',
};

const STATUS_CLASS: Record<SteeringStatus, string> = {
  draft: 'tag-status-draft', pending_review: 'tag-status-pending', approved: 'tag-status-approved',
  rejected: 'tag-status-rejected', active: 'tag-status-active', superseded: 'tag-status-deprecated', deprecated: 'tag-status-deprecated',
};

export default function SteeringDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { setBreadcrumbs, setActions } = useHeader();
  const [steering, setSteering] = useState<Steering | null>(null);
  const [loading, setLoading] = useState(true);
  const [deprecateOpen, setDeprecateOpen] = useState(false);
  const [versions, setVersions] = useState<SteeringVersionVO[]>([]);
  const [versionsTotal, setVersionsTotal] = useState(0);
  const [versionsPage, setVersionsPage] = useState(0);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<SteeringVersionDetailVO | null>(null);
  const [versionDetailOpen, setVersionDetailOpen] = useState(false);
  const versionsPageSize = 20;

  useEffect(() => {
    const load = async () => {
      try {
        const data = await steeringService.get(Number(id));
        setSteering(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const loadVersions = async () => {
      setVersionsLoading(true);
      try {
        const result = await steeringService.listVersions(Number(id), versionsPage + 1, versionsPageSize);
        setVersions(result.records);
        setVersionsTotal(result.total);
      } catch {
        // ignore
      } finally {
        setVersionsLoading(false);
      }
    };
    loadVersions();
  }, [id, versionsPage]);

  const handleVersionRowClick = async (versionNumber: number) => {
    try {
      const detail = await steeringService.getVersionDetail(Number(id), versionNumber);
      setSelectedVersion(detail);
      setVersionDetailOpen(true);
    } catch {
      // ignore
    }
  };

  const hasPendingReviewVersion = versions.some((v) => v.status === 'pending_review');

  useEffect(() => {
    if (!steering) return;

    setBreadcrumbs(
      <Flex align="center" gap={8}>
        <Typography.Text
          style={{ color: '#a1a1aa', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
          onClick={() => navigate('/steerings')}
        >
          规范管理
        </Typography.Text>
        <Typography.Text style={{ color: '#71717a', fontSize: 20 }}>/</Typography.Text>
        <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>{steering.title}</Typography.Text>
      </Flex>
    );

    const actionButtons = (
      <Flex gap={8}>
        <Button onClick={() => navigate('/steerings')}>返回</Button>
        <Button type="primary" onClick={() => navigate(`/steerings/${id}/edit`)}>编辑规范</Button>
        {steering.status === 'draft' && (
          <Button type="primary" onClick={() => handleReview('submit')}>提交审核</Button>
        )}
        {steering.status === 'pending_review' && (
          <>
            <Button type="primary" style={{ background: '#32D583' }} onClick={() => handleReview('approve')}>审核通过</Button>
            <Button danger onClick={() => handleReview('reject')}>驳回</Button>
          </>
        )}
        {steering.status === 'approved' && (
          <Button type="primary" onClick={() => handleReview('activate')}>生效</Button>
        )}
        {steering.status === 'active' && (
          <Button danger onClick={() => setDeprecateOpen(true)}>废弃</Button>
        )}
      </Flex>
    );
    setActions(actionButtons);
  }, [steering, setBreadcrumbs, setActions, navigate, id]);

  const handleReview = async (action: string) => {
    try {
      await steeringService.review(Number(id), action as any);
      message.success('操作成功');
      const data = await steeringService.get(Number(id));
      setSteering(data);
    } catch {
      message.error('操作失败');
    }
  };

  if (loading) return <Flex justify="center" style={{ padding: 64 }}><Spin size="large" /></Flex>;
  if (!steering) return <Typography.Text type="secondary">规范不存在</Typography.Text>;

  const versionColumns = [
    { title: '版本号', dataIndex: 'versionNumber', key: 'versionNumber', width: 80, render: (v: number) => `v${v}` },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s: SteeringStatus) => <Tag className={`tag-base ${STATUS_CLASS[s]}`}>{STATUS_LABEL[s]}</Tag>
    },
    { title: '修改摘要', dataIndex: 'changeSummary', key: 'changeSummary', render: (v: string) => v || '-' },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 180, render: (v: string) => v?.slice(0, 16) || '-' },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* T017: diff-hint banner */}
      {steering.status === 'active' && hasPendingReviewVersion && (
        <Alert
          type="warning"
          showIcon
          message="存在待审核的修订版本，当前搜索返回的仍为已生效版本内容"
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs
        defaultActiveKey="content"
        items={[
          {
            key: 'content',
            label: '规范内容',
            children: (
              <Flex gap={20} align="flex-start">
                {/* Left: Content */}
                <div style={{ flex: '0 0 70%' }}>
                  <Card style={{ borderRadius: 12 }}>
                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{steering.content}</ReactMarkdown>
                    </div>
                  </Card>
                </div>

                {/* Right: Metadata */}
                <div style={{ flex: '0 0 calc(30% - 20px)' }}>
                  <Card style={{ borderRadius: 12 }}>
                    <Typography.Text style={{ fontWeight: 600, fontSize: 16, display: 'block', marginBottom: 16 }}>元信息</Typography.Text>

                    {[
                      { label: '分类', value: steering.categoryName || '-' },
                      { label: '状态', value: <Tag className={`tag-base ${STATUS_CLASS[steering.status]}`}>{STATUS_LABEL[steering.status]}</Tag> },
                      { label: '版本', value: `v${steering.currentVersion}` },
                      {
                        label: '标签',
                        value: steering.tags && steering.tags.length > 0
                          ? <Flex wrap="wrap" gap={4}>{steering.tags.map((t, index) => <Tag key={t} className={`tag-base tag-color-${index % 7}`}>{t}</Tag>)}</Flex>
                          : '-'
                      },
                      {
                        label: '关键词',
                        value: steering.keywords
                          ? <Flex wrap="wrap" gap={4}>{steering.keywords.split(',').filter(k => k.trim()).map((kw, index) => <Tag key={kw} className={`tag-base tag-color-${index % 7}`} style={{ fontSize: 11 }}>{kw.trim()}</Tag>)}</Flex>
                          : '-'
                      },
                      { label: '作者', value: steering.author || '-' },
                      { label: '更新时间', value: steering.updatedAt },
                      { label: '创建时间', value: steering.createdAt },
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
                  {steering.qualityScore !== undefined && (
                    <Card style={{ borderRadius: 12, marginTop: 16 }}>
                      <Typography.Text style={{ fontWeight: 600, fontSize: 16, display: 'block', marginBottom: 12 }}>可检索性评分</Typography.Text>
                      <Progress
                        percent={(steering.qualityScore ?? 0) * 100}
                        strokeColor={
                          (steering.qualityScore ?? 0) >= 0.7 ? '#32D583'
                            : (steering.qualityScore ?? 0) >= 0.4 ? '#FFB547'
                            : '#E85A4F'
                        }
                        style={{ marginBottom: 8 }}
                      />
                      <Typography.Text style={{ fontSize: 20, fontWeight: 700 }}>
                        {((steering.qualityScore ?? 0) * 100).toFixed(0)}%
                      </Typography.Text>
                    </Card>
                  )}

                  {/* Agent Queries */}
                  {steering.agentQueries && steering.agentQueries.length > 0 && (
                    <Card style={{ borderRadius: 12, marginTop: 16 }}>
                      <Typography.Text style={{ fontWeight: 600, fontSize: 16, display: 'block', marginBottom: 4 }}>Agent 测试问题</Typography.Text>
                      <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, display: 'block', marginBottom: 12 }}>
                        AI Coding Agent 可能用以下问题检索到此规范
                      </Typography.Text>
                      {steering.agentQueries.map((q, i) => (
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
            ),
          },
          {
            key: 'versions',
            label: '版本历史',
            children: (
              <Card style={{ borderRadius: 12 }}>
                {versionsLoading ? (
                  <Flex justify="center" style={{ padding: 32 }}><Spin /></Flex>
                ) : (
                  <>
                    <Table
                      dataSource={versions}
                      columns={versionColumns}
                      rowKey="id"
                      pagination={false}
                      onRow={(record) => ({ onClick: () => handleVersionRowClick(record.versionNumber), style: { cursor: 'pointer' } })}
                      size="small"
                    />
                    {versionsTotal > versionsPageSize && (
                      <Pagination
                        count={versionsTotal}
                        page={versionsPage}
                        rowsPerPage={versionsPageSize}
                        onPageChange={setVersionsPage}
                        label="个版本"
                      />
                    )}
                  </>
                )}
              </Card>
            ),
          },
        ]}
      />

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

      {/* Version Detail Modal (read-only) */}
      <Modal
        open={versionDetailOpen}
        onCancel={() => setVersionDetailOpen(false)}
        footer={<Button onClick={() => setVersionDetailOpen(false)}>关闭</Button>}
        title={selectedVersion ? `版本 v${selectedVersion.versionNumber} 详情` : '版本详情'}
        width={800}
      >
        {selectedVersion && (
          <div>
            <Flex gap={8} style={{ marginBottom: 12 }}>
              <Tag className={`tag-base ${STATUS_CLASS[selectedVersion.status as SteeringStatus]}`}>
                {STATUS_LABEL[selectedVersion.status as SteeringStatus]}
              </Tag>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12 }}>{selectedVersion.updatedAt?.slice(0, 16)}</Typography.Text>
            </Flex>
            <Typography.Text style={{ fontWeight: 600, fontSize: 16, display: 'block', marginBottom: 8 }}>{selectedVersion.title}</Typography.Text>
            {selectedVersion.changeSummary && (
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, display: 'block', marginBottom: 12 }}>
                修改摘要：{selectedVersion.changeSummary}
              </Typography.Text>
            )}
            {selectedVersion.tags && (
              <Flex gap={4} wrap="wrap" style={{ marginBottom: 12 }}>
                {selectedVersion.tags.split(',').filter(t => t.trim()).map((t, i) => (
                  <Tag key={t} className={`tag-base tag-color-${i % 7}`}>{t.trim()}</Tag>
                ))}
              </Flex>
            )}
            <div className="markdown-body" style={{ maxHeight: 400, overflow: 'auto', padding: 12, border: '1px solid #27273a', borderRadius: 8 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedVersion.content}</ReactMarkdown>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
