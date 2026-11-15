import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { syncedStorage } from '../firebase/syncedStorage'
import { useAuth } from './AuthContext'
import {
  DEFAULT_UNIT_MAX,
  loadUnitMaxChildren,
  saveUnitMaxChildren,
} from '../utils/unitCapacity'

const ParkSettingsContext = createContext(null)

const INFO_STORAGE_KEY_LEGACY = 'parquinhoParkInfo'
export const DEFAULT_MAX_CHILDREN = DEFAULT_UNIT_MAX
export const MAX_INTERVALS_PER_DAY = 4

export const WEEK_DAYS = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca', label: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta-feira' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
]

export const DEFAULT_INTERVAL = { open: '07:00', close: '19:00' }

function makeDay(closed, intervals) {
  return {
    closed: Boolean(closed),
    intervals: intervals.map((item) => ({
      open: item.open,
      close: item.close,
    })),
  }
}

export const DEFAULT_HOURS = {
  segunda: makeDay(false, [{ open: '07:00', close: '19:00' }]),
  terca: makeDay(false, [{ open: '07:00', close: '19:00' }]),
  quarta: makeDay(false, [{ open: '07:00', close: '19:00' }]),
  quinta: makeDay(false, [{ open: '07:00', close: '19:00' }]),
  sexta: makeDay(false, [{ open: '07:00', close: '19:00' }]),
  sabado: makeDay(false, [{ open: '08:00', close: '14:00' }]),
  domingo: makeDay(true, [{ open: '07:00', close: '19:00' }]),
}

export const DEFAULT_GENERAL_INFO = ''

function normalizeInterval(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_INTERVAL }
  return {
    open: typeof raw.open === 'string' && raw.open ? raw.open : '07:00',
    close: typeof raw.close === 'string' && raw.close ? raw.close : '19:00',
  }
}

export function normalizeDay(raw) {
  if (!raw || typeof raw !== 'object') {
    return makeDay(false, [{ ...DEFAULT_INTERVAL }])
  }

  let intervals = []
  if (Array.isArray(raw.intervals) && raw.intervals.length) {
    intervals = raw.intervals.map(normalizeInterval).slice(0, MAX_INTERVALS_PER_DAY)
  } else if (raw.open || raw.close) {
    intervals = [normalizeInterval({ open: raw.open, close: raw.close })]
  } else {
    intervals = [{ ...DEFAULT_INTERVAL }]
  }

  return makeDay(Boolean(raw.closed), intervals)
}

function normalizeHours(raw) {
  const base = {}
  WEEK_DAYS.forEach(({ key }) => {
    base[key] = normalizeDay(raw?.[key] ?? DEFAULT_HOURS[key])
  })
  return base
}

export function formatDayHours(day) {
  if (!day || day.closed) return 'Fechado'
  const intervals = Array.isArray(day.intervals) ? day.intervals : []
  if (!intervals.length) return 'Sem intervalos'
  return intervals.map((item) => `${item.open} – ${item.close}`).join(' · ')
}

function scopeKey(base, tenantId, unitId) {
  const t = tenantId || 'tenant'
  const u = unitId || 'global'
  return `${base}:${t}:${u}`
}

function loadParkInfo(tenantId, unitId) {
  try {
    const key = scopeKey(INFO_STORAGE_KEY_LEGACY, tenantId, unitId)
    let raw = syncedStorage.getItem(key)
    if (!raw && unitId) {
      raw = syncedStorage.getItem(INFO_STORAGE_KEY_LEGACY)
      if (raw) syncedStorage.setItem(key, raw)
    }
    if (!raw) {
      return {
        hours: normalizeHours(null),
        generalInfo: DEFAULT_GENERAL_INFO,
      }
    }
    const parsed = JSON.parse(raw)
    return {
      hours: normalizeHours(parsed?.hours),
      generalInfo: typeof parsed?.generalInfo === 'string'
        ? parsed.generalInfo
        : DEFAULT_GENERAL_INFO,
    }
  } catch {
    return {
      hours: normalizeHours(null),
      generalInfo: DEFAULT_GENERAL_INFO,
    }
  }
}

function persistParkInfo(tenantId, unitId, info) {
  const key = scopeKey(INFO_STORAGE_KEY_LEGACY, tenantId, unitId)
  syncedStorage.setItem(key, JSON.stringify({
    hours: normalizeHours(info.hours),
    generalInfo: typeof info.generalInfo === 'string' ? info.generalInfo : '',
  }))
  window.dispatchEvent(new CustomEvent('parquinho-park-info'))
}

export function useParkSettings() {
  const ctx = useContext(ParkSettingsContext)
  if (!ctx) throw new Error('useParkSettings must be used within ParkSettingsProvider')
  return ctx
}

export function ParkSettingsProvider({ children }) {
  const { tenantId, unitId } = useAuth()
  const [maxChildren, setMaxChildrenState] = useState(() => loadUnitMaxChildren(tenantId, unitId))
  const [hours, setHoursState] = useState(() => loadParkInfo(tenantId, unitId).hours)
  const [generalInfo, setGeneralInfoState] = useState(() => loadParkInfo(tenantId, unitId).generalInfo)

  const reloadAll = useCallback(() => {
    const next = loadParkInfo(tenantId, unitId)
    setHoursState(next.hours)
    setGeneralInfoState(next.generalInfo)
    setMaxChildrenState(loadUnitMaxChildren(tenantId, unitId))
  }, [tenantId, unitId])

  useEffect(() => {
    reloadAll()
  }, [reloadAll])

  useEffect(() => {
    const sync = () => reloadAll()
    window.addEventListener('storage', sync)
    window.addEventListener('parquinho-park-settings', sync)
    window.addEventListener('parquinho-park-info', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('parquinho-park-settings', sync)
      window.removeEventListener('parquinho-park-info', sync)
    }
  }, [reloadAll])

  const setMaxChildrenForUnit = useCallback((targetUnitId, value) => {
    const n = saveUnitMaxChildren(tenantId, targetUnitId || unitId, value)
    if (!targetUnitId || targetUnitId === unitId) {
      setMaxChildrenState(n)
    }
    return n
  }, [tenantId, unitId])

  const setMaxChildren = useCallback((value) => (
    setMaxChildrenForUnit(unitId, value)
  ), [setMaxChildrenForUnit, unitId])

  const saveParkInfo = useCallback((nextHours, nextGeneralInfo) => {
    const payload = {
      hours: normalizeHours(nextHours),
      generalInfo: typeof nextGeneralInfo === 'string' ? nextGeneralInfo : '',
    }
    persistParkInfo(tenantId, unitId, payload)
    setHoursState(payload.hours)
    setGeneralInfoState(payload.generalInfo)
    return payload
  }, [tenantId, unitId])

  return (
    <ParkSettingsContext.Provider value={{
      maxChildren,
      setMaxChildren,
      setMaxChildrenForUnit,
      hours,
      generalInfo,
      saveParkInfo,
      settingsUnitId: unitId || null,
    }}>
      {children}
    </ParkSettingsContext.Provider>
  )
}
