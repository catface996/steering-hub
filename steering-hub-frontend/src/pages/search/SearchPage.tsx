import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Input, Select, Tag, Flex, Card } from 'antd';
import { Search, TrendingUp } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { searchService } from '../../services/searchService';
import { categoryService } from '../../services/steeringService';
import type { SearchResult, SteeringCategory } from '../../types';
import Pagination from '../../components/Pagination';

export default function SearchPage() {
  const navigate = useNavigate();
  const { setBreadcrumbs, setActions } = useHeader();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'hybrid' | 'semantic' | 'fulltext'>('hybrid');
  const [limit, setLimit] = useState(10);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [categories, setCategories] = useState<SteeringCategory[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [page, setPage] = useState(0);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<any>(null);

  // Use refs so the header callback always sees the latest values
  const modeRef = useRef(mode);
  const limitRef = useRef(limit);
  const categoryIdRef = useRef(categoryId);
  modeRef.current = mode;
  limitRef.current = limit;
  categoryIdRef.current = categoryId;

  const doSearch = async () => {
    const q = inputRef.current?.input?.value?.trim() || '';
    if (!q) return;
    setQuery(q);
    setHasSearched(true);
    setSearching(true);
    try {
      const data = await searchService.search({
        query: q,
        limit: limitRef.current,
        mode: modeRef.current,
        categoryId: categoryIdRef.current
      });
      setResults(data);
      setPage(0);
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    setBreadcrumbs(
      <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>规范检索</Typography.Text>
    );
  }, [setBreadcrumbs]);

  useEffect(() => {
    categoryService.list().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (hasSearched) {
      setActions(
        <Flex gap={10} align="center">
          <Input
            ref={inputRef}
            placeholder="搜索规范..."
            defaultValue={query}
            onPressEnter={doSearch}
            style={{ width: 320 }}
            allowClear
          />
          <Select
            value={categoryId}
            onChange={setCategoryId}
            placeholder="规范类型"
            style={{ width: 150 }}
            allowClear
            options={[
              { label: '全部类型', value: undefined },
              ...categories.map((cat) => ({ label: cat.name, value: cat.id }))
            ]}
          />
          <Select
            value={mode}
            onChange={setMode}
            style={{ width: 130 }}
            options={[
              { label: '混合检索', value: 'hybrid' },
              { label: '语义检索', value: 'semantic' },
              { label: '全文检索', value: 'fulltext' },
            ]}
          />
          <Select
            value={limit}
            onChange={setLimit}
            style={{ width: 100 }}
            options={[10, 20, 50].map((v) => ({ label: `前 ${v} 条`, value: v }))}
          />
          <Button
            type="primary"
            icon={searching ? undefined : <Search size={14} />}
            loading={searching}
            onClick={() => doSearch()}
          >
            检索
          </Button>
        </Flex>
      );
    } else {
      setActions(null);
    }
  }, [setActions, hasSearched, mode, limit, categoryId, categories, searching, query]);

  const pageSize = 6;
  const pagedResults = results.slice(page * pageSize, (page + 1) * pageSize);

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return '#32D583';
    if (score >= 0.4) return '#FFB547';
    return '#E85A4F';
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Initial state: centered search box */}
      {!hasSearched && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'calc(100vh - 200px)',
            gap: 24,
          }}
        >
          <Typography.Title level={3} style={{ color: '#fafaf9', margin: 0 }}>
            搜索规范
          </Typography.Title>
          <Typography.Text style={{ color: '#a1a1aa' }}>
            输入关键词，找到最相关的编码规范
          </Typography.Text>
          <div style={{ display: 'flex', gap: 8, width: 850, alignItems: 'center' }}>
            <Input
              ref={inputRef}
              placeholder="输入关键词或描述，如：Controller URL 命名规范..."
              size="large"
              style={{ flex: 1 }}
              onPressEnter={doSearch}
              allowClear
            />
            <Select
              value={categoryId}
              onChange={setCategoryId}
              placeholder="规范类型"
              size="large"
              style={{ width: 150, flexShrink: 0 }}
              allowClear
              options={[
                { label: '全部类型', value: undefined },
                ...categories.map((cat) => ({ label: cat.name, value: cat.id }))
              ]}
            />
            <Select
              value={mode}
              onChange={setMode}
              size="large"
              style={{ width: 130, flexShrink: 0 }}
              options={[
                { label: '混合检索', value: 'hybrid' },
                { label: '语义检索', value: 'semantic' },
                { label: '全文检索', value: 'fulltext' },
              ]}
            />
            <Button type="primary" size="large" onClick={doSearch} icon={<Search size={16} />}>
              搜索
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {hasSearched && results.length > 0 && (
        <>
          <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 16, display: 'block' }}>
            找到 {results.length} 条结果
          </Typography.Text>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {pagedResults.map((r) => (
              <Card
                key={r.steeringId}
                onClick={() => navigate(`/steerings/${r.steeringId}`)}
                style={{ borderRadius: 12, cursor: 'pointer', minHeight: 200, display: 'flex', flexDirection: 'column' }}
                hoverable
              >
                <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                  <Typography.Text style={{ fontWeight: 600, fontSize: 16 }} ellipsis>{r.title}</Typography.Text>
                  <Flex gap={8} align="center">
                    <Tag className="tag-base tag-content">
                      {r.matchType === 'semantic' ? '语义匹配' : r.matchType === 'fulltext' ? '全文匹配' : '混合匹配'}
                    </Tag>
                    <Flex align="center" gap={4}>
                      <TrendingUp size={14} color={getScoreColor(r.score)} />
                      <Typography.Text style={{ color: getScoreColor(r.score), fontSize: 14, fontWeight: 700 }}>
                        {(r.score * 100).toFixed(0)}%
                      </Typography.Text>
                    </Flex>
                  </Flex>
                </Flex>
                <Typography.Paragraph
                  style={{ color: '#a1a1aa', fontSize: 13, lineHeight: 1.6, flex: 1 }}
                  ellipsis={{ rows: 4 }}
                >
                  {r.content.slice(0, 150)}
                </Typography.Paragraph>
                <Flex gap={4} wrap="wrap">
                  {r.tags?.map((t) => (
                    <Tag key={t} className="tag-base tag-content">{t}</Tag>
                  ))}
                </Flex>
              </Card>
            ))}
          </div>

          {results.length > pageSize && (
            <div style={{ marginTop: 'auto', paddingTop: 20 }}>
              <Pagination
                count={results.length}
                page={page}
                rowsPerPage={pageSize}
                onPageChange={setPage}
                label="条结果"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
