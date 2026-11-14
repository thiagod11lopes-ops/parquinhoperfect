import React from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import { useGuardianSession } from '../../context/GuardianSessionContext'
import '../../styles/global.scss'

export default function ResponsavelAlertas() {
  const { alerts, simulateIncomingCall, markSessionEndingSoon } = useGuardianSession()

  return (
    <Box className="page-container guardian-page">
      <Box className="page-header">
        <Typography variant="body2" fontWeight={700}>Alertas</Typography>
      </Box>

      <Stack spacing={1} sx={{ mb: 2 }}>
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
          startIcon={<NotificationsActiveIcon />}
          onClick={markSessionEndingSoon}
        >
          Simular aviso de fim de sessão
        </Button>
      </Stack>

      {alerts.length === 0 ? (
        <Box className="guardian-empty panel-card">
          <Typography>Nenhum alerta ainda.</Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {alerts.map(alert => (
            <Box key={alert.id} className="guardian-alert-row">
              <Typography className="guardian-alert-time">{alert.time}</Typography>
              <Typography className="guardian-alert-msg">{alert.message}</Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  )
}
