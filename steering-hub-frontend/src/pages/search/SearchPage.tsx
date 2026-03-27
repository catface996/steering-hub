import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Input, Select, Tag, Flex, Card } from 'antd';
import { Search } from 'lucide-react';
import { useHeader } from '../../contexts/HeaderContext';
import { searchService } from '../../services/searchService';
import { categoryService } from '../../services/steeringService';
import { useIsMobile } from '../../utils/deviceDetect';
import type { SearchResult, SteeringCategory } from '../../types';
import Pagination from '../../components/Pagination';

export default function SearchPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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

  // PC: search controls in header after first search; Mobile: never put controls in header
  useEffect(() => {
    if (hasSearched && !isMobile) {
      setActions(
        <Flex gap={10} align="center" style={{ width: '100%' }}>
          <Input
            ref={inputRef}
            placeholder="搜索规范..."
            defaultValue={query}
            onPressEnter={doSearch}
            style={{ flex: 1, minWidth: 120 }}
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
  }, [setActions, hasSearched, isMobile, mode, limit, categoryId, categories, searching, query]);

  const pageSize = 6;
  const pagedResults = results.slice(page * pageSize, (page + 1) * pageSize);

  const matchLevelConfig = {
    high: { color: '#32D583' },
    good: { color: '#FFB547' },
    fair: { color: '#a1a1aa' },
  };

  /* ---------- Shared search form (used for initial state + mobile results state) ---------- */
  const searchForm = (centered: boolean) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: centered ? 'center' : 'stretch',
        justifyContent: centered ? 'center' : 'flex-start',
        ...(centered ? { height: 'calc(100vh - 200px)' } : {}),
        gap: centered ? 24 : 16,
      }}
    >
      {centered && (
        <>
          <Typography.Title level={3} style={{ color: '#fafaf9', margin: 0 }}>
            搜索规范
          </Typography.Title>
          <Typography.Text style={{ color: '#a1a1aa' }}>
            输入关键词，找到最相关的编码规范
          </Typography.Text>
        </>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: centered ? 650 : undefined }}>
        <Input
          ref={inputRef}
          placeholder="输入关键词或描述，如：Controller URL 命名规范..."
          size="large"
          defaultValue={centered ? undefined : query}
          style={{ width: '100%' }}
          onPressEnter={doSearch}
          allowClear
        />
        <Flex gap={8}>
          <Select
            value={categoryId}
            onChange={setCategoryId}
            placeholder="规范类型"
            size="large"
            style={{ flex: 1 }}
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
            style={{ flex: 1 }}
            options={[
              { label: '混合检索', value: 'hybrid' },
              { label: '语义检索', value: 'semantic' },
              { label: '全文检索', value: 'fulltext' },
            ]}
          />
          {!isMobile && (
            <Select
              value={limit}
              onChange={setLimit}
              size="large"
              style={{ width: 120, flexShrink: 0 }}
              options={[10, 20, 50].map((v) => ({ label: `前 ${v} 条`, value: v }))}
            />
          )}
        </Flex>
        <Button type="primary" size="large" block onClick={doSearch} loading={searching} icon={searching ? undefined : <Search size={16} />}>
          搜索
        </Button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: isMobile ? 16 : 24, display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Initial state: centered search form (both PC & mobile) */}
      {!hasSearched && searchForm(true)}

      {/* Results state */}
      {hasSearched && (
        <>
          {/* Mobile: inline search form at top of results */}
          {isMobile && searchForm(false)}

          <Typography.Text style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 16, display: 'block' }}>
            找到 {results.length} 条结果
          </Typography.Text>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {pagedResults.map((r) => (
              <Card
                key={r.steeringId}
                className="glow-card"
                onClick={() => navigate(`/steerings/${r.steeringId}`)}
                style={{ borderRadius: 12, cursor: 'pointer', minHeight: isMobile ? 140 : 200, display: 'flex', flexDirection: 'column' }}
                hoverable
              >
                <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                  <Typography.Text style={{ fontWeight: 600, fontSize: isMobile ? 14 : 16 }} ellipsis>{r.title}</Typography.Text>
                  <Flex gap={8} align="center" style={{ flexShrink: 0 }}>
                    <Tag className="tag-base tag-content">
                      {r.matchType === 'semantic' ? '语义' : r.matchType === 'fulltext' ? '全文' : '混合'}
                    </Tag>
                    <Tag style={{
                      color: matchLevelConfig[r.matchLevel ?? 'fair'].color,
                      borderColor: matchLevelConfig[r.matchLevel ?? 'fair'].color,
                      background: 'transparent',
                      fontWeight: 600,
                    }}>
                      {Math.round((r.score ?? 0) * 100)}分
                    </Tag>
                  </Flex>
                </Flex>
                <Typography.Paragraph
                  style={{ color: '#a1a1aa', fontSize: 13, lineHeight: 1.6, flex: 1 }}
                  ellipsis={{ rows: isMobile ? 2 : 4 }}
                >
                  {r.content.slice(0, 150)}
                </Typography.Paragraph>
                <Flex gap={4} wrap="wrap">
                  {r.tags?.map((t, index) => (
                    <Tag key={t} className={`tag-base tag-color-${index % 7}`}>{t}</Tag>
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
