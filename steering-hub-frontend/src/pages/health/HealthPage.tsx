import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Flex,
  Input,
  Progress,
  Select,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useIsMobile } from '../../utils/deviceDetect';
import type { ColumnsType } from 'antd/es/table';
import { useHeader } from '../../contexts/HeaderContext';
import {
  healthService,
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
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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

  const handleCompare = (pair: SimilarPairVO) => {
    navigate(`/health/${pair.id}`, { state: { pair } });
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
          strokeColor={score >= 0.9 ? 'var(--color-danger)' : score >= 0.8 ? 'var(--color-warning)' : 'var(--color-caution)'}
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
          onClick={() => handleCompare(record)}
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
            background: 'var(--bg-surface)',
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

      {/* Similar pairs */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid #1e1e2a',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {isMobile ? (
          /* Mobile: card list */
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pairs.length === 0 ? (
              <Typography.Text style={{ color: '#71717a', textAlign: 'center', display: 'block', padding: 32 }}>
                {task ? '未发现相似规范对' : '请运行检测以查看结果'}
              </Typography.Text>
            ) : pairs.map((pair) => (
              <Card
                key={pair.id}
                size="small"
                style={{ background: 'var(--bg-overlay)', border: '1px solid #27273a', borderRadius: 8 }}
              >
                <Flex vertical gap={8}>
                  <Typography.Text style={{ color: '#e4e4e7', fontSize: 13, fontWeight: 500 }} ellipsis={{ tooltip: true }}>
                    {pair.specA.title}
                  </Typography.Text>
                  <Typography.Text style={{ color: 'var(--text-dimmed)', fontSize: 11 }}>↔ 相似</Typography.Text>
                  <Typography.Text style={{ color: '#e4e4e7', fontSize: 13 }} ellipsis={{ tooltip: true }}>
                    {pair.specB.title}
                  </Typography.Text>
                  <Flex align="center" gap={8}>
                    <Progress
                      percent={Math.round((pair.overallScore ?? 0) * 100)}
                      size="small"
                      strokeColor={pair.overallScore >= 0.9 ? 'var(--color-danger)' : pair.overallScore >= 0.8 ? 'var(--color-warning)' : 'var(--color-caution)'}
                      style={{ flex: 1, margin: 0 }}
                    />
                    <Button type="link" size="small" style={{ padding: 0 }} onClick={() => handleCompare(pair)}>
                      对比
                    </Button>
                  </Flex>
                  <Flex gap={4} wrap="wrap">
                    {(pair.reasonTags ?? []).map((t) => (
                      <Tag key={t} color="blue" style={{ fontSize: 11 }}>{t}</Tag>
                    ))}
                  </Flex>
                </Flex>
              </Card>
            ))}
          </div>
        ) : (
          /* PC: table */
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
        )}
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

    </div>
  );
}
