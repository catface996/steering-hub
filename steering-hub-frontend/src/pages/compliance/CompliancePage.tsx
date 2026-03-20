import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import { useMutation } from '@tanstack/react-query'
import { complianceApi } from '@/api/compliance'
import type { ComplianceReport } from '@/types'

const SEVERITY_COLOR: Record<string, 'error' | 'warning' | 'info'> = {
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'info',
}

export default function CompliancePage() {
  const [repoFullName, setRepoFullName] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [codeSnippet, setCodeSnippet] = useState('')
  const [report, setReport] = useState<ComplianceReport | null>(null)
  const [snackMsg, setSnackMsg] = useState('')

  const checkMutation = useMutation({
    mutationFn: complianceApi.check,
    onSuccess: (data) => {
      setReport(data)
      setSnackMsg('检查完成')
    },
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    checkMutation.mutate({ repoFullName, taskDescription, codeSnippet })
  }

  const score = report ? Number(report.score) : 0

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'success'
    if (s >= 60) return 'warning'
    return 'error'
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={3}>合规审查</Typography>

      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={3}>
            <TextField
              label="代码仓库"
              required
              value={repoFullName}
              onChange={(e) => setRepoFullName(e.target.value)}
              placeholder="例如: org/my-service"
              fullWidth
            />
            <TextField
              label="任务描述"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="描述本次代码的功能或背景"
              fullWidth
            />
            <TextField
              label="代码片段"
              required
              multiline
              rows={12}
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="粘贴需要合规检查的代码..."
              fullWidth
              sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 13 } }}
            />
            <Box>
              <Button
                type="submit"
                variant="contained"
                startIcon={
                  checkMutation.isPending
                    ? <CircularProgress size={16} color="inherit" />
                    : <VerifiedUserIcon />
                }
                disabled={checkMutation.isPending}
              >
                开始检查
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>

      {report && (
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>合规检查报告</Typography>

          <Box mb={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" fontWeight={600}>合规评分</Typography>
              <Typography variant="body2" color={`${getScoreColor(score)}.main`} fontWeight={700}>
                {score} 分
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={score}
              color={getScoreColor(score) as any}
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>

          <Alert
            severity={report.compliant ? 'success' : 'warning'}
            sx={{ mb: 3 }}
          >
            {report.summary}
          </Alert>

          {report.violations && report.violations.length > 0 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>违规详情</Typography>
              <Stack spacing={2}>
                {report.violations.map((v, idx) => (
                  <Card key={idx} variant="outlined">
                    <CardHeader
                      sx={{ pb: 1 }}
                      title={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={v.severity}
                            color={SEVERITY_COLOR[v.severity] ?? 'default'}
                            size="small"
                          />
                          <Typography variant="body1" fontWeight={600}>{v.specTitle}</Typography>
                        </Stack>
                      }
                    />
                    <Divider />
                    <CardContent sx={{ pt: 1.5, pb: '12px !important' }}>
                      <Typography variant="body2" mb={1}>{v.description}</Typography>
                      {v.suggestion && (
                        <Typography variant="body2" color="text.secondary">
                          建议：{v.suggestion}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}
        </Paper>
      )}

      <Snackbar open={!!snackMsg} autoHideDuration={3000} onClose={() => setSnackMsg('')}>
        <Alert severity="success" onClose={() => setSnackMsg('')}>{snackMsg}</Alert>
      </Snackbar>
    </Box>
  )
}
