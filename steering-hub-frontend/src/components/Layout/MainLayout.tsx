import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import DescriptionIcon from '@mui/icons-material/Description'
import SearchIcon from '@mui/icons-material/Search'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import LabelIcon from '@mui/icons-material/Label'
import LogoutIcon from '@mui/icons-material/Logout'
import { removeToken } from '@/utils/auth'

const SIDEBAR_WIDTH = 220

const menuItems = [
  { key: '/dashboard', icon: <DashboardIcon sx={{ fontSize: 20 }} />, label: '概览' },
  { key: '/specs', icon: <DescriptionIcon sx={{ fontSize: 20 }} />, label: '规范编辑' },
  { key: '/search', icon: <SearchIcon sx={{ fontSize: 20 }} />, label: '规范检索' },
  { key: '/compliance', icon: <VerifiedUserIcon sx={{ fontSize: 20 }} />, label: '合规审查' },
  { key: '/categories', icon: <LabelIcon sx={{ fontSize: 20 }} />, label: '分类管理' },
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const selectedKey =
    menuItems.find((item) => location.pathname.startsWith(item.key))?.key ?? '/dashboard'

  const handleLogout = () => {
    removeToken()
    navigate('/login')
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: '#0B0B0E' }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          bgcolor: '#111114',
          borderRight: '1px solid #2A2A2E',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2.5,
            borderBottom: '1px solid #2A2A2E',
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '10px',
              background: 'linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>S</Typography>
          </Box>
          <Typography sx={{ color: '#FAFAF9', fontWeight: 700, fontSize: 15 }}>
            Steering Hub
          </Typography>
        </Box>

        {/* Nav */}
        <List sx={{ px: 1.5, pt: 2, flexGrow: 1 }}>
          {menuItems.map((item) => {
            const selected = selectedKey === item.key
            return (
              <ListItemButton
                key={item.key}
                selected={selected}
                onClick={() => navigate(item.key)}
                sx={{
                  borderRadius: '10px',
                  mb: 0.5,
                  py: 1,
                  px: 1.5,
                  color: selected ? '#FAFAF9' : '#8E8E93',
                  bgcolor: selected ? 'rgba(99,102,241,0.12)' : 'transparent',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(99,102,241,0.12)',
                    '&:hover': { bgcolor: 'rgba(99,102,241,0.18)' },
                  },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: selected ? '#6366F1' : '#4A4A50',
                    minWidth: 36,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: selected ? 600 : 400,
                  }}
                />
              </ListItemButton>
            )
          })}
        </List>

        {/* Logout */}
        <Box sx={{ p: 2, borderTop: '1px solid #2A2A2E' }}>
          <Tooltip title="退出登录" placement="right">
            <IconButton onClick={handleLogout} sx={{ color: '#4A4A50', '&:hover': { color: '#E85A4F' } }}>
              <LogoutIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
          bgcolor: '#0B0B0E',
          p: 4,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
