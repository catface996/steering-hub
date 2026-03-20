import { useNavigate } from 'react-router-dom'
import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SearchIcon from '@mui/icons-material/Search'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import AddIcon from '@mui/icons-material/Add'
import CategoryIcon from '@mui/icons-material/Category'
import { useQuery } from '@tanstack/react-query'
import { specApi } from '@/api/spec'
import type { Spec, SpecStatus } from '@/types'

const STATUS_LABEL: Record<SpecStatus, string> = {
  draft: '草稿', pending_review: '待审核', approved: '已通过',
  rejected: '已驳回', active: '已生效', deprecated: '已废弃',
}

const STATUS_CHIP_SX: Record<SpecStatus, object> = {
  draft: { bgcolor: '#2A2A2E', color: '#8E8E93' },
  pending_review: { bgcolor: '#6366F120', color: '#6366F1' },
  approved: { bgcolor: '#6366F120', color: '#818CF8' },
  rejected: { bgcolor: '#E85A4F20', color: '#E85A4F' },
  active: { bgcolor: '#32D58320', color: '#32D583' },
  deprecated: { bgcolor: '#FFB54720', color: '#FFB547' },
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: totalData } = useQuery({
    queryKey: ['specs-total'],
    queryFn: () => specApi.page({ current: 1, size: 1 }),
  })

  const { data: activeData } = useQuery({
    queryKey: ['specs-active'],
    queryFn: () => specApi.page({ current: 1, size: 1, status: 'active' }),
  })

  const { data: recentData } = useQuery({
    queryKey: ['specs-recent'],
    queryFn: () => specApi.page({ current: 1, size: 5 }),
  })

  const stats = [
    { label: '规范总数', value: totalData?.total ?? 0, icon: <DescriptionIcon />, color: '#6366F1', bgColor: '#6366F11A' },
    { label: '已生效规范', value: activeData?.total ?? 0, icon: <CheckCircleIcon />, color: '#32D583', bgColor: '#32D58320' },
    { label: '本周检索次数', value: '--', icon: <SearchIcon />, color: '#FFB547', bgColor: '#FFB54720' },
    { label: '合规检查次数', value: '--', icon: <VerifiedUserIcon />, color: '#E85A4F', bgColor: '#E85A4F20' },
  ]

  const quickActions = [
    { label: '新建规范', icon: <AddIcon sx={{ fontSize: 16 }} />, onClick: () => navigate('/specs/new'), color: '#6366F1', bgColor: '#6366F120' },
    { label: '搜索规范', icon: <SearchIcon sx={{ fontSize: 16 }} />, onClick: () => navigate('/search'), color: '#32D583', bgColor: '#32D58320' },
    { label: '合规检查', icon: <VerifiedUserIcon sx={{ fontSize: 16 }} />, onClick: () => navigate('/compliance'), color: '#FFB547', bgColor: '#FFB54720' },
    { label: '分类管理', icon: <CategoryIcon sx={{ fontSize: 16 }} />, onClick: () => navigate('/categories'), color: '#E85A4F', bgColor: '#E85A4F20' },
  ]

  const systemStatus = [
    { label: 'API 状态', status: '正常运行', chipSx: { bgcolor: '#32D58320', color: '#32D583' } },
    { label: '向量数据库', status: '已连接', chipSx: { bgcolor: '#32D58320', color: '#32D583' } },
    { label: '全文索引', status: '运行中', chipSx: { bgcolor: '#6366F120', color: '#6366F1' } },
    { label: '缓存服务', status: '正常', chipSx: { bgcolor: '#32D58320', color: '#32D583' } },
  ]

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography sx={{ color: '#FAFAF9', fontWeight: 700, fontSize: 28 }}>
            平台概览
          </Typography>
          <Typography sx={{ color: '#8E8E93', fontSize: 14, mt: 0.5 }}>
            Steering Hub 您的规范管理平台的全方位一览
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => navigate('/specs')}
          sx={{ borderColor: '#2A2A2E', color: '#8E8E93', '&:hover': { borderColor: '#3A3A40' } }}
        >
          查看所有规范
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

      {/* Bottom Section: Recent Updates + Quick Actions & System Status */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 3 }}>
        {/* Recent Updates */}
        <Box
          sx={{
            bgcolor: '#16161A',
            border: '1px solid #2A2A2E',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2A2A2E' }}>
            <Typography sx={{ color: '#FAFAF9', fontWeight: 600, fontSize: 16 }}>
              最近更新
            </Typography>
            <Button
              size="small"
              onClick={() => navigate('/specs')}
              sx={{ color: '#6366F1', fontSize: 13, '&:hover': { bgcolor: 'rgba(99,102,241,0.08)' } }}
            >
              查看全部
            </Button>
          </Box>
          {/* Table Header */}
          <Box sx={{ display: 'flex', px: 3, py: 2, borderBottom: '1px solid #2A2A2E', alignItems: 'center', minHeight: 56 }}>
            <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: '35%' }}>标题</Typography>
            <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: '20%' }}>分类</Typography>
            <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: '15%' }}>版本</Typography>
            <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: '15%' }}>状态</Typography>
            <Typography sx={{ color: '#4A4A50', fontSize: 12, fontWeight: 600, width: '15%' }}>更新时间</Typography>
          </Box>
          {/* Table Rows */}
          {recentData?.records?.map((spec: Spec) => (
            <Box
              key={spec.id}
              onClick={() => navigate(`/specs/${spec.id}`)}
              sx={{
                display: 'flex',
                px: 3,
                py: 1.5,
                borderBottom: '1px solid #2A2A2E',
                cursor: 'pointer',
                '&:hover': { bgcolor: '#1A1A1E' },
                alignItems: 'center',
              }}
            >
              <Box sx={{ width: '35%', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ color: '#FAFAF9', fontSize: 13, fontWeight: 500 }} noWrap>
                  {spec.title}
                </Typography>
                {spec.tags?.slice(0, 1).map((t) => (
                  <Chip key={t} label={t} size="small" sx={{ bgcolor: '#6366F120', color: '#818CF8', fontSize: 11, height: 22 }} />
                ))}
              </Box>
              <Typography sx={{ color: '#8E8E93', fontSize: 13, width: '20%' }} noWrap>{spec.categoryName}</Typography>
              <Typography sx={{ color: '#8E8E93', fontSize: 13, width: '15%' }}>v{spec.currentVersion}</Typography>
              <Box sx={{ width: '15%' }}>
                <Chip
                  label={STATUS_LABEL[spec.status]}
                  size="small"
                  sx={{ ...STATUS_CHIP_SX[spec.status], fontSize: 11, height: 24, fontWeight: 600 }}
                />
              </Box>
              <Typography sx={{ color: '#4A4A50', fontSize: 12, width: '15%' }}>{spec.updatedAt?.slice(0, 10)}</Typography>
            </Box>
          ))}
        </Box>

        {/* Right column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Quick Actions */}
          <Box
            sx={{
              bgcolor: '#16161A',
              border: '1px solid #2A2A2E',
              borderRadius: '16px',
              p: 3,
            }}
          >
            <Typography sx={{ color: '#FAFAF9', fontWeight: 600, fontSize: 16, mb: 2 }}>
              快速操作
            </Typography>
            <Stack spacing={1.5}>
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  onClick={action.onClick}
                  startIcon={action.icon}
                  fullWidth
                  sx={{
                    justifyContent: 'flex-start',
                    color: action.color,
                    bgcolor: action.bgColor,
                    borderRadius: '10px',
                    py: 1,
                    px: 2,
                    fontSize: 13,
                    fontWeight: 500,
                    '&:hover': { bgcolor: action.bgColor, filter: 'brightness(1.2)' },
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </Stack>
          </Box>

          {/* System Status */}
          <Box
            sx={{
              bgcolor: '#16161A',
              border: '1px solid #2A2A2E',
              borderRadius: '16px',
              p: 3,
            }}
          >
            <Typography sx={{ color: '#FAFAF9', fontWeight: 600, fontSize: 16, mb: 2 }}>
              系统状态
            </Typography>
            <Stack spacing={1.5}>
              {systemStatus.map((item) => (
                <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
                  <Typography sx={{ color: '#8E8E93', fontSize: 13 }}>{item.label}</Typography>
                  <Chip label={item.status} size="small" sx={{ ...item.chipSx, fontSize: 11, height: 22, fontWeight: 600 }} />
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
