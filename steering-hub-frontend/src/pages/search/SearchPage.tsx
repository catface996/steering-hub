import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import { useMutation } from '@tanstack/react-query'
import { searchApi } from '@/api/search'
import type { SearchResult } from '@/types'

export default function SearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'hybrid' | 'semantic' | 'fulltext'>('hybrid')
  const [limit, setLimit] = useState(10)
  const [results, setResults] = useState<SearchResult[]>([])
  const [page, setPage] = useState(1)

  const searchMutation = useMutation({
    mutationFn: searchApi.search,
    onSuccess: (data) => {
      setResults(data)
      setPage(1)
    },
  })

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    searchMutation.mutate({ query, limit, mode })
  }

  const pageSize = 5
  const totalPages = Math.ceil(results.length / pageSize)
  const pagedResults = results.slice((page - 1) * pageSize, page * pageSize)

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return '#32D583'
    if (score >= 0.4) return '#FFB547'
    return '#E85A4F'
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <Typography sx={{ color: '#FAFAF9', fontWeight: 700, fontSize: 28, mb: 3 }}>规范检索</Typography>

      {/* Search Bar */}
      <Box
        component="form"
        onSubmit={onSearch}
        sx={{
          bgcolor: '#16161A',
          border: '1px solid #2A2A2E',
          borderRadius: '16px',
          p: 3,
          mb: 3,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <TextField
            placeholder="输入关键词或描述，如：异常处理规范、REST API 命名约定..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ flex: 1 }}
            size="small"
          />
          <FormControl size="small" sx={{ width: 120 }}>
            <Select value={mode} onChange={(e) => setMode(e.target.value as any)}>
              <MenuItem value="hybrid">混合检索</MenuItem>
              <MenuItem value="semantic">语义检索</MenuItem>
              <MenuItem value="fulltext">全文检索</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ width: 100 }}>
            <Select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              {[10, 20, 50].map((v) => (
                <MenuItem key={v} value={v}>前 {v} 条</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            type="submit"
            variant="contained"
            startIcon={searchMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
            disabled={searchMutation.isPending}
            sx={{ height: 40, px: 3 }}
          >
            检索
          </Button>
        </Stack>
      </Box>

      {/* Results */}
      {results.length > 0 && (
        <Box>
          <Typography sx={{ color: '#8E8E93', fontSize: 13, mb: 2 }}>
            找到 {results.length} 条结果
          </Typography>
          <Stack spacing={2}>
            {pagedResults.map((r) => (
              <Box
                key={r.specId}
                onClick={() => navigate(`/specs/${r.specId}`)}
                sx={{
                  bgcolor: '#16161A',
                  border: '1px solid #2A2A2E',
                  borderRadius: '16px',
                  p: 3,
                  cursor: 'pointer',
                  '&:hover': { borderColor: '#3A3A40', bgcolor: '#1A1A1E' },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography sx={{ color: '#FAFAF9', fontWeight: 600, fontSize: 16 }}>{r.title}</Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Chip
                      label={r.matchType === 'semantic' ? '语义匹配' : r.matchType === 'fulltext' ? '全文匹配' : '混合匹配'}
                      size="small"
                      sx={{ bgcolor: '#6366F120', color: '#818CF8', fontSize: 11, height: 22 }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TrendingUpIcon sx={{ fontSize: 16, color: getScoreColor(r.score) }} />
                      <Typography sx={{ color: getScoreColor(r.score), fontSize: 14, fontWeight: 700 }}>
                        {(r.score * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                <Typography
                  sx={{
                    color: '#8E8E93',
                    fontSize: 13,
                    lineHeight: 1.6,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    mb: 1.5,
                  }}
                >
                  {r.content}
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {r.tags?.map((t) => (
                    <Chip key={t} label={t} size="small" sx={{ bgcolor: '#2A2A2E', color: '#8E8E93', fontSize: 11, height: 22 }} />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 3 }}>
              <Typography sx={{ color: '#4A4A50', fontSize: 13 }}>
                共 {results.length} 条结果
              </Typography>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                size="small"
                sx={{
                  '& .MuiPaginationItem-root': {
                    color: '#8E8E93',
                    borderColor: '#2A2A2E',
                    '&.Mui-selected': { bgcolor: '#6366F1', color: '#fff' },
                  },
                }}
              />
              <Typography sx={{ color: '#4A4A50', fontSize: 13 }}>每页 {pageSize} 条</Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}
