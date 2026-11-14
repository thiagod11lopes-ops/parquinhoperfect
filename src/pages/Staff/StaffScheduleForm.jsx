import React, { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, MenuItem, Alert
} from '@mui/material'
import '../../styles/global.scss'

const empty = { staffId: '', date: '', startTime: '', endTime: '' }

const getPhoneContainer = () => document.getElementById('phone-app-root') || document.body

const selectMenuProps = {
  disablePortal: true,
  PaperProps: {
    className: 'staff-select-menu',
    sx: {
      maxHeight: 240,
      bgcolor: '#fff',
      backgroundImage: 'none',
      color: '#111',
      zIndex: 1400,
    },
  },
  MenuListProps: {
    sx: { py: 0.5 },
  },
}

function getErrors(form) {
  const e = {}
  if (!form.staffId) e.staffId = 'Selecione um professor'
  if (!form.date) e.date = 'Data é obrigatória'
  if (!form.startTime) e.startTime = 'Hora de início é obrigatória'
  if (!form.endTime) e.endTime = 'Hora de fim é obrigatória'
  else if (form.startTime && form.endTime && form.endTime <= form.startTime) {
    e.endTime = 'A hora de fim deve ser depois do início'
  }
  return e
}

export default function StaffScheduleForm({ open, onClose, onSave, staffList, initial }) {
  const [form, setForm] = useState(empty)
  const [touched, setTouched] = useState({})
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setForm(initial
      ? {
          staffId: String(initial.staffId),
          date: initial.date,
          startTime: initial.startTime,
          endTime: initial.endTime,
        }
      : empty)
    setTouched({})
    setSuccess(false)
  }, [initial, open])

  const errors = getErrors(form)
  const isValid = Object.keys(errors).length === 0

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  const handleBlur = (e) => setTouched(p => ({ ...p, [e.target.name]: true }))

  const handleSave = () => {
    setTouched({ staffId: true, date: true, startTime: true, endTime: true })
    if (!isValid) return

    const member = staffList.find(s => String(s.id) === String(form.staffId))
    setSuccess(true)
    setTimeout(() => {
      onSave({
        id: initial?.id || Date.now(),
        staffId: Number(form.staffId),
        staffName: member?.name || '—',
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
      })
      onClose()
    }, 400)
  }

  const selectedMember = staffList.find(s => String(s.id) === String(form.staffId))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      container={getPhoneContainer}
      className="staff-schedule-dialog"
      PaperProps={{
        sx: {
          bgcolor: '#fff',
          backgroundImage: 'none',
          color: '#111',
        },
      }}
    >
      <DialogTitle sx={{ color: '#111', textShadow: 'none' }}>
        {initial ? 'Editar turno' : 'Novo turno do Parquinho'}
      </DialogTitle>
      <DialogContent dividers>
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {initial ? 'Turno atualizado!' : 'Turno adicionado!'}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              select
              label="Professor da equipe"
              name="staffId"
              value={form.staffId}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.staffId && !!errors.staffId}
              helperText={touched.staffId ? errors.staffId : ' '}
              disabled={!staffList.length}
              SelectProps={{
                MenuProps: selectMenuProps,
                renderValue: (value) => {
                  if (!value) return ''
                  const member = staffList.find(s => String(s.id) === String(value))
                  return member?.name || selectedMember?.name || ''
                },
              }}
              sx={{
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
                  color: '#666 !important',
                  textShadow: 'none !important',
                },
              }}
            >
              {staffList.map(s => (
                <MenuItem
                  key={s.id}
                  value={String(s.id)}
                  sx={{
                    color: '#111 !important',
                    textShadow: 'none !important',
                    fontWeight: 700,
                    whiteSpace: 'normal',
                    lineHeight: 1.3,
                    py: 1.25,
                  }}
                >
                  {s.name}
                  {s.role ? ` — ${s.role}` : ''}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth label="Data" name="date" type="date" value={form.date}
              onChange={handleChange} onBlur={handleBlur}
              error={touched.date && !!errors.date}
              helperText={touched.date ? errors.date : ' '}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiInputBase-input': { color: '#111 !important', textShadow: 'none !important', WebkitTextFillColor: '#111' },
                '& .MuiInputLabel-root': { color: '#444 !important', textShadow: 'none !important' },
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth label="Início" name="startTime" type="time" value={form.startTime}
              onChange={handleChange} onBlur={handleBlur}
              error={touched.startTime && !!errors.startTime}
              helperText={touched.startTime ? errors.startTime : ' '}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiInputBase-input': { color: '#111 !important', textShadow: 'none !important', WebkitTextFillColor: '#111' },
                '& .MuiInputLabel-root': { color: '#444 !important', textShadow: 'none !important' },
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth label="Fim" name="endTime" type="time" value={form.endTime}
              onChange={handleChange} onBlur={handleBlur}
              error={touched.endTime && !!errors.endTime}
              helperText={touched.endTime ? errors.endTime : ' '}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiInputBase-input': { color: '#111 !important', textShadow: 'none !important', WebkitTextFillColor: '#111' },
                '& .MuiInputLabel-root': { color: '#444 !important', textShadow: 'none !important' },
              }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={success || !staffList.length}>
          {initial ? 'Salvar' : 'Adicionar à escala'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
