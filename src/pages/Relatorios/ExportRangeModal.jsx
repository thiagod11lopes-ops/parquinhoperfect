import React, { useEffect, useMemo, useState } from 'react'
import {
  Box, Button, Dialog, IconButton, Typography,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import TableViewIcon from '@mui/icons-material/TableView'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const getPhoneContainer = () => document.getElementById('phone-app-root') || document.body

function pad(n) {
  return String(n).padStart(2, '0')
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toIsoDate(year, month, day = 1) {
  return `${year}-${pad(month)}-${pad(day)}`
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

function formatDateBr(iso) {
  const p = parseIso(iso)
  if (!p) return '—'
  return `${pad(p.day)}/${pad(p.month)}/${p.year}`
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

export default function ExportRangeModal({
  open,
  onClose,
  onConfirm,
  reportTitle,
  format,
  busy = false,
  markedDates = [],
}) {
  const [mode, setMode] = useState('all') // all | range | day
  const [dayDate, setDayDate] = useState(todayIso())
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [rangeStep, setRangeStep] = useState('from') // from | to
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setMode('all')
    setDayDate(todayIso())
    setRangeFrom('')
    setRangeTo('')
    setRangeStep('from')
    setError('')
    const now = new Date()
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth() + 1)
  }, [open])

  const cells = useMemo(
    () => buildCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  )

  const markedSet = useMemo(
    () => new Set([...markedDates].map((d) => String(d).slice(0, 10))),
    [markedDates],
  )

  const monthMarkedCount = useMemo(
    () => cells.filter((iso) => iso && markedSet.has(iso)).length,
    [cells, markedSet],
  )

  const today = todayIso()
  const formatLabel = format === 'pdf' ? 'PDF' : 'Excel'

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

  const onPickDay = (iso) => {
    setError('')
    if (mode === 'day') {
      setDayDate(iso)
      return
    }
    if (mode === 'range') {
      if (rangeStep === 'from' || !rangeFrom) {
        setRangeFrom(iso)
        setRangeTo('')
        setRangeStep('to')
        return
      }
      if (iso < rangeFrom) {
        setRangeTo(rangeFrom)
        setRangeFrom(iso)
      } else {
        setRangeTo(iso)
      }
      setRangeStep('from')
    }
  }

  const summary = useMemo(() => {
    if (mode === 'all') return 'Todos os dados'
    if (mode === 'day') return `Data: ${formatDateBr(dayDate)}`
    if (rangeFrom && rangeTo) return `De ${formatDateBr(rangeFrom)} a ${formatDateBr(rangeTo)}`
    if (rangeFrom) return `Início: ${formatDateBr(rangeFrom)} · escolha o fim`
    return 'Escolha o período no calendário'
  }, [mode, dayDate, rangeFrom, rangeTo])

  const handleConfirm = () => {
    setError('')
    if (mode === 'day' && !dayDate) {
      setError('Selecione uma data no calendário.')
      return
    }
    if (mode === 'range') {
      if (!rangeFrom || !rangeTo) {
        setError('Selecione a data inicial e a final no calendário.')
        return
      }
    }
    const dateFilter = mode === 'all'
      ? { mode: 'all' }
      : mode === 'day'
        ? { mode: 'day', date: dayDate }
        : { mode: 'range', from: rangeFrom, to: rangeTo }
    onConfirm(dateFilter)
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      container={getPhoneContainer}
      className="export-range-dialog"
      PaperProps={{
        className: 'export-range-paper',
        sx: {
          m: 1.5,
          width: 'calc(100% - 24px)',
          maxWidth: 380,
          borderRadius: '22px',
          overflow: 'hidden',
          bgcolor: '#0f172a',
          color: '#fff',
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
      <Box className="export-range-head">
        <Box>
          <Typography className="export-range-kicker">{formatLabel}</Typography>
          <Typography className="export-range-title">{reportTitle}</Typography>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          disabled={busy}
          aria-label="Fechar"
          className="export-range-close"
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box className="export-range-modes" role="tablist" aria-label="Escopo do relatório">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'range', label: 'Período' },
          { id: 'day', label: 'Data' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            className={`export-range-mode${mode === item.id ? ' is-active' : ''}`}
            onClick={() => {
              setMode(item.id)
              setError('')
              if (item.id === 'range') setRangeStep('from')
            }}
          >
            {item.label}
          </button>
        ))}
      </Box>

      <Typography className="export-range-summary">{summary}</Typography>

      {mode !== 'all' && (
        <Box className="export-range-calendar">
          <Box className="export-range-cal-head">
            <Typography className="export-range-cal-month">
              {monthTitle(viewYear, viewMonth)}
            </Typography>
            <Box className="export-range-cal-nav">
              <IconButton size="small" onClick={goPrev} aria-label="Mês anterior">
                <ChevronLeftIcon />
              </IconButton>
              <IconButton size="small" onClick={goNext} aria-label="Próximo mês">
                <ChevronRightIcon />
              </IconButton>
            </Box>
          </Box>

          <Box className="export-range-weekdays">
            {WEEKDAYS.map((label) => (
              <Typography key={label} component="span">{label}</Typography>
            ))}
          </Box>

          <Box className="export-range-grid">
            {cells.map((iso, index) => {
              if (!iso) {
                return <Box key={`empty-${index}`} className="export-range-day is-empty" />
              }
              const dayNum = Number(iso.split('-')[2])
              const isToday = iso === today
              const hasMoves = markedSet.has(iso)
              let isSelected = false
              let inRange = false
              if (mode === 'day') {
                isSelected = iso === dayDate
              } else if (mode === 'range') {
                isSelected = iso === rangeFrom || iso === rangeTo
                if (rangeFrom && rangeTo && iso >= rangeFrom && iso <= rangeTo) {
                  inRange = true
                }
              }
              return (
                <button
                  key={iso}
                  type="button"
                  className={[
                    'export-range-day',
                    hasMoves ? 'has-moves' : '',
                    isSelected ? 'is-selected' : '',
                    inRange ? 'is-in-range' : '',
                    isToday ? 'is-today' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => onPickDay(iso)}
                >
                  <span className="export-range-day-num">{dayNum}</span>
                  {hasMoves && <span className="export-range-day-dot" aria-hidden />}
                </button>
              )
            })}
          </Box>

          <Box className="export-range-legend">
            <span className="export-range-legend-dot" aria-hidden />
            <Typography component="span">
              Dias com movimentação
              {monthMarkedCount > 0 ? ` · ${monthMarkedCount} neste mês` : ''}
            </Typography>
          </Box>

          {mode === 'range' && (
            <Typography className="export-range-hint">
              {rangeStep === 'to' && rangeFrom
                ? 'Agora toque na data final'
                : 'Toque na data inicial e depois na final'}
            </Typography>
          )}
        </Box>
      )}

      {error ? (
        <Typography className="export-range-error">{error}</Typography>
      ) : null}

      <Box className="export-range-actions">
        <Button
          fullWidth
          className="export-range-confirm"
          disabled={busy}
          startIcon={format === 'pdf' ? <PictureAsPdfIcon /> : <TableViewIcon />}
          onClick={handleConfirm}
        >
          {busy ? 'Gerando…' : `Baixar ${formatLabel}`}
        </Button>
      </Box>
    </Dialog>
  )
}
