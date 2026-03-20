import { Box, Card, CardContent, Grid, Typography } from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SearchIcon from '@mui/icons-material/Search'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'

const stats = [
  { label: '规范总数', value: 0, icon: <DescriptionIcon fontSize="large" />, color: '#1976d2' },
  { label: '已生效规范', value: 0, icon: <CheckCircleIcon fontSize="large" />, color: '#2e7d32' },
  { label: '本周检索次数', value: 0, icon: <SearchIcon fontSize="large" />, color: '#f57c00' },
  { label: '合规检查次数', value: 0, icon: <VerifiedUserIcon fontSize="large" />, color: '#c62828' },
]

export default function DashboardPage() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={3}>
        平台概览
      </Typography>
      <Grid container spacing={2}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} lg={3} key={stat.label}>
            <Card elevation={1}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    bgcolor: `${stat.color}1a`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color={stat.color}>
                    {stat.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
