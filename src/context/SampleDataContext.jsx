import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  childrenData as seedChildren,
  staffData as seedStaff,
  activitiesData as seedActivities,
  mealsData as seedMeals,
  staffScheduleData as seedStaffSchedule,
  attendanceData as seedAttendance,
  buildSamplePresenceSessions,
} from '../data/mockData'
import { syncedStorage } from '../firebase/syncedStorage'
import { useAuth } from './AuthContext'
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
  const { tenantId, unitId } = useAuth()
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
    const kids = seedChildren.map((c) => ({ ...c, unitId: unitId || c.unitId || null }))
    setChildrenListState(kids)
    setStaffListState(seedStaff.map((s) => ({ ...s })))
    setActivitiesListState(seedActivities.map((a) => ({ ...a })))
    setScheduleListState(seedStaffSchedule.map((s) => ({ ...s })))
    setAttendanceListState(seedAttendance.map((a) => ({ ...a })))
    seedPresenceFromSamples(tenantId, unitId, buildSamplePresenceSessions(unitId))
  }, [tenantId, unitId])

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
  }, [tenantId, unitId, keys])

  useEffect(() => {
    if (enabled) applySeed()
    else loadPersisted()
  }, [tenantId, unitId, enabled, applySeed, loadPersisted])

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
