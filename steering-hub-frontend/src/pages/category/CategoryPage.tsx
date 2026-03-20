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
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>分类管理</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
          新建分类
        </Button>
      </Box>

      <Paper elevation={1}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: '#fafafa' } }}>
                <TableCell width={60}>ID</TableCell>
                <TableCell>分类名称</TableCell>
                <TableCell>编码</TableCell>
                <TableCell>描述</TableCell>
                <TableCell width={80}>排序</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (
                categories?.map((cat: SpecCategory) => (
                  <TableRow key={cat.id} hover>
                    <TableCell>{cat.id}</TableCell>
                    <TableCell>{cat.name}</TableCell>
                    <TableCell>{cat.code}</TableCell>
                    <TableCell>{cat.description}</TableCell>
                    <TableCell>{cat.sortOrder}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建分类</DialogTitle>
        <Box component="form" onSubmit={onSubmit}>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <TextField
                label="分类名称"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                fullWidth
              />
              <TextField
                label="分类编码"
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                fullWidth
              />
              <TextField
                label="描述"
                multiline
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
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
