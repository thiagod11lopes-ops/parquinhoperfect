function pad(n) {
  return String(n).padStart(2, '0')
}

export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function storageKey(tenantId) {
  return `parquinhoOccupancyHistory:${tenantId || 'tenant'}`
}

function loadRaw(tenantId) {
  try {
    const raw = localStorage.getItem(storageKey(tenantId))
    if (!raw) return { days: {} }
    const parsed = JSON.parse(raw)
    return {
      days: parsed?.days && typeof parsed.days === 'object' ? parsed.days : {},
    }
  } catch {
    return { days: {} }
  }
}

function persist(tenantId, data) {
  localStorage.setItem(storageKey(tenantId), JSON.stringify(data))
}

function shiftDateKey(daysAgo) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return todayKey(d)
}

function formatDayLabel(dateKey) {
  const [y, m, day] = dateKey.split('-').map(Number)
  if (!y || !m || !day) return dateKey
  return `${pad(day)}/${pad(m)}`
}

function weekStartKey(dateKey) {
  const [y, m, day] = dateKey.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  const weekday = d.getDay() // 0 domingo
  const diff = weekday === 0 ? 6 : weekday - 1 // segunda como início
  d.setDate(d.getDate() - diff)
  return todayKey(d)
}

function formatWeekLabel(dateKey) {
  return `Sem ${formatDayLabel(dateKey)}`
}

/**
 * Grava snapshot do dia atual para cada unidade (máx. do dia).
 * rows: [{ id, present, max }]
 */
export function recordOccupancySnapshot(tenantId, rows) {
  if (!tenantId || !Array.isArray(rows) || !rows.length) return
  const data = loadRaw(tenantId)
  const date = todayKey()
  if (!data.days[date]) data.days[date] = {}

  rows.forEach((row) => {
    if (!row?.id) return
    data.days[date][row.id] = {
      present: Math.max(0, Number(row.present) || 0),
      max: Math.max(1, Number(row.max) || 1),
      name: row.name || '',
      updatedAt: new Date().toISOString(),
    }
  })

  // Mantém ~90 dias
  const keys = Object.keys(data.days).sort()
  if (keys.length > 90) {
    keys.slice(0, keys.length - 90).forEach((k) => {
      delete data.days[k]
    })
  }

  persist(tenantId, data)
}

/**
 * Série diária (últimos N dias) com totais e % de ocupação.
 * fallbackMax: capacidade atual (quando o dia ainda não tem snapshot).
 */
export function buildDailyHistory(tenantId, unitIds, days = 7, fallbackMax = 0) {
  const data = loadRaw(tenantId)
  const ids = unitIds || []
  const series = []
  let lastMax = Math.max(0, Number(fallbackMax) || 0)

  for (let i = days - 1; i >= 0; i -= 1) {
    const key = shiftDateKey(i)
    const day = data.days[key] || {}
    let present = 0
    let max = 0
    let hasData = false
    ids.forEach((id) => {
      const cell = day[id]
      if (!cell) return
      hasData = true
      present += Number(cell.present) || 0
      max += Number(cell.max) || 0
    })
    if (max > 0) lastMax = max
    else if (!hasData) max = lastMax
    series.push({
      key,
      label: formatDayLabel(key),
      presentes: hasData ? present : 0,
      capacidade: max,
      pct: max > 0 ? Math.min(100, Math.round((present / max) * 100)) : 0,
    })
  }

  return series
}

/**
 * Agrega por semana (últimas N semanas), média de ocupação.
 */
export function buildWeeklyHistory(tenantId, unitIds, weeks = 6, fallbackMax = 0) {
  const daily = buildDailyHistory(tenantId, unitIds, weeks * 7, fallbackMax)
  const buckets = {}

  daily.forEach((point) => {
    const wk = weekStartKey(point.key)
    if (!buckets[wk]) {
      buckets[wk] = { key: wk, presentSum: 0, maxSum: 0, samples: 0 }
    }
    buckets[wk].presentSum += point.presentes
    buckets[wk].maxSum += point.capacidade
    buckets[wk].samples += 1
  })

  return Object.keys(buckets)
    .sort()
    .slice(-weeks)
    .map((wk) => {
      const b = buckets[wk]
      const presentes = b.samples ? Math.round(b.presentSum / b.samples) : 0
      const capacidade = b.samples ? Math.round(b.maxSum / b.samples) : 0
      return {
        key: wk,
        label: formatWeekLabel(wk),
        presentes,
        capacidade,
        pct: capacidade > 0 ? Math.min(100, Math.round((presentes / capacidade) * 100)) : 0,
      }
    })
}
