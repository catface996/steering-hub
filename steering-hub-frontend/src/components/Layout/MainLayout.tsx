import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
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

const DRAWER_WIDTH = 220

const menuItems = [
  { key: '/dashboard', icon: <DashboardIcon />, label: '概览' },
  { key: '/specs', icon: <DescriptionIcon />, label: '规范管理' },
  { key: '/search', icon: <SearchIcon />, label: '规范检索' },
  { key: '/compliance', icon: <VerifiedUserIcon />, label: '合规审查' },
  { key: '/categories', icon: <LabelIcon />, label: '分类管理' },
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
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: '#1a2332',
            color: '#fff',
            height: '100vh',
            overflow: 'hidden',
          },
        }}
      >
        <Box
          sx={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
            Steering Hub
          </Typography>
        </Box>
        <List sx={{ px: 1, pt: 1, flexGrow: 1, bgcolor: '#1a2332' }}>
          {menuItems.map((item) => {
            const selected = selectedKey === item.key
            return (
              <ListItemButton
                key={item.key}
                selected={selected}
                onClick={() => navigate(item.key)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  color: selected ? '#90caf9' : 'rgba(255,255,255,0.7)',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(144,202,249,0.15)',
                    '&:hover': { bgcolor: 'rgba(144,202,249,0.2)' },
                  },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            )
          })}
        </List>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <AppBar
          position="static"
          elevation={0}
          sx={{
            bgcolor: '#fff',
            borderBottom: '1px solid #e0e0e0',
            color: '#333',
          }}
        >
          <Toolbar>
            <Typography variant="body1" sx={{ color: '#555', flexGrow: 1 }}>
              AI Coding Agent 规范管理平台
            </Typography>
            <Tooltip title="退出登录">
              <IconButton onClick={handleLogout} sx={{ color: '#555' }}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: '#f5f5f5', overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
