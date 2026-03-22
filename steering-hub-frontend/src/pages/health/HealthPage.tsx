import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Col,
  Drawer,
  Flex,
  Input,
  Progress,
  Row,
  Select,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useHeader } from '../../contexts/HeaderContext';
import {
  healthService,
  type CompareVO,
  type HealthCheckTaskVO,
  type SimilarPairVO,
} from '../../services/healthService';
import { get } from '../../utils/request';
import Pagination from '../../components/Pagination';

const TOKEN_KEY = 'steering_hub_token';

interface Category {
  id: number;
  name: string;
}

export default function HealthPage() {
  const { setBreadcrumbs, setActions } = useHeader();
  const [task, setTask] = useState<HealthCheckTaskVO | null>(null);
  const [pairs, setPairs] = useState<SimilarPairVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // 0-indexed for Pagination component
  const [pageSize] = useState(10);
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [specTitle, setSpecTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [compareData, setCompareData] = useState<CompareVO | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const esRef = useRef<EventSource | null>(null);

  const loadLatest = async () => {
    const t = await healthService.getLatestTask();
    setTask(t);
    return t;
  };

  const loadPairs = async (taskId: number, p: number, title?: string, catId?: number | null) => {
    const result = await healthService.getSimilarPairs(taskId, p + 1, pageSize, title, catId);
    setPairs(result?.records ?? []);
    setTotal(result?.total ?? 0);
  };

  useEffect(() => {
    get<{ id: number; name: string }[]>('/api/v1/web/categories').then((r) => {
      setCategories(r.data ?? []);
    });
    loadLatest().then((t) => {
      if (t) {
        loadPairs(t.taskId, 0);
      }
    });
    return () => {
      esRef.current?.close();
    };
  }, []);

  const handleSearch = () => {
    setPage(0);
    if (task) {
      loadPairs(task.taskId, 0, specTitle, categoryId);
    }
  };

  const handleReset = () => {
    setSpecTitle('');
    setCategoryId(null);
    setPage(0);
    if (task) {
      loadPairs(task.taskId, 0, '', null);
    }
  };

  const openEventSource = () => {
    esRef.current?.close();
    const token = localStorage.getItem(TOKEN_KEY) ?? '';
    const url = `/api/v1/health-check/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('task-completed', (e) => {
      es.close();
      esRef.current = null;
      setRunning(false);
      setSpecTitle('');
      setCategoryId(null);
      loadLatest().then((t) => {
        if (t) {
          setPage(0);
          loadPairs(t.taskId, 0, '', null);
        }
      });
    });

    es.addEventListener('task-failed', (e) => {
      es.close();
      esRef.current = null;
      setRunning(false);
      try {
        const data = JSON.parse(e.data);
        setErrorMsg(data.errorMessage ?? '检测任务失败');
      } catch {
        setErrorMsg('检测任务失败');
      }
    });

    es.addEventListener('heartbeat', () => {/* keep-alive */});

    es.onerror = () => {
      es.close();
      esRef.current = null;
      setRunning(false);
    };
  };

  const handleRunCheck = async () => {
    setErrorMsg(null);
    setRunning(true);
    try {
      await healthService.triggerCheck();
      openEventSource();
    } catch {
      setRunning(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (task) {
      loadPairs(task.taskId, newPage, specTitle, categoryId);
    }
  };

  useEffect(() => {
    setBreadcrumbs(
      <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>规范健康度</Typography.Text>
    );
    setActions(
      <Flex gap={8} align="center">
        <Input
          placeholder="规范标题关键词"
          value={specTitle}
          onChange={(e) => setSpecTitle(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 200 }}
          allowClear
        />
        <Select
          placeholder="请选择分类"
          value={categoryId}
          onChange={(v) => setCategoryId(v ?? null)}
          allowClear
          style={{ width: 160 }}
          options={categories.map((c) => ({ label: c.name, value: c.id }))}
        />
        <Button type="primary" onClick={handleSearch}>查询</Button>
        <Button onClick={handleReset}>重置</Button>
        <Button
          type="primary"
          onClick={handleRunCheck}
          disabled={running}
          icon={running ? <Spin size="small" /> : undefined}
        >
          {running ? '检测进行中...' : '运行检测'}
        </Button>
      </Flex>
    );
  }, [specTitle, categoryId, categories, running, task, setBreadcrumbs, setActions]);

  const handleCompare = async (specAId: number, specBId: number) => {
    setDrawerOpen(true);
    setCompareData(null);
    setCompareLoading(true);
    try {
      const data = await healthService.compareSpecs(specAId, specBId);
      setCompareData(data);
    } finally {
      setCompareLoading(false);
    }
  };

  const columns: ColumnsType<SimilarPairVO> = [
    {
      title: '规范 A',
      dataIndex: 'specA',
      render: (specA: SimilarPairVO['specA']) => (
        <Flex align="center" gap={8}>
          <Typography.Text style={{ color: '#e4e4e7' }}>{specA.title}</Typography.Text>
          {specA.categoryName && <Tag color="default" style={{ fontSize: 12, margin: 0 }}>{specA.categoryName}</Tag>}
        </Flex>
      ),
    },
    {
      title: '规范 B',
      dataIndex: 'specB',
      render: (specB: SimilarPairVO['specB']) => (
        <Flex align="center" gap={8}>
          <Typography.Text style={{ color: '#e4e4e7' }}>{specB.title}</Typography.Text>
          {specB.categoryName && <Tag color="default" style={{ fontSize: 12, margin: 0 }}>{specB.categoryName}</Tag>}
        </Flex>
      ),
    },
    {
      title: '综合相似度',
      dataIndex: 'overallScore',
      width: 160,
      render: (score: number) => (
        <Progress
          percent={Math.round((score ?? 0) * 100)}
          size="small"
          strokeColor={score >= 0.9 ? '#f87171' : score >= 0.8 ? '#fb923c' : '#facc15'}
          format={(p) => `${p}%`}
        />
      ),
    },
    {
      title: '相似原因',
      dataIndex: 'reasonTags',
      width: 160,
      render: (tags: string[]) => (
        <Flex gap={4} wrap="wrap">
          {(tags ?? []).map((t) => (
            <Tag key={t} color="blue" style={{ fontSize: 12 }}>
              {t}
            </Tag>
          ))}
        </Flex>
      ),
    },
    {
      title: '操作',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => handleCompare(record.specA.id, record.specB.id)}
        >
          查看对比
        </Button>
      ),
    },
  ];

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return '-';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const s = Math.floor(ms / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div style={{ padding: '24px', minHeight: '100%', background: '#09090f' }}>
      {errorMsg && (
        <Alert
          type="error"
          message={errorMsg}
          closable
          onClose={() => setErrorMsg(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Task status bar */}
      {task && (
        <div
          style={{
            background: '#13131f',
            border: '1px solid #1e1e2a',
            borderRadius: 8,
            padding: '16px 20px',
            marginBottom: 24,
          }}
        >
          <Flex gap={32} wrap="wrap" align="center">
            <div>
              <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>最近检测时间</Typography.Text>
              <div>
                <Typography.Text style={{ color: '#e4e4e7' }}>
                  {task.startedAt ? new Date(task.startedAt).toLocaleString() : '-'}
                </Typography.Text>
              </div>
            </div>
            <div>
              <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>耗时</Typography.Text>
              <div>
                <Typography.Text style={{ color: '#e4e4e7' }}>
                  {formatDuration(task.startedAt, task.completedAt)}
                </Typography.Text>
              </div>
            </div>
            <div>
              <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>检测规范数</Typography.Text>
              <div>
                <Typography.Text style={{ color: '#e4e4e7' }}>{task.activeSpecCount}</Typography.Text>
              </div>
            </div>
            <div>
              <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>发现相似对</Typography.Text>
              <div>
                <Badge
                  count={task.similarPairCount}
                  showZero
                  style={{ backgroundColor: task.similarPairCount > 0 ? '#f59e0b' : '#52c41a' }}
                />
              </div>
            </div>
          </Flex>
          {task.isExpired && (
            <Alert
              type="warning"
              message="结果已过期，建议重新检测"
              style={{ marginTop: 12 }}
              showIcon
            />
          )}
        </div>
      )}

      {/* Similar pairs table */}
      <div
        style={{
          background: '#13131f',
          border: '1px solid #1e1e2a',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={pairs}
          pagination={false}
          style={{ background: 'transparent' }}
          locale={{
            emptyText: task
              ? '未发现相似规范对'
              : '请运行检测以查看结果',
          }}
        />
        {total > 0 && task && (
          <Pagination
            count={total}
            page={page}
            rowsPerPage={pageSize}
            onPageChange={handlePageChange}
            label="对"
          />
        )}
      </div>

      {/* Compare drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width="80%"
        title="规范内容对比"
        styles={{ body: { padding: 0, background: '#09090f' } }}
      >
        {compareLoading ? (
          <Flex justify="center" align="center" style={{ height: 300 }}>
            <Spin />
          </Flex>
        ) : compareData ? (
          <Row style={{ height: '100%' }}>
            <Col
              span={12}
              style={{
                padding: 24,
                borderRight: '1px solid #1e1e2a',
                overflowY: 'auto',
                maxHeight: 'calc(100vh - 120px)',
              }}
            >
              <SpecPanel spec={compareData.specA} />
            </Col>
            <Col
              span={12}
              style={{
                padding: 24,
                overflowY: 'auto',
                maxHeight: 'calc(100vh - 120px)',
              }}
            >
              <SpecPanel spec={compareData.specB} />
            </Col>
          </Row>
        ) : null}
      </Drawer>
    </div>
  );
}

function SpecPanel({ spec }: { spec: NonNullable<CompareVO>['specA'] }) {
  const tags = spec.tags ? spec.tags.split(',').filter(Boolean) : [];
  return (
    <div>
      <Typography.Title level={4} style={{ color: '#e4e4e7', marginTop: 0 }}>
        {spec.title}
      </Typography.Title>
      {tags.length > 0 && (
        <Flex gap={4} wrap="wrap" style={{ marginBottom: 16 }}>
          {tags.map((t) => (
            <Tag key={t} color="geekblue">
              {t}
            </Tag>
          ))}
        </Flex>
      )}
      <div style={{ color: '#a1a1aa', fontSize: 14, lineHeight: 1.7 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{spec.content}</ReactMarkdown>
      </div>
    </div>
  );
}
