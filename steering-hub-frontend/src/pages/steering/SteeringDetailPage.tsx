import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button, Tag, Card, Flex, Spin, Modal, App, Progress, Tabs, Table, Alert } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useHeader } from '../../contexts/HeaderContext';
import { steeringService } from '../../services/steeringService';
import { formatDateTime } from '../../utils/formatTime';
import { repoService } from '../../services/repoService';
import type { Steering, SteeringStatus, SteeringVersionVO, SteeringVersionDetailVO, RepoBindingItem } from '../../types';
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDraftOpen, setDeleteDraftOpen] = useState(false);
  const [versions, setVersions] = useState<SteeringVersionVO[]>([]);
  const [versionsTotal, setVersionsTotal] = useState(0);
  const [versionsPage, setVersionsPage] = useState(0);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<SteeringVersionDetailVO | null>(null);
  const [versionDetailOpen, setVersionDetailOpen] = useState(false);
  const [selectedVersionTab, setSelectedVersionTab] = useState<string | null>(null);
  const [selectedVersionDetail, setSelectedVersionDetail] = useState<SteeringVersionDetailVO | null>(null);
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  const versionsPageSize = 20;

  const [repoBindings, setRepoBindings] = useState<RepoBindingItem[]>([]);
  const [repoTotal, setRepoTotal] = useState(0);
  const [repoPage, setRepoPage] = useState(0);
  const [repoBindingsLoading, setRepoBindingsLoading] = useState(false);
  const REPO_PAGE_SIZE = 20;

  const loadRepoBindings = useCallback(async (p = repoPage) => {
    setRepoBindingsLoading(true);
    try {
      const data = await repoService.listReposBySteering(Number(id), p + 1, REPO_PAGE_SIZE);
      setRepoBindings(data.records);
      setRepoTotal(Number(data.total));
    } catch {
      // toasted
    } finally {
      setRepoBindingsLoading(false);
    }
  }, [id, repoPage]);

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

  useEffect(() => { loadRepoBindings(repoPage); }, [repoPage]);

  useEffect(() => {
    if (!id) return;
    const loadVersions = async () => {
      setVersionsLoading(true);
      try {
        const result = await steeringService.listVersions(Number(id), versionsPage + 1, versionsPageSize);
        setVersions(result.records);
        setVersionsTotal(result.total);
        // Auto-load first version detail
        if (result.records.length > 0) {
          const first = result.records[0];
          setSelectedVersionTab(String(first.versionNumber));
          const detail = await steeringService.getVersionDetail(Number(id), first.versionNumber);
          setSelectedVersionDetail(detail);
        } else {
          setSelectedVersionTab(null);
          setSelectedVersionDetail(null);
        }
      } catch {
        // ignore
      } finally {
        setVersionsLoading(false);
      }
    };
    loadVersions();
  }, [id, versionsPage, versionsRefreshKey]);

  const handleVersionRowClick = async (versionNumber: number) => {
    try {
      const detail = await steeringService.getVersionDetail(Number(id), versionNumber);
      setSelectedVersion(detail);
      setVersionDetailOpen(true);
    } catch {
      // ignore
    }
  };

  const handleVersionTabChange = async (key: string) => {
    setSelectedVersionTab(key);
    const versionNumber = Number(key);
    try {
      const detail = await steeringService.getVersionDetail(Number(id), versionNumber);
      setSelectedVersionDetail(detail);
    } catch {
      message.error('加载版本失败');
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
        {(steering.status === 'draft' || steering.status === 'deprecated') && (
          <Button danger onClick={() => setDeleteOpen(true)}>删除</Button>
        )}
      </Flex>
    );
    setActions(actionButtons);
  }, [steering, versions, selectedVersionDetail, setBreadcrumbs, setActions, navigate, id]);

  const handleReview = async (action: string) => {
    try {
      await steeringService.review(Number(id), action as any);
      message.success('操作成功');
      const data = await steeringService.get(Number(id));
      setSteering(data);
      setVersionsRefreshKey(k => k + 1);
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await steeringService.delete(Number(id));
      message.success('规范已删除');
      navigate('/steerings');
    } catch {
      message.error('删除失败');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
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
          message={
            <Flex align="center" justify="space-between">
              <span>存在待审核的修订版本，当前搜索返回的仍为已生效版本内容</span>
              <Button type="link" size="small" onClick={() => navigate(`/review/${id}/diff`)} style={{ padding: 0 }}>
                前往审批 →
              </Button>
            </Flex>
          }
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
                      { label: '作者', value: steering.author || '-' },
                      { label: '更新时间', value: formatDateTime(steering.updatedAt) },
                      { label: '创建时间', value: formatDateTime(steering.createdAt) },
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
            children: versionsLoading ? (
              <Flex justify="center" style={{ padding: 32 }}><Spin /></Flex>
            ) : versions.length === 0 ? (
              <Card style={{ borderRadius: 12 }}>
                <Flex justify="center" style={{ padding: 32 }}>
                  <Typography.Text style={{ color: '#71717a' }}>暂无版本记录</Typography.Text>
                </Flex>
              </Card>
            ) : (
              <Tabs
                tabPosition="left"
                activeKey={selectedVersionTab ?? String(versions[0]?.versionNumber)}
                onChange={handleVersionTabChange}
                items={versions.map((v) => ({
                  key: String(v.versionNumber),
                  label: (
                    <Flex align="center" gap={6}>
                      <span>v{v.versionNumber}</span>
                      <Tag className={`tag-base ${STATUS_CLASS[v.status]}`} style={{ fontSize: 11, marginRight: 0 }}>
                        {STATUS_LABEL[v.status]}
                      </Tag>
                    </Flex>
                  ),
                  children: selectedVersionDetail && selectedVersionDetail.versionNumber === v.versionNumber ? (
                    <Flex gap={20} align="flex-start">
                      <div style={{ flex: '0 0 70%' }}>
                        <Card style={{ borderRadius: 12 }}>
                          <Typography.Text style={{ fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 16 }}>
                            {selectedVersionDetail.title}
                          </Typography.Text>
                          <div className="markdown-body">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedVersionDetail.content}</ReactMarkdown>
                          </div>
                        </Card>
                      </div>
                      <div style={{ flex: '0 0 calc(30% - 20px)' }}>
                        <Card style={{ borderRadius: 12 }}>
                          <Typography.Text style={{ fontWeight: 600, fontSize: 16, display: 'block', marginBottom: 16 }}>版本信息</Typography.Text>
                          {[
                            { label: '状态', value: <Tag className={`tag-base ${STATUS_CLASS[selectedVersionDetail.status]}`}>{STATUS_LABEL[selectedVersionDetail.status]}</Tag> },
                            { label: '版本号', value: `v${selectedVersionDetail.versionNumber}` },
                            {
                              label: '标签',
                              value: selectedVersionDetail.tags
                                ? <Flex wrap="wrap" gap={4}>{selectedVersionDetail.tags.split(',').filter(t => t.trim()).map((t, i) => <Tag key={t} className={`tag-base tag-color-${i % 7}`}>{t.trim()}</Tag>)}</Flex>
                                : '-'
                            },
                            { label: '修改摘要', value: selectedVersionDetail.changeSummary || '-' },
                            { label: '更新时间', value: formatDateTime(selectedVersionDetail.updatedAt) },
                          ].map((item) => (
                            <div key={item.label} style={{ marginBottom: 16 }}>
                              <Typography.Text style={{ color: '#71717a', fontSize: 12, display: 'block', marginBottom: 4 }}>{item.label}</Typography.Text>
                              {typeof item.value === 'string' ? (
                                <Typography.Text style={{ fontSize: 14, fontWeight: 500 }}>{item.value}</Typography.Text>
                              ) : item.value}
                            </div>
                          ))}
                          {selectedVersionDetail.status === 'draft' && (
                            <Flex vertical gap={8} style={{ marginTop: 8 }}>
                              {!hasPendingReviewVersion && (
                                <Button type="primary" block onClick={() => handleReview('submit')}>
                                  提交审核
                                </Button>
                              )}
                              <Button danger block onClick={() => setDeleteDraftOpen(true)}>
                                删除草稿
                              </Button>
                            </Flex>
                          )}
                        </Card>
                      </div>
                    </Flex>
                  ) : (
                    <Flex justify="center" style={{ padding: 32 }}><Spin /></Flex>
                  ),
                }))}
              />
            ),
          },
        ]}
      />

      {/* Repos binding list */}
      <Card style={{ borderRadius: 12, marginTop: 20, padding: 0, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e1e2a' }}>
          <Typography.Text style={{ fontWeight: 600, fontSize: 16 }}>引用仓库</Typography.Text>
          <Typography.Text style={{ color: '#71717a', fontSize: 13, marginLeft: 8 }}>绑定了此规范的仓库列表</Typography.Text>
        </div>
        {repoBindingsLoading ? (
          <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['仓库名称', 'full_name', '强制', '状态', '绑定时间'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, color: '#a1a1aa', fontWeight: 500, background: 'var(--bg-elevated)', borderBottom: '1px solid #1e1e2a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {repoBindings.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px 16px', textAlign: 'center', color: '#71717a', fontSize: 14 }}>暂无引用仓库</td>
                </tr>
              ) : repoBindings.map((b) => (
                <tr key={b.bindingId}>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2a', fontSize: 14, color: '#e4e4e7' }}>
                    <Typography.Text
                      style={{ color: '#818CF8', cursor: 'pointer' }}
                      onClick={() => navigate(`/repos/${b.repoId}`)}
                    >
                      {b.repoName}
                    </Typography.Text>
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2a', fontSize: 13, color: '#a1a1aa' }}>{b.repoFullName}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2a' }}>
                    {b.mandatory
                      ? <Tag color="blue" style={{ borderRadius: 100 }}>强制</Tag>
                      : <Typography.Text style={{ color: '#71717a' }}>-</Typography.Text>}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2a' }}>
                    <Tag color={b.repoEnabled ? 'success' : 'default'} style={{ borderRadius: 100 }}>
                      {b.repoEnabled ? '启用' : '停用'}
                    </Tag>
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2a', fontSize: 12, color: '#71717a' }}>{formatDateTime(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          count={repoTotal}
          page={repoPage}
          rowsPerPage={REPO_PAGE_SIZE}
          onPageChange={setRepoPage}
          label="个仓库"
        />
      </Card>

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

      {/* Delete Modal */}
      <Modal
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onOk={handleDelete}
        title="确认删除"
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: deleting }}
      >
        <Typography.Text type="secondary">
          删除后数据不可恢复，确认删除规范「{steering.title}」？
        </Typography.Text>
      </Modal>

      {/* Delete Draft Modal */}
      <Modal
        open={deleteDraftOpen}
        onCancel={() => setDeleteDraftOpen(false)}
        onOk={async () => {
          if (!selectedVersionDetail) return;
          try {
            await steeringService.deleteDraftVersion(Number(id), selectedVersionDetail.versionNumber);
            message.success('草稿已删除');
            setDeleteDraftOpen(false);
            // Reload versions list and auto-select first
            const result = await steeringService.listVersions(Number(id), 1, versionsPageSize);
            setVersions(result.records);
            setVersionsTotal(result.total);
            if (result.records.length > 0) {
              const first = result.records[0];
              setSelectedVersionTab(String(first.versionNumber));
              const detail = await steeringService.getVersionDetail(Number(id), first.versionNumber);
              setSelectedVersionDetail(detail);
            } else {
              setSelectedVersionTab(null);
              setSelectedVersionDetail(null);
            }
          } catch {
            message.error('删除失败');
          }
        }}
        title="确认删除草稿"
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Typography.Text type="secondary">
          确认删除草稿版本 v{selectedVersionDetail?.versionNumber}？删除后不可恢复。
        </Typography.Text>
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
