import React from 'react'
import { Card, Box, Typography } from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import Stat3DIcon from './Stat3DIcon'
import '../../styles/global.scss'

export default function StatCard({ title, value, subtitle, iconName = 'children', trend, trendLabel }) {
  const isUp = trend === 'up'
  const isDown = trend === 'down'

  return (
    <Card className="stat-card">
      <Box className="stat-card-inner">
        <Box className="stat-body">
          <Typography className="stat-value">{value}</Typography>
          <Typography className="stat-label">{title}</Typography>
          {subtitle && (
            <Typography className="stat-sub">{subtitle}</Typography>
          )}
          {trend && (
            <Box className={`stat-trend ${isUp ? 'up' : 'down'}`}>
              {isUp ? <TrendingUpIcon sx={{ fontSize: 13 }} /> : <TrendingDownIcon sx={{ fontSize: 13 }} />}
              {trendLabel}
            </Box>
          )}
        </Box>
        <Stat3DIcon name={iconName} />
      </Box>
    </Card>
  )
}
