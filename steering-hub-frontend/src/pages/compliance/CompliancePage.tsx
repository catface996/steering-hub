import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import SecurityIcon from '@mui/icons-material/Security'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useMutation } from '@tanstack/react-query'
import { complianceApi } from '@/api/compliance'
import type { ComplianceReport } from '@/types'

const SEVERITY_CHIP_SX: Record<string, object> = {
  HIGH: { bgcolor: '#E85A4F20', color: '#E85A4F' },
  MEDIUM: { bgcolor: '#FFB54720', color: '#FFB547' },
  LOW: { bgcolor: '#6366F120', color: '#6366F1' },
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
    if (s >= 80) return '#32D583'
    if (s >= 60) return '#FFB547'
    return '#E85A4F'
  }

  return (
    <Box>
      {/* Header */}
      <Typography sx={{ color: '#FAFAF9', fontWeight: 700, fontSize: 28 }}>合规审查</Typography>
      <Typography sx={{ color: '#8E8E93', fontSize: 14, mt: 0.5, mb: 4 }}>
        自动检测代码是否符合已确定的编码规范，确保团队统一遵守代码标准和设计规范
      </Typography>

      {/* Code Submission */}
      <Box
        sx={{
          bgcolor: '#16161A',
          border: '1px solid #2A2A2E',
          borderRadius: '16px',
          p: 3,
          mb: 3,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
          <SecurityIcon sx={{ color: '#6366F1', fontSize: 20 }} />
          <Typography sx={{ color: '#FAFAF9', fontWeight: 600, fontSize: 16 }}>代码提交</Typography>
          <Typography sx={{ color: '#8E8E93', fontSize: 13 }}>- 提交代码片段进行合规检测</Typography>
        </Stack>

        <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
            <Box>
              <Typography sx={{ color: '#8E8E93', fontSize: 13, mb: 1, fontWeight: 500 }}>代码仓库</Typography>
              <TextField
                required
                value={repoFullName}
                onChange={(e) => setRepoFullName(e.target.value)}
                placeholder="例如: org/my-service"
                fullWidth
                size="small"
              />
            </Box>
            <Box>
              <Typography sx={{ color: '#8E8E93', fontSize: 13, mb: 1, fontWeight: 500 }}>任务描述（可选）</Typography>
              <TextField
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="描述本次代码的功能或背景"
                fullWidth
                size="small"
              />
            </Box>
          </Box>
          <Box>
            <Typography sx={{ color: '#8E8E93', fontSize: 13, mb: 1, fontWeight: 500 }}>代码片段</Typography>
            <Box sx={{ position: 'relative' }}>
              <TextField
                required
                multiline
                rows={10}
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder="粘贴需要合规检查的代码..."
                fullWidth
                sx={{
                  '& textarea': { fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 13 },
                  '& .MuiOutlinedInput-root': { bgcolor: '#1A1A1E' },
                }}
              />
              <Chip
                label="Java"
                size="small"
                sx={{ position: 'absolute', bottom: 12, left: 12, bgcolor: '#6366F120', color: '#818CF8', fontSize: 11 }}
              />
              <ContentCopyIcon
                sx={{ position: 'absolute', top: 12, right: 12, color: '#4A4A50', fontSize: 18, cursor: 'pointer', '&:hover': { color: '#8E8E93' } }}
              />
            </Box>
          </Box>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={() => { setCodeSnippet(''); setRepoFullName(''); setTaskDescription('') }}
              sx={{ borderColor: '#2A2A2E', color: '#8E8E93', px: 3 }}
            >
              重置
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={checkMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <VerifiedUserIcon />}
              disabled={checkMutation.isPending}
              sx={{ px: 3 }}
            >
              开始检查
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Report */}
      {report && (
        <>
          <Box
            sx={{
              bgcolor: '#16161A',
              border: '1px solid #2A2A2E',
              borderRadius: '16px',
              p: 3,
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleIcon sx={{ color: report.compliant ? '#32D583' : '#FFB547', fontSize: 20 }} />
                <Typography sx={{ color: '#FAFAF9', fontWeight: 600, fontSize: 16 }}>审查报告</Typography>
                <Typography sx={{ color: '#8E8E93', fontSize: 13 }}>
                  - 基于 {report.relatedSpecs?.length || 0} 条规范进行检查分析
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ color: '#8E8E93', fontSize: 13 }}>合规评分</Typography>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    border: `3px solid ${getScoreColor(score)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography sx={{ color: getScoreColor(score), fontWeight: 700, fontSize: 14 }}>
                    {score}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Score Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
              <Box sx={{ bgcolor: '#1A1A1E', borderRadius: '10px', p: 2, textAlign: 'center' }}>
                <Typography sx={{ color: '#E85A4F', fontWeight: 700, fontSize: 24 }}>
                  {report.violations?.filter(v => v.severity === 'HIGH').length || 0}
                </Typography>
                <Typography sx={{ color: '#4A4A50', fontSize: 12 }}>严重问题</Typography>
              </Box>
              <Box sx={{ bgcolor: '#1A1A1E', borderRadius: '10px', p: 2, textAlign: 'center' }}>
                <Typography sx={{ color: '#FFB547', fontWeight: 700, fontSize: 24 }}>
                  {report.violations?.filter(v => v.severity === 'MEDIUM').length || 0}
                </Typography>
                <Typography sx={{ color: '#4A4A50', fontSize: 12 }}>警告</Typography>
              </Box>
              <Box sx={{ bgcolor: '#1A1A1E', borderRadius: '10px', p: 2, textAlign: 'center' }}>
                <Typography sx={{ color: '#32D583', fontWeight: 700, fontSize: 24 }}>
                  {report.relatedSpecs?.length || 0}
                </Typography>
                <Typography sx={{ color: '#4A4A50', fontSize: 12 }}>关联规范</Typography>
              </Box>
            </Box>

            {/* Summary */}
            <Box sx={{ bgcolor: report.compliant ? '#32D58310' : '#FFB54710', borderRadius: '10px', p: 2, border: `1px solid ${report.compliant ? '#32D58330' : '#FFB54730'}` }}>
              <Typography sx={{ color: report.compliant ? '#32D583' : '#FFB547', fontSize: 13 }}>{report.summary}</Typography>
            </Box>
          </Box>

          {/* Violations */}
          {report.violations && report.violations.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ color: '#FAFAF9', fontWeight: 600, fontSize: 16 }}>违规详情</Typography>
                <Button size="small" sx={{ color: '#6366F1', fontSize: 13 }}>
                  + 导出报告
                </Button>
              </Box>
              <Stack spacing={2}>
                {report.violations.map((v, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      bgcolor: '#16161A',
                      border: '1px solid #2A2A2E',
                      borderRadius: '16px',
                      p: 3,
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                      <Chip
                        label={v.severity}
                        size="small"
                        sx={{ ...SEVERITY_CHIP_SX[v.severity], fontSize: 11, height: 22, fontWeight: 700 }}
                      />
                      <Typography sx={{ color: '#FAFAF9', fontWeight: 600, fontSize: 15 }}>{v.specTitle}</Typography>
                    </Stack>
                    <Typography sx={{ color: '#8E8E93', fontSize: 13, mb: 1 }}>{v.description}</Typography>
                    {v.suggestion && (
                      <Box sx={{ bgcolor: '#6366F108', borderRadius: '8px', p: 1.5, border: '1px solid #6366F120' }}>
                        <Typography sx={{ color: '#818CF8', fontSize: 12 }}>
                          建议：{v.suggestion}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </>
      )}

      <Snackbar open={!!snackMsg} autoHideDuration={3000} onClose={() => setSnackMsg('')}>
        <Alert severity="success" onClose={() => setSnackMsg('')}>{snackMsg}</Alert>
      </Snackbar>
    </Box>
  )
}
