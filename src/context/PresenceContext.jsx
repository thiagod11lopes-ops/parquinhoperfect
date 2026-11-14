import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { syncedStorage } from '../firebase/syncedStorage'
import { useAuth } from './AuthContext'
import { useParkSettings } from './ParkSettingsContext'

const PresenceContext = createContext(null)

const STORAGE_PREFIX = 'parquinhoPresence'
const EVENT_NAME = 'parquinho-presence'

function storageKey(tenantId, unitId) {
  return `${STORAGE_PREFIX}:${tenantId || 'tenant'}:${unitId || 'global'}`
}

function todayKey() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatClock(date = new Date()) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function emptyBucket() {
  return { date: todayKey(), active: [], dayLog: [], pendingExit: null }
}

function loadBucket(tenantId, unitId) {
  try {
    const raw = syncedStorage.getItem(storageKey(tenantId, unitId))
    if (!raw) return emptyBucket()
    const parsed = JSON.parse(raw)
    const date = parsed.date || todayKey()
    if (date !== todayKey()) return emptyBucket()
    return {
      date,
      active: Array.isArray(parsed.active) ? parsed.active : [],
      dayLog: Array.isArray(parsed.dayLog) ? parsed.dayLog : [],
      pendingExit: parsed.pendingExit || null,
    }
  } catch {
    return emptyBucket()
  }
}

export function buildExitPayload({
  session,
  tenantId,
  unitId,
  staffName,
}) {
  if (!session) return ''
  return JSON.stringify({
    type: 'parquinho-exit',
    sessionId: session.id,
    childId: session.childId,
    childName: session.childName,
    guardian: session.guardian || null,
    tenantId: tenantId || null,
    unitId: unitId || null,
    staffName: staffName || 'Equipe',
    issuedAt: new Date().toISOString(),
  })
}

export function parseExitPayload(payloadText = '') {
  if (!payloadText) return null
  try {
    const data = JSON.parse(payloadText)
    if (data.type && data.type !== 'parquinho-exit') return null
    return data
  } catch {
    return null
  }
}

function persistBucket(tenantId, unitId, bucket) {
  syncedStorage.setItem(storageKey(tenantId, unitId), JSON.stringify(bucket))
  window.dispatchEvent(new CustomEvent(EVENT_NAME, {
    detail: { tenantId, unitId },
  }))
}

/** Usado pelo botão de dados de exemplo para colocar crianças no parquinho. */
export function seedPresenceFromSamples(tenantId, unitId, sessions) {
  const list = Array.isArray(sessions) ? sessions : []
  const bucket = {
    date: todayKey(),
    active: list.map((s) => ({ ...s, status: 'in', unitId: unitId || s.unitId || null })),
    dayLog: list.map((s) => ({ ...s, status: 'in', unitId: unitId || s.unitId || null })),
    pendingExit: null,
  }
  persistBucket(tenantId, unitId, bucket)
  return bucket
}

export function clearPresenceSamples(tenantId, unitId) {
  persistBucket(tenantId, unitId, emptyBucket())
}

function normalizeBucket(bucket) {
  if (!bucket || bucket.date !== todayKey()) return emptyBucket()
  return {
    ...emptyBucket(),
    ...bucket,
    date: todayKey(),
    active: Array.isArray(bucket.active) ? bucket.active : [],
    dayLog: Array.isArray(bucket.dayLog) ? bucket.dayLog : [],
    pendingExit: bucket.pendingExit || null,
  }
}

export function usePresence() {
  const ctx = useContext(PresenceContext)
  if (!ctx) throw new Error('usePresence must be used within PresenceProvider')
  return ctx
}

export function PresenceProvider({ children }) {
  const { tenantId, unitId } = useAuth()
  const { maxChildren } = useParkSettings()
  const [bucket, setBucket] = useState(() => loadBucket(tenantId, unitId))

  const reload = useCallback(() => {
    setBucket(loadBucket(tenantId, unitId))
  }, [tenantId, unitId])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || !e.key.startsWith(STORAGE_PREFIX)) return
      reload()
    }
    const onCustom = () => reload()
    window.addEventListener('storage', onStorage)
    window.addEventListener(EVENT_NAME, onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(EVENT_NAME, onCustom)
    }
  }, [reload])

  const activeSessions = bucket.active
  const dayLog = bucket.dayLog
  const presentCount = activeSessions.length
  const atCapacity = presentCount >= maxChildren

  const findActiveByChild = useCallback((childId, childName) => {
    return activeSessions.find((s) => (
      (childId != null && String(s.childId) === String(childId))
      || (childName && (s.childName || '').toLowerCase() === String(childName).toLowerCase())
    )) || null
  }, [activeSessions])

  const checkIn = useCallback(({
    childId,
    childName,
    guardian,
    sessionId,
    unitId: sessionUnitId,
  }) => {
    if (!childName) return { success: false, error: 'Criança inválida.' }

    const current = normalizeBucket(loadBucket(tenantId, unitId))
    const already = current.active.find((s) => (
      (childId != null && String(s.childId) === String(childId))
      || (s.childName || '').toLowerCase() === String(childName).toLowerCase()
    ))
    if (already) {
      return { success: false, error: 'A criança já está no parquinho.', session: already }
    }
    if (current.active.length >= maxChildren) {
      return {
        success: false,
        error: `Lotação atingida (${maxChildren}). Sem fila de espera — tente mais tarde.`,
        code: 'capacity',
      }
    }

    const started = {
      id: sessionId || Date.now(),
      childId: childId ?? null,
      childName,
      guardian: guardian || 'Responsável',
      status: 'in',
      entryTime: formatClock(),
      entryAt: new Date().toISOString(),
      exitTime: null,
      exitAt: null,
      date: todayKey(),
      unitId: sessionUnitId || unitId || null,
      confirmed: true,
    }
    const next = {
      ...current,
      date: todayKey(),
      active: [started, ...current.active],
      dayLog: [started, ...current.dayLog],
    }
    persistBucket(tenantId, unitId, next)
    setBucket(next)
    return { success: true, session: started }
  }, [tenantId, unitId, maxChildren])

  const checkOut = useCallback(({ childId, childName, sessionId, payloadText } = {}) => {
    const fromQr = parseExitPayload(payloadText)
    if (payloadText && !fromQr) {
      return { success: false, error: 'QR inválido para saída.' }
    }

    const targetSessionId = fromQr?.sessionId ?? sessionId
    const targetChildId = fromQr?.childId ?? childId
    const targetChildName = fromQr?.childName ?? childName

    const current = normalizeBucket(loadBucket(tenantId, unitId))
    const idx = current.active.findIndex((s) => {
      if (targetSessionId != null && String(s.id) === String(targetSessionId)) return true
      if (targetChildId != null && String(s.childId) === String(targetChildId)) return true
      if (targetChildName && (s.childName || '').toLowerCase() === String(targetChildName).toLowerCase()) {
        return true
      }
      return false
    })
    if (idx < 0) {
      return { success: false, error: 'Não há sessão ativa para saída.' }
    }

    const ended = {
      ...current.active[idx],
      status: 'out',
      exitTime: formatClock(),
      exitAt: new Date().toISOString(),
      confirmed: true,
    }
    const active = current.active.filter((_, i) => i !== idx)
    let nextDayLog = current.dayLog.map((row) => (
      String(row.id) === String(ended.id) ? ended : row
    ))
    if (!nextDayLog.some((row) => String(row.id) === String(ended.id))) {
      nextDayLog = [ended, ...nextDayLog]
    }
    const next = { ...current, active, dayLog: nextDayLog, pendingExit: null }
    persistBucket(tenantId, unitId, next)
    setBucket(next)
    return { success: true, session: ended }
  }, [tenantId, unitId])

  const setExitTarget = useCallback((session, staffName) => {
    if (!session) return { success: false, error: 'Selecione uma criança.' }
    const current = normalizeBucket(loadBucket(tenantId, unitId))
    const stillActive = current.active.some((s) => String(s.id) === String(session.id))
    if (!stillActive) {
      return { success: false, error: 'Esta criança não está mais no parquinho.' }
    }
    const payload = buildExitPayload({ session, tenantId, unitId, staffName })
    const pendingExit = {
      sessionId: session.id,
      childId: session.childId,
      childName: session.childName,
      guardian: session.guardian || null,
      staffName: staffName || 'Equipe',
      payload,
      issuedAt: new Date().toISOString(),
    }
    const next = { ...current, pendingExit }
    persistBucket(tenantId, unitId, next)
    setBucket(next)
    return { success: true, pendingExit }
  }, [tenantId, unitId])

  const clearExitTarget = useCallback(() => {
    const current = normalizeBucket(loadBucket(tenantId, unitId))
    const next = { ...current, pendingExit: null }
    persistBucket(tenantId, unitId, next)
    setBucket(next)
  }, [tenantId, unitId])

  const pendingExit = bucket.pendingExit || null
  const exitPayload = pendingExit?.payload || ''

  const value = {
    activeSessions,
    dayLog,
    presentCount,
    maxChildren,
    atCapacity,
    remaining: Math.max(0, maxChildren - presentCount),
    findActiveByChild,
    checkIn,
    checkOut,
    setExitTarget,
    clearExitTarget,
    pendingExit,
    exitPayload,
    today: bucket.date,
  }

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  )
}
