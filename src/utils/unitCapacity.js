import { syncedStorage } from '../firebase/syncedStorage'

const MAX_KEY = 'parquinhoMaxChildren'
export const DEFAULT_UNIT_MAX = 20

export function unitMaxStorageKey(tenantId, unitId) {
  return `${MAX_KEY}:${tenantId || 'tenant'}:${unitId || 'global'}`
}

function clampMax(value) {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n < 1) return DEFAULT_UNIT_MAX
  return Math.min(200, n)
}

/** Lotação máxima salva para a unidade (Informações / Painel). */
export function loadUnitMaxChildren(tenantId, unitId) {
  try {
    const key = unitMaxStorageKey(tenantId, unitId)
    let raw = syncedStorage.getItem(key)
    if (raw == null && unitId) {
      raw = syncedStorage.getItem(MAX_KEY)
    }
    if (raw == null) {
      try {
        raw = localStorage.getItem(key) ?? (unitId ? localStorage.getItem(MAX_KEY) : null)
      } catch {
        raw = null
      }
    }
    if (raw == null) return DEFAULT_UNIT_MAX
    return clampMax(raw)
  } catch {
    return DEFAULT_UNIT_MAX
  }
}

/** Persiste lotação máxima da unidade e notifica o app. */
export function saveUnitMaxChildren(tenantId, unitId, value) {
  const n = clampMax(value)
  const key = unitMaxStorageKey(tenantId, unitId)
  syncedStorage.setItem(key, String(n))
  try {
    localStorage.setItem(key, String(n))
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent('parquinho-park-settings'))
  return n
}

/**
 * Crianças presentes na unidade.
 * Sem unitId no cadastro legado → conta só na unidade ativa (fallbackUnitId).
 */
export function countUnitPresent(children, unitId, fallbackUnitId = null) {
  const list = Array.isArray(children) ? children : []
  return list.filter((c) => {
    if (c?.unitId) return c.unitId === unitId
    return Boolean(fallbackUnitId && unitId === fallbackUnitId)
  }).length
}

export function buildUnitsOccupancy({
  units,
  children,
  tenantId,
  activeUnitId,
}) {
  const rows = (units || []).map((unit) => {
    const max = loadUnitMaxChildren(tenantId, unit.id)
    const present = countUnitPresent(children, unit.id, activeUnitId)
    const remaining = Math.max(0, max - present)
    const pct = max > 0 ? Math.min(100, Math.round((present / max) * 100)) : 0
    return {
      id: unit.id,
      name: unit.name,
      present,
      max,
      remaining,
      pct,
      atLimit: present >= max,
      nearLimit: present < max && remaining <= 3,
    }
  })

  const totals = rows.reduce(
    (acc, row) => {
      acc.present += row.present
      acc.max += row.max
      return acc
    },
    { present: 0, max: 0 },
  )

  return {
    rows,
    totals: {
      ...totals,
      remaining: Math.max(0, totals.max - totals.present),
      pct: totals.max > 0 ? Math.min(100, Math.round((totals.present / totals.max) * 100)) : 0,
    },
    chart: rows.map((row) => ({
      name: row.name.length > 12 ? `${row.name.slice(0, 11)}…` : row.name,
      fullName: row.name,
      presentes: row.present,
      vagas: row.remaining,
      capacidade: row.max,
      pct: row.pct,
    })),
  }
}
