import React from 'react'
import { Box, Button, Typography } from '@mui/material'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import CloseIcon from '@mui/icons-material/Close'
import { useCallBridge } from '../../context/CallBridgeContext'

export default function ProfessorCallOverlay() {
  const {
    activeCall,
    isCalling,
    secondsLeft,
    maxAttempts,
    clearCall,
  } = useCallBridge()

  if (!activeCall) return null
  if (!isCalling && activeCall.status !== 'acknowledged' && activeCall.status !== 'failed') {
    return null
  }

  const attempt = activeCall.attempt || 1
  const done = activeCall.status === 'acknowledged' || activeCall.status === 'failed'
  const ok = activeCall.status === 'acknowledged'
  const isEmergency = activeCall.kind === 'emergency'

  return (
    <Box className={`professor-call-overlay ${done ? (ok ? 'is-ok' : 'is-failed') : 'is-ringing'} ${isEmergency ? 'is-emergency' : ''}`}>
      <Box className="professor-call-ring" aria-hidden />
      <Typography className="professor-call-kicker">
        {done
          ? (ok ? 'Chamada concluída' : 'Tentativas encerradas')
          : (isEmergency ? 'Emergência · chamando responsável' : 'Chamando responsável')}
      </Typography>
      <Typography className="professor-call-child">{activeCall.childName}</Typography>
      <Typography className="professor-call-guardian">
        {activeCall.guardianName}
      </Typography>

      {!done && (
        <>
          <Box className="professor-call-timer" aria-live="polite">
            <Typography className="professor-call-seconds">{secondsLeft}</Typography>
            <Typography className="professor-call-seconds-label">segundos</Typography>
          </Box>
          <Typography className="professor-call-attempt">
            Tentativa {attempt} de {maxAttempts}
          </Typography>
          <Typography className="professor-call-hint">
            Aguardando OK do responsável…
          </Typography>
        </>
      )}

      {done && (
        <Typography className="professor-call-result">
          {ok
            ? 'Responsável ciente do aviso.'
            : 'Sem retorno após 2 tentativas de 30 segundos.'}
        </Typography>
      )}

      <Box className="professor-call-actions">
        {done ? (
          <Button
            className="professor-call-btn"
            onClick={clearCall}
            startIcon={<CloseIcon />}
          >
            Fechar
          </Button>
        ) : (
          <Button
            className="professor-call-btn professor-call-btn--cancel"
            onClick={clearCall}
            startIcon={<PhoneInTalkIcon />}
          >
            Cancelar chamada
          </Button>
        )}
      </Box>
    </Box>
  )
}
