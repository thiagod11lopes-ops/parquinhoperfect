import React, { useEffect, useMemo, useState } from 'react'
import {
  Box, TextField, Typography, InputAdornment, Button, IconButton, Dialog,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useSampleData } from '../../context/SampleDataContext'
import { useGuardianSession } from '../../context/GuardianSessionContext'
import '../../styles/global.scss'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const getPhoneContainer = () => document.getElementById('phone-app-root') || document.body

function durationLabel(entryTime, exitTime) {
  if (!entryTime || !exitTime) return '—'
  const [eh, em] = entryTime.split(':').map(Number)
  const [xh, xm] = exitTime.split(':').map(Number)
  if (![eh, em, xh, xm].every(Number.isFinite)) return '—'
  const mins = Math.max(0, (xh * 60 + xm) - (eh * 60 + em))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

function formatDateLabel(isoDate) {
  if (!isoDate) return '—'
  const [y, m, d] = isoDate.split('-').map(Number)
  if (![y, m, d].every(Number.isFinite)) return isoDate
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateShort(isoDate) {
  if (!isoDate) return '—'
  const [y, m, d] = isoDate.split('-').map(Number)
  if (![y, m, d].every(Number.isFinite)) return isoDate
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

function todayIso() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
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

function HistoricoCalendarPicker({
  open,
  onClose,
  selectedDate,
  markedDates,
  onSelectDate,
}) {
  const parsed = parseIso(selectedDate) || parseIso(todayIso())
  const [viewYear, setViewYear] = useState(parsed.year)
  const [viewMonth, setViewMonth] = useState(parsed.month)

  useEffect(() => {
    if (!open) return
    const next = parseIso(selectedDate) || parseIso(todayIso())
    setViewYear(next.year)
    setViewMonth(next.month)
  }, [open, selectedDate])

  const cells = useMemo(
    () => buildCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  )

  const markedSet = useMemo(
    () => new Set([...markedDates].map(String)),
    [markedDates],
  )

  const today = todayIso()
  const monthMarkedCount = cells.filter((iso) => iso && markedSet.has(iso)).length

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
          <Typography className="schedule-calendar-kicker">Filtrar por data</Typography>
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
            const hasMoves = markedSet.has(iso)
            const isSelected = iso === selectedDate
            const isToday = iso === today
            const dayNum = Number(iso.split('-')[2])
            return (
              <button
                key={iso}
                type="button"
                className={[
                  'schedule-calendar-day',
                  hasMoves ? 'has-schedule' : '',
                  isSelected ? 'is-selected' : '',
                  isToday ? 'is-today' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onSelectDate(iso)}
              >
                <span className="schedule-calendar-day-num">{dayNum}</span>
                {hasMoves && <span className="schedule-calendar-day-dot" aria-hidden />}
              </button>
            )
          })}
        </Box>

        <Box className="schedule-calendar-legend">
          <span className="schedule-calendar-legend-dot" />
          <Typography variant="caption">
            Dias com movimentação
            {monthMarkedCount > 0 ? ` · ${monthMarkedCount} neste mês` : ''}
          </Typography>
        </Box>
      </Box>
    </Dialog>
  )
}

function HistoricoView({
  attendanceList,
  childrenList,
  childOnly = false,
  filterChildId = null,
  filterChildName = null,
  showSearch = true,
  titleSuffix = null,
}) {
  const [query, setQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)

  const childMap = useMemo(() => {
    const map = {}
    childrenList.forEach(c => { map[c.id] = c })
    return map
  }, [childrenList])

  const baseRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (attendanceList || [])
      .map(row => {
        const child = childMap[row.childId]
        return {
          ...row,
          guardian: child?.guardian || row.guardian || '—',
          plan: child?.plan || row.plan || null,
        }
      })
      .filter(row => {
        if (filterChildId != null || filterChildName) {
          const byId = filterChildId != null && String(row.childId) === String(filterChildId)
          const byName = filterChildName
            && (row.childName || '').toLowerCase() === String(filterChildName).toLowerCase()
          if (!byId && !byName) return false
        }
        if (!q || childOnly) return true
        return (
          (row.childName || '').toLowerCase().includes(q)
          || (row.guardian || '').toLowerCase().includes(q)
        )
      })
  }, [attendanceList, childMap, childOnly, filterChildId, filterChildName, query])

  const markedDates = useMemo(
    () => [...new Set(baseRows.map((r) => r.date).filter(Boolean))],
    [baseRows],
  )

  const tableRows = useMemo(() => (
    baseRows
      .filter((row) => !selectedDate || row.date === selectedDate)
      .sort((a, b) => {
        const byDate = String(b.date).localeCompare(String(a.date))
        if (byDate !== 0) return byDate
        return String(a.entryTime || '').localeCompare(String(b.entryTime || ''))
      })
  ), [baseRows, selectedDate])

  const totalMoves = tableRows.length

  const colCount = childOnly ? 5 : 6

  return (
    <Box className="page-container historico-page">
      <Box className="historico-table-wrap">
        <Box className="historico-table-toolbar">
          <Typography className="historico-table-title">
            {totalMoves} {totalMoves === 1 ? 'Movimentação' : 'Movimentações'}
            {titleSuffix ? ` · ${titleSuffix}` : ' no parquinho'}
          </Typography>

          {showSearch && (
            <TextField
              fullWidth
              size="small"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar criança ou responsável"
              className="historico-search"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />
          )}

          <Box className="historico-quick-dates">
            <Button
              size="small"
              className={`historico-chip ${!selectedDate ? 'is-active' : ''}`}
              onClick={() => setSelectedDate('')}
            >
              Todos
            </Button>
            <Button
              size="small"
              className={`historico-chip ${selectedDate === todayIso() ? 'is-active' : ''}`}
              onClick={() => setSelectedDate(todayIso())}
            >
              Hoje
            </Button>
            <IconButton
              className={`historico-calendar-btn ${selectedDate && selectedDate !== todayIso() ? 'is-active' : ''}`}
              onClick={() => setCalendarOpen(true)}
              aria-label="Escolher data"
            >
              <CalendarMonthIcon />
            </IconButton>
          </Box>

          {selectedDate ? (
            <Typography className="historico-date-label">
              {formatDateLabel(selectedDate)}
            </Typography>
          ) : null}
        </Box>

        <Box className="historico-table" component="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Criança</th>
              {!childOnly && <th>Responsável</th>}
              <th>Entrada</th>
              <th>Saída</th>
              <th>Tempo</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr className="historico-empty-row">
                <td colSpan={colCount}>
                  {selectedDate
                    ? 'Nenhuma movimentação nesta data.'
                    : 'Nenhuma movimentação registrada.'}
                </td>
              </tr>
            ) : tableRows.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="historico-td-date" title={formatDateLabel(item.date)}>
                    {formatDateShort(item.date)}
                  </span>
                </td>
                <td>
                  <span className="historico-td-child" title={item.childName || ''}>
                    {item.childName || '—'}
                  </span>
                </td>
                {!childOnly && (
                  <td>
                    <span className="historico-td-guardian" title={item.guardian || ''}>
                      {item.guardian || '—'}
                    </span>
                  </td>
                )}
                <td>
                  <span className="historico-td-badge is-in">{item.entryTime || '—'}</span>
                </td>
                <td>
                  <span className="historico-td-badge is-out">{item.exitTime || '—'}</span>
                </td>
                <td>
                  <span className="historico-td-duration">
                    {durationLabel(item.entryTime, item.exitTime)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>

      <HistoricoCalendarPicker
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={selectedDate}
        markedDates={markedDates}
        onSelectDate={(iso) => {
          setSelectedDate(iso)
          setCalendarOpen(false)
        }}
      />
    </Box>
  )
}

/** Histórico completo (gerente / professor) */
export default function Historico() {
  const { attendanceList, childrenList } = useSampleData()
  return (
    <HistoricoView
      attendanceList={attendanceList}
      childrenList={childrenList}
      showSearch
    />
  )
}

/** Histórico do responsável — sessões simuladas + registros da própria criança */
export function ResponsavelHistoricoPage() {
  const { attendanceList, childrenList } = useSampleData()
  const { child, history } = useGuardianSession()

  const attendanceListForChild = useMemo(() => {
    const sessionRows = (history || []).map((h) => ({
      id: h.id,
      childId: h.childId,
      childName: h.childName,
      date: h.date || String(h.entryAt || h.exitAt || '').slice(0, 10) || todayIso(),
      entryTime: h.entryTime,
      exitTime: h.exitTime,
      guardian: h.guardian || child?.guardian || '—',
    }))

    const fromAttendance = (attendanceList || []).filter((row) => {
      const byId = child?.id != null && String(row.childId) === String(child.id)
      const byName = child?.name
        && (row.childName || '').toLowerCase() === String(child.name).toLowerCase()
      return byId || byName
    })

    const seen = new Set()
    const merged = []
    ;[...sessionRows, ...fromAttendance].forEach((row) => {
      const key = String(row.id)
      if (seen.has(key)) return
      seen.add(key)
      merged.push(row)
    })
    return merged
  }, [attendanceList, child, history])

  return (
    <HistoricoView
      attendanceList={attendanceListForChild}
      childrenList={childrenList}
      childOnly
      showSearch={false}
      titleSuffix={child?.name || 'sua criança'}
    />
  )
}
