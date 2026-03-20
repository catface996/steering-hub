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
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { specApi } from '@/api/spec'
import type { SpecStatus } from '@/types'

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

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress sx={{ color: '#6366F1' }} /></Box>
  if (!spec) return <Typography sx={{ color: '#8E8E93' }}>规范不存在</Typography>

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography sx={{ color: '#FAFAF9', fontWeight: 700, fontSize: 28 }}>{spec.title}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/specs')} sx={{ borderColor: '#2A2A2E', color: '#8E8E93' }}>
            返回
          </Button>
          <Button variant="contained" onClick={() => navigate(`/specs/${id}/edit`)}>
            编辑规范
          </Button>
          {spec.status === 'draft' && (
            <Button variant="contained" onClick={() => reviewMutation.mutate({ action: 'submit' })}>
              提交审核
            </Button>
          )}
          {spec.status === 'pending_review' && (
            <>
              <Button
                variant="contained"
                onClick={() => reviewMutation.mutate({ action: 'approve' })}
                sx={{ bgcolor: '#32D583', '&:hover': { bgcolor: '#28b06e' } }}
              >
                审核通过
              </Button>
              <Button
                variant="outlined"
                onClick={() => reviewMutation.mutate({ action: 'reject' })}
                sx={{ borderColor: '#E85A4F', color: '#E85A4F' }}
              >
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
            <Button
              variant="outlined"
              onClick={() => setDeprecateOpen(true)}
              sx={{ borderColor: '#E85A4F', color: '#E85A4F' }}
            >
              废弃
            </Button>
          )}
        </Stack>
      </Box>

      {/* Metadata Cards */}
      <Box
        sx={{
          bgcolor: '#16161A',
          border: '1px solid #2A2A2E',
          borderRadius: '16px',
          mb: 3,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {/* Row 1 */}
          <Box sx={{ p: 2.5, borderBottom: '1px solid #2A2A2E', borderRight: '1px solid #2A2A2E' }}>
            <Typography sx={{ color: '#4A4A50', fontSize: 12, mb: 0.5 }}>状态</Typography>
            <Chip label={STATUS_LABEL[spec.status]} size="small" sx={{ ...STATUS_CHIP_SX[spec.status], fontSize: 12, fontWeight: 600 }} />
          </Box>
          <Box sx={{ p: 2.5, borderBottom: '1px solid #2A2A2E', borderRight: '1px solid #2A2A2E' }}>
            <Typography sx={{ color: '#4A4A50', fontSize: 12, mb: 0.5 }}>版本</Typography>
            <Typography sx={{ color: '#FAFAF9', fontSize: 14, fontWeight: 500 }}>v{spec.currentVersion}</Typography>
          </Box>
          <Box sx={{ p: 2.5, borderBottom: '1px solid #2A2A2E', borderRight: '1px solid #2A2A2E' }}>
            <Typography sx={{ color: '#4A4A50', fontSize: 12, mb: 0.5 }}>分类</Typography>
            <Typography sx={{ color: '#FAFAF9', fontSize: 14, fontWeight: 500 }}>{spec.categoryName || '-'}</Typography>
          </Box>
          <Box sx={{ p: 2.5, borderBottom: '1px solid #2A2A2E' }}>
            <Typography sx={{ color: '#4A4A50', fontSize: 12, mb: 0.5 }}>编码标准</Typography>
            <Typography sx={{ color: '#FAFAF9', fontSize: 14, fontWeight: 500 }}>{spec.author || '-'}</Typography>
          </Box>
          {/* Row 2 */}
          <Box sx={{ p: 2.5, borderRight: '1px solid #2A2A2E' }}>
            <Typography sx={{ color: '#4A4A50', fontSize: 12, mb: 0.5 }}>标签</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap">
              {spec.tags?.map((t) => (
                <Chip key={t} label={t} size="small" sx={{ bgcolor: '#6366F120', color: '#818CF8', fontSize: 11, height: 22 }} />
              )) || <Typography sx={{ color: '#4A4A50', fontSize: 13 }}>-</Typography>}
            </Stack>
          </Box>
          <Box sx={{ p: 2.5, borderRight: '1px solid #2A2A2E' }}>
            <Typography sx={{ color: '#4A4A50', fontSize: 12, mb: 0.5 }}>作者</Typography>
            <Typography sx={{ color: '#FAFAF9', fontSize: 14, fontWeight: 500 }}>{spec.author || '-'}</Typography>
          </Box>
          <Box sx={{ p: 2.5, borderRight: '1px solid #2A2A2E' }}>
            <Typography sx={{ color: '#4A4A50', fontSize: 12, mb: 0.5 }}>更新时间</Typography>
            <Typography sx={{ color: '#FAFAF9', fontSize: 14, fontWeight: 500 }}>{spec.updatedAt}</Typography>
          </Box>
          <Box sx={{ p: 2.5 }}>
            <Typography sx={{ color: '#4A4A50', fontSize: 12, mb: 0.5 }}>创建时间</Typography>
            <Typography sx={{ color: '#FAFAF9', fontSize: 14, fontWeight: 500 }}>{spec.createdAt}</Typography>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          bgcolor: '#16161A',
          border: '1px solid #2A2A2E',
          borderRadius: '16px',
          p: 4,
        }}
      >
        <Typography sx={{ color: '#FAFAF9', fontWeight: 600, fontSize: 18, mb: 2 }}>规范内容</Typography>
        <Box sx={{ borderTop: '1px solid #2A2A2E', pt: 3 }} className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{spec.content}</ReactMarkdown>
        </Box>
      </Box>

      {/* Deprecate Dialog */}
      <Dialog open={deprecateOpen} onClose={() => setDeprecateOpen(false)}>
        <DialogTitle>确认废弃</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#8E8E93' }}>确认废弃此规范？废弃后将无法通过 MCP 工具检索到此规范。</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeprecateOpen(false)} sx={{ color: '#8E8E93' }}>取消</Button>
          <Button
            variant="contained"
            onClick={() => { reviewMutation.mutate({ action: 'deprecate' }); setDeprecateOpen(false) }}
            sx={{ bgcolor: '#E85A4F', '&:hover': { bgcolor: '#d04a3f' } }}
          >
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
