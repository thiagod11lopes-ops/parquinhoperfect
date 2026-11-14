import React, { useEffect, useState } from 'react'
import {
  Box, Typography, Stack, TextField, Button, Switch, FormControlLabel, Collapse, IconButton,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import ScheduleIcon from '@mui/icons-material/Schedule'
import GroupsIcon from '@mui/icons-material/Groups'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useAuth } from '../../context/AuthContext'
import {
  useParkSettings,
  WEEK_DAYS,
  DEFAULT_INTERVAL,
  MAX_INTERVALS_PER_DAY,
  normalizeDay,
  formatDayHours,
} from '../../context/ParkSettingsContext'
import '../../styles/global.scss'

function HoursSectionToggle({ expanded, onToggle }) {
  return (
    <button
      type="button"
      className={`info-expand-btn ${expanded ? 'is-open' : ''}`}
      onClick={onToggle}
      aria-expanded={expanded}
    >
      <Box className="info-section-head info-expand-head">
        <ScheduleIcon fontSize="small" />
        <Typography className="info-section-title">Horário de funcionamento</Typography>
      </Box>
      <ExpandMoreIcon className="info-expand-icon" />
    </button>
  )
}

function DayEditor({
  label,
  day,
  expanded,
  onToggle,
  onSetClosed,
  onUpdateInterval,
  onAddInterval,
  onRemoveInterval,
}) {
  const intervals = day.intervals || []
  const canAdd = !day.closed && intervals.length < MAX_INTERVALS_PER_DAY

  return (
    <Box className={`info-day-card ${expanded ? 'is-open' : ''}`}>
      <button
        type="button"
        className="info-day-toggle"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <Box className="info-day-toggle-copy">
          <Typography className="info-day-label">{label}</Typography>
          <Typography className="info-day-summary">{formatDayHours(day)}</Typography>
        </Box>
        <ExpandMoreIcon className={`info-day-chevron ${expanded ? 'is-open' : ''}`} />
      </button>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box className="info-day-fields">
          <FormControlLabel
            className="info-closed-switch"
            control={(
              <Switch
                size="small"
                checked={!day.closed}
                onChange={(e) => onSetClosed(!e.target.checked)}
                color="warning"
              />
            )}
            label={day.closed ? 'Fechado neste dia' : 'Aberto neste dia'}
          />

          {!day.closed && (
            <Stack spacing={1.1} className="info-intervals">
              {intervals.map((interval, index) => (
                <Box key={`interval-${index}`} className="info-interval-row">
                  <Typography className="info-interval-label">
                    Intervalo {index + 1}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      label="Abre"
                      type="time"
                      size="small"
                      value={interval.open || '07:00'}
                      onChange={(e) => onUpdateInterval(index, { open: e.target.value || '07:00' })}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ step: 300 }}
                      fullWidth
                      className="info-time-field"
                    />
                    <TextField
                      label="Fecha"
                      type="time"
                      size="small"
                      value={interval.close || '19:00'}
                      onChange={(e) => onUpdateInterval(index, { close: e.target.value || '19:00' })}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ step: 300 }}
                      fullWidth
                      className="info-time-field"
                    />
                    {intervals.length > 1 && (
                      <IconButton
                        className="info-remove-interval"
                        size="small"
                        onClick={() => onRemoveInterval(index)}
                        aria-label={`Remover intervalo ${index + 1}`}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </Box>
              ))}

              <button
                type="button"
                className={`info-plus-chip ${!canAdd ? 'is-disabled' : ''}`}
                onClick={onAddInterval}
                disabled={!canAdd}
              >
                <span className="info-plus-chip-icon"><AddRoundedIcon /></span>
                <span>Novo intervalo</span>
              </button>
            </Stack>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}

export default function Informacoes() {
  const { isGerente, isResponsavel, unitName, isAdmin } = useAuth()
  const { hours, generalInfo, maxChildren, setMaxChildren, saveParkInfo } = useParkSettings()
  const [draftHours, setDraftHours] = useState(hours)
  const [draftInfo, setDraftInfo] = useState(generalInfo)
  const [draftMax, setDraftMax] = useState(String(maxChildren))
  const [saved, setSaved] = useState(false)
  const [hoursOpen, setHoursOpen] = useState(false)
  const [openDay, setOpenDay] = useState(null)

  useEffect(() => {
    setDraftHours(hours)
    setDraftInfo(generalInfo)
    setDraftMax(String(maxChildren))
  }, [hours, generalInfo, maxChildren])

  const setDay = (key, updater) => {
    setDraftHours((prev) => {
      const current = normalizeDay(prev[key])
      const next = typeof updater === 'function' ? updater(current) : updater
      return {
        ...prev,
        [key]: normalizeDay(next),
      }
    })
  }

  const toggleDay = (key) => {
    setOpenDay((current) => (current === key ? null : key))
  }

  const handleSave = () => {
    saveParkInfo(draftHours, draftInfo)
    const nextMax = setMaxChildren(draftMax)
    setDraftMax(String(nextMax))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  if (!isGerente) {
    return (
      <Box className="page-container info-page">
        <Box className="page-header">
          <Typography variant="body2" fontWeight={700}>
            Informações do parquinho
          </Typography>
          {unitName && (
            <Typography variant="caption" sx={{ color: 'var(--app-font-color, #fff)', opacity: 0.9 }}>
              Unidade: {unitName}
            </Typography>
          )}
        </Box>

        {isResponsavel && (
          <Box className="info-notepad info-general-top">
            <Box className="info-notepad-binding" aria-hidden />
            <Box className="info-notepad-sheet">
              <Typography className="info-notepad-title">Informações gerais</Typography>
              <Typography className={`info-notepad-body ${generalInfo?.trim() ? '' : 'is-empty'}`}>
                {generalInfo?.trim() || 'Nenhuma informação publicada pelo gerente.'}
              </Typography>
            </Box>
          </Box>
        )}

        <Box className="info-section panel-card" sx={{ mt: isResponsavel ? 2 : 0 }}>
          <HoursSectionToggle
            expanded={hoursOpen}
            onToggle={() => setHoursOpen((v) => !v)}
          />
          <Collapse in={hoursOpen} timeout="auto" unmountOnExit>
            <Stack spacing={1} className="info-hours-list" sx={{ mt: 1 }}>
              {WEEK_DAYS.map(({ key, label }) => (
                <Box key={key} className="info-hours-row">
                  <Typography className="info-hours-day">{label}</Typography>
                  <Typography className="info-hours-value">
                    {formatDayHours(hours[key])}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Collapse>
          {!hoursOpen && (
            <Typography className="info-expand-hint">
              Toque para ver o horário de cada dia da semana
            </Typography>
          )}
        </Box>

        {!isResponsavel && (
          <>
            <Box className="info-section panel-card" sx={{ mt: 2 }}>
              <Box className="info-section-head">
                <GroupsIcon fontSize="small" />
                <Typography className="info-section-title">Lotação máxima</Typography>
              </Box>
              <Typography className="info-capacity-value">{maxChildren} crianças</Typography>
              <Typography className="info-capacity-hint">
                Definido pelo gerente do parquinho
              </Typography>
            </Box>

            <Box className="info-notepad" sx={{ mt: 2 }}>
              <Box className="info-notepad-binding" aria-hidden />
              <Box className="info-notepad-sheet">
                <Typography className="info-notepad-title">Informações gerais</Typography>
                <Typography className={`info-notepad-body ${generalInfo?.trim() ? '' : 'is-empty'}`}>
                  {generalInfo?.trim() || 'Nenhuma informação publicada pelo gerente.'}
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </Box>
    )
  }

  return (
    <Box className="page-container info-page">
      <Box className="page-header">
        <Typography variant="body2" fontWeight={700}>
          Informações do parquinho
        </Typography>
        <Typography variant="caption" sx={{ color: 'var(--app-font-color, #fff)', opacity: 0.9 }}>
          {unitName
            ? `Unidade: ${unitName}${isAdmin ? ' · editando esta unidade' : ''}`
            : 'Visível para professores e responsáveis'}
        </Typography>
      </Box>

      <Box className="info-section panel-card">
        <HoursSectionToggle
          expanded={hoursOpen}
          onToggle={() => {
            setHoursOpen((v) => !v)
            if (hoursOpen) setOpenDay(null)
          }}
        />
        <Collapse in={hoursOpen} timeout="auto" unmountOnExit>
          <Typography className="info-expand-hint" sx={{ mt: 1, mb: 1 }}>
            Toque no dia para editar · use + para adicionar intervalos
          </Typography>
          <Stack spacing={1} className="info-hours-edit">
            {WEEK_DAYS.map(({ key, label }) => {
              const day = normalizeDay(draftHours[key])
              return (
                <DayEditor
                  key={key}
                  label={label}
                  day={day}
                  expanded={openDay === key}
                  onToggle={() => toggleDay(key)}
                  onSetClosed={(closed) => setDay(key, (current) => ({ ...current, closed }))}
                  onUpdateInterval={(index, patch) => setDay(key, (current) => ({
                    ...current,
                    intervals: current.intervals.map((item, i) => (
                      i === index ? { ...item, ...patch } : item
                    )),
                  }))}
                  onAddInterval={() => setDay(key, (current) => {
                    if (current.intervals.length >= MAX_INTERVALS_PER_DAY) return current
                    const last = current.intervals[current.intervals.length - 1]
                    return {
                      ...current,
                      closed: false,
                      intervals: [
                        ...current.intervals,
                        {
                          open: last?.close || DEFAULT_INTERVAL.open,
                          close: '19:00',
                        },
                      ],
                    }
                  })}
                  onRemoveInterval={(index) => setDay(key, (current) => ({
                    ...current,
                    intervals: current.intervals.length <= 1
                      ? current.intervals
                      : current.intervals.filter((_, i) => i !== index),
                  }))}
                />
              )
            })}
          </Stack>
        </Collapse>
      </Box>

      <Box className="info-section panel-card" sx={{ mt: 2 }}>
        <Box className="info-section-head">
          <GroupsIcon fontSize="small" />
          <Typography className="info-section-title">Lotação máxima</Typography>
        </Box>
        {unitName && (
          <Typography className="info-capacity-hint" sx={{ mb: 1 }}>
            Alterando vagas da unidade <strong>{unitName}</strong>
          </Typography>
        )}
        <TextField
          size="small"
          type="number"
          label="Máximo de crianças"
          value={draftMax}
          onChange={(e) => setDraftMax(e.target.value)}
          inputProps={{ min: 1, max: 200 }}
          fullWidth
          className="info-time-field info-capacity-field"
        />
      </Box>

      <Box className="info-notepad is-editable" sx={{ mt: 2 }}>
        <Box className="info-notepad-binding" aria-hidden />
        <Box className="info-notepad-sheet">
          <Typography className="info-notepad-title">Informações gerais</Typography>
          <TextField
            fullWidth
            multiline
            minRows={6}
            value={draftInfo}
            onChange={(e) => setDraftInfo(e.target.value)}
            placeholder="Avisos, regras, o que trazer, contatos..."
            className="info-notepad-field"
            variant="standard"
            InputProps={{ disableUnderline: true }}
          />
        </Box>
      </Box>

      <Button
        fullWidth
        variant="contained"
        className="btn-orange-card"
        startIcon={<SaveIcon />}
        onClick={handleSave}
        sx={{ mt: 2, mb: 1 }}
      >
        {saved ? 'Salvo!' : 'Salvar informações'}
      </Button>
    </Box>
  )
}
