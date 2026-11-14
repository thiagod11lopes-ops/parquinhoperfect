import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert, Box, Button, Typography, Dialog, DialogTitle,
  DialogContent, DialogActions, LinearProgress, IconButton, Tooltip,
} from '@mui/material'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CloseIcon from '@mui/icons-material/Close'
import ChatIcon from '@mui/icons-material/Chat'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import { usePresence } from '../../context/PresenceContext'
import { useAppNotifications } from '../../context/AppNotificationsContext'
import { useAuth } from '../../context/AuthContext'
import { useSampleData } from '../../context/SampleDataContext'
import { useChat } from '../../context/ChatContext'
import { useCallBridge } from '../../context/CallBridgeContext'
import CallTypeDialog from '../../components/staff/CallTypeDialog'
import '../../styles/global.scss'

function unitMatch(child, unitId) {
  if (!unitId) return true
  if (child?.unitId) return child.unitId === unitId
  return true
}

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

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function ChildPresenceCard({
  session,
  selected,
  onSelect,
  onChat,
  onCall,
  callDisabled,
}) {
  return (
    <Box className={`presenca-child-card ${selected ? 'is-selected' : ''}`}>
      <Box className="presenca-child-body">
        <Box className="presenca-id-row">
          <Box className="presenca-id-stack">
            <Box className="presenca-id-block">
              <span className="presenca-id-label">Criança</span>
              <span className="presenca-child-name">{session.childName}</span>
            </Box>
            <Box className="presenca-id-block">
              <span className="presenca-id-label">Responsável</span>
              <span className="presenca-child-guardian">
                {session.guardian || '—'}
              </span>
            </Box>
          </Box>
          <Box className="presenca-child-meta">
            <span className="presenca-chip">
              <LoginIcon fontSize="inherit" />
              {session.entryTime}
            </span>
            <span className="presenca-chip">
              <AccessTimeIcon fontSize="inherit" />
              {elapsedLabel(session.entryAt)}
            </span>
          </Box>
          <Box className="presenca-id-block is-actions">
            <Box className="presenca-actions-stack">
              <Box className="presenca-inline-actions">
                <Tooltip title="Chat com o responsável" arrow>
                  <IconButton
                    className="presenca-action-btn is-chat"
                    onClick={() => onChat(session)}
                    aria-label="Chat com o responsável"
                  >
                    <ChatIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Ligar / emergência" arrow>
                  <span>
                    <IconButton
                      className="presenca-action-btn is-call"
                      onClick={() => onCall(session)}
                      disabled={callDisabled}
                      aria-label="Ligar para o responsável"
                    >
                      <PhoneInTalkIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
              <Tooltip title="QR saída" arrow>
                <Button
                  className="presenca-action-btn is-qr"
                  onClick={() => onSelect(session)}
                  aria-label="QR saída"
                  startIcon={<QrCode2Icon fontSize="small" />}
                >
                  QR
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default function Presenca() {
  const {
    activeSessions,
    presentCount,
    maxChildren,
    atCapacity,
    remaining,
    pendingExit,
    exitPayload,
    checkIn,
    setExitTarget,
    clearExitTarget,
  } = usePresence()
  const navigate = useNavigate()
  const { pushNotification } = useAppNotifications()
  const { tenantId, unitId, user } = useAuth()
  const { childrenList } = useSampleData()
  const { openThread, chatPath } = useChat()
  const { startCall, isCalling } = useCallBridge()
  const [, setTick] = useState(0)
  const [scanOpen, setScanOpen] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [callChild, setCallChild] = useState(null)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!pendingExit) return
    const stillThere = activeSessions.some((s) => String(s.id) === String(pendingExit.sessionId))
    if (!stillThere) clearExitTarget()
  }, [activeSessions, pendingExit, clearExitTarget])

  const occupancyPct = maxChildren > 0
    ? Math.min(100, Math.round((presentCount / maxChildren) * 100))
    : 0

  const availableChildren = useMemo(() => {
    const activeIds = new Set(activeSessions.map((s) => String(s.childId)))
    const activeNames = new Set(activeSessions.map((s) => (s.childName || '').toLowerCase()))
    return (childrenList || []).filter((c) => {
      if (!unitMatch(c, unitId)) return false
      if (activeIds.has(String(c.id))) return false
      if (activeNames.has((c.name || '').toLowerCase())) return false
      return true
    })
  }, [childrenList, activeSessions, unitId])

  const sortedSessions = useMemo(
    () => [...activeSessions].sort((a, b) => String(a.childName).localeCompare(String(b.childName), 'pt-BR')),
    [activeSessions],
  )

  const registerEntry = (child) => {
    const result = checkIn({
      childId: child.id,
      childName: child.name,
      guardian: child.guardian || 'Responsável',
      unitId: child.unitId || unitId,
    })
    if (!result.success) {
      setFeedback({ ok: false, message: result.error })
      return
    }
    pushNotification({
      type: 'entry',
      title: 'Entrada registrada',
      message: `${result.session.childName} entrou às ${result.session.entryTime}.`,
      path: '/presenca',
      tenantId,
      unitId: unitId || null,
      forRoles: ['administrador', 'gerente', 'professor', 'responsavel'],
    })
    setFeedback({
      ok: true,
      message: `Entrada de ${result.session.childName} às ${result.session.entryTime}.`,
    })
    setScanOpen(false)
  }

  const handleSelectExit = (session) => {
    const result = setExitTarget(session, user?.name || 'Equipe')
    if (!result.success) {
      setFeedback({ ok: false, message: result.error })
      return
    }
    setFeedback(null)
  }

  const resolveChild = (session) => {
    const fromList = childrenList.find((c) => (
      String(c.id) === String(session.childId)
      || (c.name || '').toLowerCase() === String(session.childName || '').toLowerCase()
    ))
    return fromList || {
      id: session.childId,
      name: session.childName,
      guardian: session.guardian || 'Responsável',
    }
  }

  const handleChat = (session) => {
    const child = resolveChild(session)
    openThread({
      childId: child.id,
      id: child.id,
      name: child.name,
      guardian: child.guardian,
    })
    navigate(chatPath || '/chat')
  }

  const handleCall = (session) => {
    if (isCalling) return
    setCallChild(resolveChild(session))
  }

  const handleCallType = (kind) => {
    if (!callChild || isCalling) return
    const c = callChild
    setCallChild(null)
    startCall({
      childId: c.id,
      childName: c.name,
      guardianName: c.guardian || 'Responsável',
      kind,
    })
  }

  return (
    <Box className="page-container presenca-page">
      <Box className="presenca-hero panel-card">
        <Box className="presenca-hero-top">
          <Typography className="presenca-hero-title">Presença</Typography>
          <Box className={`presenca-live-badge ${atCapacity ? 'is-full' : ''}`}>
            <span className="presenca-live-dot" aria-hidden />
            {atCapacity ? 'Lotado' : 'Ao vivo'}
          </Box>
        </Box>

        <Box className="presenca-meter">
          <Box className="presenca-meter-head">
            <Typography className="presenca-meter-label">Ocupação</Typography>
            <Typography className="presenca-meter-value">
              {presentCount}
              <span>/{maxChildren}</span>
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={occupancyPct}
            className={`presenca-meter-bar ${atCapacity ? 'is-full' : occupancyPct >= 80 ? 'is-high' : ''}`}
          />
          <Box className="presenca-meter-foot">
            <span>{occupancyPct}% ocupado</span>
            <span>{remaining} vaga(s)</span>
          </Box>
        </Box>

        {atCapacity && (
          <Alert severity="warning" className="presenca-alert" sx={{ borderRadius: 2 }}>
            Lotação cheia — novas entradas bloqueadas.
          </Alert>
        )}
      </Box>

      {feedback && (
        <Alert
          severity={feedback.ok ? 'success' : 'warning'}
          icon={feedback.ok ? <CheckCircleIcon /> : undefined}
          className="presenca-alert"
          sx={{ borderRadius: 2, mb: 1.5 }}
          onClose={() => setFeedback(null)}
        >
          {feedback.message}
        </Alert>
      )}

      <Box className="presenca-block panel-card is-entry">
        <Box className="presenca-section-head">
          <span className="presenca-section-icon is-entry" aria-hidden>
            <LoginIcon fontSize="small" />
          </span>
          <Box className="presenca-section-grow">
            <Typography className="presenca-section-title">Entrada</Typography>
            <Typography className="presenca-section-sub">
              Leia o QR do responsável cadastrado
            </Typography>
          </Box>
          <span className="presenca-step">01</span>
        </Box>
        <Button
          fullWidth
          variant="contained"
          className="btn-orange-card presenca-primary-btn"
          disabled={atCapacity}
          startIcon={<QrCodeScannerIcon />}
          onClick={() => setScanOpen(true)}
        >
          Ler QR do responsável
        </Button>
      </Box>

      <Box className="presenca-block panel-card is-exit">
        <Box className="presenca-section-head">
          <span className="presenca-section-icon is-exit" aria-hidden>
            <LogoutIcon fontSize="small" />
          </span>
          <Box className="presenca-section-grow">
            <Typography className="presenca-section-title">Saída</Typography>
            <Typography className="presenca-section-sub">
              Toque na criança para gerar o QR do responsável
            </Typography>
          </Box>
          <span className="presenca-step">02</span>
        </Box>

        {pendingExit && exitPayload ? (
          <Box className="presenca-qr-panel">
            <Box className="presenca-qr-panel-head">
              <Box>
                <Typography className="presenca-qr-kicker">QR de saída ativo</Typography>
                <Typography className="presenca-exit-child">{pendingExit.childName}</Typography>
                <Typography className="presenca-exit-hint">
                  Mostre ao responsável · {pendingExit.guardian || 'cadastrado'}
                </Typography>
              </Box>
              <Button
                size="small"
                className="presenca-qr-close"
                startIcon={<CloseIcon />}
                onClick={clearExitTarget}
              >
                Fechar
              </Button>
            </Box>
            <Box className="presenca-exit-qr">
              <QRCodeSVG value={exitPayload} size={188} level="M" includeMargin />
            </Box>
            <Typography className="presenca-qr-foot">
              Aguardando leitura do responsável
            </Typography>
          </Box>
        ) : null}

        {sortedSessions.length === 0 ? (
          <Box className="presenca-empty-state">
            <GroupsEmptyIcon />
            <Typography className="presenca-empty">Nenhuma criança no parquinho agora.</Typography>
          </Box>
        ) : (
          <Box className="presenca-child-list">
            <Typography className="presenca-list-label">
              {sortedSessions.length} presente{sortedSessions.length === 1 ? '' : 's'}
            </Typography>
            {sortedSessions.map((s) => (
              <ChildPresenceCard
                key={s.id}
                session={s}
                selected={pendingExit && String(pendingExit.sessionId) === String(s.id)}
                onSelect={handleSelectExit}
                onChat={handleChat}
                onCall={handleCall}
                callDisabled={isCalling}
              />
            ))}
          </Box>
        )}
      </Box>

      <CallTypeDialog
        open={!!callChild}
        child={callChild}
        onClose={() => setCallChild(null)}
        onSelect={handleCallType}
      />

      <Dialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ className: 'presenca-dialog-paper' }}
      >
        <DialogTitle>Ler QR do responsável</DialogTitle>
        <DialogContent>
          <Typography className="presenca-dialog-hint">
            Escolha a criança para simular a leitura do QR do responsável.
          </Typography>
          {availableChildren.length === 0 ? (
            <Box className="presenca-empty-state is-compact">
              <Typography className="presenca-empty">Nenhuma criança disponível para entrada.</Typography>
            </Box>
          ) : (
            <Box className="presenca-pick-list">
              {availableChildren.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="presenca-pick-card"
                  disabled={atCapacity}
                  onClick={() => registerEntry(c)}
                >
                  <span className="presenca-child-avatar is-sm" aria-hidden>{initials(c.name)}</span>
                  <span className="presenca-pick-copy">
                    <span className="presenca-pick-name">{c.name}</span>
                    <span className="presenca-pick-meta">Resp. {c.guardian || '—'}</span>
                  </span>
                </button>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function GroupsEmptyIcon() {
  return (
    <span className="presenca-empty-icon" aria-hidden>
      <AccessTimeIcon />
    </span>
  )
}
