import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button, Col, Flex, Progress, Row, Spin, Tag, Typography, message as antMessage } from 'antd';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useHeader } from '../../contexts/HeaderContext';
import { healthService, type CompareVO, type SimilarPairVO } from '../../services/healthService';
import { formatDateTime } from '../../utils/formatTime';

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  pending_review: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  active: '已生效',
  deprecated: '已废弃',
};

const STATUS_ANT_COLOR: Record<string, string> = {
  draft: 'default',
  pending_review: 'warning',
  approved: 'geekblue',
  rejected: 'error',
  active: 'success',
  deprecated: 'orange',
};

export default function SimilarPairDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { setBreadcrumbs, setActions } = useHeader();

  const pair = location.state?.pair as SimilarPairVO | undefined;
  const [compareData, setCompareData] = useState<CompareVO | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!pair) { setLoading(false); return; }
    setLoading(true);
    healthService.compareSpecs(pair.specA.id, pair.specB.id)
      .then(setCompareData)
      .finally(() => setLoading(false));
  }, [pair]);

  const handleDismiss = async () => {
    if (!id) return;
    setDismissing(true);
    try {
      await healthService.dismissPair(Number(id));
      antMessage.success('已标记为已处理');
      navigate('/health');
    } catch {
      // error toasted by request layer
    } finally {
      setDismissing(false);
    }
  };

  useEffect(() => {
    setBreadcrumbs(
      <Flex align="center" gap={8}>
        <Typography.Text
          style={{ color: '#a1a1aa', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
          onClick={() => navigate('/health')}
        >
          规范健康度
        </Typography.Text>
        <Typography.Text style={{ color: '#71717a', fontSize: 20 }}>/</Typography.Text>
        <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>
          相似对比 #{id}
        </Typography.Text>
      </Flex>
    );
    setActions(
      <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/health')}>返回</Button>
    );
  }, [id, setBreadcrumbs, setActions, navigate]);

  if (!pair) {
    return (
      <Flex justify="center" align="center" style={{ padding: 64 }} vertical gap={16}>
        <Typography.Text style={{ color: '#71717a' }}>无效的访问，请从健康度列表进入。</Typography.Text>
        <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/health')}>返回列表</Button>
      </Flex>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Score & reason summary bar */}
      <div
        style={{
          background: '#13131f',
          border: '1px solid #1e1e2a',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 24,
        }}
      >
        <Flex align="center" gap={32} wrap="wrap">
          <div>
            <Typography.Text style={{ color: '#71717a', fontSize: 12, display: 'block', marginBottom: 6 }}>综合相似度</Typography.Text>
            <Progress
              percent={Math.round((pair.overallScore ?? 0) * 100)}
              size="small"
              strokeColor={pair.overallScore >= 0.9 ? '#f87171' : pair.overallScore >= 0.8 ? '#fb923c' : '#facc15'}
              format={(p) => `${p}%`}
              style={{ width: 200 }}
            />
          </div>
          {pair.vectorScore != null && (
            <div>
              <Typography.Text style={{ color: '#71717a', fontSize: 12, display: 'block', marginBottom: 6 }}>向量相似度</Typography.Text>
              <Typography.Text style={{ color: '#e4e4e7' }}>{pair.vectorScore.toFixed(2)}</Typography.Text>
            </div>
          )}
          {pair.titleScore != null && (
            <div>
              <Typography.Text style={{ color: '#71717a', fontSize: 12, display: 'block', marginBottom: 6 }}>标题相似度</Typography.Text>
              <Typography.Text style={{ color: '#e4e4e7' }}>{pair.titleScore.toFixed(2)}</Typography.Text>
            </div>
          )}
          <div>
            <Typography.Text style={{ color: '#71717a', fontSize: 12, display: 'block', marginBottom: 6 }}>相似原因</Typography.Text>
            <Flex gap={4} wrap="wrap">
              {(pair.reasonTags ?? []).map((t) => (
                <Tag key={t} color="blue" style={{ fontSize: 12 }}>{t}</Tag>
              ))}
            </Flex>
          </div>
        </Flex>
      </div>

      {/* Spec comparison */}
      {loading ? (
        <Flex justify="center" style={{ padding: 64 }}><Spin size="large" /></Flex>
      ) : compareData ? (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <div style={{ background: '#13131f', border: '1px solid #1e1e2a', borderRadius: 8, padding: 24 }}>
              <SpecPanel spec={compareData.specA} categoryName={pair.specA.categoryName} />
            </div>
          </Col>
          <Col span={12}>
            <div style={{ background: '#13131f', border: '1px solid #1e1e2a', borderRadius: 8, padding: 24 }}>
              <SpecPanel spec={compareData.specB} categoryName={pair.specB.categoryName} />
            </div>
          </Col>
        </Row>
      ) : null}

      {/* Bottom actions */}
      <Flex justify="flex-end">
        <Button type="primary" danger loading={dismissing} onClick={handleDismiss}>
          标记已处理
        </Button>
      </Flex>
    </div>
  );
}

function SpecPanel({
  spec,
  categoryName,
}: {
  spec: NonNullable<CompareVO>['specA'];
  categoryName?: string | null;
}) {
  const tags = spec.tags ? spec.tags.split(',').filter(Boolean) : [];
  const statusKey = spec.status?.toLowerCase() ?? '';

  return (
    <div>
      <Flex align="flex-start" justify="space-between" gap={8} style={{ marginBottom: 12 }}>
        <Typography.Title level={4} style={{ color: '#e4e4e7', margin: 0, flex: 1 }}>
          {spec.title}
        </Typography.Title>
        <Tag
          color={STATUS_ANT_COLOR[statusKey] || 'default'}
          style={{ borderRadius: 100, flexShrink: 0 }}
        >
          {STATUS_LABEL[statusKey] || spec.status}
        </Tag>
      </Flex>

      <Flex gap={6} wrap="wrap" style={{ marginBottom: 12 }}>
        {categoryName && (
          <Tag color="default" style={{ borderRadius: 100 }}>{categoryName}</Tag>
        )}
        {tags.map((t) => (
          <Tag key={t} color="geekblue" style={{ borderRadius: 100 }}>{t}</Tag>
        ))}
      </Flex>

      <Typography.Text style={{ color: '#71717a', fontSize: 12, display: 'block', marginBottom: 16 }}>
        更新于 {formatDateTime(spec.updatedAt)}
      </Typography.Text>

      <div style={{ color: '#a1a1aa', fontSize: 14, lineHeight: 1.7 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{spec.content}</ReactMarkdown>
      </div>
    </div>
  );
}
