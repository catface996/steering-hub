import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography, Button, Input, Select, Flex, Spin, App, Tag, Alert } from 'antd';
import { FileText, Tag as TagIcon, BookOpen, Save, Plus, X } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { steeringService } from '../../services/steeringService';
import { categoryService } from '../../services/steeringService';
import type { SteeringCategory } from '../../types';

export default function SteeringEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { setBreadcrumbs, setActions } = useHeader();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isActiveSteering, setIsActiveSteering] = useState(false);
  const [categories, setCategories] = useState<SteeringCategory[]>([]);

  const [form, setForm] = useState({
    title: '',
    categoryId: '',
    tags: '',
    keywords: '',
    author: '',
    content: '',
    changeLog: '',
  });
  const [keywordInput, setKeywordInput] = useState('');
  const tagsList = form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const keywordsList = form.keywords ? form.keywords.split(',').map((k) => k.trim()).filter(Boolean) : [];

  // Predefined tag options — replace with API fetch if backend provides tag list
  const PREDEFINED_TAGS = [
    'Java', 'SpringBoot', 'Python', 'Go', 'TypeScript', 'React', 'Vue',
    '异常处理', 'API设计', 'REST', 'gRPC', '数据库', 'SQL', 'Redis',
    '安全规范', '日志规范', '命名规范', '代码风格', '单元测试', '集成测试',
    '微服务', 'Docker', 'Kubernetes', 'CI/CD', 'Git', '文档规范',
    '性能优化', '并发编程', '设计模式', '架构规范',
  ];

  const availableTags = PREDEFINED_TAGS.filter((t) => !tagsList.includes(t));

  const addTag = (tag: string) => {
    if (!tag || tagsList.includes(tag)) return;
    const updated = [...tagsList, tag].join(', ');
    setForm((f) => ({ ...f, tags: updated }));
  };

  const removeTag = (tag: string) => {
    const updated = tagsList.filter((t) => t !== tag).join(', ');
    setForm((f) => ({ ...f, tags: updated }));
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw || keywordsList.includes(kw)) { setKeywordInput(''); return; }
    const updated = [...keywordsList, kw].join(', ');
    setForm((f) => ({ ...f, keywords: updated }));
    setKeywordInput('');
  };

  const removeKeyword = (keyword: string) => {
    const updated = keywordsList.filter((k) => k !== keyword).join(', ');
    setForm((f) => ({ ...f, keywords: updated }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { message.error('请输入规范标题'); return; }
    if (!form.content.trim()) { message.error('请输入规范内容'); return; }
    const tags = form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    setSubmitting(true);
    try {
      if (isEdit) {
        await steeringService.update(Number(id), { ...form, categoryId: form.categoryId ? Number(form.categoryId) : undefined, tags });
        message.success('更新成功');
        setTimeout(() => navigate(`/steerings/${id}`), 500);
      } else {
        const data = await steeringService.create({ ...form, categoryId: Number(form.categoryId), tags });
        message.success('创建成功');
        setTimeout(() => navigate(`/steerings/${data.id}`), 500);
      }
    } catch {
      message.error(isEdit ? '更新失败' : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    setBreadcrumbs(
      <Flex align="center" gap={8}>
        <Typography.Text
          style={{ color: '#a1a1aa', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
          onClick={() => navigate('/steerings')}
        >
          规范管理
        </Typography.Text>
        <Typography.Text style={{ color: '#71717a', fontSize: 20 }}>/</Typography.Text>
        <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>
          {isEdit ? '编辑规范' : '新建规范'}
        </Typography.Text>
      </Flex>
    );
  }, [setBreadcrumbs, navigate, isEdit]);

  useEffect(() => {
    setActions(
      <Flex gap={8}>
        <Button onClick={() => navigate(isEdit ? `/steerings/${id}` : '/steerings')}>取消</Button>
        <Button
          type="primary"
          icon={isEdit ? <Save size={14} /> : <Plus size={14} />}
          loading={submitting}
          onClick={() => void handleSave()}
        >
          {isEdit ? '保存修改' : '保存规范'}
        </Button>
      </Flex>
    );
  }, [setActions, navigate, isEdit, id, submitting, form]);

  useEffect(() => {
    categoryService.list().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      steeringService.get(Number(id)).then((steering) => {
        setIsActiveSteering(steering.status === 'active');
        setForm({
          title: steering.title ?? '',
          categoryId: steering.categoryId ? String(steering.categoryId) : '',
          tags: steering.tags?.join(', ') ?? '',
          keywords: steering.keywords ?? '',
          author: steering.author ?? '',
          content: steering.content ?? '',
          changeLog: '',
        });
      }).finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  if (loading) return <Flex justify="center" style={{ padding: 64 }}><Spin size="large" /></Flex>;

  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 8, fontSize: 13, color: '#a1a1aa' };

  const sectionHeader = (icon: React.ReactNode, title: string) => (
    <Flex align="center" gap={10} style={{ marginBottom: 20 }}>
      {icon}
      <Typography.Text style={{ fontSize: 16, fontWeight: 600 }}>{title}</Typography.Text>
    </Flex>
  );

  return (
    <div style={{ padding: 24, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isActiveSteering && (
        <Alert
          type="info"
          showIcon
          message="当前规范处于生效状态，编辑将创建新草稿版本，不会直接修改现有内容"
        />
      )}
      <div style={{ flex: 1, display: 'flex', gap: 24 }}>
      {/* Left Column - Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Basic Information */}
        <div style={{ borderRadius: 12, border: '1px solid #27273a', padding: 24 }}>
          {sectionHeader(<FileText size={18} color="var(--primary-color)" />, '基本信息')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>规范标题 *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="例如：Java 异常处理规范 v2.0"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>规范分类</label>
                <Select
                  value={form.categoryId || undefined}
                  onChange={(val) => setForm((f) => ({ ...f, categoryId: val }))}
                  placeholder="请选择分类"
                  style={{ width: '100%' }}
                  options={categories.map((c) => ({ label: c.name, value: String(c.id) }))}
                />
              </div>
              <div>
                <label style={labelStyle}>作者</label>
                <Input
                  value={form.author}
                  onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                  placeholder="规范作者"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ borderRadius: 12, border: '1px solid #27273a', padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {sectionHeader(<BookOpen size={18} color="var(--primary-color)" />, '规范内容')}
          <Input.TextArea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="请输入 Markdown 格式的规范内容..."
            style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 13, flex: 1, minHeight: 360 }}
          />
        </div>
      </div>

      {/* Right Column - Metadata */}
      <div style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Tags & Keywords */}
        <div style={{ borderRadius: 12, border: '1px solid #27273a', padding: 24 }}>
          {sectionHeader(<TagIcon size={18} color="var(--primary-color)" />, '标签与关键词')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>标签</label>
              <Flex gap={8}>
                <Select
                  value={null as unknown as string}
                  onChange={(val) => { addTag(val); }}
                  placeholder="选择标签"
                  style={{ flex: 1 }}
                  showSearch
                  options={availableTags.map((t) => ({ label: t, value: t }))}
                  notFoundContent="无可选标签"
                />
              </Flex>
              {tagsList.length > 0 && (
                <Flex wrap="wrap" gap={6} style={{ marginTop: 10 }}>
                  {tagsList.map((tag, i) => (
                    <Tag key={tag} className={`tag-base tag-editable tag-color-${i % 7}`}>
                      {tag}
                      <X size={12} className="tag-close" onClick={() => removeTag(tag)} />
                    </Tag>
                  ))}
                </Flex>
              )}
            </div>
            <div>
              <label style={labelStyle}>关键词</label>
              <Flex gap={8}>
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onPressEnter={(e) => { e.preventDefault(); addKeyword(); }}
                  placeholder="输入关键词后点击添加"
                  style={{ flex: 1 }}
                />
                <Button icon={<Plus size={14} />} onClick={addKeyword}>添加</Button>
              </Flex>
              {keywordsList.length > 0 && (
                <Flex wrap="wrap" gap={6} style={{ marginTop: 10 }}>
                  {keywordsList.map((kw, i) => (
                    <Tag key={kw} className={`tag-base tag-editable tag-color-${i % 7}`}>
                      {kw}
                      <X size={12} className="tag-close" onClick={() => removeKeyword(kw)} />
                    </Tag>
                  ))}
                </Flex>
              )}
              <Typography.Text style={{ fontSize: 11, color: '#71717a', marginTop: 6, display: 'block' }}>
                关键词用于提升规范的检索命中率
              </Typography.Text>
            </div>
          </div>
        </div>

        {/* Change Log (edit only) */}
        {isEdit && (
          <div style={{ borderRadius: 12, border: '1px solid #27273a', padding: 24 }}>
            {sectionHeader(<Save size={18} color="var(--primary-color)" />, '变更记录')}
            <div>
              <label style={labelStyle}>变更说明</label>
              <Input.TextArea
                rows={3}
                value={form.changeLog}
                onChange={(e) => setForm((f) => ({ ...f, changeLog: e.target.value }))}
                placeholder="简要描述本次修改内容"
              />
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
