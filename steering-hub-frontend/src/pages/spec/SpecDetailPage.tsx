import { useParams, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { specApi } from '@/api/spec'
import type { SpecStatus } from '@/types'

const STATUS_COLOR: Record<SpecStatus, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
  draft: 'default', pending_review: 'info', approved: 'primary',
  rejected: 'error', active: 'success', deprecated: 'warning',
}
const STATUS_LABEL: Record<SpecStatus, string> = {
  draft: '草稿', pending_review: '待审核', approved: '已通过',
  rejected: '已驳回', active: '已生效', deprecated: '已废弃',
}

export default function SpecDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deprecateOpen, setDeprecateOpen] = useState(false)
  const [snackMsg, setSnackMsg] = useState('')

  const { data: spec, isLoading } = useQuery({
    queryKey: ['spec', id],
    queryFn: () => specApi.get(Number(id)),
    enabled: !!id,
  })

  const reviewMutation = useMutation({
    mutationFn: ({ action, comment }: { action: any; comment?: string }) =>
      specApi.review(Number(id), action, comment),
    onSuccess: () => {
      setSnackMsg('操作成功')
      queryClient.invalidateQueries({ queryKey: ['spec', id] })
    },
  })

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
  if (!spec) return <Typography>规范不存在</Typography>

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>{spec.title}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate(`/specs/${id}/edit`)}>编辑</Button>
          {spec.status === 'draft' && (
            <Button variant="contained" onClick={() => reviewMutation.mutate({ action: 'submit' })}>
              提交审核
            </Button>
          )}
          {spec.status === 'pending_review' && (
            <>
              <Button variant="contained" color="success" onClick={() => reviewMutation.mutate({ action: 'approve' })}>
                审核通过
              </Button>
              <Button variant="outlined" color="error" onClick={() => reviewMutation.mutate({ action: 'reject' })}>
                驳回
              </Button>
            </>
          )}
          {spec.status === 'approved' && (
            <Button variant="contained" onClick={() => reviewMutation.mutate({ action: 'activate' })}>
              生效
            </Button>
          )}
          {spec.status === 'active' && (
            <Button variant="outlined" color="error" onClick={() => setDeprecateOpen(true)}>
              废弃
            </Button>
          )}
          <Button variant="outlined" onClick={() => navigate('/specs')}>返回</Button>
        </Stack>
      </Box>

      <Paper elevation={1} sx={{ mb: 3 }}>
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: 120, bgcolor: '#fafafa' }}>状态</TableCell>
              <TableCell>
                <Chip label={STATUS_LABEL[spec.status]} color={STATUS_COLOR[spec.status]} size="small" />
              </TableCell>
              <TableCell sx={{ fontWeight: 600, width: 120, bgcolor: '#fafafa' }}>版本</TableCell>
              <TableCell>v{spec.currentVersion}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>分类</TableCell>
              <TableCell>{spec.categoryName}</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>作者</TableCell>
              <TableCell>{spec.author || '-'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>标签</TableCell>
              <TableCell colSpan={3}>
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {spec.tags?.map((t) => <Chip key={t} label={t} size="small" variant="outlined" />) || '-'}
                </Stack>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>更新时间</TableCell>
              <TableCell>{spec.updatedAt}</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>创建时间</TableCell>
              <TableCell>{spec.createdAt}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>规范内容</Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ '& h1,h2,h3,h4,h5,h6': { mt: 2, mb: 1 }, '& p': { mb: 1 }, '& pre': { bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1, overflow: 'auto' }, '& code': { fontFamily: 'monospace', bgcolor: '#f5f5f5', px: 0.5 } }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{spec.content}</ReactMarkdown>
        </Box>
      </Paper>

      <Dialog open={deprecateOpen} onClose={() => setDeprecateOpen(false)}>
        <DialogTitle>确认废弃</DialogTitle>
        <DialogContent>
          <DialogContentText>确认废弃此规范？废弃后将无法通过 MCP 工具检索到此规范。</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeprecateOpen(false)}>取消</Button>
          <Button color="error" variant="contained" onClick={() => { reviewMutation.mutate({ action: 'deprecate' }); setDeprecateOpen(false) }}>
            废弃
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackMsg} autoHideDuration={3000} onClose={() => setSnackMsg('')}>
        <Alert severity="success" onClose={() => setSnackMsg('')}>{snackMsg}</Alert>
      </Snackbar>
    </Box>
  )
}
