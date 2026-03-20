import { Box, Typography } from '@mui/material'
import QueryStatsIcon from '@mui/icons-material/QueryStats'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import SpeedIcon from '@mui/icons-material/Speed'
import DownloadIcon from '@mui/icons-material/Download'
import Button from '@mui/material/Button'
import InboxIcon from '@mui/icons-material/Inbox'

export default function SpecAnalyticsPage() {
  const stats = [
    { label: '总查询次数', value: '--', icon: <QueryStatsIcon />, color: '#6366F1', bgColor: '#6366F11A' },
    { label: '本月查询', value: '--', icon: <TrendingUpIcon />, color: '#32D583', bgColor: '#32D58320' },
    { label: '活跃规范数', value: '--', icon: <AccessTimeIcon />, color: '#FFB547', bgColor: '#FFB54720' },
    { label: '平均响应时间', value: '--', icon: <SpeedIcon />, color: '#E85A4F', bgColor: '#E85A4F20' },
  ]

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography sx={{ color: '#FAFAF9', fontWeight: 700, fontSize: 28 }}>规范使用分析</Typography>
          <Typography sx={{ color: '#8E8E93', fontSize: 14, mt: 0.5 }}>
            了解规范使用情况 — 按时间区间查看数据
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          sx={{ borderColor: '#2A2A2E', color: '#8E8E93' }}
          disabled
        >
          导出
        </Button>
      </Box>

      {/* Stat Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 4 }}>
        {stats.map((stat) => (
          <Box
            key={stat.label}
            sx={{
              bgcolor: '#16161A',
              border: '1px solid #2A2A2E',
              borderRadius: '16px',
              p: 2.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                bgcolor: stat.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stat.color,
              }}
            >
              {stat.icon}
            </Box>
            <Typography sx={{ color: '#8E8E93', fontSize: 13 }}>{stat.label}</Typography>
            <Typography sx={{ color: '#FAFAF9', fontWeight: 700, fontSize: 28 }}>{stat.value}</Typography>
          </Box>
        ))}
      </Box>

      {/* Empty State */}
      <Box
        sx={{
          bgcolor: '#16161A',
          border: '1px solid #2A2A2E',
          borderRadius: '16px',
          py: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <InboxIcon sx={{ fontSize: 48, color: '#2A2A2E' }} />
        <Typography sx={{ color: '#4A4A50', fontSize: 15 }}>暂无分析数据</Typography>
        <Typography sx={{ color: '#4A4A50', fontSize: 13 }}>后端统计接口就绪后将自动展示使用分析</Typography>
      </Box>
    </Box>
  )
}
