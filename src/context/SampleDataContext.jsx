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
import { useAuth } from './AuthContext'
import { seedPresenceFromSamples, clearPresenceSamples } from './PresenceContext'

const SampleDataContext = createContext(null)

function loadEnabled() {
  const stored = localStorage.getItem('sampleDataEnabled')
  return stored === 'true'
}

export function useSampleData() {
  const ctx = useContext(SampleDataContext)
  if (!ctx) throw new Error('useSampleData must be used within SampleDataProvider')
  return ctx
}

export function SampleDataProvider({ children }) {
  const { tenantId, unitId } = useAuth()
  const [enabled, setEnabled] = useState(loadEnabled)

  const [childrenList, setChildrenList] = useState([])
  const [staffList, setStaffList] = useState([])
  const [activitiesList, setActivitiesList] = useState([])
  const [scheduleList, setScheduleList] = useState([])
  const [attendanceList, setAttendanceList] = useState([])

  const applySeed = useCallback(() => {
    const kids = seedChildren.map((c) => ({ ...c, unitId: unitId || c.unitId || null }))
    setChildrenList(kids)
    setStaffList(seedStaff.map((s) => ({ ...s })))
    setActivitiesList(seedActivities.map((a) => ({ ...a })))
    setScheduleList(seedStaffSchedule.map((s) => ({ ...s })))
    setAttendanceList(seedAttendance.map((a) => ({ ...a })))
    seedPresenceFromSamples(tenantId, unitId, buildSamplePresenceSessions(unitId))
  }, [tenantId, unitId])

  const clearAll = useCallback(() => {
    setChildrenList([])
    setStaffList([])
    setActivitiesList([])
    setScheduleList([])
    setAttendanceList([])
    clearPresenceSamples(tenantId, unitId)
  }, [tenantId, unitId])

  useEffect(() => {
    if (enabled) applySeed()
    else clearAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reseed ao mudar unidade/tenant
  }, [tenantId, unitId])

  const toggleSampleData = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      localStorage.setItem('sampleDataEnabled', String(next))
      if (next) applySeed()
      else clearAll()
      return next
    })
  }, [applySeed, clearAll])

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
