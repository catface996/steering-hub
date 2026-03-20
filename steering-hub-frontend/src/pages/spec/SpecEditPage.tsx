import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery, useMutation } from '@tanstack/react-query'
import { specApi } from '@/api/spec'
import { categoryApi } from '@/api/category'

export default function SpecEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const [snackMsg, setSnackMsg] = useState('')

  const [form, setForm] = useState({
    title: '',
    categoryId: '',
    tags: '',
    keywords: '',
    author: '',
    content: '',
    changeLog: '',
  })

  const { data: spec } = useQuery({
    queryKey: ['spec', id],
    queryFn: () => specApi.get(Number(id)),
    enabled: isEdit,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.list,
  })

  useEffect(() => {
    if (spec) {
      setForm({
        title: spec.title ?? '',
        categoryId: spec.categoryId ? String(spec.categoryId) : '',
        tags: spec.tags?.join(',') ?? '',
        keywords: spec.keywords ?? '',
        author: spec.author ?? '',
        content: spec.content ?? '',
        changeLog: '',
      })
    }
  }, [spec])

  const createMutation = useMutation({
    mutationFn: specApi.create,
    onSuccess: (data) => {
      setSnackMsg('创建成功')
      setTimeout(() => navigate(`/specs/${data.id}`), 500)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (values: any) => specApi.update(Number(id), values),
    onSuccess: () => {
      setSnackMsg('更新成功')
      setTimeout(() => navigate(`/specs/${id}`), 500)
    },
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const tags = form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
    if (isEdit) {
      const payload = {
        ...form,
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        tags,
      }
      updateMutation.mutate(payload)
    } else {
      const payload = {
        ...form,
        categoryId: Number(form.categoryId),
        tags,
      }
      createMutation.mutate(payload)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={600} mb={3}>
        {isEdit ? '编辑规范' : '新建规范'}
      </Typography>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={3}>
            <TextField
              label="规范标题"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>规范分类</InputLabel>
              <Select
                label="规范分类"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <MenuItem value="">请选择分类</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="标签（逗号分隔）"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="例如: Java, SpringBoot, REST"
              fullWidth
            />
            <TextField
              label="关键词（用于全文检索，逗号分隔）"
              value={form.keywords}
              onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
              fullWidth
            />
            <TextField
              label="作者"
              value={form.author}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              fullWidth
            />
            <TextField
              label="规范内容（Markdown）"
              required
              multiline
              rows={20}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="请输入 Markdown 格式的规范内容..."
              fullWidth
              sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 14 } }}
            />
            {isEdit && (
              <TextField
                label="变更说明"
                value={form.changeLog}
                onChange={(e) => setForm((f) => ({ ...f, changeLog: e.target.value }))}
                placeholder="简要描述本次修改内容"
                fullWidth
              />
            )}
            <Stack direction="row" spacing={2}>
              <Button
                type="submit"
                variant="contained"
                disabled={isPending}
                startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                保存
              </Button>
              <Button variant="outlined" onClick={() => navigate(-1)}>取消</Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      <Snackbar open={!!snackMsg} autoHideDuration={3000} onClose={() => setSnackMsg('')}>
        <Alert severity="success" onClose={() => setSnackMsg('')}>{snackMsg}</Alert>
      </Snackbar>
    </Box>
  )
}
