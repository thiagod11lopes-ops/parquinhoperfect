import React from 'react'
import { Box, Typography } from '@mui/material'
import '../../styles/global.scss'

export default function ParentsPortal() {
  return (
    <Box className="page-container">
      <Box
        sx={{
          minHeight: '50vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{
            textAlign: 'center',
            color: 'var(--app-font-color, #fff)',
            textShadow: '0 1px 2px #000',
          }}
        >
          Portal dos Pais
        </Typography>
      </Box>
    </Box>
  )
}
