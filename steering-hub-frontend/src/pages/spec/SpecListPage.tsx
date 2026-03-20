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
  Paper,
  Select,
  Snackbar,
  Alert,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { specApi } from '@/api/spec'
import { qualityApi, type SpecQuality } from '@/api/search'
import type { Spec, SpecStatus } from '@/types'

const STATUS_COLOR: Record<SpecStatus, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
  draft: 'default',
  pending_review: 'info',
  approved: 'primary',
  rejected: 'error',
  active: 'success',
  deprecated: 'warning',
}

const STATUS_LABEL: Record<SpecStatus, string> = {
  draft: '草稿',
  pending_review: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  active: '已生效',
  deprecated: '已废弃',
}

export default function SpecListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')
  const [keyword, setKeyword] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [qualityDetail, setQualityDetail] = useState<SpecQuality | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false, msg: '', severity: 'success',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['specs', page + 1, status || undefined, keyword],
    queryFn: () => specApi.page({ current: page + 1, size: 20, status: status || undefined, keyword }),
  })

  // 获取当前页规范的质量评分
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>规范管理</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/specs/new')}>
          新建规范
        </Button>
      </Box>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="搜索规范标题/关键词"
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

      <Paper elevation={1}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: '#fafafa' } }}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>ID</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>标题</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>分类</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>状态</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 70 }}>版本</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>标签</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 140 }}>可检索性</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 160 }}>更新时间</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 220 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (
                data?.records?.map((record: Spec) => (
                  <TableRow key={record.id} hover>
                    <TableCell>{record.id}</TableCell>
                    <TableCell>
                      <Button
                        variant="text"
                        size="small"
                        sx={{ textAlign: 'left', textTransform: 'none' }}
                        onClick={() => navigate(`/specs/${record.id}`)}
                      >
                        {record.title}
                      </Button>
                    </TableCell>
                    <TableCell>{record.categoryName}</TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABEL[record.status]}
                        color={STATUS_COLOR[record.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{record.currentVersion}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {record.tags?.map((t) => (
                          <Chip key={t} label={t} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {qualityData?.[record.id] ? (
                        <Tooltip
                          title={
                            <Box sx={{ p: 0.5 }}>
                              <Typography variant="caption" display="block">
                                自检索排名: {qualityData[record.id].scores.selfRetrievalRank}
                              </Typography>
                              <Typography variant="caption" display="block">
                                标签数: {qualityData[record.id].scores.tagCount}
                              </Typography>
                              <Typography variant="caption" display="block">
                                关键词数: {qualityData[record.id].scores.keywordCount}
                              </Typography>
                              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                点击查看详细建议
                              </Typography>
                            </Box>
                          }
                        >
                          <Box
                            sx={{ cursor: 'pointer', width: '100%' }}
                            onClick={() => setQualityDetail(qualityData[record.id])}
                          >
                            <Stack direction="row" spacing={1} alignItems="center">
                              <LinearProgress
                                variant="determinate"
                                value={qualityData[record.id].scores.overallScore * 100}
                                sx={{
                                  width: 80,
                                  height: 8,
                                  borderRadius: 1,
                                  bgcolor: '#e0e0e0',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor:
                                      qualityData[record.id].scores.overallScore >= 0.7
                                        ? '#4caf50'
                                        : qualityData[record.id].scores.overallScore >= 0.4
                                        ? '#ff9800'
                                        : '#f44336',
                                  },
                                }}
                              />
                              <Typography variant="caption" fontWeight={600}>
                                {(qualityData[record.id].scores.overallScore * 100).toFixed(0)}%
                              </Typography>
                            </Stack>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{record.updatedAt}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Button size="small" variant="outlined" onClick={() => navigate(`/specs/${record.id}/edit`)}>
                          编辑
                        </Button>
                        {record.status === 'draft' && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => reviewMutation.mutate({ id: record.id, action: 'submit' })}
                          >
                            提交审核
                          </Button>
                        )}
                        {record.status === 'approved' && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => reviewMutation.mutate({ id: record.id, action: 'activate' })}
                          >
                            生效
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => setDeleteId(record.id)}
                        >
                          删除
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={data?.total ?? 0}
          page={page}
          rowsPerPage={20}
          rowsPerPageOptions={[20]}
          onPageChange={(_, p) => setPage(p)}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count} 条`}
        />
      </Paper>

      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>确定要删除这条规范吗？此操作不可撤销。</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>取消</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
            disabled={deleteMutation.isPending}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={qualityDetail !== null} onClose={() => setQualityDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>可检索性评分详情</DialogTitle>
        <DialogContent>
          {qualityDetail && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                规范: {qualityDetail.title}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  评分指标
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 1 }}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">综合评分</Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={
                          qualityDetail.scores.overallScore >= 0.7
                            ? 'success.main'
                            : qualityDetail.scores.overallScore >= 0.4
                            ? 'warning.main'
                            : 'error.main'
                        }
                      >
                        {(qualityDetail.scores.overallScore * 100).toFixed(1)}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={qualityDetail.scores.overallScore * 100}
                      sx={{
                        mt: 0.5,
                        height: 6,
                        borderRadius: 1,
                        '& .MuiLinearProgress-bar': {
                          bgcolor:
                            qualityDetail.scores.overallScore >= 0.7
                              ? '#4caf50'
                              : qualityDetail.scores.overallScore >= 0.4
                              ? '#ff9800'
                              : '#f44336',
                        },
                      }}
                    />
                  </Box>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      自检索排名
                    </Typography>
                    <Typography variant="body2">{qualityDetail.scores.selfRetrievalRank}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      自检索得分
                    </Typography>
                    <Typography variant="body2">
                      {qualityDetail.scores.selfRetrievalScore.toFixed(3)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      标签数量
                    </Typography>
                    <Typography variant="body2">{qualityDetail.scores.tagCount}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      关键词数量
                    </Typography>
                    <Typography variant="body2">{qualityDetail.scores.keywordCount}</Typography>
                  </Stack>
                </Stack>
              </Box>
              {qualityDetail.suggestions.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    改进建议
                  </Typography>
                  <List dense sx={{ bgcolor: '#f5f5f5', borderRadius: 1, py: 1 }}>
                    {qualityDetail.suggestions.map((suggestion, idx) => (
                      <ListItem key={idx} sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={suggestion}
                          primaryTypographyProps={{ variant: 'body2' }}
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
          <Button onClick={() => setQualityDetail(null)}>关闭</Button>
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
