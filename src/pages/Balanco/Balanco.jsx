import React, { useMemo, useState } from 'react'
import { Box, Typography, Stack, Divider, IconButton } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
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
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ChildCareIcon from '@mui/icons-material/ChildCare'
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom'
import PeopleIcon from '@mui/icons-material/People'
import EventNoteIcon from '@mui/icons-material/EventNote'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import { useSampleData } from '../../context/SampleDataContext'
import '../../styles/global.scss'

const HOURS = Array.from({ length: 12 }, (_, i) => 7 + i) // 07–18
const CHART = {
  orange: '#f97316',
  deep: '#ea580c',
  soft: '#fdba74',
  ink: '#0f172a',
  muted: '#000000',
  grid: 'rgba(15, 23, 42, 0.06)',
  plans: ['#f97316', '#0ea5e9', '#a78bfa', '#22c55e'],
  ages: ['#fb923c', '#f97316', '#ea580c', '#c2410c'],
}

function hourFromTime(time) {
  if (!time || typeof time !== 'string') return null
  const [h] = time.split(':').map(Number)
  return Number.isFinite(h) ? h : null
}

function toHourLabel(h) {
  return `${String(h).padStart(2, '0')}h`
}

function uniqueGuardians(children) {
  const set = new Set(
    children
      .map(c => (c.guardian || '').trim().toLowerCase())
      .filter(Boolean)
  )
  return set.size
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

function buildPlanData(children) {
  const map = {}
  children.forEach(c => {
    const key = c.plan || 'Sem plano'
    map[key] = (map[key] || 0) + 1
  })
  return Object.entries(map).map(([name, value]) => ({ name, value }))
}

function buildAgeData(children) {
  const map = {}
  children.forEach(c => {
    const key = `${c.age ?? '?'} anos`
    map[key] = (map[key] || 0) + 1
  })
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => parseInt(a.name, 10) - parseInt(b.name, 10))
}

function buildAllergyData(children) {
  let withAllergy = 0
  let none = 0
  const map = {}
  children.forEach(c => {
    const a = (c.allergies || 'Nenhuma').trim()
    if (!a || a.toLowerCase() === 'nenhuma') {
      none += 1
      return
    }
    withAllergy += 1
    map[a] = (map[a] || 0) + 1
  })
  return {
    withAllergy,
    none,
    list: Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
  }
}

function peakHour(hourly) {
  if (!hourly.length) return '—'
  const top = [...hourly].sort((a, b) => b.value - a.value)[0]
  return top?.value ? top.hour : '—'
}

function avgPerBusyHour(hourly) {
  const busy = hourly.filter(h => h.value > 0)
  if (!busy.length) return 0
  return Number((busy.reduce((s, h) => s + h.value, 0) / busy.length).toFixed(1))
}

function timeToMinutes(time) {
  if (!time || typeof time !== 'string') return null
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function formatHours(mins) {
  if (!mins || mins <= 0) return '0h'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}h ${m}min`
  if (h) return `${h}h`
  return `${m}min`
}

function buildParticipationRanking(attendance, children) {
  const byChild = {}
  attendance.forEach(row => {
    const key = row.childId
    if (!byChild[key]) {
      byChild[key] = {
        childId: key,
        name: row.childName,
        days: 0,
        totalMinutes: 0,
        lastDate: row.date,
        lastEntry: row.entryTime,
        lastExit: row.exitTime,
      }
    }
    const item = byChild[key]
    item.days += 1
    const start = timeToMinutes(row.entryTime)
    const end = timeToMinutes(row.exitTime)
    if (start != null && end != null && end > start) {
      item.totalMinutes += end - start
    }
    if (String(row.date) >= String(item.lastDate)) {
      item.lastDate = row.date
      item.lastEntry = row.entryTime
      item.lastExit = row.exitTime
      item.name = row.childName || item.name
    }
  })

  // Inclui cadastrados sem registro ainda
  children.forEach(c => {
    if (!byChild[c.id]) {
      byChild[c.id] = {
        childId: c.id,
        name: c.name,
        days: 0,
        totalMinutes: 0,
        lastDate: null,
        lastEntry: c.entryTime || null,
        lastExit: c.exitTime || null,
      }
    } else if (!byChild[c.id].name) {
      byChild[c.id].name = c.name
    }
  })

  const ranked = Object.values(byChild)
    .sort((a, b) => {
      if (b.days !== a.days) return b.days - a.days
      return b.totalMinutes - a.totalMinutes
    })
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      hoursLabel: formatHours(item.totalMinutes),
      avgHoursLabel: item.days
        ? formatHours(Math.round(item.totalMinutes / item.days))
        : '—',
    }))

  const maxDays = ranked[0]?.days || 1
  return ranked.map(item => ({
    ...item,
    barPct: Math.round((item.days / maxDays) * 100),
  }))
}

function ModernTrophy({ tone = 'gold' }) {
  const ids = {
    gold: { cup: 'tgCup', shine: 'tgShine' },
    silver: { cup: 'tsCup', shine: 'tsShine' },
    bronze: { cup: 'tbCup', shine: 'tbShine' },
  }[tone]
  const colors = {
    gold: { a: '#FDE68A', b: '#F59E0B', c: '#B45309', glow: 'rgba(245,158,11,0.35)' },
    silver: { a: '#F8FAFC', b: '#94A3B8', c: '#475569', glow: 'rgba(100,116,139,0.3)' },
    bronze: { a: '#FDBA74', b: '#C2410C', c: '#7C2D12', glow: 'rgba(194,65,12,0.3)' },
  }[tone]

  return (
    <Box
      component="svg"
      className={`balance-trophy balance-trophy--${tone}`}
      viewBox="0 0 64 64"
      aria-hidden
      sx={{ filter: `drop-shadow(0 6px 10px ${colors.glow})` }}
    >
      <defs>
        <linearGradient id={ids.cup} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors.a} />
          <stop offset="55%" stopColor={colors.b} />
          <stop offset="100%" stopColor={colors.c} />
        </linearGradient>
        <linearGradient id={ids.shine} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* handles */}
      <path d="M16 18c-6 1-9 6-8 12 1 5 5 8 10 8" fill="none" stroke={`url(#${ids.cup})`} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M48 18c6 1 9 6 8 12-1 5-5 8-10 8" fill="none" stroke={`url(#${ids.cup})`} strokeWidth="3.2" strokeLinecap="round" />
      {/* cup */}
      <path d="M20 14h24c1.2 10 .2 18-4.5 24H24.5C19.8 32 18.8 24 20 14z" fill={`url(#${ids.cup})`} />
      <path d="M24 16h10c0 8-1 14-3.5 19" fill="none" stroke={`url(#${ids.shine})`} strokeWidth="3" strokeLinecap="round" />
      {/* neck + base */}
      <rect x="29" y="38" width="6" height="8" rx="2" fill={`url(#${ids.cup})`} />
      <path d="M22 52h20c1 0 2 .8 2 2v2H20v-2c0-1.2 1-2 2-2z" fill={`url(#${ids.cup})`} />
      <rect x="24" y="46" width="16" height="6" rx="2" fill={`url(#${ids.cup})`} />
      {/* gem */}
      <circle cx="32" cy="26" r="3.2" fill="#fff" fillOpacity="0.55" />
    </Box>
  )
}

function ChartCard({ title, subtitle, children, tall }) {
  return (
    <Box className={`balance-card ${tall ? 'is-tall' : ''}`}>
      <Box className="balance-card-head">
        <Typography className="balance-card-title">{title}</Typography>
        {subtitle && <Typography className="balance-card-sub">{subtitle}</Typography>}
      </Box>
      <Box className="balance-card-body">{children}</Box>
    </Box>
  )
}

function Kpi({ icon, label, value, hint }) {
  return (
    <Box className="balance-kpi">
      <Box className="balance-kpi-icon">{icon}</Box>
      <Box className="balance-kpi-copy">
        <Typography className="balance-kpi-label">{label}</Typography>
        <Typography className="balance-kpi-value">{value}</Typography>
        {hint && <Typography className="balance-kpi-hint">{hint}</Typography>}
      </Box>
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

export default function Balanco() {
  const { childrenList, staffList, activitiesList, scheduleList, attendanceList } = useSampleData()
  const [rankExpanded, setRankExpanded] = useState(false)

  const metrics = useMemo(() => {
    const hourly = buildHourlyMovement(childrenList)
    const plans = buildPlanData(childrenList)
    const ages = buildAgeData(childrenList)
    const allergies = buildAllergyData(childrenList)
    const ranking = buildParticipationRanking(attendanceList || [], childrenList)
    const guardians = uniqueGuardians(childrenList)
    const activeStaff = staffList.filter(s => s.status === 'Ativo').length
    const peak = peakHour(hourly)
    const avgHour = avgPerBusyHour(hourly)

    return {
      hourly,
      plans,
      ages,
      allergies,
      ranking,
      totals: {
        children: childrenList.length,
        guardians,
        staff: staffList.length,
        activeStaff,
        activities: activitiesList.length,
        shifts: scheduleList.length,
        peak,
        avgHour,
        allergyRate: childrenList.length
          ? Math.round((allergies.withAllergy / childrenList.length) * 100)
          : 0,
      },
    }
  }, [childrenList, staffList, activitiesList, scheduleList, attendanceList])

  const { totals } = metrics

  return (
    <Box className="page-container balance-page">
      <Box className="page-header">
        <Typography variant="body2" fontWeight={700}>
          Visão geral do sistema
        </Typography>
      </Box>

      <Stack spacing={1.5} className="balance-stack">
        <Box className="balance-kpi-grid">
          <Kpi
            icon={<ChildCareIcon />}
            label="Crianças"
            value={totals.children}
            hint="cadastradas"
          />
          <Kpi
            icon={<FamilyRestroomIcon />}
            label="Responsáveis"
            value={totals.guardians}
            hint="únicos"
          />
          <Kpi
            icon={<PeopleIcon />}
            label="Professores"
            value={`${totals.activeStaff}/${totals.staff}`}
            hint="ativos / total"
          />
          <Kpi
            icon={<AccessTimeIcon />}
            label="Pico"
            value={totals.peak}
            hint="maior movimento"
          />
          <Kpi
            icon={<TrendingUpIcon />}
            label="Média/hora"
            value={totals.avgHour}
            hint="crianças por horário"
          />
          <Kpi
            icon={<EventNoteIcon />}
            label="Atividades"
            value={totals.activities}
            hint={`${totals.shifts} turnos`}
          />
        </Box>

        <ChartCard
          title="Movimento por horário"
          subtitle="Entradas registradas ao longo do dia"
          tall
        >
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={metrics.hourly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="moveFill" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#moveFill)"
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
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={metrics.hourly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
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

        <Box className="balance-split">
          <ChartCard title="Planos" subtitle="Mensal × Anual">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={metrics.plans}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={42}
                  outerRadius={62}
                  paddingAngle={3}
                  stroke="none"
                >
                  {metrics.plans.map((_, i) => (
                    <Cell key={i} fill={CHART.plans[i % CHART.plans.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CleanTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent="center" sx={{ mt: 0.5 }}>
              {metrics.plans.map((p, i) => (
                <Box key={p.name} className="balance-legend-item">
                  <span style={{ background: CHART.plans[i % CHART.plans.length] }} />
                  {p.name} · {p.value}
                </Box>
              ))}
            </Stack>
          </ChartCard>

          <ChartCard title="Faixa etária" subtitle="Crianças por idade">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={metrics.ages} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={54}
                  tick={{ fill: CHART.muted, fontSize: 10, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CleanTooltip />} />
                <Bar dataKey="value" name="Crianças" radius={[0, 8, 8, 0]} maxBarSize={14}>
                  {metrics.ages.map((_, i) => (
                    <Cell key={i} fill={CHART.ages[i % CHART.ages.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Box>

        <ChartCard title="Saúde e alertas" subtitle="Alergias cadastradas">
          <Box className="balance-health">
            <Typography className="balance-health-rate">{totals.allergyRate}%</Typography>
            <Typography className="balance-health-label">com alergia</Typography>
            <Divider sx={{ my: 1.25, borderColor: 'rgba(15,23,42,0.08)' }} />
            <Stack spacing={0.75}>
              {metrics.allergies.list.length === 0 ? (
                <Typography className="balance-card-sub">Nenhuma alergia registrada</Typography>
              ) : (
                metrics.allergies.list.map(a => (
                  <Box key={a.name} className="balance-allergy-row">
                    <Typography component="span">{a.name}</Typography>
                    <Typography component="span" className="balance-allergy-count">{a.value}</Typography>
                  </Box>
                ))
              )}
            </Stack>
            <Typography className="balance-card-sub" sx={{ mt: 1.25 }}>
              Sem alergia: {metrics.allergies.none}
            </Typography>
          </Box>
        </ChartCard>

        <ChartCard
          title="Ranking de participações"
          subtitle="Pódio das crianças que mais frequentam o parquinho"
        >
          {metrics.ranking.length === 0 ? (
            <Typography className="balance-card-sub">Nenhuma participação registrada</Typography>
          ) : (
            <Box className="balance-podium-wrap">
              {!rankExpanded && (
                <Box className="balance-podium">
                  {[metrics.ranking[1], metrics.ranking[0], metrics.ranking[2]].map((item, visualIdx) => {
                    if (!item) return <Box key={`empty-${visualIdx}`} className="balance-podium-slot is-empty" />
                    const place = item.rank
                    const tone = place === 1 ? 'gold' : place === 2 ? 'silver' : 'bronze'
                    return (
                      <Box
                        key={item.childId}
                        className={`balance-podium-slot place-${place}`}
                      >
                        <Box className={`balance-podium-crown place-${place}`}>
                          <ModernTrophy tone={tone} />
                        </Box>
                        <Typography className="balance-podium-name">{item.name}</Typography>
                        <Box className={`balance-podium-block place-${place}`}>
                          <span className="balance-podium-place">
                            <em>{place}</em>
                          </span>
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              )}

              {rankExpanded && (
                <Stack spacing={1} className="balance-rank-list">
                  {metrics.ranking.map(item => (
                    <Box
                      key={item.childId}
                      className={`balance-rank-row rank-${item.rank <= 3 ? item.rank : 'n'}`}
                    >
                      <Box className="balance-rank-badge">{item.rank}º</Box>
                      <Box className="balance-rank-main">
                        <Typography className="balance-rank-name">{item.name}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}

              <Box className="balance-podium-expand">
                <Typography className="balance-podium-expand-label">
                  {rankExpanded ? 'Voltar ao pódio' : 'Ver ranking completo'}
                </Typography>
                <IconButton
                  size="small"
                  className={`balance-podium-expand-btn ${rankExpanded ? 'is-open' : ''}`}
                  onClick={() => setRankExpanded(v => !v)}
                  aria-label={rankExpanded ? 'Voltar ao pódio' : 'Expandir ranking completo'}
                >
                  <ExpandMoreIcon />
                </IconButton>
              </Box>
            </Box>
          )}
        </ChartCard>

      </Stack>
    </Box>
  )
}
