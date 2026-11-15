import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  childrenData as seedChildren,
  staffData as seedStaff,
  activitiesData as seedActivities,
  mealsData as seedMeals,
  staffScheduleData as seedStaffSchedule,
  attendanceData as seedAttendance,
  sampleUnitsData,
  buildSamplePresenceSessions,
} from '../data/mockData'
import { syncedStorage } from '../firebase/syncedStorage'
import { useAuth } from './AuthContext'
import { useTenant } from './TenantContext'
import { seedPresenceFromSamples, clearPresenceSamples } from './PresenceContext'

const SampleDataContext = createContext(null)

function loadEnabled() {
  const stored = syncedStorage.getItem('sampleDataEnabled')
  return stored === 'true'
}

function scope(prefix, tenantId, unitId) {
  return `${prefix}:${tenantId || 'tenant'}:${unitId || 'global'}`
}

function loadList(key) {
  try {
    const raw = syncedStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistList(key, list) {
  syncedStorage.setItem(key, JSON.stringify(Array.isArray(list) ? list : []))
}

export function useSampleData() {
  const ctx = useContext(SampleDataContext)
  if (!ctx) throw new Error('useSampleData must be used within SampleDataProvider')
  return ctx
}

export function SampleDataProvider({ children }) {
  const { tenantId, unitId, selectActiveUnit } = useAuth()
  const { seedSampleUnits, restoreUnitsAfterSample } = useTenant()
  const [enabled, setEnabled] = useState(loadEnabled)

  const [childrenList, setChildrenListState] = useState([])
  const [staffList, setStaffListState] = useState([])
  const [activitiesList, setActivitiesListState] = useState([])
  const [scheduleList, setScheduleListState] = useState([])
  const [attendanceList, setAttendanceListState] = useState([])

  const keys = {
    children: scope('parquinhoChildren', tenantId, unitId),
    staff: scope('parquinhoStaff', tenantId, unitId),
    activities: scope('parquinhoActivities', tenantId, unitId),
    schedule: scope('parquinhoSchedule', tenantId, unitId),
    attendance: scope('parquinhoAttendance', tenantId, unitId),
  }

  const applySeed = useCallback(() => {
    const unitsResult = seedSampleUnits(tenantId)
    const units = unitsResult?.units?.length ? unitsResult.units : sampleUnitsData
    const preferredId = (() => {
      try {
        const raw = localStorage.getItem('daycareUser')
        const parsed = raw ? JSON.parse(raw) : null
        return parsed?.unitId || null
      } catch {
        return null
      }
    })()
    const activeUnit = units.find((u) => u.id === preferredId) || units[0]
    if (activeUnit) {
      selectActiveUnit?.(activeUnit.id, activeUnit.name)
    }
    const activeId = activeUnit?.id || units[0]?.id || null
    const kids = seedChildren.map((c, index) => ({
      ...c,
      unitId: units[index % units.length]?.id || activeId,
    }))
    setChildrenListState(kids)
    setStaffListState(seedStaff.map((s) => ({ ...s })))
    setActivitiesListState(seedActivities.map((a) => ({ ...a })))
    setScheduleListState(seedStaffSchedule.map((s) => ({ ...s })))
    setAttendanceListState(seedAttendance.map((a, index) => ({
      ...a,
      unitId: units[index % units.length]?.id || activeId,
    })))
    seedPresenceFromSamples(tenantId, activeId, buildSamplePresenceSessions(activeId))
  }, [tenantId, seedSampleUnits, selectActiveUnit])

  const refreshPresenceForActiveUnit = useCallback(() => {
    if (!enabled || !unitId) return
    seedPresenceFromSamples(tenantId, unitId, buildSamplePresenceSessions(unitId))
  }, [enabled, tenantId, unitId])

  const loadPersisted = useCallback(() => {
    setChildrenListState(loadList(keys.children))
    setStaffListState(loadList(keys.staff))
    setActivitiesListState(loadList(keys.activities))
    setScheduleListState(loadList(keys.schedule))
    setAttendanceListState(loadList(keys.attendance))
  }, [keys.children, keys.staff, keys.activities, keys.schedule, keys.attendance])

  const clearAll = useCallback(() => {
    setChildrenListState([])
    setStaffListState([])
    setActivitiesListState([])
    setScheduleListState([])
    setAttendanceListState([])
    persistList(keys.children, [])
    persistList(keys.staff, [])
    persistList(keys.activities, [])
    persistList(keys.schedule, [])
    persistList(keys.attendance, [])
    clearPresenceSamples(tenantId, unitId)
    const restored = restoreUnitsAfterSample(tenantId)
    const first = restored?.units?.[0]
    if (first) selectActiveUnit?.(first.id, first.name)
  }, [tenantId, unitId, keys, restoreUnitsAfterSample, selectActiveUnit])

  useEffect(() => {
    if (enabled) applySeed()
    else loadPersisted()
    // Só re-semeia ao ligar o modo exemplo ou trocar de tenant — não a cada troca de unidade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, enabled])

  useEffect(() => {
    refreshPresenceForActiveUnit()
  }, [refreshPresenceForActiveUnit])

  useEffect(() => {
    const sync = () => {
      if (syncedStorage.getItem('sampleDataEnabled') === 'true') return
      loadPersisted()
    }
    window.addEventListener('parquinho-sample-data', sync)
    window.addEventListener('parquinho-cloud-sync', sync)
    return () => {
      window.removeEventListener('parquinho-sample-data', sync)
      window.removeEventListener('parquinho-cloud-sync', sync)
    }
  }, [loadPersisted])

  const toggleSampleData = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      syncedStorage.setItem('sampleDataEnabled', String(next))
      if (next) applySeed()
      else {
        clearAll()
      }
      return next
    })
  }, [applySeed, clearAll])

  const setChildrenList = useCallback((updater) => {
    setChildrenListState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (!enabled) persistList(keys.children, next)
      return next
    })
  }, [enabled, keys.children])

  const setStaffList = useCallback((updater) => {
    setStaffListState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (!enabled) persistList(keys.staff, next)
      return next
    })
  }, [enabled, keys.staff])

  const setActivitiesList = useCallback((updater) => {
    setActivitiesListState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (!enabled) persistList(keys.activities, next)
      return next
    })
  }, [enabled, keys.activities])

  const setScheduleList = useCallback((updater) => {
    setScheduleListState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (!enabled) persistList(keys.schedule, next)
      return next
    })
  }, [enabled, keys.schedule])

  const setAttendanceList = useCallback((updater) => {
    setAttendanceListState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (!enabled) persistList(keys.attendance, next)
      return next
    })
  }, [enabled, keys.attendance])

  const value = {
    enabled,
    toggleSampleData,
    childrenList,
    setChildrenList,
    staffList,
    setStaffList,
    activitiesList,
    setActivitiesList,
    scheduleList,
    setScheduleList,
    attendanceList,
    setAttendanceList,
    meals: enabled ? seedMeals : [],
  }

  return (
    <SampleDataContext.Provider value={value}>
      {children}
    </SampleDataContext.Provider>
  )
}
