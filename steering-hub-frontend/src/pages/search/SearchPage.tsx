import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useMutation } from '@tanstack/react-query'
import { searchApi } from '@/api/search'
import type { SearchResult } from '@/types'

export default function SearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'hybrid' | 'semantic' | 'fulltext'>('hybrid')
  const [limit, setLimit] = useState(10)
  const [results, setResults] = useState<SearchResult[]>([])

  const searchMutation = useMutation({
    mutationFn: searchApi.search,
    onSuccess: setResults,
  })

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    searchMutation.mutate({ query, limit, mode })
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={3}>规范检索</Typography>

      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box component="form" onSubmit={onSearch}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <TextField
              size="medium"
              placeholder="输入关键词或描述，如：异常处理规范、REST API 命名约定..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ flex: 1 }}
            />
            <FormControl size="medium" sx={{ width: 130 }}>
              <InputLabel>检索模式</InputLabel>
              <Select label="检索模式" value={mode} onChange={(e) => setMode(e.target.value as any)}>
                <MenuItem value="hybrid">混合检索</MenuItem>
                <MenuItem value="semantic">语义检索</MenuItem>
                <MenuItem value="fulltext">全文检索</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="medium" sx={{ width: 110 }}>
              <InputLabel>返回条数</InputLabel>
              <Select label="返回条数" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                {[10, 20, 50].map((v) => (
                  <MenuItem key={v} value={v}>前 {v} 条</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={searchMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
              disabled={searchMutation.isPending}
              sx={{ height: 56 }}
            >
              检索
            </Button>
          </Stack>
        </Box>
      </Paper>

      {results.length > 0 && (
        <Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            找到 {results.length} 条结果
          </Typography>
          <Stack spacing={2}>
            {results.map((r) => (
              <Card key={r.specId} elevation={1}>
                <CardActionArea onClick={() => navigate(`/specs/${r.specId}`)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>{r.title}</Typography>
                      <Stack direction="row" spacing={1}>
                        <Chip label={r.matchType} color="primary" size="small" />
                        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                          相关度: {(r.score * 100).toFixed(0)}%
                        </Typography>
                      </Stack>
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 1,
                      }}
                    >
                      {r.content}
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {r.tags?.map((t) => (
                        <Chip key={t} label={t} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  )
}
