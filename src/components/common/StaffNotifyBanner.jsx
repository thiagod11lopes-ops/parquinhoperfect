import React from 'react'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useAuth } from '../../context/AuthContext'
import { useStaffNotify } from '../../context/StaffNotifyContext'

export default function StaffNotifyBanner() {
  const { isProfessor, isGerente } = useAuth()
  const { notifications, markRead, dismissNotification } = useStaffNotify()

  if (!isProfessor && !isGerente) return null

  const latestUnread = notifications.find(
    n => !n.read && (n.type === 'guardian-ack' || n.type === 'no-response')
  )
  if (!latestUnread) return null

  const isAck = latestUnread.type === 'guardian-ack'

  return (
    <Box className="staff-notify-banner">
      <Alert
        severity={isAck ? 'success' : 'warning'}
        icon={isAck ? <CheckCircleOutlineIcon fontSize="inherit" /> : <WarningAmberIcon fontSize="inherit" />}
        className="staff-notify-alert"
        action={(
          <Stack direction="row" spacing={0.5}>
            <Button
              color="inherit"
              size="small"
              onClick={() => markRead(latestUnread.id)}
              sx={{ fontWeight: 800 }}
            >
              OK
            </Button>
            <Button
              color="inherit"
              size="small"
              onClick={() => dismissNotification(latestUnread.id)}
              sx={{ fontWeight: 700 }}
            >
              Fechar
            </Button>
          </Stack>
        )}
      >
        <Typography className="staff-notify-title">{latestUnread.title}</Typography>
        <Typography className="staff-notify-msg">{latestUnread.message}</Typography>
        <Typography className="staff-notify-time">{latestUnread.time}</Typography>
      </Alert>
    </Box>
  )
}
