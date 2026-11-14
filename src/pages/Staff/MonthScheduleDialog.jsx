import React, { useEffect, useMemo, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent,
  Button, Box, Typography, Stack, Chip, Divider, IconButton, Tooltip
} from '@mui/material'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import ChildActions from '../Children/ChildActions'
import '../../styles/global.scss'

const getPhoneContainer = () => document.getElementById('phone-app-root') || document.body

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatDayLabel(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function toIsoDate(year, month, day = 1) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseIso(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return { year: y, month: m, day: d }
}

function monthTitle(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
}

function buildCalendarCells(year, month) {
  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDow; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toIsoDate(year, month, day))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function ShiftRow({ shift, member, readOnly, onEditShift, onDeleteShift }) {
  return (
    <Box className="month-shift-row">
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" fontWeight={800} sx={{ color: '#111', textShadow: 'none' }}>
          {shift.staffName}
        </Typography>
        {member?.phone && (
          <Typography variant="caption" display="block" sx={{ color: '#555', textShadow: 'none' }}>
            {member.phone}
          </Typography>
        )}
        <Box className="month-shift-time" sx={{ mt: 0.75 }}>
          <AccessTimeIcon sx={{ fontSize: 14 }} />
          <Typography variant="caption" fontWeight={800} sx={{ color: '#111', textShadow: 'none' }}>
            {shift.startTime} — {shift.endTime}
          </Typography>
        </Box>
      </Box>
      {!readOnly && (
        <ChildActions
          onEdit={() => onEditShift?.(shift)}
          onDelete={() => onDeleteShift?.(shift)}
        />
      )}
    </Box>
  )
}

function DayGroup({ date, shifts, staffList, selected, readOnly, onEditShift, onDeleteShift }) {
  return (
    <Box className={`month-day-group ${selected ? 'is-selected-day' : ''}`}>
      <Box className="month-day-group-header">
        <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#111', textShadow: 'none' }}>
          {formatDayLabel(date)}
        </Typography>
        <Chip
          label={`${shifts.length}`}
          size="small"
          sx={{ height: 20, fontWeight: 700, bgcolor: '#fff', color: '#111' }}
        />
      </Box>
      <Divider sx={{ mb: 1 }} />
      <Stack spacing={0.75}>
        {shifts.map((shift) => (
          <ShiftRow
            key={shift.id}
            shift={shift}
            member={staffList.find((s) => s.id === shift.staffId)}
            readOnly={readOnly}
            onEditShift={onEditShift}
            onDeleteShift={onDeleteShift}
          />
        ))}
      </Stack>
    </Box>
  )
}

function ScheduleCalendarPicker({
  open,
  onClose,
  selectedDate,
  scheduledDates,
  onSelectDate,
}) {
  const parsed = parseIso(selectedDate) || (() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
  })()
  const [viewYear, setViewYear] = useState(parsed.year)
  const [viewMonth, setViewMonth] = useState(parsed.month)

  useEffect(() => {
    if (!open) return
    const next = parseIso(selectedDate)
    if (next) {
      setViewYear(next.year)
      setViewMonth(next.month)
    }
  }, [open, selectedDate])

  const cells = useMemo(
    () => buildCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  )

  const scheduledSet = useMemo(
    () => new Set([...scheduledDates].map(String)),
    [scheduledDates],
  )

  const todayIso = toIsoDate(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    new Date().getDate(),
  )

  const goPrev = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1)
      setViewMonth(12)
      return
    }
    setViewMonth((m) => m - 1)
  }

  const goNext = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1)
      setViewMonth(1)
      return
    }
    setViewMonth((m) => m + 1)
  }

  const monthScheduledCount = useMemo(
    () => cells.filter((iso) => iso && scheduledSet.has(iso)).length,
    [cells, scheduledSet],
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      container={getPhoneContainer}
      className="schedule-calendar-dialog"
      PaperProps={{
        className: 'schedule-calendar-paper',
        sx: {
          m: 1.5,
          width: 'calc(100% - 24px)',
          maxWidth: 360,
          borderRadius: '22px',
          overflow: 'hidden',
          bgcolor: '#fff',
          color: '#111',
        },
      }}
      sx={{
        position: 'absolute',
        '& .MuiDialog-container': {
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      <Box className="schedule-calendar-head">
        <Box>
          <Typography className="schedule-calendar-kicker">Escolher data</Typography>
          <Typography className="schedule-calendar-month">
            {monthTitle(viewYear, viewMonth)}
          </Typography>
        </Box>
        <Box className="schedule-calendar-nav">
          <IconButton size="small" onClick={goPrev} aria-label="Mês anterior">
            <ChevronLeftIcon />
          </IconButton>
          <IconButton size="small" onClick={goNext} aria-label="Próximo mês">
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      <Box className="schedule-calendar-body">
        <Box className="schedule-calendar-weekdays">
          {WEEKDAYS.map((label) => (
            <Typography key={label} component="span">{label}</Typography>
          ))}
        </Box>

        <Box className="schedule-calendar-grid">
          {cells.map((iso, index) => {
            if (!iso) {
              return <Box key={`empty-${index}`} className="schedule-calendar-day is-empty" />
            }
            const hasSchedule = scheduledSet.has(iso)
            const isSelected = iso === selectedDate
            const isToday = iso === todayIso
            const dayNum = Number(iso.split('-')[2])
            return (
              <button
                key={iso}
                type="button"
                className={[
                  'schedule-calendar-day',
                  hasSchedule ? 'has-schedule' : '',
                  isSelected ? 'is-selected' : '',
                  isToday ? 'is-today' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onSelectDate(iso)}
                aria-label={
                  hasSchedule
                    ? `${formatDayLabel(iso)} · com escala`
                    : formatDayLabel(iso)
                }
              >
                <span className="schedule-calendar-day-num">{dayNum}</span>
                {hasSchedule && <span className="schedule-calendar-day-dot" aria-hidden />}
              </button>
            )
          })}
        </Box>

        <Box className="schedule-calendar-legend">
          <span className="schedule-calendar-legend-dot" />
          <Typography variant="caption">
            Dias com escala
            {monthScheduledCount > 0 ? ` · ${monthScheduledCount} neste mês` : ''}
          </Typography>
        </Box>
      </Box>
    </Dialog>
  )
}

export default function MonthScheduleDialog({
  open,
  onClose,
  year,
  month,
  date: initialDate,
  scheduleList,
  staffList,
  onEditShift,
  onDeleteShift,
  onAddShift,
  onMonthChange,
  readOnly = false,
}) {
  const [selectedDate, setSelectedDate] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      setCalendarOpen(false)
      return
    }
    setShowAll(false)
    if (initialDate) {
      setSelectedDate(initialDate)
      return
    }
    if (year && month) {
      setSelectedDate(toIsoDate(year, month, 1))
    }
  }, [open, initialDate, year, month])

  const dayShifts = useMemo(() => {
    if (!selectedDate) return []
    return [...scheduleList]
      .filter((s) => String(s.date) === String(selectedDate))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [scheduleList, selectedDate])

  const allDays = useMemo(() => {
    const byDate = {}
    scheduleList.forEach((shift) => {
      const key = String(shift.date)
      if (!byDate[key]) byDate[key] = []
      byDate[key].push(shift)
    })
    return Object.keys(byDate)
      .sort((a, b) => a.localeCompare(b))
      .map((date) => ({
        date,
        shifts: [...byDate[date]].sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }))
  }, [scheduleList])

  const scheduledDates = useMemo(
    () => allDays.map((d) => d.date),
    [allDays],
  )

  const visibleCount = showAll
    ? allDays.reduce((sum, d) => sum + d.shifts.length, 0)
    : dayShifts.length

  const handleSelectDate = (value) => {
    if (!value) return
    const [y, m] = value.split('-').map(Number)
    setShowAll(false)
    setSelectedDate(value)
    setCalendarOpen(false)
    onMonthChange?.({ year: y, month: m, date: value })
  }

  const empty = showAll ? allDays.length === 0 : dayShifts.length === 0

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen
        container={getPhoneContainer}
        className="month-schedule-dialog"
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
              <FolderOpenIcon />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#111', textShadow: 'none', lineHeight: 1.2 }}>
                Pasta da escala
              </Typography>
              <Typography variant="caption" sx={{ color: '#555', textShadow: 'none', display: 'block' }}>
                {showAll ? 'Todas as escalas' : formatDayLabel(selectedDate)}
              </Typography>
            </Box>

            <Button
              size="small"
              className={`month-schedule-todos-btn ${showAll ? 'is-active' : ''}`}
              onClick={() => setShowAll(true)}
              aria-pressed={showAll}
            >
              Todos
            </Button>

            <Tooltip title="Escolher data" arrow>
              <IconButton
                className={`month-schedule-calendar-btn ${!showAll ? 'is-active' : ''}`}
                aria-label="Escolher data"
                onClick={() => setCalendarOpen(true)}
              >
                <CalendarMonthIcon />
              </IconButton>
            </Tooltip>
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

        <DialogContent dividers className="month-schedule-folder-body">
          {empty ? (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#444', textShadow: 'none', mb: 2 }}>
                {showAll ? 'Nenhum turno cadastrado.' : 'Nenhum turno nesta data.'}
              </Typography>
              {!readOnly && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={onAddShift}
                  disabled={!staffList.length}
                >
                  Adicionar turno
                </Button>
              )}
            </Box>
          ) : (
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={showAll
                    ? `${visibleCount} turno${visibleCount !== 1 ? 's' : ''} · ${allDays.length} dia${allDays.length !== 1 ? 's' : ''}`
                    : `${dayShifts.length} turno${dayShifts.length !== 1 ? 's' : ''} nesta data`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    bgcolor: 'rgba(249,115,22,0.15)',
                    color: '#9a3412',
                  }}
                />
                {!readOnly && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={onAddShift}
                    disabled={!staffList.length}
                    sx={{ ml: 'auto', textTransform: 'none', fontWeight: 700 }}
                  >
                    Novo turno
                  </Button>
                )}
              </Box>

              {showAll ? (
                allDays.map(({ date, shifts }) => (
                  <DayGroup
                    key={date}
                    date={date}
                    shifts={shifts}
                    staffList={staffList}
                    selected={date === selectedDate}
                    readOnly={readOnly}
                    onEditShift={onEditShift}
                    onDeleteShift={onDeleteShift}
                  />
                ))
              ) : (
                <DayGroup
                  date={selectedDate}
                  shifts={dayShifts}
                  staffList={staffList}
                  selected
                  readOnly={readOnly}
                  onEditShift={onEditShift}
                  onDeleteShift={onDeleteShift}
                />
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <ScheduleCalendarPicker
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={selectedDate}
        scheduledDates={scheduledDates}
        onSelectDate={handleSelectDate}
      />
    </>
  )
}
