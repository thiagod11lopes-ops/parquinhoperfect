import React from 'react'
import { IconButton, Tooltip } from '@mui/material'
import DatasetIcon from '@mui/icons-material/Dataset'
import DatasetOutlinedIcon from '@mui/icons-material/DatasetOutlined'
import { useSampleData } from '../../context/SampleDataContext'

export default function SampleDataToggle() {
  const { enabled, toggleSampleData } = useSampleData()

  return (
    <Tooltip title={enabled ? 'Desativar dados de exemplo' : 'Ativar dados de exemplo'}>
      <IconButton
        onClick={toggleSampleData}
        color={enabled ? 'primary' : 'inherit'}
        aria-label={enabled ? 'Desativar dados de exemplo' : 'Ativar dados de exemplo'}
        aria-pressed={enabled}
      >
        {enabled ? <DatasetIcon /> : <DatasetOutlinedIcon />}
      </IconButton>
    </Tooltip>
  )
}
