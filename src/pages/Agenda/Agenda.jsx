import React, { useMemo, useState } from 'react'
import { Box, Typography, Stack, Button } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import EventNoteIcon from '@mui/icons-material/EventNote'
import PeopleIcon from '@mui/icons-material/People'
import StorefrontIcon from '@mui/icons-material/Storefront'
import { useNavigate } from 'react-router-dom'
import { useSampleData } from '../../context/SampleDataContext'
import { useParkSettings, formatDayHours, normalizeDay } from '../../context/ParkSettingsContext'
import { useAuth } from '../../context/AuthContext'
import '../../styles/global.scss'

const WEEKDAY_PT = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

function pad(n) {
  return String(n).padStart(2, '0')
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function parkDayKey(date) {
  // WEEK_DAYS: segunda..domingo
  const js = date.getDay() // 0 dom
  const map = {
    1: 'segunda',
    2: 'terca',
    3: 'quarta',
    4: 'quinta',
    5: 'sexta',
    6: 'sabado',
    0: 'domingo',
  }
  return map[js]
}

function timeToMinutes(t) {
  if (!t || typeof t !== 'string') return 0
  const [h, m] = t.split(':').map(Number)
  if (!Number.isFinite(h)) return 0
  return h * 60 + (Number.isFinite(m) ? m : 0)
}

function formatLongDate(date) {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

export default function Agenda() {
  const navigate = useNavigate()
  const { unitName, isGerente, isAdmin } = useAuth()
  const { activitiesList, scheduleList } = useSampleData()
  const { hours } = useParkSettings()
  const [anchor, setAnchor] = useState(() => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    return d
  })
  const [selectedKey, setSelectedKey] = useState(() => toDateKey(new Date()))

  const weekDays = useMemo(() => {
    const monday = anchor.getDay() === 0
      ? addDays(anchor, -6)
      : addDays(anchor, 1 - anchor.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(monday, i)
      return {
        date: d,
        key: toDateKey(d),
        label: WEEKDAY_PT[d.getDay()].slice(0, 3),
        dayNum: d.getDate(),
        isToday: toDateKey(d) === toDateKey(new Date()),
      }
    })
  }, [anchor])

  const selectedDate = useMemo(() => {
    const found = weekDays.find((d) => d.key === selectedKey)
    return found?.date || new Date()
  }, [weekDays, selectedKey])

  const weekdayLabel = WEEKDAY_PT[selectedDate.getDay()]
  const parkKey = parkDayKey(selectedDate)
  const parkDay = normalizeDay(hours?.[parkKey])
  const parkOpenLabel = formatDayHours(parkDay)

  const dayActivities = useMemo(() => {
    const list = (activitiesList || []).filter((a) => {
      const day = String(a.day || '')
      return day === 'Diário' || day === weekdayLabel
    })
    return [...list].sort((a, b) => timeToMinutes(a.startTime || a.time) - timeToMinutes(b.startTime || b.time))
  }, [activitiesList, weekdayLabel])

  const dayShifts = useMemo(() => {
    const key = toDateKey(selectedDate)
    const list = (scheduleList || []).filter((s) => String(s.date) === key)
    return [...list].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
  }, [scheduleList, selectedDate])

  const timeline = useMemo(() => {
    const items = [
      ...dayActivities.map((a) => ({
        id: `act-${a.id}`,
        kind: 'activity',
        time: a.startTime || a.time || '—',
        end: a.endTime || null,
        title: a.title,
        detail: [a.professor, a.description].filter(Boolean).join(' · '),
      })),
      ...dayShifts.map((s) => ({
        id: `shift-${s.id}`,
        kind: 'staff',
        time: s.startTime || '—',
        end: s.endTime || null,
        title: s.staffName || 'Equipe',
        detail: s.endTime ? `Até ${s.endTime}` : 'Escala',
      })),
    ]
    return items.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
  }, [dayActivities, dayShifts])

  const shiftWeek = (dir) => {
    const next = addDays(anchor, dir * 7)
    setAnchor(next)
    setSelectedKey(toDateKey(next))
  }

  return (
    <Box className="page-container agenda-page">
      <Box className="agenda-hero panel-card">
        <Typography className="agenda-hero-title">Agenda unificada</Typography>
        <Typography className="agenda-hero-sub">
          Atividades, escala e horário do parquinho
          {unitName ? ` · ${unitName}` : ''}
        </Typography>
        <Typography className="agenda-hero-date">{formatLongDate(selectedDate)}</Typography>
      </Box>

      <Box className="agenda-week panel-card">
        <Box className="agenda-week-nav">
          <Button
            size="small"
            className="agenda-week-btn"
            startIcon={<ChevronLeftIcon />}
            onClick={() => shiftWeek(-1)}
          >
            Semana
          </Button>
          <Button
            size="small"
            className="agenda-week-btn"
            endIcon={<ChevronRightIcon />}
            onClick={() => shiftWeek(1)}
          >
            Semana
          </Button>
        </Box>
        <Box className="agenda-week-strip" role="tablist" aria-label="Dias da semana">
          {weekDays.map((d) => (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={d.key === selectedKey}
              className={`agenda-day-chip ${d.key === selectedKey ? 'is-active' : ''} ${d.isToday ? 'is-today' : ''}`}
              onClick={() => setSelectedKey(d.key)}
            >
              <span className="agenda-day-chip-label">{d.label}</span>
              <span className="agenda-day-chip-num">{d.dayNum}</span>
            </button>
          ))}
        </Box>
      </Box>

      <Box className={`agenda-park panel-card ${parkDay.closed ? 'is-closed' : ''}`}>
        <Box className="agenda-section-head">
          <span className="agenda-section-icon" aria-hidden><StorefrontIcon fontSize="small" /></span>
          <Box>
            <Typography className="agenda-section-title">Horário do parquinho</Typography>
            <Typography className="agenda-section-sub">{weekdayLabel}</Typography>
          </Box>
        </Box>
        <Typography className="agenda-park-hours">
          {parkDay.closed ? 'Fechado neste dia' : parkOpenLabel}
        </Typography>
        {(isGerente || isAdmin) && (
          <Button
            size="small"
            className="agenda-link-btn"
            onClick={() => navigate('/informacoes')}
          >
            Editar em Informações
          </Button>
        )}
      </Box>

      <Box className="agenda-block panel-card">
        <Box className="agenda-section-head">
          <span className="agenda-section-icon" aria-hidden><EventNoteIcon fontSize="small" /></span>
          <Box className="agenda-section-head-grow">
            <Typography className="agenda-section-title">Atividades</Typography>
            <Typography className="agenda-section-sub">
              {dayActivities.length} no dia
            </Typography>
          </Box>
          <Button size="small" className="agenda-link-btn" onClick={() => navigate('/activities')}>
            Gerenciar
          </Button>
        </Box>
        {dayActivities.length === 0 ? (
          <Typography className="agenda-empty">Nenhuma atividade neste dia.</Typography>
        ) : (
          <Stack spacing={1}>
            {dayActivities.map((a) => (
              <Box key={a.id} className="agenda-item is-activity">
                <Box className="agenda-item-time">
                  <AccessTimeIcon fontSize="inherit" />
                  <span>
                    {a.startTime || a.time}
                    {a.endTime ? `–${a.endTime}` : ''}
                  </span>
                </Box>
                <Box className="agenda-item-copy">
                  <Typography className="agenda-item-title">{a.title}</Typography>
                  <Typography className="agenda-item-detail">
                    {[a.professor, a.day, a.description].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Box className="agenda-block panel-card">
        <Box className="agenda-section-head">
          <span className="agenda-section-icon" aria-hidden><PeopleIcon fontSize="small" /></span>
          <Box className="agenda-section-head-grow">
            <Typography className="agenda-section-title">Escala da equipe</Typography>
            <Typography className="agenda-section-sub">
              {dayShifts.length} plantão(ões)
            </Typography>
          </Box>
          {(isGerente || isAdmin) && (
            <Button size="small" className="agenda-link-btn" onClick={() => navigate('/staff')}>
              Equipe
            </Button>
          )}
        </Box>
        {dayShifts.length === 0 ? (
          <Typography className="agenda-empty">Nenhuma escala neste dia.</Typography>
        ) : (
          <Stack spacing={1}>
            {dayShifts.map((s) => (
              <Box key={s.id} className="agenda-item is-staff">
                <Box className="agenda-item-time">
                  <AccessTimeIcon fontSize="inherit" />
                  <span>{s.startTime}–{s.endTime}</span>
                </Box>
                <Box className="agenda-item-copy">
                  <Typography className="agenda-item-title">{s.staffName}</Typography>
                  <Typography className="agenda-item-detail">Plantão na unidade</Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {timeline.length > 0 && (
        <Box className="agenda-block panel-card">
          <Box className="agenda-section-head">
            <span className="agenda-section-icon" aria-hidden><AccessTimeIcon fontSize="small" /></span>
            <Box>
              <Typography className="agenda-section-title">Linha do tempo</Typography>
              <Typography className="agenda-section-sub">Atividades + escala no mesmo dia</Typography>
            </Box>
          </Box>
          <Box className="agenda-timeline">
            {timeline.map((item) => (
              <Box key={item.id} className={`agenda-timeline-row is-${item.kind}`}>
                <Typography className="agenda-timeline-time">
                  {item.time}{item.end ? `–${item.end}` : ''}
                </Typography>
                <Box className="agenda-timeline-dot" aria-hidden />
                <Box className="agenda-timeline-copy">
                  <Typography className="agenda-timeline-title">{item.title}</Typography>
                  <Typography className="agenda-timeline-detail">
                    {item.kind === 'activity' ? 'Atividade' : 'Equipe'}
                    {item.detail ? ` · ${item.detail}` : ''}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}
