import React from 'react'
import { Box } from '@mui/material'
import SampleDataToggle from './SampleDataToggle'

/** Controles do cabeçalho / menu */
export default function HeaderControls() {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
      <SampleDataToggle />
    </Box>
  )
}
