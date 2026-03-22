import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Tag, Input, Select, Flex, Spin, Modal, App, Progress, Tooltip, Card } from 'antd';
import { Plus } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { steeringService, categoryService } from '../../services/steeringService';
import { qualityService, type SteeringQuality } from '../../services/searchService';
import type { Steering, SteeringStatus, SteeringCategory } from '../../types';
import Pagination from '../../components/Pagination';

const STATUS_LABEL: Record<SteeringStatus, string> = {
  draft: '草稿', pending_review: '待审核', approved: '已通过',
  rejected: '已驳回', active: '已生效', deprecated: '已废弃',
};

const STATUS_CLASS: Record<SteeringStatus, string> = {
  draft: 'tag-status-draft', pending_review: 'tag-status-pending', approved: 'tag-status-approved',
  rejected: 'tag-status-rejected', active: 'tag-status-active', deprecated: 'tag-status-deprecated',
};

export default function SteeringListPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { setBreadcrumbs, setActions } = useHeader();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [data, setData] = useState<{ records: Steering[]; total: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualityData, setQualityData] = useState<Record<number, SteeringQuality | null>>({});
  const [qualityDetail, setQualityDetail] = useState<SteeringQuality | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [categories, setCategories] = useState<SteeringCategory[]>([]);

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
        const result = await steeringService.page({ current: page + 1, size: 10, status: status || undefined, keyword, categoryId });
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
  }, [page, status, keyword, categoryId]);

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await steeringService.delete(deleteId);
      message.success('删除成功');
      setDeleteId(null);
      setPage(0);
    } catch {
      message.error('删除失败');
    }
  };

  const handleReview = async (id: number, action: 'submit' | 'activate' | 'deprecate') => {
    try {
      await steeringService.review(id, action);
      message.success('操作成功');
      // Reload
      const result = await steeringService.page({ current: page + 1, size: 10, status: status || undefined, keyword });
      setData(result);
    } catch {
      message.error('操作失败');
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
      <Flex gap={12}>
        <Input
          placeholder="搜索规范标题..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 280 }}
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

      {/* Table Card */}
      <Card
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      >
        {loading ? (
          <Flex justify="center" align="center" style={{ flex: 1, padding: 48 }}>
            <Spin size="large" />
          </Flex>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', minWidth: 900 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #27273a', background: '#1e1e2a', position: 'sticky', top: 0, zIndex: 10 }}>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 50, flexShrink: 0 }}>ID</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, flex: 1, minWidth: 0 }}>标题</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 100, flexShrink: 0 }}>分类</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 80, flexShrink: 0 }}>状态</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 60, flexShrink: 0 }}>版本</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 120, flexShrink: 0 }}>可检索性</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 100, flexShrink: 0 }}>更新时间</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 200, flexShrink: 0 }}>操作</Typography.Text>
            </div>
            {/* Rows */}
            {data?.records?.map((record) => (
              <div key={record.id} style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 20px', borderBottom: '1px solid #27273a' }}>
                <Typography.Text style={{ color: '#71717a', fontSize: 13, width: 50, flexShrink: 0 }}>{record.id}</Typography.Text>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span
                    onClick={() => navigate(`/steerings/${record.id}`)}
                    style={{ fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={record.title}
                  >
                    {record.title}
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {record.tags?.map((t, i) => (
                      <Tag key={t} className={`tag-base tag-color-${i % 7}`}>{t}</Tag>
                    ))}
                  </div>
                </div>
                <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, width: 100, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{record.categoryName}</Typography.Text>
                <div style={{ width: 80, flexShrink: 0 }}>
                  <Tag className={`tag-base ${STATUS_CLASS[record.status]}`}>
                    {STATUS_LABEL[record.status]}
                  </Tag>
                </div>
                <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, width: 60, flexShrink: 0 }}>v{record.currentVersion}</Typography.Text>
                <div style={{ width: 120, flexShrink: 0 }}>
                  {(() => {
                    const q = qualityData[record.id];
                    if (!q) return <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>-</Typography.Text>;
                    return (
                      <Tooltip
                        title={
                          <div>
                            <div>自检索排名: {q.scores.selfRetrievalRank}</div>
                            <div>标签数: {q.scores.tagCount}</div>
                            <div>关键词数: {q.scores.keywordCount}</div>
                          </div>
                        }
                      >
                        <Flex
                          align="center"
                          gap={6}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setQualityDetail(q)}
                        >
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
                  })()}
                </div>
                <Typography.Text style={{ color: '#71717a', fontSize: 12, width: 100, flexShrink: 0 }}>{record.updatedAt?.slice(0, 10)}</Typography.Text>
                <Flex gap={4} style={{ width: 200, flexShrink: 0 }}>
                  <Button type="link" size="small" onClick={() => navigate(`/steerings/${record.id}/edit`)} style={{ color: '#a1a1aa', fontSize: 12 }}>编辑</Button>
                  {record.status === 'draft' && (
                    <Button type="link" size="small" onClick={() => handleReview(record.id, 'submit')} style={{ fontSize: 12 }}>提交审核</Button>
                  )}
                  {record.status === 'approved' && (
                    <Button type="link" size="small" onClick={() => handleReview(record.id, 'activate')} style={{ color: '#32D583', fontSize: 12 }}>生效</Button>
                  )}
                  <Button type="link" size="small" danger onClick={() => setDeleteId(record.id)} style={{ fontSize: 12 }}>删除</Button>
                </Flex>
              </div>
            ))}
          </div>
        )}
        <Pagination
          count={data?.total ?? 0}
          page={page}
          rowsPerPage={10}
          onPageChange={setPage}
        />
      </Card>

      {/* Delete Modal */}
      <Modal
        open={deleteId !== null}
        onCancel={() => setDeleteId(null)}
        onOk={handleDelete}
        title="确认删除"
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Typography.Text type="secondary">确定要删除这条规范吗？此操作不可撤销。</Typography.Text>
      </Modal>

      {/* Quality Detail Modal */}
      <Modal
        open={qualityDetail !== null}
        onCancel={() => setQualityDetail(null)}
        footer={<Button onClick={() => setQualityDetail(null)}>关闭</Button>}
        title="可检索性评分详情"
        width={480}
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
