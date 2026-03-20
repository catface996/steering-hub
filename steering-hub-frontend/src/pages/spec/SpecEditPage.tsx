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
      updateMutation.mutate({ ...form, categoryId: form.categoryId ? Number(form.categoryId) : undefined, tags })
    } else {
      createMutation.mutate({ ...form, categoryId: Number(form.categoryId), tags })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const labelSx = { color: '#8E8E93', fontSize: 13, mb: 1, fontWeight: 500 }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ color: '#FAFAF9', fontWeight: 700, fontSize: 28 }}>
          {isEdit ? '编辑规范' : '编辑规范'}
        </Typography>
        <Typography sx={{ color: '#8E8E93', fontSize: 14, mt: 0.5 }}>
          创建或编辑代码规范文档
        </Typography>
      </Box>

      <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Title */}
        <Box>
          <Typography sx={labelSx}>规范标题</Typography>
          <TextField
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Java异常处理规范 v2.0"
            fullWidth
            size="small"
          />
        </Box>

        {/* Category + Author */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          <Box>
            <Typography sx={labelSx}>规范分类</Typography>
            <FormControl fullWidth size="small">
              <Select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                displayEmpty
              >
                <MenuItem value="">请选择分类</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box>
            <Typography sx={labelSx}>作者</Typography>
            <TextField
              value={form.author}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              fullWidth
              size="small"
            />
          </Box>
        </Box>

        {/* Tags */}
        <Box>
          <Typography sx={labelSx}>标签（逗号分隔）</Typography>
          <TextField
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            placeholder="Java, 异常处理, SpringBoot"
            fullWidth
            size="small"
          />
        </Box>

        {/* Keywords */}
        <Box>
          <Typography sx={labelSx}>关键词（逗号分隔）</Typography>
          <TextField
            value={form.keywords}
            onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
            placeholder="try-catch Exception, 异常处理"
            fullWidth
            size="small"
          />
        </Box>

        {/* Content */}
        <Box>
          <Typography sx={labelSx}>规范内容（Markdown）</Typography>
          <TextField
            required
            multiline
            rows={18}
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="请输入 Markdown 格式的规范内容..."
            fullWidth
            sx={{
              '& textarea': { fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 13 },
              '& .MuiOutlinedInput-root': { bgcolor: '#1A1A1E' },
            }}
          />
        </Box>

        {/* Changelog (edit mode) */}
        {isEdit && (
          <Box>
            <Typography sx={labelSx}>变更说明</Typography>
            <TextField
              value={form.changeLog}
              onChange={(e) => setForm((f) => ({ ...f, changeLog: e.target.value }))}
              placeholder="简要描述本次修改内容"
              fullWidth
              size="small"
            />
          </Box>
        )}

        {/* Actions */}
        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 1 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
            sx={{ borderColor: '#2A2A2E', color: '#8E8E93', px: 4 }}
          >
            取消
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isPending}
            startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ px: 4 }}
          >
            保存
          </Button>
        </Stack>
      </Box>

      <Snackbar open={!!snackMsg} autoHideDuration={3000} onClose={() => setSnackMsg('')}>
        <Alert severity="success" onClose={() => setSnackMsg('')}>{snackMsg}</Alert>
      </Snackbar>
    </Box>
  )
}
