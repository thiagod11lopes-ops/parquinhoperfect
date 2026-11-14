import React, { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, MenuItem, Alert, Box, Typography, IconButton
} from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import CloseIcon from '@mui/icons-material/Close'
import { formatPhone, isValidPhone, PHONE_PLACEHOLDER } from '../../utils/phone'
import '../../styles/global.scss'

const STATUSES = ['Ativo', 'De Licença', 'Inativo']
const empty    = { name: '', email: '', phone: '', status: 'Ativo' }

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim().toLowerCase())
}

const getPhoneContainer = () => document.getElementById('phone-app-root') || document.body

const fieldSx = {
  '& .MuiInputBase-input': {
    color: '#111 !important',
    textShadow: 'none !important',
    WebkitTextFillColor: '#111',
  },
  '& .MuiInputLabel-root': {
    color: '#444 !important',
    textShadow: 'none !important',
  },
  '& .MuiFormHelperText-root': {
    textShadow: 'none !important',
  },
}

function getErrors(form) {
  const e = {}
  if (!form.name.trim())              e.name   = 'Nome é obrigatório'
  if (!form.email.trim())             e.email  = 'E-mail é obrigatório'
  else if (!isValidEmail(form.email)) e.email  = 'Informe um e-mail válido'
  if (!form.phone.trim())             e.phone  = 'Telefone é obrigatório'
  else if (!isValidPhone(form.phone)) e.phone  = `Use o formato: ${PHONE_PLACEHOLDER}`
  if (!form.status)                   e.status = 'Status é obrigatório'
  return e
}

export default function StaffForm({ open, onClose, onSave, initial }) {
  const [form, setForm]       = useState(empty)
  const [touched, setTouched] = useState({})
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setForm(initial
      ? {
          name: initial.name || '',
          email: initial.email || '',
          phone: formatPhone(initial.phone || ''),
          status: initial.status || 'Ativo',
          id: initial.id,
        }
      : empty)
    setTouched({})
    setSuccess(false)
  }, [initial, open])

  const errors  = getErrors(form)
  const isValid = Object.keys(errors).length === 0

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(p => ({
      ...p,
      [name]: name === 'phone' ? formatPhone(value) : value,
    }))
  }
  const handleBlur = (e) => setTouched(p => ({ ...p, [e.target.name]: true }))

  const handleSubmit = () => {
    setTouched({ name: true, email: true, phone: true, status: true })
    if (!isValid) return
    setSuccess(true)
    setTimeout(() => {
      onSave({
        ...(initial || {}),
        id: form.id || initial?.id,
        name: form.name,
        email: String(form.email || '').trim().toLowerCase(),
        phone: form.phone,
        status: form.status,
      })
    }, 600)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      container={getPhoneContainer}
      className="month-schedule-dialog child-form-dialog"
      PaperProps={{
        className: 'month-schedule-folder',
        sx: {
          bgcolor: '#fff8f1',
          backgroundImage: 'none',
          color: '#111',
          borderRadius: 0,
          m: 0,
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
        },
      }}
      sx={{
        position: 'absolute',
        '& .MuiDialog-container': {
          alignItems: 'stretch',
        },
      }}
    >
      <DialogTitle className="month-schedule-folder-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, pr: 6 }}>
          <Box className="month-folder-icon-wrap">
            <PeopleIcon />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#111', textShadow: 'none', lineHeight: 1.2 }}>
              {initial ? 'Editar professor da equipe' : 'Adicionar professor da equipe'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#555', textShadow: 'none', display: 'block' }}>
              Inclua o e-mail para vincular o professor à unidade no login
            </Typography>
          </Box>
        </Box>

        <IconButton
          className="month-schedule-close-btn"
          aria-label="Fechar"
          onClick={onClose}
          edge="end"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers className="month-schedule-folder-body child-form-dialog-body">
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {initial ? 'Professor atualizado!' : 'Professor adicionado!'}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <TextField fullWidth label="Nome" name="name" value={form.name}
              onChange={handleChange} onBlur={handleBlur}
              error={touched.name && !!errors.name} helperText={touched.name ? errors.name : ' '}
              sx={fieldSx} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="E-mail (login)" name="email" type="email" value={form.email}
              onChange={handleChange} onBlur={handleBlur}
              error={touched.email && !!errors.email} helperText={touched.email ? errors.email : 'Usado para vincular à unidade'}
              sx={fieldSx} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Telefone" name="phone" value={form.phone}
              onChange={handleChange} onBlur={handleBlur}
              error={touched.phone && !!errors.phone} helperText={touched.phone ? errors.phone : ' '}
              placeholder={PHONE_PLACEHOLDER}
              inputProps={{ inputMode: 'numeric', maxLength: 17 }}
              sx={fieldSx} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth select label="Status" name="status" value={form.status}
              onChange={handleChange} onBlur={handleBlur}
              error={touched.status && !!errors.status} helperText={touched.status ? errors.status : ' '}
              sx={fieldSx}
              SelectProps={{
                MenuProps: {
                  disablePortal: true,
                  PaperProps: {
                    className: 'staff-select-menu',
                    sx: { maxHeight: 220, bgcolor: '#fff', color: '#111' },
                  },
                },
              }}
            >
              {STATUSES.map(s => (
                <MenuItem key={s} value={s} sx={{ color: '#111 !important', textShadow: 'none !important' }}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions className="child-form-dialog-actions">
        <Button onClick={onClose} variant="outlined">Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={success}>
          {initial ? 'Salvar alterações' : 'Adicionar professor'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
