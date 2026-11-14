import React, { useEffect } from 'react'
import { Box, Button, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useGuardianSession } from '../../context/GuardianSessionContext'
import { startCallRingtone, stopCallRingtone } from '../../utils/callRingtone'

const EMERGENCY_MESSAGE =
  'Sua presença é necessária imediatamente no Parquinho Perfect Body.'

export default function IncomingCallOverlay() {
  const { activeCall, acknowledgeCall } = useGuardianSession()

  useEffect(() => {
    if (!activeCall || activeCall.status !== 'ringing') {
      stopCallRingtone()
      return undefined
    }

    startCallRingtone()
    return () => stopCallRingtone()
  }, [activeCall?.id, activeCall?.ringToken, activeCall?.status, activeCall?.attempt])

  if (!activeCall || activeCall.status !== 'ringing') return null

  const isEmergency = activeCall.kind === 'emergency'

  const handleOk = () => {
    stopCallRingtone()
    acknowledgeCall()
  }

  return (
    <Box className={`guardian-call-overlay is-ringing ${isEmergency ? 'is-emergency' : ''}`}>
      <Box className="guardian-call-pulse" aria-hidden />

      {isEmergency ? (
        <>
          <Typography className="guardian-call-sos">SOS EMERGENCIA</Typography>
          <Typography className="guardian-call-child">{activeCall.childName}</Typography>
          <Typography className="guardian-call-message guardian-call-message--emergency">
            {EMERGENCY_MESSAGE}
          </Typography>
        </>
      ) : (
        <>
          <Typography className="guardian-call-label">Chamada do Parquinho</Typography>
          <Typography className="guardian-call-child">{activeCall.childName}</Typography>
          <Typography className="guardian-call-message">{activeCall.message}</Typography>
        </>
      )}

      <Box className="guardian-call-actions">
        <Button
          className={`guardian-call-btn guardian-call-btn--ok ${isEmergency ? 'guardian-call-btn--emergency-ok' : ''}`}
          onClick={handleOk}
          startIcon={<CheckCircleIcon />}
        >
          OK
        </Button>
      </Box>
    </Box>
  )
}
