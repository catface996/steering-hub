import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Tag, Flex, Card, Button, App, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
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

  const handleActivate = async (id: number) => {
    try {
      await steeringService.review(id, 'activate', '生效');
      message.success('已生效');
      setRefreshKey((k) => k + 1);
    } catch {
      message.error('操作失败');
    }
  };

  const columns: ColumnsType<ReviewQueueItem> = [
    {
      title: '类型',
      dataIndex: 'isRevision',
      width: 80,
      render: (isRevision: boolean) => (
        <Tag className={`tag-base ${isRevision ? 'tag-status-pending' : 'tag-status-active'}`}>
          {isRevision ? '修订' : '新建'}
        </Tag>
      ),
    },
    {
      title: '规范标题',
      dataIndex: 'steeringTitle',
      ellipsis: true,
      render: (title: string, item) => (
        <Typography.Text
          style={{ fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          ellipsis={{ tooltip: true }}
          onClick={() => navigate(`/steerings/${item.steeringId}`)}
        >
          {title}
        </Typography.Text>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryName',
      width: 100,
      render: (name: string) => (
        <Typography.Text style={{ color: '#a1a1aa', fontSize: 13 }}>
          {name || '-'}
        </Typography.Text>
      ),
    },
    {
      title: '版本',
      width: 120,
      render: (_, item) => (
        <Typography.Text style={{ color: '#a1a1aa', fontSize: 13 }}>
          {item.isRevision ? `v${item.currentActiveVersion} → v${item.pendingVersion}` : `v${item.pendingVersion}`}
        </Typography.Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'versionStatus',
      width: 90,
      render: (status: string) => (
        <Tag className={`tag-base ${status === 'approved' ? 'tag-status-approved' : 'tag-status-pending'}`} style={{ fontSize: 11 }}>
          {status === 'approved' ? '待生效' : '待审核'}
        </Tag>
      ),
    },
    {
      title: '修改说明',
      dataIndex: 'changeLog',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Typography.Text style={{ color: '#a1a1aa', fontSize: 12 }} ellipsis={{ tooltip: true }}>
          {text || '-'}
        </Typography.Text>
      ),
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      width: 140,
      render: (time: string) => (
        <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>
          {formatDateTime(time)}
        </Typography.Text>
      ),
    },
    {
      title: '操作',
      width: 180,
      render: (_, item) => (
        <Flex gap={4}>
          {item.isRevision && (
            <Button type="link" size="small" onClick={() => navigate(`/review/${item.steeringId}/diff`)} style={{ fontSize: 12 }}>
              查看对比
            </Button>
          )}
          {item.versionStatus === 'pending_review' && (
            <>
              <Button type="link" size="small" onClick={() => handleApprove(item.steeringId)} style={{ color: '#32D583', fontSize: 12 }}>
                通过
              </Button>
              <Button type="link" size="small" danger onClick={() => handleReject(item.steeringId)} style={{ fontSize: 12 }}>
                驳回
              </Button>
            </>
          )}
          {item.versionStatus === 'approved' && (
            <Button type="link" size="small" onClick={() => handleActivate(item.steeringId)} style={{ color: '#818CF8', fontSize: 12 }}>
              生效
            </Button>
          )}
        </Flex>
      ),
    },
  ];

  return (
    <div className="list-page">
      <Card
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      >
        <Table<ReviewQueueItem>
          rowKey="versionId"
          columns={columns}
          dataSource={data?.records ?? []}
          loading={loading}
          pagination={false}
          style={{ background: 'transparent' }}
          locale={{ emptyText: '暂无待审批项' }}
        />
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
