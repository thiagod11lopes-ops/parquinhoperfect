import React, { useEffect, useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import LogoutIcon from '@mui/icons-material/Logout'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import HistoryIcon from '@mui/icons-material/History'
import ChatIcon from '@mui/icons-material/Chat'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import TimerIcon from '@mui/icons-material/Timer'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
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

function ActionCard({ icon, title, text, onClick, primary }) {
  return (
    <Button
      fullWidth
      onClick={onClick}
      className={`guardian-action-card ${primary ? 'is-primary' : ''}`}
    >
      <Box className="guardian-action-icon">{icon}</Box>
      <Box className="guardian-action-copy">
        <Typography className="guardian-action-title">{title}</Typography>
        <Typography className="guardian-action-text">{text}</Typography>
      </Box>
    </Button>
  )
}

export default function ResponsavelHome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    child,
    session,
    isInSession,
    alerts,
    lastConfirmation,
    simulateIncomingCall,
    markSessionEndingSoon,
    atCapacity,
    presentCount,
    maxChildren,
  } = useGuardianSession()
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!isInSession) return undefined
    const id = setInterval(() => setTick((t) => t + 1), 15000)
    return () => clearInterval(id)
  }, [isInSession])

  return (
    <Box className="page-container guardian-page">
      <Box className="guardian-hero panel-card">
        <Typography className="guardian-kicker">Olá, {user?.name?.split(' ')[0] || 'Responsável'}</Typography>
        <Typography className="guardian-child-name">{child?.name || '—'}</Typography>
        <Typography className="guardian-status-line">
          {isInSession
            ? `No parquinho · entrada ${session.entryTime} · há ${elapsedLabel(session.entryAt)}`
            : atCapacity
              ? `Fora · lotação ${presentCount}/${maxChildren}`
              : 'Fora · mostre o QR ao gerente/professor'}
        </Typography>
      </Box>

      <Box className={`guardian-status-card panel-card ${isInSession ? 'is-in' : 'is-out'}`}>
        <Box className="guardian-status-row">
          <CheckCircleIcon fontSize="small" />
          <Box>
            <Typography className="guardian-status-kicker">Status</Typography>
            <Typography className="guardian-status-title">
              {isInSession ? 'Dentro do parquinho' : 'Fora do parquinho'}
            </Typography>
            <Typography className="guardian-status-detail">
              {isInSession
                ? 'Para sair, leia o QR da equipe'
                : lastConfirmation?.kind === 'exit'
                  ? lastConfirmation.message
                  : 'Entrada: equipe lê o seu QR'}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Stack spacing={1.25} sx={{ mt: 2 }}>
        <ActionCard
          primary
          icon={<QrCode2Icon />}
          title="QR de entrada"
          text="Mostre para o gerente ou professor ler"
          onClick={() => navigate('/responsavel/qr')}
        />
        <ActionCard
          icon={<LogoutIcon />}
          title="Saída"
          text="Equipe escolhe a criança e você lê o QR"
          onClick={() => navigate('/responsavel/saida')}
        />
        <ActionCard
          icon={<ChatIcon />}
          title="Chat"
          text="Converse com os professores do parquinho"
          onClick={() => navigate('/responsavel/chat')}
        />
        <ActionCard
          icon={<NotificationsActiveIcon />}
          title="Alertas"
          text={alerts.length ? `${alerts.length} alerta(s)` : 'Chamadas e avisos do parquinho'}
          onClick={() => navigate('/responsavel/alertas')}
        />
        <ActionCard
          icon={<HistoryIcon />}
          title="Histórico"
          text="Entradas, saídas e duração das sessões"
          onClick={() => navigate('/responsavel/historico')}
        />
        <ActionCard
          icon={<InfoOutlinedIcon />}
          title="Informações"
          text="Horário de funcionamento e avisos gerais"
          onClick={() => navigate('/responsavel/informacoes')}
        />
      </Stack>

      <Box className="guardian-demo-box">
        <Typography className="guardian-demo-title">Simulações (demo)</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          <Button
            fullWidth
            variant="contained"
            className="btn-orange-card"
            startIcon={<PhoneInTalkIcon />}
            onClick={() => simulateIncomingCall()}
          >
            Simular chamada de auxílio
          </Button>
          <Button
            fullWidth
            variant="outlined"
            sx={{ color: 'var(--app-font-color, #fff)', borderColor: 'rgba(255,255,255,0.55)', fontWeight: 800 }}
            startIcon={<TimerIcon />}
            onClick={markSessionEndingSoon}
          >
            Simular fim de sessão
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
