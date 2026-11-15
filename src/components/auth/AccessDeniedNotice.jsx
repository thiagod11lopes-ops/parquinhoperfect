import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Box, Button, Typography } from '@mui/material'
import GppBadOutlinedIcon from '@mui/icons-material/GppBadOutlined'

export function isUnauthorizedAccessMessage(message = '') {
  const text = String(message).toLowerCase()
  return (
    text.includes('não cadastrado')
    || text.includes('nao cadastrado')
    || text.includes('revogado')
    || text.includes('está cadastrado como')
    || text.includes('esta cadastrado como')
    || text.includes('outro papel')
    || text.includes('peça ao')
    || text.includes('peca ao')
    || text.includes('incluir seu celular')
    || text.includes('acesso correto')
  )
}

export default function AccessDeniedNotice({
  open,
  message,
  role,
  onClose,
}) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const host = document.getElementById('phone-app-root') || document.body

  return createPortal(
    <Box className="access-denied-overlay" role="alertdialog" aria-modal="true" aria-labelledby="access-denied-title">
      <Box className="access-denied-backdrop" onClick={onClose} aria-hidden />
      <Box className="access-denied-card">
        <Box className="access-denied-orb" aria-hidden />
        <Box className="access-denied-icon-wrap" aria-hidden>
          <span className="access-denied-ring" />
          <span className="access-denied-ring access-denied-ring--delay" />
          <Box className="access-denied-icon">
            <GppBadOutlinedIcon />
          </Box>
        </Box>

        <Typography id="access-denied-title" className="access-denied-kicker">
          Acesso bloqueado
        </Typography>
        <Typography className="access-denied-title">
          Você ainda não está autorizado
        </Typography>
        <Typography className="access-denied-message" sx={{ mb: 1.5 }}>
          {message || 'Este login não está liberado na pirâmide do sistema.'}
        </Typography>

        <Button
          fullWidth
          disableElevation
          className="access-denied-cta"
          onClick={onClose}
        >
          Entendi
        </Button>
      </Box>
    </Box>,
    host,
  )
}
