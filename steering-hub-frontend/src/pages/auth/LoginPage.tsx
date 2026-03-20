import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
} from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { authApi } from '@/api/auth'
import { setToken } from '@/utils/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('请输入用户名和密码')
      return
    }

    setLoading(true)
    try {
      const result = await authApi.login({ username, password })
      setToken(result.token)
      navigate('/dashboard')
    } catch {
      setError('登录失败，请检查用户名和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#0B0B0E',
        background: 'radial-gradient(ellipse at 50% 50%, #1a1040 0%, #0B0B0E 70%)',
      }}
    >
      <Box
        sx={{
          width: 420,
          bgcolor: '#16161A',
          borderRadius: '20px',
          border: '1px solid #2A2A2E',
          p: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '32px',
            background: 'linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LockOutlinedIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Box>

        {/* Title */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: '#FAFAF9', fontWeight: 700, fontSize: 24, mb: 1 }}>
            Steering Hub
          </Typography>
          <Typography sx={{ color: '#8E8E93', fontSize: 14 }}>
            AI Coding Agent 规范管理平台
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        )}

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box>
            <Typography sx={{ color: '#8E8E93', fontSize: 13, mb: 1, fontWeight: 500 }}>
              用户名
            </Typography>
            <TextField
              fullWidth
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1A1A1E',
                  borderRadius: '10px',
                  '& fieldset': { borderColor: '#2A2A2E' },
                  '&:hover fieldset': { borderColor: '#3A3A40' },
                  '&.Mui-focused fieldset': { borderColor: '#6366F1' },
                },
                '& .MuiInputBase-input': { color: '#FAFAF9', py: 1.5 },
                '& .MuiInputBase-input::placeholder': { color: '#4A4A50', opacity: 1 },
              }}
            />
          </Box>
          <Box>
            <Typography sx={{ color: '#8E8E93', fontSize: 13, mb: 1, fontWeight: 500 }}>
              密码
            </Typography>
            <TextField
              fullWidth
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1A1A1E',
                  borderRadius: '10px',
                  '& fieldset': { borderColor: '#2A2A2E' },
                  '&:hover fieldset': { borderColor: '#3A3A40' },
                  '&.Mui-focused fieldset': { borderColor: '#6366F1' },
                },
                '& .MuiInputBase-input': { color: '#FAFAF9', py: 1.5 },
                '& .MuiInputBase-input::placeholder': { color: '#4A4A50', opacity: 1 },
              }}
            />
          </Box>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              mt: 1,
              py: 1.5,
              borderRadius: '10px',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {loading ? '登录中...' : '登 录'}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
