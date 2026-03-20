import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Pagination,
  Select,
  Snackbar,
  Alert,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { specApi } from '@/api/spec'
import { qualityApi, type SpecQuality } from '@/api/search'
import type { Spec, SpecStatus } from '@/types'

const STATUS_LABEL: Record<SpecStatus, string> = {
  draft: '草稿', pending_review: '待审核', approved: '已通过',
  rejected: '已驳回', active: '已生效', deprecated: '已废弃',
}

const STATUS_CHIP_SX: Record<SpecStatus, object> = {
  draft: { bgcolor: '#2A2A2E', color: '#8E8E93' },
  pending_review: { bgcolor: '#6366F120', color: '#6366F1' },
  approved: { bgcolor: '#6366F120', color: '#818CF8' },
  rejected: { bgcolor: '#E85A4F20', color: '#E85A4F' },
  active: { bgcolor: '#32D58320', color: '#32D583' },
  deprecated: { bgcolor: '#FFB54720', color: '#FFB547' },
}

export default function SpecListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [keyword, setKeyword] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [qualityDetail, setQualityDetail] = useState<SpecQuality | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false, msg: '', severity: 'success',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['specs', page, status || undefined, keyword],
    queryFn: () => specApi.page({ current: page, size: 10, status: status || undefined, keyword }),
  })

  const specIds = data?.records?.map((r: Spec) => r.id) || []
  const { data: qualityData } = useQuery({
    queryKey: ['quality', specIds],
    queryFn: async () => {
      if (specIds.length === 0) return {}
      const results = await Promise.all(
        specIds.map(async (id: number) => {
          try {
            const quality = await qualityApi.getQuality(id)
            return [id, quality] as const
          } catch {
            return [id, null] as const
          }
        })
      )
      return Object.fromEntries(results)
    },
    enabled: specIds.length > 0,
  })

  const deleteMutation = useMutation({
    mutationFn: specApi.delete,
    onSuccess: () => {
      setSnackbar({ open: true, msg: '删除成功', severity: 'success' })
      setDeleteId(null)
      queryClient.invalidateQueries({ queryKey: ['specs'] })
    },
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'submit' | 'activate' | 'deprecate' }) =>
      specApi.review(id, action),
    onSuccess: () => {
      setSnackbar({ open: true, msg: '操作成功', severity: 'success' })
      queryClient.invalidateQueries({ queryKey: ['specs'] })
    },
  })

  const totalPages = data?.pages ?? 1

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography sx={{ color: '#FAFAF9', fontWeight: 700, fontSize: 28 }}>规范管理</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/specs/new')}>
          + 新建规范
        </Button>
      </Box>

      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="搜索规范标题..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          sx={{ width: 280 }}
        />
        <FormControl size="small" sx={{ width: 140 }}>
          <InputLabel>筛选状态</InputLabel>
          <Select label="筛选状态" value={status} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="">全部</MenuItem>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Table */}
      <Box sx={{ bgcolor: '#16161A', border: '1px solid #2A2A2E', borderRadius: '16px', overflow: 'hidden', flex: 1 }}>
        {/* Table Header */}
        <Box sx={{ display: 'flex', px: 3, py: 2, borderBottom: '1px solid #2A2A2E', alignItems: 'center', minHeight: 56 }}>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 50 }}>ID</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, flex: 1 }}>标题</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 100 }}>分类</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 80 }}>状态</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 60 }}>版本</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 120 }}>可检索性</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 100 }}>更新时间</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 200 }}>操作</Typography>
        </Box>

        {/* Table Body */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={24} sx={{ color: '#6366F1' }} />
          </Box>
        ) : (
          data?.records?.map((record: Spec) => (
            <Box
              key={record.id}
              sx={{
                display: 'flex',
                px: 3,
                py: 1.5,
                borderBottom: '1px solid #2A2A2E',
                alignItems: 'center',
                '&:hover': { bgcolor: '#1A1A1E' },
              }}
            >
              <Typography sx={{ color: '#4A4A50', fontSize: 13, width: 50 }}>{record.id}</Typography>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
                <Typography
                  onClick={() => navigate(`/specs/${record.id}`)}
                  sx={{ color: '#FAFAF9', fontSize: 13, fontWeight: 500, cursor: 'pointer', '&:hover': { color: '#6366F1' } }}
                  noWrap
                >
                  {record.title}
                </Typography>
                {record.tags?.slice(0, 2).map((t) => (
                  <Chip key={t} label={t} size="small" sx={{ bgcolor: '#6366F120', color: '#818CF8', fontSize: 11, height: 22 }} />
                ))}
              </Box>
              <Typography sx={{ color: '#8E8E93', fontSize: 13, width: 100 }} noWrap>{record.categoryName}</Typography>
              <Box sx={{ width: 80 }}>
                <Chip
                  label={STATUS_LABEL[record.status]}
                  size="small"
                  sx={{ ...STATUS_CHIP_SX[record.status], fontSize: 11, height: 24, fontWeight: 600 }}
                />
              </Box>
              <Typography sx={{ color: '#8E8E93', fontSize: 13, width: 60 }}>v{record.currentVersion}</Typography>
              <Box sx={{ width: 120 }}>
                {(() => {
                  const q = qualityData?.[record.id]
                  if (!q) return <Typography sx={{ color: '#4A4A50', fontSize: 12 }}>-</Typography>
                  return (
                    <Tooltip
                      title={
                        <Box sx={{ p: 0.5 }}>
                          <Typography variant="caption" display="block">
                            自检索排名: {q.scores.selfRetrievalRank}
                          </Typography>
                          <Typography variant="caption" display="block">
                            标签数: {q.scores.tagCount}
                          </Typography>
                          <Typography variant="caption" display="block">
                            关键词数: {q.scores.keywordCount}
                          </Typography>
                        </Box>
                      }
                    >
                      <Box
                        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1 }}
                        onClick={() => setQualityDetail(q)}
                      >
                        <LinearProgress
                          variant="determinate"
                          value={q.scores.overallScore * 100}
                          sx={{
                            width: 60,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: '#2A2A2E',
                            '& .MuiLinearProgress-bar': {
                              bgcolor:
                                q.scores.overallScore >= 0.7 ? '#32D583'
                                  : q.scores.overallScore >= 0.4 ? '#FFB547'
                                  : '#E85A4F',
                            },
                          }}
                        />
                        <Typography sx={{ color: '#8E8E93', fontSize: 12, fontWeight: 600 }}>
                          {(q.scores.overallScore * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    </Tooltip>
                  )
                })()}
              </Box>
              <Typography sx={{ color: '#4A4A50', fontSize: 12, width: 100 }}>{record.updatedAt?.slice(0, 10)}</Typography>
              <Stack direction="row" spacing={0.5} sx={{ width: 200 }}>
                <Button
                  size="small"
                  onClick={() => navigate(`/specs/${record.id}/edit`)}
                  sx={{ color: '#8E8E93', fontSize: 12, minWidth: 'auto', '&:hover': { color: '#FAFAF9' } }}
                >
                  编辑
                </Button>
                {record.status === 'draft' && (
                  <Button
                    size="small"
                    onClick={() => reviewMutation.mutate({ id: record.id, action: 'submit' })}
                    sx={{ color: '#6366F1', fontSize: 12, minWidth: 'auto' }}
                  >
                    提交审核
                  </Button>
                )}
                {record.status === 'approved' && (
                  <Button
                    size="small"
                    onClick={() => reviewMutation.mutate({ id: record.id, action: 'activate' })}
                    sx={{ color: '#32D583', fontSize: 12, minWidth: 'auto' }}
                  >
                    生效
                  </Button>
                )}
                <Button
                  size="small"
                  onClick={() => setDeleteId(record.id)}
                  sx={{ color: '#E85A4F', fontSize: 12, minWidth: 'auto' }}
                >
                  删除
                </Button>
              </Stack>
            </Box>
          ))
        )}

      </Box>

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 2, px: 1 }}>
        <Typography sx={{ color: '#4A4A50', fontSize: 13 }}>
          共 {data?.total ?? 0} 条记录
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
              '&.Mui-selected': {
                bgcolor: '#6366F1',
                color: '#fff',
                '&:hover': { bgcolor: '#4F46E5' },
              },
            },
          }}
        />
        <Typography sx={{ color: '#4A4A50', fontSize: 13 }}>每页 10 条</Typography>
      </Box>

      {/* Delete Dialog */}
      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#8E8E93' }}>确定要删除这条规范吗？此操作不可撤销。</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} sx={{ color: '#8E8E93' }}>取消</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
            disabled={deleteMutation.isPending}
            sx={{ bgcolor: '#E85A4F', '&:hover': { bgcolor: '#d04a3f' } }}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quality Detail Dialog */}
      <Dialog open={qualityDetail !== null} onClose={() => setQualityDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>可检索性评分详情</DialogTitle>
        <DialogContent>
          {qualityDetail && (
            <Box>
              <Typography sx={{ color: '#8E8E93', fontSize: 14, mb: 2 }}>
                规范: {qualityDetail.title}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ color: '#FAFAF9', fontWeight: 600, fontSize: 14, mb: 2 }}>评分指标</Typography>
                <Stack spacing={1.5}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ color: '#8E8E93', fontSize: 13 }}>综合评分</Typography>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: qualityDetail.scores.overallScore >= 0.7 ? '#32D583'
                            : qualityDetail.scores.overallScore >= 0.4 ? '#FFB547' : '#E85A4F',
                        }}
                      >
                        {(qualityDetail.scores.overallScore * 100).toFixed(1)}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={qualityDetail.scores.overallScore * 100}
                      sx={{
                        mt: 1,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: '#2A2A2E',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: qualityDetail.scores.overallScore >= 0.7 ? '#32D583'
                            : qualityDetail.scores.overallScore >= 0.4 ? '#FFB547' : '#E85A4F',
                        },
                      }}
                    />
                  </Box>
                  {[
                    { label: '自检索排名', value: qualityDetail.scores.selfRetrievalRank },
                    { label: '自检索得分', value: qualityDetail.scores.selfRetrievalScore.toFixed(3) },
                    { label: '标签数量', value: qualityDetail.scores.tagCount },
                    { label: '关键词数量', value: qualityDetail.scores.keywordCount },
                  ].map((item) => (
                    <Stack key={item.label} direction="row" justifyContent="space-between">
                      <Typography sx={{ color: '#8E8E93', fontSize: 13 }}>{item.label}</Typography>
                      <Typography sx={{ color: '#FAFAF9', fontSize: 13 }}>{item.value}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
              {qualityDetail.suggestions.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography sx={{ color: '#FAFAF9', fontWeight: 600, fontSize: 14, mb: 1 }}>改进建议</Typography>
                  <List dense sx={{ bgcolor: '#1A1A1E', borderRadius: '10px', py: 1, border: '1px solid #2A2A2E' }}>
                    {qualityDetail.suggestions.map((suggestion, idx) => (
                      <ListItem key={idx} sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={suggestion}
                          primaryTypographyProps={{ fontSize: 13, color: '#8E8E93' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQualityDetail(null)} sx={{ color: '#8E8E93' }}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
