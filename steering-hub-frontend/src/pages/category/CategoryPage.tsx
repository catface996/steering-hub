import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import type { SpecCategory } from '@/types'

export default function CategoryPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [snackMsg, setSnackMsg] = useState('')
  const [form, setForm] = useState({ name: '', code: '', description: '' })

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.get<{ data: SpecCategory[] }>('/categories').then((r) => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (values: any) =>
      apiClient.post('/categories', null, { params: values }).then((r) => r.data),
    onSuccess: () => {
      setSnackMsg('创建成功')
      setModalOpen(false)
      setForm({ name: '', code: '', description: '' })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  const labelSx = { color: '#8E8E93', fontSize: 13, mb: 1, fontWeight: 500 }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography sx={{ color: '#FAFAF9', fontWeight: 700, fontSize: 28 }}>分类管理</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
          + 新建分类
        </Button>
      </Box>

      {/* Table */}
      <Box sx={{ bgcolor: '#16161A', border: '1px solid #2A2A2E', borderRadius: '16px', overflow: 'hidden', flex: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', px: 3, py: 2, borderBottom: '1px solid #2A2A2E', alignItems: 'center', minHeight: 56 }}>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 60 }}>ID</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 160 }}>分类名称</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 160 }}>编码</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, flex: 1 }}>描述</Typography>
          <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: 60 }}>操作</Typography>
        </Box>

        {/* Body */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={24} sx={{ color: '#6366F1' }} />
          </Box>
        ) : (
          categories?.map((cat: SpecCategory) => (
            <Box
              key={cat.id}
              sx={{
                display: 'flex',
                px: 3,
                py: 2,
                borderBottom: '1px solid #2A2A2E',
                alignItems: 'center',
                '&:hover': { bgcolor: '#1A1A1E' },
              }}
            >
              <Typography sx={{ color: '#4A4A50', fontSize: 13, width: 60 }}>{cat.id}</Typography>
              <Typography sx={{ color: '#FAFAF9', fontSize: 13, fontWeight: 500, width: 160 }}>{cat.name}</Typography>
              <Typography sx={{ color: '#8E8E93', fontSize: 13, width: 160, fontFamily: 'monospace' }}>{cat.code}</Typography>
              <Typography sx={{ color: '#8E8E93', fontSize: 13, flex: 1 }} noWrap>{cat.description}</Typography>
              <Box sx={{ width: 60 }}>
                <IconButton size="small" sx={{ color: '#4A4A50', '&:hover': { color: '#FAFAF9' } }}>
                  <ChevronRightIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>
          ))
        )}

      </Box>

      {/* Footer */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 2, px: 1 }}>
        <Typography sx={{ color: '#4A4A50', fontSize: 13 }}>
          共 {categories?.length ?? 0} 个分类
        </Typography>
        <Typography sx={{ color: '#4A4A50', fontSize: 13 }}>每页 10 条</Typography>
      </Box>

      {/* Create Dialog */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建分类</DialogTitle>
        <Box component="form" onSubmit={onSubmit}>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Box>
                <Typography sx={labelSx}>分类名称</Typography>
                <TextField
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  fullWidth
                  size="small"
                />
              </Box>
              <Box>
                <Typography sx={labelSx}>分类编码</Typography>
                <TextField
                  required
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  fullWidth
                  size="small"
                />
              </Box>
              <Box>
                <Typography sx={labelSx}>描述</Typography>
                <TextField
                  multiline
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  fullWidth
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setModalOpen(false)} sx={{ color: '#8E8E93', borderColor: '#2A2A2E' }} variant="outlined">取消</Button>
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

      <Snackbar open={!!snackMsg} autoHideDuration={3000} onClose={() => setSnackMsg('')}>
        <Alert severity="success" onClose={() => setSnackMsg('')}>{snackMsg}</Alert>
      </Snackbar>
    </Box>
  )
}
