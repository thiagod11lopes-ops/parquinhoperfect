import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Button, Stack, TextField, MenuItem, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import EventNoteIcon from '@mui/icons-material/EventNote'
import CloseIcon from '@mui/icons-material/Close'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import { useSampleData } from '../../context/SampleDataContext'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import ChildActions from '../Children/ChildActions'
import '../../styles/global.scss'

const DAYS = ['Diário', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const DAY_ORDER = {
  Diário: 0,
  'Segunda-feira': 1,
  'Terça-feira': 2,
  'Quarta-feira': 3,
  'Quinta-feira': 4,
  'Sexta-feira': 5,
  Sábado: 6,
  Domingo: 7,
}

const empty = {
  title: '',
  description: '',
  day: '',
  startTime: '',
  endTime: '',
  professor: '',
}

const getPhoneContainer = () => document.getElementById('phone-app-root') || document.body

function timeToMinutes(t) {
  if (!t || typeof t !== 'string') return 0
  const [h, m] = t.split(':').map(Number)
  if (!Number.isFinite(h)) return 0
  return h * 60 + (Number.isFinite(m) ? m : 0)
}

function normalizeActivity(a = {}) {
  const startTime = a.startTime || a.time || ''
  const endTime = a.endTime || ''
  return {
    ...a,
    startTime,
    endTime,
    time: startTime,
    professor: a.professor || '',
  }
}

function getErrors(f) {
  const e = {}
  if (!f.title.trim()) e.title = 'Nome da atividade é obrigatório'
  if (!f.day) e.day = 'Dia é obrigatório'
  if (!f.startTime) e.startTime = 'Início é obrigatório'
  if (!f.endTime) e.endTime = 'Fim é obrigatório'
  if (f.startTime && f.endTime && timeToMinutes(f.endTime) <= timeToMinutes(f.startTime)) {
    e.endTime = 'O fim deve ser depois do início'
  }
  if (!f.professor.trim()) e.professor = 'Professor é obrigatório'
  return e
}

export default function Activities() {
  const { activitiesList, setActivitiesList, staffList } = useSampleData()
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(empty)
  const [touched, setTouched] = useState({})
  const [deleteId, setDeleteId] = useState(null)
  const [success, setSuccess] = useState(false)
  const [filterDay, setFilterDay] = useState('Todos')

  const professors = useMemo(() => {
    const fromStaff = (staffList || [])
      .filter((s) => (s.status || 'Ativo') === 'Ativo')
      .map((s) => s.name)
      .filter(Boolean)
    const fromActivities = (activitiesList || []).map((a) => a.professor).filter(Boolean)
    return [...new Set([...fromStaff, ...fromActivities])].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [staffList, activitiesList])

  const agenda = useMemo(() => {
    const list = (activitiesList || []).map(normalizeActivity)
    const filtered = filterDay === 'Todos'
      ? list
      : list.filter((a) => a.day === filterDay)
    return [...filtered].sort((a, b) => {
      const dayDiff = (DAY_ORDER[a.day] ?? 99) - (DAY_ORDER[b.day] ?? 99)
      if (dayDiff !== 0) return dayDiff
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    })
  }, [activitiesList, filterDay])

  const openAdd = () => {
    setEditItem(null)
    setForm(empty)
    setTouched({})
    setSuccess(false)
    setFormOpen(true)
  }

  const openEdit = (a) => {
    const item = normalizeActivity(a)
    setEditItem(item)
    setForm({
      title: item.title || '',
      description: item.description || '',
      day: item.day || '',
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      professor: item.professor || '',
    })
    setTouched({})
    setSuccess(false)
    setFormOpen(true)
  }

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  const handleBlur = (e) => setTouched((p) => ({ ...p, [e.target.name]: true }))

  const errors = getErrors(form)
  const isValid = Object.keys(errors).length === 0

  const handleSave = () => {
    setTouched({
      title: true, day: true, startTime: true, endTime: true, professor: true,
    })
    if (!isValid) return
    setSuccess(true)
    setTimeout(() => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        day: form.day,
        startTime: form.startTime,
        endTime: form.endTime,
        time: form.startTime,
        professor: form.professor.trim(),
      }
      if (editItem) {
        setActivitiesList((p) => p.map((a) => (
          a.id === editItem.id ? { ...a, ...payload, id: editItem.id } : a
        )))
      } else {
        setActivitiesList((p) => [...p, { ...payload, id: Date.now() }])
      }
      setFormOpen(false)
    }, 500)
  }

  const selectMenu = {
    MenuProps: {
      disablePortal: true,
      PaperProps: { className: 'responsavel-form-menu' },
    },
  }

  return (
    <Box className="page-container activities-page">
      <Box className="page-header">
        <Box>
          <Typography variant="body2" fontWeight={700}>
            {agenda.length} atividade(s) na agenda
          </Typography>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: 'var(--app-font-color, #fff)',
              textShadow: '0 1px 2px #000',
              fontWeight: 700,
              opacity: 0.9,
            }}
          >
            Início, fim e professor responsáveis
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openAdd}
          className="btn-orange-card"
        >
          Adicionar atividade
        </Button>
      </Box>

      <Box className="activities-filters panel-card">
        <Typography className="activities-filters-label">Filtrar por dia</Typography>
        <Box className="activities-filter-chips">
          {['Todos', ...DAYS].map((d) => (
            <button
              key={d}
              type="button"
              className={`activities-filter-chip ${filterDay === d ? 'is-active' : ''}`}
              onClick={() => setFilterDay(d)}
            >
              {d === 'Todos' ? 'Toda a agenda' : d.replace('-feira', '')}
            </button>
          ))}
        </Box>
      </Box>

      {agenda.length === 0 ? (
        <Box className="activities-empty panel-card">
          <EventNoteIcon />
          <Typography>Nenhuma atividade na agenda.</Typography>
          <Typography variant="caption">Adicione uma atividade ou ative os dados de exemplo.</Typography>
        </Box>
      ) : (
        <Stack spacing={1} className="activities-agenda">
          {agenda.map((a) => (
            <Box key={a.id} className="activity-card panel-card">
              <Box className="activity-card-top">
                <Box className="activity-card-copy">
                  <Typography className="activity-day-label">{a.day}</Typography>
                  <Typography className="activity-title">{a.title}</Typography>
                  {a.description ? (
                    <Typography className="activity-desc">{a.description}</Typography>
                  ) : null}
                </Box>
                <ChildActions onEdit={() => openEdit(a)} onDelete={() => setDeleteId(a.id)} />
              </Box>
              <Box className="activity-card-meta">
                <span className="activity-meta-chip">
                  <AccessTimeIcon fontSize="inherit" />
                  {a.startTime || '—'}
                  {a.endTime ? ` – ${a.endTime}` : ''}
                </span>
                <span className="activity-meta-chip">
                  <PersonOutlineIcon fontSize="inherit" />
                  {a.professor || 'Sem professor'}
                </span>
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        fullScreen
        container={getPhoneContainer}
        className="child-form-dialog month-schedule-dialog"
        PaperProps={{ className: 'child-form-paper unidades-page' }}
      >
        <Box className="child-form-bg" aria-hidden>
          <Box className="child-form-bg-image" />
          <Box className="child-form-bg-wash" />
        </Box>

        <DialogTitle className="child-form-title">
          <Box className="responsaveis-create-head">
            <Typography className="info-section-title">
              {editItem ? 'Editar atividade' : 'Nova atividade'}
            </Typography>
            <IconButton
              size="small"
              className="responsavel-cancel-edit"
              onClick={() => setFormOpen(false)}
              aria-label="Fechar"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent className="child-form-body">
          {success && (
            <Alert severity="success" sx={{ mb: 1.25, borderRadius: 2 }}>
              {editItem ? 'Atividade atualizada!' : 'Atividade adicionada!'}
            </Alert>
          )}

          <Stack spacing={1} className="child-form-fields panel-card unidade-create">
            <TextField
              size="small"
              fullWidth
              label="Nome da atividade"
              name="title"
              value={form.title}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.title && !!errors.title}
              helperText={touched.title ? errors.title : ' '}
              className="unidade-field responsavel-form-field"
            />
            <TextField
              size="small"
              fullWidth
              label="Descrição (opcional)"
              name="description"
              value={form.description}
              onChange={handleChange}
              multiline
              minRows={2}
              className="unidade-field responsavel-form-field"
            />
            <TextField
              select
              size="small"
              fullWidth
              label="Dia"
              name="day"
              value={form.day}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.day && !!errors.day}
              helperText={touched.day ? errors.day : ' '}
              className="unidade-field responsavel-form-field"
              SelectProps={selectMenu}
            >
              <MenuItem value="">Selecione</MenuItem>
              {DAYS.map((d) => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              fullWidth
              label="Início"
              name="startTime"
              type="time"
              value={form.startTime}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.startTime && !!errors.startTime}
              helperText={touched.startTime ? errors.startTime : ' '}
              InputLabelProps={{ shrink: true }}
              className="unidade-field responsavel-form-field"
            />
            <TextField
              size="small"
              fullWidth
              label="Fim"
              name="endTime"
              type="time"
              value={form.endTime}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.endTime && !!errors.endTime}
              helperText={touched.endTime ? errors.endTime : ' '}
              InputLabelProps={{ shrink: true }}
              className="unidade-field responsavel-form-field"
            />
            {professors.length > 0 ? (
              <TextField
                select
                size="small"
                fullWidth
                label="Professor"
                name="professor"
                value={form.professor}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.professor && !!errors.professor}
                helperText={touched.professor ? errors.professor : ' '}
                className="unidade-field responsavel-form-field"
                SelectProps={selectMenu}
              >
                <MenuItem value="">Selecione</MenuItem>
                {professors.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                size="small"
                fullWidth
                label="Nome do professor"
                name="professor"
                value={form.professor}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.professor && !!errors.professor}
                helperText={touched.professor ? errors.professor : 'Digite o nome do professor'}
                className="unidade-field responsavel-form-field"
              />
            )}
          </Stack>
        </DialogContent>

        <DialogActions className="child-form-actions">
          <Button
            fullWidth
            className="btn-orange-card"
            startIcon={editItem ? <EditRoundedIcon /> : <AddIcon />}
            onClick={handleSave}
            disabled={success}
          >
            {editItem ? 'Salvar alterações' : 'Adicionar à agenda'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Excluir atividade"
        message="Tem certeza de que deseja remover esta atividade da agenda?"
        onConfirm={() => {
          setActivitiesList((p) => p.filter((a) => a.id !== deleteId))
          setDeleteId(null)
        }}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  )
}
