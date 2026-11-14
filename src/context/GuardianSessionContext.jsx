import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { useSampleData } from './SampleDataContext'
import { useCallBridge } from './CallBridgeContext'
import { useAppNotifications } from './AppNotificationsContext'
import { usePresence } from './PresenceContext'

const GuardianSessionContext = createContext(null)

const STORAGE_KEY = 'parquinhoGuardianSession'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function nowIso() {
  return new Date().toISOString()
}

function formatClock(date = new Date()) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function toDateKey(iso) {
  if (!iso) {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return String(iso).slice(0, 10)
}

export function useGuardianSession() {
  const ctx = useContext(GuardianSessionContext)
  if (!ctx) throw new Error('useGuardianSession must be used within GuardianSessionProvider')
  return ctx
}

export function GuardianSessionProvider({ children }) {
  const { user, isResponsavel, tenantId, unitId } = useAuth()
  const { childrenList, setAttendanceList } = useSampleData()
  const { activeCall: bridgeCall, acknowledgeCall: acknowledgeBridgeCall, startCall } = useCallBridge()
  const { pushNotification } = useAppNotifications()
  const {
    findActiveByChild,
    checkIn,
    checkOut,
    exitPayload,
    pendingExit,
    presentCount,
    maxChildren,
    atCapacity,
  } = usePresence()
  const [alerts, setAlerts] = useState([])
  const [history, setHistory] = useState([])
  const [activeCall, setActiveCall] = useState(null)
  const [lastConfirmation, setLastConfirmation] = useState(null)
  const [hydrated, setHydrated] = useState(false)

  const child = useMemo(() => {
    if (!isResponsavel || !user) return null
    const byId = user.childId
      ? childrenList.find(c => String(c.id) === String(user.childId))
      : null
    if (byId) return byId
    const byName = user.childName
      ? childrenList.find(c => (c.name || '').toLowerCase() === (user.childName || '').toLowerCase())
      : null
    if (byName) return byName
    const byGuardian = childrenList.find(
      c => (c.guardian || '').toLowerCase() === (user.name || '').toLowerCase()
    )
    return byGuardian || {
      id: user.childId || `child-${user.email || user.id || 'resp'}`,
      name: user.childName || 'Criança',
      age: user.childAge ?? null,
      guardian: user.name,
      allergies: user.childAllergies || 'Nenhuma',
      plan: user.childPlan || 'Mensal',
      phone: user.phone || '',
      unitId: user.unitId || null,
    }
  }, [childrenList, isResponsavel, user])

  const liveSession = useMemo(() => {
    if (!child) return null
    return findActiveByChild(child.id, child.name)
  }, [child, findActiveByChild])

  const entryPayload = useMemo(() => {
    if (!child || !user) return ''
    return JSON.stringify({
      type: 'parquinho-entry',
      childId: child.id,
      childName: child.name,
      guardianId: user.id,
      guardianName: user.name,
      unitId: unitId || child.unitId || null,
      issuedAt: new Date().toISOString(),
    })
  }, [child, user, unitId])

  useEffect(() => {
    if (!isResponsavel || !user) {
      setHydrated(false)
      return
    }
    const stored = loadState()
    if (!stored || stored.userId !== user.id) {
      setAlerts([])
      setHistory([])
      setActiveCall(null)
      setLastConfirmation(null)
      setHydrated(true)
      return
    }
    setAlerts(stored.alerts || [])
    setHistory(Array.isArray(stored.history) ? stored.history : [])
    setLastConfirmation(stored.lastConfirmation || null)
    setActiveCall(null)
    setHydrated(true)
  }, [isResponsavel, user])

  useEffect(() => {
    if (!isResponsavel || !user || !hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      userId: user.id,
      alerts,
      history,
      lastConfirmation,
    }))
  }, [alerts, history, hydrated, isResponsavel, lastConfirmation, user])

  useEffect(() => {
    if (!isResponsavel || !child) return

    if (!bridgeCall || bridgeCall.status !== 'ringing') {
      setActiveCall(prev => (prev?.fromBridge ? null : prev))
      return
    }

    const matchesChild = bridgeCall.childId == null
      || String(bridgeCall.childId) === String(child.id)
      || (bridgeCall.childName || '').toLowerCase() === (child.name || '').toLowerCase()

    if (!matchesChild) return

    setActiveCall({
      id: bridgeCall.callId,
      childName: bridgeCall.childName || child.name,
      message: bridgeCall.message,
      kind: bridgeCall.kind || 'normal',
      at: bridgeCall.attemptStartedAt || nowIso(),
      time: formatClock(),
      status: 'ringing',
      attempt: bridgeCall.attempt,
      ringToken: bridgeCall.ringToken,
      fromBridge: true,
    })

    setAlerts(prev => {
      const exists = prev.some(
        a => a.id === bridgeCall.callId && a.attempt === bridgeCall.attempt
      )
      if (exists) return prev
      return [{
        id: bridgeCall.callId,
        childName: bridgeCall.childName || child.name,
        message: bridgeCall.message,
        kind: bridgeCall.kind || 'normal',
        at: bridgeCall.attemptStartedAt || nowIso(),
        time: formatClock(),
        status: 'received',
        attempt: bridgeCall.attempt,
        fromBridge: true,
      }, ...prev]
    })
  }, [bridgeCall, child, isResponsavel])

  const checkInWithProfessor = useCallback(() => {
    if (!child) return { success: false, error: 'Nenhuma criança vinculada.' }
    const result = checkIn({
      childId: child.id,
      childName: child.name,
      guardian: child.guardian || user?.name || 'Responsável',
      unitId: unitId || child.unitId || null,
    })
    if (!result.success) return result

    const started = result.session
    setLastConfirmation({
      kind: 'entry',
      at: started.entryAt,
      time: started.entryTime,
      childName: started.childName,
      message: `Entrada confirmada às ${started.entryTime}.`,
    })
    pushNotification({
      type: 'entry',
      title: 'Entrada confirmada',
      message: `${child.name} entrou às ${started.entryTime}.`,
      path: isResponsavel ? '/responsavel' : '/presenca',
      tenantId,
      unitId: unitId || child.unitId || null,
      forRoles: ['administrador', 'gerente', 'professor', 'responsavel'],
    })
    return { success: true, session: started }
  }, [child, checkIn, user, pushNotification, isResponsavel, tenantId, unitId])

  const completeExitWithProfessorQr = useCallback((payloadText = '') => {
    if (!child && !liveSession) {
      return { success: false, error: 'Não há sessão ativa para saída.' }
    }

    const text = payloadText || exitPayload || pendingExit?.payload || ''
    if (!text) {
      return {
        success: false,
        error: 'A equipe ainda não gerou o QR de saída desta criança.',
      }
    }

    let parsed = null
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = null
    }

    if (parsed?.type && parsed.type !== 'parquinho-exit') {
      return { success: false, error: 'QR inválido para saída.' }
    }

    if (parsed?.childId != null && child?.id != null
      && String(parsed.childId) !== String(child.id)) {
      return { success: false, error: 'Este QR é de outra criança.' }
    }
    if (parsed?.childName && child?.name
      && String(parsed.childName).toLowerCase() !== String(child.name).toLowerCase()) {
      return { success: false, error: 'Este QR é de outra criança.' }
    }

    const result = checkOut({
      childId: parsed?.childId || child?.id || liveSession?.childId,
      childName: parsed?.childName || child?.name || liveSession?.childName,
      sessionId: parsed?.sessionId || liveSession?.id,
      payloadText: text,
    })
    if (!result.success) return result

    const ended = result.session
    setHistory(prev => [ended, ...prev])
    setLastConfirmation({
      kind: 'exit',
      at: ended.exitAt,
      time: ended.exitTime,
      childName: ended.childName,
      message: `Saída confirmada às ${ended.exitTime}.`,
      entryTime: ended.entryTime,
    })

    setAttendanceList(prev => {
      const row = {
        id: ended.id,
        childId: ended.childId,
        childName: ended.childName,
        date: ended.date || toDateKey(ended.entryAt),
        entryTime: ended.entryTime,
        exitTime: ended.exitTime,
        guardian: ended.guardian,
      }
      const exists = prev.some(a => String(a.id) === String(row.id))
      if (exists) {
        return prev.map(a => (String(a.id) === String(row.id) ? { ...a, ...row } : a))
      }
      return [row, ...prev]
    })

    pushNotification({
      type: 'exit',
      title: 'Saída confirmada',
      message: `${ended.childName} saiu às ${ended.exitTime}.`,
      path: isResponsavel ? '/responsavel/historico' : '/presenca',
      tenantId,
      unitId: unitId || child?.unitId || null,
      forRoles: ['administrador', 'gerente', 'professor', 'responsavel'],
    })

    return { success: true, session: ended }
  }, [
    child, liveSession, checkOut, setAttendanceList, pushNotification,
    isResponsavel, tenantId, unitId, exitPayload, pendingExit,
  ])

  const simulateIncomingCall = useCallback((message) => {
    if (!child) return
    startCall({
      childId: child.id,
      childName: child.name,
      guardianName: user?.name || child.guardian || 'Responsável',
      message: message || `${child.name} precisa de auxílio no Parquinho Perfect Body`,
    })
  }, [child, startCall, user])

  const acknowledgeCall = useCallback(() => {
    if (!activeCall) return
    acknowledgeBridgeCall({ guardianName: user?.name || 'Responsável' })
    setAlerts(prev => prev.map(a => (
      a.id === activeCall.id ? { ...a, status: 'acknowledged' } : a
    )))
    setActiveCall(null)
  }, [acknowledgeBridgeCall, activeCall, user])

  const markSessionEndingSoon = useCallback(() => {
    if (!child) return
    startCall({
      childId: child.id,
      childName: child.name,
      guardianName: user?.name || child.guardian || 'Responsável',
      message: `Sessão de ${child.name} está encerrando. Por favor, busque no Parquinho Perfect Body.`,
    })
  }, [child, startCall, user])

  const clearConfirmation = useCallback(() => setLastConfirmation(null), [])

  const value = {
    child,
    entryPayload,
    exitPayload,
    pendingExit,
    session: liveSession,
    alerts,
    history,
    activeCall,
    lastConfirmation,
    clearConfirmation,
    checkInWithProfessor,
    completeExitWithProfessorQr,
    simulateIncomingCall,
    acknowledgeCall,
    markSessionEndingSoon,
    isInSession: Boolean(liveSession),
    presentCount,
    maxChildren,
    atCapacity,
  }

  return (
    <GuardianSessionContext.Provider value={value}>
      {children}
    </GuardianSessionContext.Provider>
  )
}
