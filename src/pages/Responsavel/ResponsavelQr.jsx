import React, { useEffect, useState } from 'react'
import { Alert, Box, Typography } from '@mui/material'
import { QRCodeSVG } from 'qrcode.react'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useGuardianSession } from '../../context/GuardianSessionContext'
import '../../styles/global.scss'

function elapsedLabel(entryAt) {
  if (!entryAt) return '—'
  const ms = Date.now() - new Date(entryAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const mins = Math.floor(ms / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h <= 0) return `${Math.max(0, m)} min`
  return `${h}h ${String(m).padStart(2, '0')}min`
}

export default function ResponsavelQr() {
  const {
    child,
    entryPayload,
    isInSession,
    session,
    atCapacity,
  } = useGuardianSession()
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!isInSession) return undefined
    const id = setInterval(() => setTick((t) => t + 1), 15000)
    return () => clearInterval(id)
  }, [isInSession])

  return (
    <Box className="page-container guardian-page">
      <Box className="page-header">
        <Typography variant="body2" fontWeight={700}>QR de entrada</Typography>
      </Box>

      <Box className={`guardian-status-card panel-card ${isInSession ? 'is-in' : 'is-out'}`}>
        <Typography className="guardian-status-kicker">Status</Typography>
        <Typography className="guardian-status-title">
          {isInSession ? 'No parquinho' : 'Aguardando entrada'}
        </Typography>
        <Typography className="guardian-status-detail">
          {isInSession
            ? `Entrada ${session.entryTime} · há ${elapsedLabel(session.entryAt)}`
            : 'Mostre este QR ao gerente ou professor'}
        </Typography>
      </Box>

      <Box className="guardian-qr-card">
        <Typography className="guardian-qr-title">{child?.name}</Typography>
        <Typography className="guardian-qr-sub">
          O gerente ou professor lê este QR para dar entrada. Você só mostra a tela.
        </Typography>

        <Box className={`guardian-qr-frame ${isInSession ? 'is-dimmed' : ''}`}>
          <QRCodeSVG value={entryPayload || 'parquinho'} size={200} level="M" includeMargin />
        </Box>

        {isInSession ? (
          <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 2, borderRadius: 2 }}>
            Entrada já registrada. Para sair, use a aba Saída e leia o QR da equipe.
          </Alert>
        ) : atCapacity ? (
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
            Lotação cheia no momento. Aguarde uma vaga.
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
            Aguarde o gerente ou professor ler o seu QR.
          </Alert>
        )}
      </Box>
    </Box>
  )
}
