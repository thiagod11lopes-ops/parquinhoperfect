import React, { useEffect, useMemo, useState } from 'react'
import GroupsIcon from '@mui/icons-material/Groups'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Box, Typography, Stack, Button } from '@mui/material'
import { useAppearance } from '../../context/AppearanceContext'
import { buildUnitsOccupancy } from '../../utils/unitCapacity'
import {
  recordOccupancySnapshot,
  buildDailyHistory,
  buildWeeklyHistory,
} from '../../utils/unitOccupancyHistory'

function OccupancyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <Box className="unidades-balance-tooltip panel-card">
      <Typography className="unidades-balance-tooltip-title">
        {row?.fullName || row?.name || row?.label}
      </Typography>
      {payload.map((p) => (
        <Typography key={p.dataKey} className="unidades-balance-tooltip-row">
          {p.name}: <strong>{p.value}</strong>
        </Typography>
      ))}
      {row?.pct != null && (
        <Typography className="unidades-balance-tooltip-row">
          Ocupação: <strong>{row.pct}%</strong>
        </Typography>
      )}
    </Box>
  )
}

export default function UnitsBalanceCard({
  units,
  childrenList,
  tenantId,
  activeUnitId,
}) {
  const { appearance } = useAppearance()
  const [tick, setTick] = useState(0)
  const [historyMode, setHistoryMode] = useState('day') // day | week

  const chartColors = useMemo(() => {
    const accent = appearance.accent || appearance.buttonColor || '#f97316'
    const deep = appearance.accentDeep || '#ea580c'
    const font = appearance.fontColor || '#ffffff'
    return {
      accent,
      deep,
      soft: accent,
      free: 'rgba(255, 255, 255, 0.28)',
      font,
      grid: 'rgba(255, 255, 255, 0.16)',
      cursor: `${accent}33`,
    }
  }, [appearance])

  // Reage a mudanças de lotação máxima e mantém sensação de tempo real
  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener('storage', bump)
    window.addEventListener('parquinho-park-settings', bump)
    window.addEventListener('parquinho-park-info', bump)
    const id = window.setInterval(bump, 4000)
    return () => {
      window.removeEventListener('storage', bump)
      window.removeEventListener('parquinho-park-settings', bump)
      window.removeEventListener('parquinho-park-info', bump)
      window.clearInterval(id)
    }
  }, [])

  const data = useMemo(
    () => buildUnitsOccupancy({
      units,
      children: childrenList,
      tenantId,
      activeUnitId,
    }),
    // tick força releitura do localStorage de capacidade
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [units, childrenList, tenantId, activeUnitId, tick],
  )

  useEffect(() => {
    if (!tenantId || !data?.rows?.length) return
    recordOccupancySnapshot(tenantId, data.rows)
  }, [tenantId, data])

  const historySeries = useMemo(() => {
    const ids = (units || []).map((u) => u.id)
    if (!tenantId || !ids.length) return []
    const fallbackMax = data?.totals?.max || 0
    return historyMode === 'week'
      ? buildWeeklyHistory(tenantId, ids, 6, fallbackMax)
      : buildDailyHistory(tenantId, ids, 7, fallbackMax)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, units, historyMode, data, tick])

  if (!units?.length) return null

  const { rows, totals, chart } = data

  return (
    <Box className="unidades-balance-card panel-card">
      <Box className="unidades-balance-head">
        <span className="unidades-balance-icon" aria-hidden>
          <TrendingUpIcon fontSize="small" />
        </span>
        <Box className="unidades-balance-head-copy">
          <Typography className="unidades-balance-title">Balanço de lotação</Typography>
          <Typography className="unidades-balance-sub">
            Tempo real · todas as unidades
          </Typography>
        </Box>
        <Box className="unidades-balance-live" aria-hidden>
          <i />
          Ao vivo
        </Box>
      </Box>

      <Box className="unidades-balance-totals">
        <Box className="unidades-balance-total">
          <GroupsIcon fontSize="small" />
          <Box>
            <Typography className="unidades-balance-total-value">
              {totals.present}
              <span> / {totals.max}</span>
            </Typography>
            <Typography className="unidades-balance-total-label">Presentes no total</Typography>
          </Box>
        </Box>
        <Box className="unidades-balance-total">
          <Box>
            <Typography className="unidades-balance-total-value">
              {totals.remaining}
            </Typography>
            <Typography className="unidades-balance-total-label">Vagas livres</Typography>
          </Box>
        </Box>
        <Box className="unidades-balance-total">
          <Box>
            <Typography className="unidades-balance-total-value">
              {totals.pct}%
            </Typography>
            <Typography className="unidades-balance-total-label">Ocupação geral</Typography>
          </Box>
        </Box>
      </Box>

      <Stack spacing={1} className="unidades-balance-list">
        {rows.map((row) => (
          <Box
            key={row.id}
            className={`unidades-balance-row ${row.atLimit ? 'is-full' : row.nearLimit ? 'is-near' : ''}`}
          >
            <Box className="unidades-balance-row-top">
              <Typography className="unidades-balance-row-name">{row.name}</Typography>
              <Typography className="unidades-balance-row-count">
                {row.present}/{row.max}
              </Typography>
            </Box>
            <Box className="unidades-balance-bar" aria-hidden>
              <span style={{ width: `${row.pct}%` }} />
            </Box>
            <Typography className="unidades-balance-row-meta">
              {row.atLimit
                ? 'Lotação máxima'
                : `${row.remaining} vaga(s) · ${row.pct}%`}
            </Typography>
          </Box>
        ))}
      </Stack>

      <Box className="unidades-balance-chart-wrap">
        <Typography className="unidades-balance-chart-title">
          Comparativo por unidade
        </Typography>
        <Box className="unidades-balance-chart">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chart}
              margin={{ top: 8, right: 4, left: -18, bottom: 4 }}
              barCategoryGap="18%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{
                  fill: chartColors.font,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--app-font)',
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{
                  fill: chartColors.font,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--app-font)',
                  opacity: 0.85,
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<OccupancyTooltip />} cursor={{ fill: chartColors.cursor }} />
              <Legend
                wrapperStyle={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: chartColors.font,
                  fontFamily: 'var(--app-font)',
                }}
              />
              <Bar
                dataKey="presentes"
                name="Presentes"
                stackId="occ"
                fill={chartColors.accent}
                radius={[0, 0, 0, 0]}
                maxBarSize={36}
              />
              <Bar
                dataKey="vagas"
                name="Vagas livres"
                stackId="occ"
                fill={chartColors.free}
                stroke={chartColors.font}
                strokeOpacity={0.25}
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      <Box className="unidades-balance-chart-wrap unidades-balance-history">
        <Box className="unidades-balance-history-head">
          <Box>
            <Typography className="unidades-balance-chart-title">
              Histórico de lotação
            </Typography>
            <Typography className="unidades-balance-chart-sub">
              {historyMode === 'week' ? 'Média por semana' : 'Últimos 7 dias'}
            </Typography>
          </Box>
          <Box className="unidades-balance-history-toggle" role="group" aria-label="Período do histórico">
            <Button
              size="small"
              className={`unidades-balance-toggle-btn ${historyMode === 'day' ? 'is-active' : ''}`}
              onClick={() => setHistoryMode('day')}
            >
              Dia
            </Button>
            <Button
              size="small"
              className={`unidades-balance-toggle-btn ${historyMode === 'week' ? 'is-active' : ''}`}
              onClick={() => setHistoryMode('week')}
            >
              Semana
            </Button>
          </Box>
        </Box>
        <Box className="unidades-balance-chart">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={historySeries}
              margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            >
              <defs>
                <linearGradient id="unidadesHistoryFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.accent} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{
                  fill: chartColors.font,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--app-font)',
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{
                  fill: chartColors.font,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--app-font)',
                  opacity: 0.85,
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<OccupancyTooltip />} cursor={{ stroke: chartColors.accent, strokeWidth: 1 }} />
              <Legend
                wrapperStyle={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: chartColors.font,
                  fontFamily: 'var(--app-font)',
                }}
              />
              <Area
                type="monotone"
                dataKey="presentes"
                name="Presentes"
                stroke={chartColors.accent}
                strokeWidth={2.5}
                fill="url(#unidadesHistoryFill)"
                activeDot={{ r: 4, fill: chartColors.accent }}
              />
              <Area
                type="monotone"
                dataKey="capacidade"
                name="Capacidade"
                stroke={chartColors.font}
                strokeOpacity={0.45}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                fill="transparent"
                dot={false}
                activeDot={{ r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Box>
  )
}
