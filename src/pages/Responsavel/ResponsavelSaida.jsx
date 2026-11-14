import React, { useState } from 'react'
import { Alert, Box, Button, Typography } from '@mui/material'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useNavigate } from 'react-router-dom'
import { useGuardianSession } from '../../context/GuardianSessionContext'
import { useRatings } from '../../context/RatingsContext'
import { useAuth } from '../../context/AuthContext'
import '../../styles/global.scss'

export default function ResponsavelSaida() {
  const navigate = useNavigate()
  const {
    child,
    isInSession,
    session,
    exitPayload,
    pendingExit,
    completeExitWithProfessorQr,
    lastConfirmation,
  } = useGuardianSession()
  const { startHandover } = useRatings()
  const { user } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)

  const qrReady = Boolean(exitPayload || pendingExit?.payload)
  const qrForThisChild = !pendingExit?.childName
    || !child?.name
    || String(pendingExit.childName).toLowerCase() === String(child.name).toLowerCase()

  const handleScan = async () => {
    if (!isInSession) {
      setResult({ ok: false, message: 'Sua criança ainda não entrou. Mostre o QR de entrada primeiro.' })
      return
    }
    if (!qrReady) {
      setResult({
        ok: false,
        message: 'Peça à equipe para selecionar sua criança e mostrar o QR de saída.',
      })
      return
    }
    if (!qrForThisChild) {
      setResult({ ok: false, message: 'O QR exibido agora é de outra criança.' })
      return
    }
    setScanning(true)
    setResult(null)
    await new Promise((r) => setTimeout(r, 800))
    const out = completeExitWithProfessorQr(exitPayload || pendingExit?.payload)
    setScanning(false)
    if (!out.success) {
      setResult({ ok: false, message: out.error || 'Falha ao registrar saída.' })
      return
    }

    startHandover({
      childId: child?.id || out.session.childId,
      childName: child?.name || out.session.childName,
      guardianName: user?.name || child?.guardian || 'Responsável',
      professorName: 'Equipe',
      sessionId: out.session.id,
      exitTime: out.session.exitTime,
    })

    setResult({
      ok: true,
      message: `Saída de ${child?.name || 'sua criança'} às ${out.session.exitTime}.`,
    })
  }

  const justExited = lastConfirmation?.kind === 'exit' && !isInSession

  return (
    <Box className="page-container guardian-page">
      <Box className="page-header">
        <Typography variant="body2" fontWeight={700}>Saída</Typography>
      </Box>

      <Box className={`guardian-status-card panel-card ${isInSession ? 'is-in' : 'is-out'}`}>
        <Typography className="guardian-status-kicker">Status</Typography>
        <Typography className="guardian-status-title">
          {isInSession ? 'Pronto para sair' : justExited ? 'Saída registrada' : 'Sem entrada ativa'}
        </Typography>
        <Typography className="guardian-status-detail">
          {isInSession
            ? `${child?.name} no parquinho desde ${session?.entryTime}`
            : justExited
              ? lastConfirmation.message
              : 'Primeiro a equipe precisa ler o seu QR de entrada'}
        </Typography>
      </Box>

      <Box className="guardian-qr-card">
        <Typography className="guardian-qr-title">Ler QR da equipe</Typography>
        <Typography className="guardian-qr-sub">
          A equipe escolhe {child?.name || 'sua criança'} na lista e mostra o QR. Você lê para confirmar a saída.
        </Typography>

        <Box className="guardian-scan-stage">
          <QrCodeScannerIcon sx={{ fontSize: 64, color: '#ea580c' }} />
          <Typography className="guardian-scan-hint">
            {!isInSession
              ? 'Disponível após a entrada'
              : qrReady && qrForThisChild
                ? 'QR da equipe pronto — toque para ler'
                : 'Aguarde a equipe gerar o QR desta criança'}
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="contained"
          className="btn-orange-card"
          disabled={scanning || !isInSession || !qrReady || !qrForThisChild}
          onClick={handleScan}
        >
          {scanning ? 'Lendo QR...' : 'Ler QR do gerente/professor'}
        </Button>

        {result && (
          <Alert
            severity={result.ok ? 'success' : 'warning'}
            icon={result.ok ? <CheckCircleIcon /> : undefined}
            sx={{ mt: 1.5, borderRadius: 2 }}
          >
            {result.message}
          </Alert>
        )}

        {justExited && (
          <Button
            fullWidth
            variant="outlined"
            sx={{
              mt: 1.5,
              color: 'var(--app-font-color, #fff)',
              borderColor: 'rgba(255,255,255,0.45)',
              fontWeight: 800,
            }}
            onClick={() => navigate('/responsavel/historico')}
          >
            Ver histórico
          </Button>
        )}
      </Box>
    </Box>
  )
}
