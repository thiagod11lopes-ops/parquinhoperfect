import React, { useEffect, useMemo, useState } from 'react'
import {
  Grid, Box, Typography, Stack, IconButton, TextField,
} from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import StatCard from '../../components/common/StatCard'
import { useSampleData } from '../../context/SampleDataContext'
import { useAuth } from '../../context/AuthContext'
import { useParkSettings } from '../../context/ParkSettingsContext'
import '../../styles/global.scss'

const HOURS = Array.from({ length: 12 }, (_, i) => 7 + i)
const CHART = {
  orange: '#f97316',
  deep: '#ea580c',
  muted: '#000000',
  grid: 'rgba(15, 23, 42, 0.06)',
}

function hourFromTime(time) {
  if (!time || typeof time !== 'string') return null
  const [h] = time.split(':').map(Number)
  return Number.isFinite(h) ? h : null
}

function toHourLabel(h) {
  return `${String(h).padStart(2, '0')}h`
}

function buildHourlyMovement(children) {
  const counts = Object.fromEntries(HOURS.map(h => [h, 0]))
  children.forEach(c => {
    const h = hourFromTime(c.entryTime)
    if (h != null && counts[h] != null) counts[h] += 1
  })
  return HOURS.map(h => ({
    hour: toHourLabel(h),
    value: counts[h],
    avg: Number((counts[h]).toFixed(1)),
  }))
}

function ChartCard({ title, subtitle, children }) {
  return (
    <Box className="balance-card">
      <Box className="balance-card-head">
        <Typography className="balance-card-title">{title}</Typography>
        {subtitle && <Typography className="balance-card-sub">{subtitle}</Typography>}
      </Box>
      <Box className="balance-card-body">{children}</Box>
    </Box>
  )
}

function CleanTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <Box className="balance-tooltip">
      <Typography className="balance-tooltip-label">{label}</Typography>
      {payload.map((p, i) => (
        <Typography key={i} className="balance-tooltip-row">
          {p.name}: <strong>{p.value}</strong>
        </Typography>
      ))}
    </Box>
  )
}

export default function Dashboard() {
  const { childrenList, staffList } = useSampleData()
  const { isProfessor, isGerente, unitId } = useAuth()
  const { maxChildren, setMaxChildren } = useParkSettings()
  const [editingCapacity, setEditingCapacity] = useState(false)
  const [draftMax, setDraftMax] = useState(String(maxChildren))
  const [capacitySaved, setCapacitySaved] = useState(false)

  useEffect(() => {
    if (!editingCapacity) setDraftMax(String(maxChildren))
  }, [maxChildren, editingCapacity])

  const unitChildren = useMemo(
    () => childrenList.filter((c) => (c.unitId ? c.unitId === unitId : Boolean(unitId))),
    [childrenList, unitId],
  )

  const hourly = useMemo(() => buildHourlyMovement(unitChildren), [unitChildren])

  const presentCount = unitChildren.length
  const remaining = Math.max(0, maxChildren - presentCount)
  const atLimit = presentCount >= maxChildren
  const nearLimit = !atLimit && remaining <= 3

  const startEditCapacity = () => {
    setDraftMax(String(maxChildren))
    setCapacitySaved(false)
    setEditingCapacity(true)
  }

  const cancelEditCapacity = () => {
    setDraftMax(String(maxChildren))
    setEditingCapacity(false)
  }

  const saveEditCapacity = () => {
    const next = setMaxChildren(draftMax)
    setDraftMax(String(next))
    setEditingCapacity(false)
    setCapacitySaved(true)
    window.setTimeout(() => setCapacitySaved(false), 2200)
  }

  return (
    <Box className="page-container">
      {(isProfessor || isGerente) && (
        <Box className={`capacity-card panel-card ${atLimit ? 'is-full' : nearLimit ? 'is-near' : ''}`} sx={{ mb: 2 }}>
          <Box className="capacity-card-head">
            <Typography className="capacity-title">Capacidade do parquinho</Typography>
            {isGerente && !editingCapacity && (
              <IconButton
                size="small"
                className="capacity-edit-btn"
                aria-label="Editar lotação máxima"
                onClick={startEditCapacity}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {editingCapacity && isGerente && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.25 }}>
              <TextField
                size="small"
                type="number"
                label="Lotação máxima"
                value={draftMax}
                onChange={(e) => setDraftMax(e.target.value)}
                inputProps={{ min: 1, max: 200 }}
                className="capacity-input"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEditCapacity()
                  if (e.key === 'Escape') cancelEditCapacity()
                }}
              />
              <IconButton
                size="small"
                className="capacity-save-btn"
                aria-label="Salvar lotação"
                onClick={saveEditCapacity}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                className="capacity-cancel-btn"
                aria-label="Cancelar edição"
                onClick={cancelEditCapacity}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          )}

          <Typography className="capacity-hint">
            {atLimit
              ? 'Limite atingido — não liberar novas entradas.'
              : `${remaining} vaga${remaining === 1 ? '' : 's'} restante${remaining === 1 ? '' : 's'}.`}
          </Typography>

          {capacitySaved && (
            <Typography className="capacity-saved">Lotação atualizada.</Typography>
          )}

          {(!isGerente || editingCapacity) && (
            <Typography className="capacity-professor-note">
              {isGerente
                ? 'Defina o máximo de crianças no parquinho'
                : 'Definido pelo gerente · use para controlar entradas'}
            </Typography>
          )}
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <StatCard
            title="Crianças / Lotação máx."
            value={`${presentCount} / ${maxChildren}`}
            iconName="children"
          />
        </Grid>
        <Grid item xs={12}>
          <StatCard
            title="Professores da equipe"
            value={staffList.length}
            iconName="staff"
          />
        </Grid>
      </Grid>

      <Stack spacing={1.5} className="dashboard-charts" sx={{ mt: 2 }}>
        <ChartCard
          title="Movimento por horário"
          subtitle="Entradas registradas ao longo do dia"
        >
          <ResponsiveContainer width="100%" height={95}>
            <AreaChart data={hourly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="dashMoveFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.orange} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={CHART.orange} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fill: CHART.muted, fontSize: 10, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: CHART.muted, fontSize: 10, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip content={<CleanTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                name="Crianças"
                stroke={CHART.orange}
                strokeWidth={2.5}
                fill="url(#dashMoveFill)"
                dot={{ r: 3, fill: '#fff', stroke: CHART.orange, strokeWidth: 2 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Média de crianças por horário"
          subtitle="Distribuição das entradas por faixa"
        >
          <ResponsiveContainer width="100%" height={85}>
            <BarChart data={hourly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fill: CHART.muted, fontSize: 10, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: CHART.muted, fontSize: 10, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip content={<CleanTooltip />} />
              <Bar
                dataKey="avg"
                name="Média"
                fill={CHART.deep}
                radius={[8, 8, 4, 4]}
                maxBarSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Stack>
    </Box>
  )
}
