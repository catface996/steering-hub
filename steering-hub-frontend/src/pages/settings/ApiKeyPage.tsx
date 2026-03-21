import { useState, useEffect } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiKeyApi } from '@/api/apiKey'
import type { ApiKeyItem } from '@/types'
import { usePageHeader } from '@/contexts/PageHeaderContext'

export default function ApiKeyPage() {
  const { setHeader } = usePageHeader()
  const queryClient = useQueryClient()
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [keyDisplayModal, setKeyDisplayModal] = useState<{ open: boolean; key: string; name: string }>({
    open: false,
    key: '',
    name: '',
  })
  const [snackMsg, setSnackMsg] = useState('')
  const [form, setForm] = useState({ name: '', description: '' })

  useEffect(() => {
    setHeader({ title: 'API Keys' })
  }, [setHeader])

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: apiKeyApi.list,
  })

  const createMutation = useMutation({
    mutationFn: apiKeyApi.create,
    onSuccess: (data) => {
      setCreateModalOpen(false)
      setForm({ name: '', description: '' })
      setKeyDisplayModal({ open: true, key: data.keyValue, name: data.name })
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (error: any) => {
      setSnackMsg(error.message || '创建失败')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: apiKeyApi.toggle,
    onSuccess: () => {
      setSnackMsg('状态更新成功')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (error: any) => {
      setSnackMsg(error.message || '操作失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: apiKeyApi.delete,
    onSuccess: () => {
      setSnackMsg('删除成功')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (error: any) => {
      setSnackMsg(error.message || '删除失败')
    },
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  const handleCopyKey = () => {
    navigator.clipboard.writeText(keyDisplayModal.key)
    setSnackMsg('API Key 已复制到剪贴板')
  }

  const labelSx = { color: '#8E8E93', fontSize: 13, mb: 1, fontWeight: 500 }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography sx={{ color: '#FAFAF9', fontWeight: 700, fontSize: 28 }}>API Keys</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateModalOpen(true)}>
          创建 API Key
        </Button>
      </Box>

      {/* Table */}
      <Box sx={{ bgcolor: '#16161A', border: '1px solid #2A2A2E', borderRadius: '16px', overflow: 'hidden', flex: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', px: 3, py: 2, borderBottom: '1px solid #2A2A2E', alignItems: 'center', minHeight: 56 }}>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 180 }}>名称</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 260 }}>Key 值</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, flex: 1 }}>描述</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 100, textAlign: 'center' }}>状态</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 150, textAlign: 'center' }}>最后使用</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 150, textAlign: 'center' }}>创建时间</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 120, textAlign: 'center' }}>操作</Typography>
        </Box>

        {/* Body */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={24} sx={{ color: '#6366F1' }} />
          </Box>
        ) : apiKeys && apiKeys.length > 0 ? (
          apiKeys.map((item: ApiKeyItem) => (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                px: 3,
                py: 2,
                borderBottom: '1px solid #2A2A2E',
                alignItems: 'center',
                '&:hover': { bgcolor: '#1A1A1E' },
              }}
            >
              <Typography sx={{ color: '#FAFAF9', fontSize: 13, fontWeight: 500, width: 180 }} noWrap>
                {item.name}
              </Typography>
              <Typography
                sx={{
                  color: '#8E8E93',
                  fontSize: 13,
                  width: 260,
                  fontFamily: 'monospace',
                  letterSpacing: '0.5px',
                }}
                noWrap
              >
                {item.keyValue}
              </Typography>
              <Typography sx={{ color: '#8E8E93', fontSize: 13, flex: 1 }} noWrap>
                {item.description || '-'}
              </Typography>
              <Box sx={{ width: 100, display: 'flex', justifyContent: 'center' }}>
                <Chip
                  label={item.enabled ? '已启用' : '已禁用'}
                  size="small"
                  sx={{
                    bgcolor: item.enabled ? 'rgba(52, 211, 153, 0.15)' : 'rgba(142, 142, 147, 0.15)',
                    color: item.enabled ? '#34D399' : '#8E8E93',
                    fontSize: 11,
                    fontWeight: 600,
                    height: 22,
                  }}
                />
              </Box>
              <Typography sx={{ color: '#8E8E93', fontSize: 13, width: 150, textAlign: 'center' }}>
                {item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleDateString('zh-CN') : '-'}
              </Typography>
              <Typography sx={{ color: '#8E8E93', fontSize: 13, width: 150, textAlign: 'center' }}>
                {new Date(item.createdAt).toLocaleDateString('zh-CN')}
              </Typography>
              <Box sx={{ width: 120, display: 'flex', justifyContent: 'center', gap: 1 }}>
                <Tooltip title={item.enabled ? '禁用' : '启用'}>
                  <Switch
                    checked={item.enabled}
                    onChange={() => toggleMutation.mutate(item.id)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#6366F1',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#6366F1',
                      },
                    }}
                  />
                </Tooltip>
                <Tooltip title="删除">
                  <IconButton
                    size="small"
                    onClick={() => {
                      if (window.confirm(`确定要删除 API Key "${item.name}" 吗？`)) {
                        deleteMutation.mutate(item.id)
                      }
                    }}
                    sx={{ color: '#4A4A50', '&:hover': { color: '#E85A4F' } }}
                  >
                    <DeleteIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <Typography sx={{ color: '#4A4A50', fontSize: 14 }}>暂无 API Key</Typography>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 2, px: 1 }}>
        <Typography sx={{ color: '#4A4A50', fontSize: 13 }}>
          共 {apiKeys?.length ?? 0} 个 API Key
        </Typography>
      </Box>

      {/* Create Dialog */}
      <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建 API Key</DialogTitle>
        <Box component="form" onSubmit={onSubmit}>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Box>
                <Typography sx={labelSx}>名称</Typography>
                <TextField
                  required
                  placeholder="例如：Production API"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  fullWidth
                  size="small"
                />
              </Box>
              <Box>
                <Typography sx={labelSx}>描述</Typography>
                <TextField
                  multiline
                  rows={3}
                  placeholder="描述此 API Key 的用途"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  fullWidth
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => setCreateModalOpen(false)}
              sx={{ color: '#8E8E93', borderColor: '#2A2A2E' }}
              variant="outlined"
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending}
              startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              创建
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Key Display Dialog */}
      <Dialog
        open={keyDisplayModal.open}
        onClose={() => setKeyDisplayModal({ open: false, key: '', name: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>API Key 创建成功</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning" sx={{ bgcolor: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>重要提示</Typography>
              <Typography sx={{ fontSize: 12 }}>
                请立即复制并妥善保存此 API Key。出于安全考虑，关闭此窗口后将无法再次查看完整密钥。
              </Typography>
            </Alert>
            <Box>
              <Typography sx={labelSx}>名称</Typography>
              <Typography sx={{ color: '#FAFAF9', fontSize: 14, fontWeight: 500 }}>
                {keyDisplayModal.name}
              </Typography>
            </Box>
            <Box>
              <Typography sx={labelSx}>API Key</Typography>
              <Box
                sx={{
                  bgcolor: '#1A1A1E',
                  border: '1px solid #2A2A2E',
                  borderRadius: '8px',
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Typography
                  sx={{
                    color: '#FAFAF9',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    letterSpacing: '0.5px',
                    flex: 1,
                    wordBreak: 'break-all',
                  }}
                >
                  {keyDisplayModal.key}
                </Typography>
                <Tooltip title="复制">
                  <IconButton
                    size="small"
                    onClick={handleCopyKey}
                    sx={{ color: '#6366F1', '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.1)' } }}
                  >
                    <ContentCopyIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setKeyDisplayModal({ open: false, key: '', name: '' })}
            variant="contained"
            fullWidth
          >
            我已安全保存
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackMsg} autoHideDuration={3000} onClose={() => setSnackMsg('')}>
        <Alert severity="success" onClose={() => setSnackMsg('')}>
          {snackMsg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
