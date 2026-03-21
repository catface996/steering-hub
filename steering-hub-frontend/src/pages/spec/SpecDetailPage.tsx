import { useParams, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
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
import { useSetPageHeader } from '@/hooks/useSetPageHeader'

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
      {/* Header - 负margin抵消 main 的 padding，贴顶显示 */}
      <Box sx={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mx: -4,  // 抵消 main 的 px: 4
        px: 4,
        mt: 0,  // main 的 pt 已经是 0，不需要抵消
        mb: 3,
        borderBottom: '1px solid #2A2A2E',
        bgcolor: 'transparent',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography
            sx={{ color: '#8E8E93', fontWeight: 500, fontSize: 14, cursor: 'pointer', '&:hover': { color: '#6366F1' } }}
            onClick={() => navigate('/specs')}
          >
            规范管理
          </Typography>
          <Typography sx={{ color: '#444', fontSize: 14 }}>/</Typography>
          <Typography sx={{ color: '#FAFAF9', fontWeight: 700, fontSize: 20 }}>
            {spec.title}
          </Typography>
        </Box>
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

      {/* 左右分栏布局 */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', mt: 0 }}>
        {/* 左侧 70%：内容 */}
        <Box sx={{ flex: '0 0 70%' }}>

          {/* 内容 */}
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
        </Box>

        {/* 右侧 30%：元信息 + 可检索性 + Agent测试问题 */}
        <Box sx={{
          flex: '0 0 calc(30% - 24px)',
          alignSelf: 'flex-start',
        }}>
          {/* 元信息卡片 */}
          <Card
            sx={{
              bgcolor: '#16161A',
              border: '1px solid #2A2A2E',
              borderRadius: '16px',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ color: '#FAFAF9', fontWeight: 600, fontSize: 16, mb: 2 }}>
                元信息
              </Typography>

              {/* 分类 */}
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ color: '#4A4A50', fontSize: 12, mb: 0.5 }}>分类</Typography>
                <Typography sx={{ color: '#FAFAF9', fontSize: 14, fontWeight: 500 }}>
                  {spec.categoryName || '-'}
                </Typography>
              </Box>

              {/* 状态 */}
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ color: '#4A4A50', fontSize: 12, mb: 0.5 }}>状态</Typography>
                <Chip
                  label={STATUS_LABEL[spec.status]}
                  size="small"
                  sx={{ ...STATUS_CHIP_SX[spec.status], fontSize: 12, fontWeight: 600 }}
                />
              </Box>

              {/* 版本 */}
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ color: '#4A4A50', fontSize: 12, mb: 0.5 }}>版本</Typography>
                <Typography sx={{ color: '#FAFAF9', fontSize: 14, fontWeight: 500 }}>
                  v{spec.currentVersion}
                </Typography>
              </Box>

              {/* 标签 */}
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ color: '#4A4A50', fontSize: 12, mb: 0.5 }}>标签</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {spec.tags && spec.tags.length > 0 ? (
                    spec.tags.map((t) => (
                      <Chip key={t} label={t} size="small" sx={{ bgcolor: '#6366F120', color: '#818CF8', fontSize: 11, height: 22 }} />
                    ))
                  ) : (
                    <Typography sx={{ color: '#4A4A50', fontSize: 13 }}>-</Typography>
                  )}
                </Stack>
              </Box>

              {/* 关键词 */}
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ color: '#4A4A50', fontSize: 12, mb: 0.5 }}>关键词</Typography>
                <Typography sx={{ color: '#FAFAF9', fontSize: 14, fontWeight: 500 }}>
                  {spec.keywords || '-'}
                </Typography>
              </Box>

              {/* 作者 */}
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ color: '#4A4A50', fontSize: 12, mb: 0.5 }}>作者</Typography>
                <Typography sx={{ color: '#FAFAF9', fontSize: 14, fontWeight: 500 }}>
                  {spec.author || '-'}
                </Typography>
              </Box>

              {/* 更新时间 */}
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ color: '#4A4A50', fontSize: 12, mb: 0.5 }}>更新时间</Typography>
                <Typography sx={{ color: '#FAFAF9', fontSize: 14, fontWeight: 500 }}>
                  {spec.updatedAt}
                </Typography>
              </Box>

              {/* 创建时间 */}
              <Box>
                <Typography sx={{ color: '#4A4A50', fontSize: 12, mb: 0.5 }}>创建时间</Typography>
                <Typography sx={{ color: '#FAFAF9', fontSize: 14, fontWeight: 500 }}>
                  {spec.createdAt}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* 可检索性评分 */}
          <Card
            sx={{
              bgcolor: '#16161A',
              border: '1px solid #2A2A2E',
              borderRadius: '16px',
              boxShadow: 'none',
              mt: 2,
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ color: '#FAFAF9', fontWeight: 600, fontSize: 16, mb: 2 }}>
                可检索性评分
              </Typography>
              <Box sx={{ mb: 1 }}>
                <LinearProgress
                  value={(spec.qualityScore ?? 0) * 100}
                  variant="determinate"
                  color={
                    (spec.qualityScore ?? 0) >= 0.7
                      ? 'success'
                      : (spec.qualityScore ?? 0) >= 0.4
                      ? 'warning'
                      : 'error'
                  }
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>
              <Typography sx={{ color: '#FAFAF9', fontSize: 20, fontWeight: 700 }}>
                {((spec.qualityScore ?? 0) * 100).toFixed(0)}%
              </Typography>
            </CardContent>
          </Card>

          {/* Agent 测试问题 */}
          {spec.agentQueries && spec.agentQueries.length > 0 && (
            <Card
              sx={{
                bgcolor: '#16161A',
                border: '1px solid #2A2A2E',
                borderRadius: '16px',
                boxShadow: 'none',
                mt: 2,
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ color: '#FAFAF9', fontWeight: 600, fontSize: 16, mb: 1 }}>
                  Agent 测试问题
                </Typography>
                <Typography variant="caption" sx={{ color: '#8E8E93', display: 'block', mb: 2 }}>
                  AI Coding Agent 可能用以下问题检索到此规范
                </Typography>
                {spec.agentQueries.map((q: string, i: number) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'flex-start' }}>
                    <Typography sx={{ color: '#6366F1', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                      Q{i + 1}
                    </Typography>
                    <Typography sx={{ color: '#8E8E93', fontSize: 13 }}>
                      {q}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}
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
