import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Tag, Input, Select, Flex, Spin, Modal, App, Progress, Tooltip, Card, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useIsMobile } from '../../utils/deviceDetect';
import { Plus, LayoutList, LayoutGrid } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { steeringService, categoryService } from '../../services/steeringService';
import { qualityService, type SteeringQuality } from '../../services/searchService';
import type { Steering, SteeringStatus, SteeringCategory } from '../../types';
import { formatDate } from '../../utils/formatTime';
import Pagination from '../../components/Pagination';

const STATUS_LABEL: Record<SteeringStatus, string> = {
  draft: '草稿', pending_review: '待审核', approved: '已通过',
  rejected: '已驳回', active: '已生效', superseded: '已被取代', deprecated: '已废弃',
};

const STATUS_CLASS: Record<SteeringStatus, string> = {
  draft: 'tag-status-draft', pending_review: 'tag-status-pending', approved: 'tag-status-approved',
  rejected: 'tag-status-rejected', active: 'tag-status-active', superseded: 'tag-status-deprecated', deprecated: 'tag-status-deprecated',
};

export default function SteeringListPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { setBreadcrumbs, setActions } = useHeader();
  const isMobile = useIsMobile();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [data, setData] = useState<{ records: Steering[]; total: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualityData, setQualityData] = useState<Record<number, SteeringQuality | null>>({});
  const [qualityDetail, setQualityDetail] = useState<SteeringQuality | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [categories, setCategories] = useState<SteeringCategory[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const effectiveViewMode = isMobile ? 'card' : viewMode;
  const pageSize = effectiveViewMode === 'card' ? 9 : 10;

  useEffect(() => {
    categoryService.list().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setBreadcrumbs(
      <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>规范管理</Typography.Text>
    );
    setActions(
      <Button type="primary" icon={<Plus size={14} />} onClick={() => navigate('/steerings/new')}>
        新建规范
      </Button>
    );
  }, [setBreadcrumbs, setActions, navigate]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const result = await steeringService.page({ current: page + 1, size: effectiveViewMode === 'card' ? 9 : 10, status: status || undefined, keyword, categoryId });
        setData(result);
        // Load quality data
        if (result.records.length > 0) {
          const qualityResults = await Promise.all(
            result.records.map(async (r) => {
              try {
                const q = await qualityService.getQuality(r.id);
                return [r.id, q] as const;
              } catch {
                return [r.id, null] as const;
              }
            })
          );
          setQualityData(Object.fromEntries(qualityResults));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, status, keyword, categoryId, refreshKey, pageSize]);

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await steeringService.delete(deleteId);
      message.success('删除成功');
      setDeleteId(null);
      setPage(0);
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      message.error(e?.message || '删除失败');
    }
  };

  const handleReview = async (id: number, action: 'submit' | 'activate' | 'deprecate') => {
    try {
      await steeringService.review(id, action);
      message.success('操作成功');
      setRefreshKey(k => k + 1);
    } catch {
      message.error('操作失败');
    }
  };

  const handleDeprecate = async (id: number) => {
    try {
      await steeringService.review(id, 'deprecate', '废弃');
      message.success('已废弃');
      setRefreshKey(k => k + 1);
    } catch {
      // request.ts 已全局处理错误 toast，这里不需要再处理
    }
  };

  const handleWithdraw = async (id: number) => {
    try {
      await steeringService.withdraw(id);
      message.success('已撤回');
      setRefreshKey(k => k + 1);
    } catch {
      // ignore
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return '#32D583';
    if (score >= 0.4) return '#FFB547';
    return '#E85A4F';
  };

  return (
    <div className="list-page">
      {/* Filters */}
      <Flex gap={12} justify="space-between" align="center" wrap="wrap">
        <Flex gap={12} wrap="wrap">
          <Input
            placeholder="搜索规范标题..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: isMobile ? '100%' : 280 }}
          />
          <Select
            value={status}
            onChange={(val) => setStatus(val)}
            style={{ width: 140 }}
            options={[
              { label: '全部', value: '' },
              ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ label, value })),
            ]}
          />
          <Select
            value={categoryId}
            onChange={(val) => setCategoryId(val)}
            allowClear
            placeholder="全部分类"
            style={{ width: 140 }}
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Flex>
        {!isMobile && (
          <Flex gap={4}>
            <Button
              type={viewMode === 'list' ? 'primary' : 'default'}
              icon={<LayoutList size={16} />}
              onClick={() => { setViewMode('list'); setPage(0); }}
            />
            <Button
              type={viewMode === 'card' ? 'primary' : 'default'}
              icon={<LayoutGrid size={16} />}
              onClick={() => { setViewMode('card'); setPage(0); }}
            />
          </Flex>
        )}
      </Flex>

      {/* Table Card */}
      {effectiveViewMode === 'card' && (
        <>
          {loading ? (
            <Flex justify="center" align="center" style={{ flex: 1, padding: 48 }}>
              <Spin size="large" />
            </Flex>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
              {data?.records?.map((record) => (
                <Card
                  key={record.id}
                  className="glow-card"
                  onClick={() => navigate(`/steerings/${record.id}`)}
                  style={{ borderRadius: 12, cursor: 'pointer', minHeight: 200, display: 'flex', flexDirection: 'column' }}
                  styles={{ body: { display: 'flex', flexDirection: 'column', flex: 1, height: '100%' } }}
                  hoverable
                >
                  <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                    <Typography.Text style={{ fontWeight: 600, fontSize: 16 }} ellipsis={{ tooltip: true }}>{record.title}</Typography.Text>
                    <Flex gap={8} align="center" style={{ flexShrink: 0 }}>
                      <Tag className={`tag-base ${STATUS_CLASS[record.status]}`}>{STATUS_LABEL[record.status]}</Tag>
                      <Typography.Text style={{ color: '#a1a1aa', fontSize: 12 }}>v{record.currentVersion}</Typography.Text>
                    </Flex>
                  </Flex>
                  <Typography.Paragraph
                    style={{ color: '#a1a1aa', fontSize: 13, lineHeight: 1.6, flex: 1 }}
                    ellipsis={{ rows: 4 }}
                  >
                    {record.content?.slice(0, 150)}
                  </Typography.Paragraph>
                  <Flex gap={4} wrap="wrap">
                    {record.tags?.map((t, index) => (
                      <Tag key={t} className={`tag-base tag-color-${index % 7}`}>{t}</Tag>
                    ))}
                  </Flex>
                </Card>
              ))}
            </div>
          )}
          <Pagination
            count={data?.total ?? 0}
            page={page}
            rowsPerPage={pageSize}
            onPageChange={setPage}
            label="条规范"
          />
        </>
      )}
      {effectiveViewMode === 'list' && (() => {
        const columns: ColumnsType<Steering> = [
          {
            title: 'ID',
            dataIndex: 'id',
            width: 60,
            render: (v: number) => <Typography.Text style={{ color: '#71717a', fontSize: 13 }}>{v}</Typography.Text>,
          },
          {
            title: '标题',
            dataIndex: 'title',
            render: (title: string, record) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }} title={title}>
                  {title}
                </span>
                {record.tags && record.tags.length > 0 && (
                  <Flex gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                    {record.tags.slice(0, 3).map((t, i) => (
                      <Tag key={t} className={`tag-base tag-color-${i % 7}`}>{t}</Tag>
                    ))}
                  </Flex>
                )}
              </div>
            ),
          },
          {
            title: '分类',
            dataIndex: 'categoryName',
            width: 110,
            ellipsis: true,
            render: (v: string) => <Typography.Text style={{ color: '#a1a1aa', fontSize: 13 }}>{v || '-'}</Typography.Text>,
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (v: SteeringStatus) => (
              <Tag className={`tag-base ${STATUS_CLASS[v]}`}>{STATUS_LABEL[v]}</Tag>
            ),
          },
          {
            title: '版本',
            dataIndex: 'currentVersion',
            width: 60,
            render: (v: number) => <Typography.Text style={{ color: '#a1a1aa', fontSize: 13 }}>v{v}</Typography.Text>,
          },
          {
            title: '可检索性',
            width: 130,
            render: (_: unknown, record) => {
              const q = qualityData[record.id];
              if (!q) return <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>-</Typography.Text>;
              return (
                <Tooltip title={
                  <div>
                    <div>自检索排名: {q.scores.selfRetrievalRank}</div>
                    <div>标签数: {q.scores.tagCount}</div>
                    <div>关键词数: {q.scores.keywordCount}</div>
                  </div>
                }>
                  <Flex align="center" gap={6} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setQualityDetail(q); }}>
                    <Progress
                      percent={q.scores.overallScore * 100}
                      showInfo={false}
                      size="small"
                      strokeColor={getScoreColor(q.scores.overallScore)}
                      style={{ width: 60, margin: 0 }}
                    />
                    <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600 }}>
                      {(q.scores.overallScore * 100).toFixed(0)}%
                    </Typography.Text>
                  </Flex>
                </Tooltip>
              );
            },
          },
          {
            title: '更新时间',
            dataIndex: 'updatedAt',
            width: 100,
            render: (v: string) => <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>{formatDate(v)}</Typography.Text>,
          },
          {
            title: '操作',
            width: 120,
            render: (_: unknown, record) => (
              <Flex gap={4} onClick={(e) => e.stopPropagation()}>
                <Button type="link" size="small" onClick={() => navigate(`/steerings/${record.id}/edit`)} style={{ color: '#a1a1aa', fontSize: 12, padding: '0 4px' }}>编辑</Button>
                {record.status === 'draft' && (
                  <Button type="link" size="small" onClick={() => handleReview(record.id, 'submit')} style={{ fontSize: 12, padding: '0 4px' }}>提交</Button>
                )}
                {record.status === 'pending_review' && (
                  <Button type="link" size="small" onClick={() => handleWithdraw(record.id)} style={{ fontSize: 12, padding: '0 4px' }}>撤回</Button>
                )}
                {record.status === 'approved' && (
                  <Button type="link" size="small" onClick={() => handleReview(record.id, 'activate')} style={{ color: '#32D583', fontSize: 12, padding: '0 4px' }}>生效</Button>
                )}
                {record.status === 'active' && (
                  <Button type="link" size="small" danger onClick={() => handleDeprecate(record.id)} style={{ fontSize: 12, padding: '0 4px' }}>废弃</Button>
                )}
                {(record.status === 'draft' || record.status === 'deprecated') && (
                  <Button type="link" size="small" danger onClick={() => setDeleteId(record.id)} style={{ fontSize: 12, padding: '0 4px' }}>删除</Button>
                )}
              </Flex>
            ),
          },
        ];

        return (
          <Card
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            styles={{ body: { padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
          >
            <div style={{ flex: 1, overflow: 'auto' }}>
              <Table
                rowKey="id"
                columns={columns}
                dataSource={data?.records ?? []}
                loading={loading}
                size="middle"
                scroll={{ x: 900 }}
                pagination={false}
                onRow={(record) => ({
                  onClick: () => navigate(`/steerings/${record.id}`),
                  style: { cursor: 'pointer' },
                })}
                sticky
              />
            </div>
            <Pagination
              count={data?.total ?? 0}
              page={page}
              rowsPerPage={pageSize}
              onPageChange={setPage}
              label="条规范"
            />
          </Card>
        );
      })()}

      {/* Delete Modal */}
      <Modal
        open={deleteId !== null}
        onCancel={() => setDeleteId(null)}
        onOk={handleDelete}
        title="确认删除"
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        width={isMobile ? '90vw' : 520}
      >
        <Typography.Text type="secondary">确定要删除这条规范吗？此操作不可撤销。</Typography.Text>
      </Modal>

      {/* Quality Detail Modal */}
      <Modal
        open={qualityDetail !== null}
        onCancel={() => setQualityDetail(null)}
        footer={<Button onClick={() => setQualityDetail(null)}>关闭</Button>}
        title="可检索性评分详情"
        width={isMobile ? '90vw' : 480}
      >
        {qualityDetail && (
          <div>
            <Typography.Text style={{ color: '#a1a1aa', fontSize: 14, display: 'block', marginBottom: 16 }}>
              规范: {qualityDetail.title}
            </Typography.Text>
            <Typography.Text style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 12 }}>评分指标</Typography.Text>
            <Flex vertical gap={10}>
              <div>
                <Flex justify="space-between" align="center">
                  <Typography.Text style={{ color: '#a1a1aa', fontSize: 13 }}>综合评分</Typography.Text>
                  <Typography.Text style={{ fontWeight: 600, fontSize: 13, color: getScoreColor(qualityDetail.scores.overallScore) }}>
                    {(qualityDetail.scores.overallScore * 100).toFixed(1)}%
                  </Typography.Text>
                </Flex>
                <Progress
                  percent={qualityDetail.scores.overallScore * 100}
                  showInfo={false}
                  strokeColor={getScoreColor(qualityDetail.scores.overallScore)}
                  style={{ marginTop: 4 }}
                />
              </div>
              {[
                { label: '自检索排名', value: qualityDetail.scores.selfRetrievalRank },
                { label: '自检索得分', value: qualityDetail.scores.selfRetrievalScore.toFixed(3) },
                { label: '标签数量', value: qualityDetail.scores.tagCount },
                { label: '关键词数量', value: qualityDetail.scores.keywordCount },
              ].map((item) => (
                <Flex key={item.label} justify="space-between">
                  <Typography.Text style={{ color: '#a1a1aa', fontSize: 13 }}>{item.label}</Typography.Text>
                  <Typography.Text style={{ fontSize: 13 }}>{item.value}</Typography.Text>
                </Flex>
              ))}
            </Flex>
            {qualityDetail.suggestions.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <Typography.Text style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>改进建议</Typography.Text>
                <div style={{ background: '#1e1e2a', borderRadius: 8, padding: 12, border: '1px solid #27273a' }}>
                  {qualityDetail.suggestions.map((s, i) => (
                    <Typography.Text key={i} style={{ color: '#a1a1aa', fontSize: 13, display: 'block', marginBottom: 4 }}>
                      {s}
                    </Typography.Text>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
