import { useState, useEffect } from 'react';
import { Typography, Button, Input, Card, Flex, Tag, App } from 'antd';
import { ShieldCheck, CheckCircle, Copy } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { complianceService } from '../../services/complianceService';
import type { ComplianceReport } from '../../types';

const SEVERITY_CLASS: Record<string, string> = {
  HIGH: 'tag-severity-high',
  MEDIUM: 'tag-severity-medium',
  LOW: 'tag-severity-low',
};

export default function CompliancePage() {
  const { setBreadcrumbs } = useHeader();
  const { message } = App.useApp();
  const [repoFullName, setRepoFullName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setBreadcrumbs(
      <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>合规审查</Typography.Text>
    );
  }, [setBreadcrumbs]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    try {
      const data = await complianceService.check({ repoFullName, taskDescription, codeSnippet });
      setReport(data);
      message.success('检查完成');
    } catch {
      message.error('检查失败');
    } finally {
      setChecking(false);
    }
  };

  const score = report ? Number(report.score) : 0;

  const getScoreColor = (s: number) => {
    if (s >= 80) return '#32D583';
    if (s >= 60) return '#FFB547';
    return '#E85A4F';
  };

  const labelStyle = { fontSize: 13, color: '#a1a1aa', display: 'block' as const, marginBottom: 4, fontWeight: 500 };

  return (
    <div style={{ padding: 24 }}>
      {/* Code Submission */}
      <Card style={{ borderRadius: 12, marginBottom: 20 }}>
        <Flex gap={8} align="center" style={{ marginBottom: 16 }}>
          <ShieldCheck size={18} color="var(--primary-color)" />
          <Typography.Text style={{ fontWeight: 600, fontSize: 16 }}>代码提交</Typography.Text>
          <Typography.Text style={{ color: '#a1a1aa', fontSize: 13 }}>- 提交代码片段进行合规检测</Typography.Text>
        </Flex>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Typography.Text style={labelStyle}>代码仓库</Typography.Text>
              <Input
                required
                value={repoFullName}
                onChange={(e) => setRepoFullName(e.target.value)}
                placeholder="例如: org/my-service"
              />
            </div>
            <div>
              <Typography.Text style={labelStyle}>任务描述（可选）</Typography.Text>
              <Input
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="描述本次代码的功能或背景"
              />
            </div>
          </div>
          <div>
            <Typography.Text style={labelStyle}>代码片段</Typography.Text>
            <div style={{ position: 'relative' }}>
              <Input.TextArea
                required
                rows={10}
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder="粘贴需要合规检查的代码..."
                style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 13 }}
              />
              <Tag className="tag-base tag-content" style={{ position: 'absolute', bottom: 12, left: 12 }}>
                Java
              </Tag>
              <Copy
                size={16}
                style={{ position: 'absolute', top: 12, right: 12, color: '#71717a', cursor: 'pointer' }}
                onClick={() => { navigator.clipboard.writeText(codeSnippet); message.success('已复制'); }}
              />
            </div>
          </div>
          <Flex justify="flex-end" gap={12}>
            <Button onClick={() => { setCodeSnippet(''); setRepoFullName(''); setTaskDescription(''); }}>重置</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={checking ? undefined : <ShieldCheck size={14} />}
              loading={checking}
            >
              开始检查
            </Button>
          </Flex>
        </form>
      </Card>

      {/* Report */}
      {report && (
        <>
          <Card style={{ borderRadius: 12, marginBottom: 20 }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
              <Flex gap={8} align="center">
                <CheckCircle size={18} color={report.compliant ? '#32D583' : '#FFB547'} />
                <Typography.Text style={{ fontWeight: 600, fontSize: 16 }}>审查报告</Typography.Text>
                <Typography.Text style={{ color: '#a1a1aa', fontSize: 13 }}>
                  - 基于 {report.relatedSteerings?.length || 0} 条规范进行检查分析
                </Typography.Text>
              </Flex>
              <Flex gap={8} align="center">
                <Typography.Text style={{ color: '#a1a1aa', fontSize: 13 }}>合规评分</Typography.Text>
                <div
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    border: `3px solid ${getScoreColor(score)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Typography.Text style={{ color: getScoreColor(score), fontWeight: 700, fontSize: 14 }}>
                    {score}
                  </Typography.Text>
                </div>
              </Flex>
            </Flex>

            {/* Score Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#1e1e2a', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <Typography.Text style={{ color: '#E85A4F', fontWeight: 700, fontSize: 24, display: 'block' }}>
                  {report.violations?.filter(v => v.severity === 'HIGH').length || 0}
                </Typography.Text>
                <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>严重问题</Typography.Text>
              </div>
              <div style={{ background: '#1e1e2a', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <Typography.Text style={{ color: '#FFB547', fontWeight: 700, fontSize: 24, display: 'block' }}>
                  {report.violations?.filter(v => v.severity === 'MEDIUM').length || 0}
                </Typography.Text>
                <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>警告</Typography.Text>
              </div>
              <div style={{ background: '#1e1e2a', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <Typography.Text style={{ color: '#32D583', fontWeight: 700, fontSize: 24, display: 'block' }}>
                  {report.relatedSteerings?.length || 0}
                </Typography.Text>
                <Typography.Text style={{ color: '#71717a', fontSize: 12 }}>关联规范</Typography.Text>
              </div>
            </div>

            {/* Summary */}
            <div
              style={{
                background: report.compliant ? 'rgba(var(--color-success-rgb), 0.06)' : 'rgba(var(--color-warning-tag-rgb), 0.06)',
                borderRadius: 10, padding: 12,
                border: `1px solid ${report.compliant ? 'rgba(var(--color-success-rgb), 0.2)' : 'rgba(var(--color-warning-tag-rgb), 0.2)'}`,
              }}
            >
              <Typography.Text style={{ color: report.compliant ? '#32D583' : '#FFB547', fontSize: 13 }}>
                {report.summary}
              </Typography.Text>
            </div>
          </Card>

          {/* Violations */}
          {report.violations && report.violations.length > 0 && (
            <div>
              <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                <Typography.Text style={{ fontWeight: 600, fontSize: 16 }}>违规详情</Typography.Text>
                <Button type="link" style={{ fontSize: 13 }}>+ 导出报告</Button>
              </Flex>
              <Flex vertical gap={12}>
                {report.violations.map((v, idx) => (
                  <Card key={idx} style={{ borderRadius: 12 }}>
                    <Flex gap={10} align="center" style={{ marginBottom: 10 }}>
                      <Tag
                        className={`tag-base ${SEVERITY_CLASS[v.severity]}`}
                      >
                        {v.severity}
                      </Tag>
                      <Typography.Text style={{ fontWeight: 600, fontSize: 15 }}>{v.steeringTitle}</Typography.Text>
                    </Flex>
                    <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, display: 'block', marginBottom: 8 }}>
                      {v.description}
                    </Typography.Text>
                    {v.suggestion && (
                      <div style={{ background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: 8, padding: 10, border: '1px solid rgba(var(--primary-rgb), 0.12)' }}>
                        <Typography.Text style={{ color: '#818CF8', fontSize: 12 }}>
                          建议：{v.suggestion}
                        </Typography.Text>
                      </div>
                    )}
                  </Card>
                ))}
              </Flex>
            </div>
          )}
        </>
      )}
    </div>
  );
}
