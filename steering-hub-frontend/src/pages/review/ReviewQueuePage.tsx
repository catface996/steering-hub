import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Tag, Flex, Spin, Card, Button, App } from 'antd';
import { useHeader } from '../../contexts/HeaderContext';
import { steeringService } from '../../services/steeringService';
import type { ReviewQueueItem } from '../../types';
import { formatDateTime } from '../../utils/formatTime';
import Pagination from '../../components/Pagination';

export default function ReviewQueuePage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { setBreadcrumbs, setActions } = useHeader();
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ records: ReviewQueueItem[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setBreadcrumbs(
      <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>审批队列</Typography.Text>
    );
    setActions(null);
  }, [setBreadcrumbs, setActions]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const result = await steeringService.listReviewQueue(page + 1, 20);
        setData(result);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, refreshKey]);

  const handleApprove = async (id: number) => {
    try {
      await steeringService.review(id, 'approve', '审批通过');
      message.success('已通过');
      setRefreshKey((k) => k + 1);
    } catch {
      message.error('操作失败');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await steeringService.review(id, 'reject', '审批驳回');
      message.success('已驳回');
      setRefreshKey((k) => k + 1);
    } catch {
      message.error('操作失败');
    }
  };

  return (
    <div className="list-page">
      <Card
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      >
        {loading ? (
          <Flex justify="center" align="center" style={{ flex: 1, padding: 48 }}>
            <Spin size="large" />
          </Flex>
        ) : data?.records?.length === 0 ? (
          <Flex justify="center" align="center" style={{ flex: 1, padding: 48 }}>
            <Typography.Text style={{ color: '#71717a' }}>暂无待审批项</Typography.Text>
          </Flex>
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #27273a', background: '#1e1e2a', position: 'sticky', top: 0, zIndex: 10 }}>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 80, flexShrink: 0 }}>类型</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, flex: 1, minWidth: 0 }}>规范标题</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 100, flexShrink: 0 }}>分类</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 100, flexShrink: 0 }}>版本</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 200, flexShrink: 0 }}>修改说明</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 140, flexShrink: 0 }}>提交时间</Typography.Text>
              <Typography.Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, width: 180, flexShrink: 0 }}>操作</Typography.Text>
            </div>
            {/* Rows */}
            {data?.records?.map((item) => (
              <div key={item.versionId} style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #27273a' }}>
                <div style={{ width: 80, flexShrink: 0 }}>
                  <Tag className={`tag-base ${item.isRevision ? 'tag-status-pending' : 'tag-status-active'}`}>
                    {item.isRevision ? '修订' : '新建'}
                  </Tag>
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                  <Typography.Text
                    style={{ fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                    ellipsis={{ tooltip: true }}
                    onClick={() => navigate(`/steerings/${item.steeringId}`)}
                  >
                    {item.steeringTitle}
                  </Typography.Text>
                </div>
                <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, width: 100, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {item.categoryName || '-'}
                </Typography.Text>
                <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, width: 100, flexShrink: 0 }}>
                  {item.isRevision ? `v${item.currentActiveVersion} → v${item.pendingVersion}` : `v${item.pendingVersion}`}
                </Typography.Text>
                <Typography.Text
                  style={{ color: '#a1a1aa', fontSize: 12, width: 200, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                  title={item.changeLog || '-'}
                >
                  {item.changeLog || '-'}
                </Typography.Text>
                <Typography.Text style={{ color: '#71717a', fontSize: 12, width: 140, flexShrink: 0 }}>
                  {formatDateTime(item.submittedAt)}
                </Typography.Text>
                <Flex gap={4} style={{ width: 180, flexShrink: 0 }}>
                  {item.isRevision && (
                    <Button type="link" size="small" onClick={() => navigate(`/review/${item.steeringId}/diff`)} style={{ fontSize: 12 }}>
                      查看对比
                    </Button>
                  )}
                  <Button type="link" size="small" onClick={() => handleApprove(item.steeringId)} style={{ color: '#32D583', fontSize: 12 }}>
                    通过
                  </Button>
                  <Button type="link" size="small" danger onClick={() => handleReject(item.steeringId)} style={{ fontSize: 12 }}>
                    驳回
                  </Button>
                </Flex>
              </div>
            ))}
          </div>
        )}
        <Pagination
          count={data?.total ?? 0}
          page={page}
          rowsPerPage={20}
          onPageChange={setPage}
          label="条待审项"
        />
      </Card>
    </div>
  );
}
