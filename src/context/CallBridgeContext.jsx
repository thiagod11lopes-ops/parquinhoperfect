import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { useAuth } from './AuthContext'
import { useStaffNotify } from './StaffNotifyContext'

const CallBridgeContext = createContext(null)

const STORAGE_KEY = 'parquinhoActiveCall'
const EVENT_NAME = 'parquinho-active-call'
export const CALL_ATTEMPT_SECONDS = 30
export const CALL_MAX_ATTEMPTS = 2
const ATTEMPT_MS = CALL_ATTEMPT_SECONDS * 1000

function loadCall() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persistCall(call) {
  if (!call) localStorage.removeItem(STORAGE_KEY)
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(call))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function clockNow() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function useCallBridge() {
  const ctx = useContext(CallBridgeContext)
  if (!ctx) throw new Error('useCallBridge must be used within CallBridgeProvider')
  return ctx
}

export function CallBridgeProvider({ children }) {
  const { isProfessor, isGerente } = useAuth()
  const { notifyProfessor } = useStaffNotify()
  const [activeCall, setActiveCall] = useState(() => loadCall())
  const [nowMs, setNowMs] = useState(() => Date.now())

  const sync = useCallback(() => setActiveCall(loadCall()), [])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key && e.key !== STORAGE_KEY) return
      sync()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(EVENT_NAME, sync)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(EVENT_NAME, sync)
    }
  }, [sync])

  // Relógio local para o cronômetro
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'ringing') return undefined
    const id = window.setInterval(() => setNowMs(Date.now()), 200)
    return () => clearInterval(id)
  }, [activeCall])

  // Timeout → 2ª tentativa → fim
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'ringing') return undefined

    const id = window.setInterval(() => {
      const current = loadCall()
      if (!current || current.status !== 'ringing') return
      if (current.callId !== activeCall.callId) return
      const ends = new Date(current.attemptEndsAt).getTime()
      if (Date.now() < ends) return

      const maxAttempts = current.maxAttempts || CALL_MAX_ATTEMPTS

      if (current.attempt < maxAttempts) {
        const started = Date.now()
        const next = {
          ...current,
          attempt: current.attempt + 1,
          attemptStartedAt: new Date(started).toISOString(),
          attemptEndsAt: new Date(started + ATTEMPT_MS).toISOString(),
          ringToken: (current.ringToken || 0) + 1,
          status: 'ringing',
        }
        persistCall(next)
        setActiveCall(next)
        setNowMs(started)
        return
      }

      const failed = {
        ...current,
        status: 'failed',
        endedAt: new Date().toISOString(),
      }
      persistCall(failed)
      setActiveCall(failed)

      // Só professor/gerente dispara o aviso de "sem resposta"
      if (isProfessor || isGerente) {
        notifyProfessor({
          callId: failed.callId,
          childName: failed.childName,
          guardianName: failed.guardianName,
          type: 'no-response',
          title: 'Sem resposta do responsável',
          message: `${failed.guardianName || 'Responsável'} não confirmou o aviso sobre ${failed.childName || 'a criança'} após ${maxAttempts} tentativas.`,
        })
      }
    }, 250)

    return () => clearInterval(id)
  }, [activeCall, isGerente, isProfessor, notifyProfessor])

  const startCall = useCallback(({ childId, childName, guardianName, message, kind = 'normal' }) => {
    const existing = loadCall()
    if (existing?.status === 'ringing') {
      return { success: false, error: 'Já existe uma chamada em andamento.' }
    }
    const isEmergency = kind === 'emergency'
    const started = Date.now()
    const defaultMessage = isEmergency
      ? `Sua presença é necessária imediatamente no Parquinho Perfect Body por causa de ${childName || 'a criança'}.`
      : `${childName || 'A criança'} precisa de auxílio no Parquinho Perfect Body`
    const call = {
      callId: started,
      childId: childId ?? null,
      childName: childName || 'Criança',
      guardianName: guardianName || 'Responsável',
      kind: isEmergency ? 'emergency' : 'normal',
      message: message || defaultMessage,
      attempt: 1,
      maxAttempts: CALL_MAX_ATTEMPTS,
      attemptStartedAt: new Date(started).toISOString(),
      attemptEndsAt: new Date(started + ATTEMPT_MS).toISOString(),
      ringToken: 1,
      status: 'ringing',
      startedAt: new Date(started).toISOString(),
    }
    persistCall(call)
    setActiveCall(call)
    setNowMs(started)
    return { success: true, call }
  }, [])

  const acknowledgeCall = useCallback(({ guardianName } = {}) => {
    const current = loadCall()
    if (!current || current.status !== 'ringing') {
      return { success: false, error: 'Nenhuma chamada ativa.' }
    }
    const ackName = guardianName || current.guardianName || 'Responsável'
    const ack = {
      ...current,
      status: 'acknowledged',
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: ackName,
    }
    persistCall(ack)
    setActiveCall(ack)
    const emergency = ack.kind === 'emergency'
    notifyProfessor({
      callId: ack.callId,
      childName: ack.childName,
      guardianName: ackName,
      type: 'guardian-ack',
      title: emergency ? 'Emergência · responsável ciente' : 'Responsável ciente',
      message: emergency
        ? `${ackName} confirmou a emergência e a presença imediata sobre ${ack.childName || 'a criança'}.`
        : `${ackName} confirmou ciência do aviso sobre ${ack.childName || 'a criança'}.`,
    })
    return { success: true, call: ack }
  }, [notifyProfessor])

  const clearCall = useCallback(() => {
    persistCall(null)
    setActiveCall(null)
  }, [])

  const secondsLeft = useMemo(() => {
    if (!activeCall || activeCall.status !== 'ringing') return 0
    const ends = new Date(activeCall.attemptEndsAt).getTime()
    return Math.max(0, Math.ceil((ends - nowMs) / 1000))
  }, [activeCall, nowMs])

  const isCalling = activeCall?.status === 'ringing'

  return (
    <CallBridgeContext.Provider value={{
      activeCall,
      isCalling,
      secondsLeft,
      attemptSeconds: CALL_ATTEMPT_SECONDS,
      maxAttempts: CALL_MAX_ATTEMPTS,
      startCall,
      acknowledgeCall,
      clearCall,
      clockLabel: clockNow(),
    }}>
      {children}
    </CallBridgeContext.Provider>
  )
}
