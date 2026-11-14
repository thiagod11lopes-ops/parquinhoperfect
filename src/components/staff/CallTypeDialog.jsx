import React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Stack, Box,
} from '@mui/material'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import CrisisAlertIcon from '@mui/icons-material/CrisisAlert'
import CloseIcon from '@mui/icons-material/Close'

const getPhoneContainer = () => document.getElementById('phone-app-root') || document.body

export default function CallTypeDialog({ open, child, onClose, onSelect }) {
  if (!child) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      container={getPhoneContainer}
      PaperProps={{ className: 'call-type-dialog' }}
    >
      <DialogTitle className="call-type-dialog-title">
        Chamar responsável
      </DialogTitle>
      <DialogContent>
        <Typography className="call-type-dialog-child">
          {child.name}
        </Typography>
        <Typography className="call-type-dialog-guardian">
          {child.guardian || 'Responsável'}
        </Typography>
        <Typography className="call-type-dialog-hint">
          Escolha o tipo de chamada
        </Typography>

        <Stack spacing={1.25} sx={{ mt: 2 }}>
          <Button
            fullWidth
            className="call-type-btn call-type-btn--normal"
            startIcon={<PhoneInTalkIcon />}
            onClick={() => onSelect('normal')}
          >
            <Box className="call-type-btn-copy">
              <span className="call-type-btn-title">Chamada comum</span>
              <span className="call-type-btn-sub">Aviso padrão do parquinho</span>
            </Box>
          </Button>
          <Button
            fullWidth
            className="call-type-btn call-type-btn--emergency"
            startIcon={<CrisisAlertIcon />}
            onClick={() => onSelect('emergency')}
          >
            <Box className="call-type-btn-copy">
              <span className="call-type-btn-title">Chamada de emergência</span>
              <span className="call-type-btn-sub">SOS — presença imediata</span>
            </Box>
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose} startIcon={<CloseIcon />} sx={{ fontWeight: 700 }}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
