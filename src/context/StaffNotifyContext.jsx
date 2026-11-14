import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { syncedStorage } from '../firebase/syncedStorage'

const StaffNotifyContext = createContext(null)

const STORAGE_KEY = 'parquinhoStaffNotifications'
const EVENT_NAME = 'parquinho-staff-notify'

function loadNotifications() {
  try {
    const raw = syncedStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persist(list) {
  syncedStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

export function useStaffNotify() {
  const ctx = useContext(StaffNotifyContext)
  if (!ctx) throw new Error('useStaffNotify must be used within StaffNotifyProvider')
  return ctx
}

export function StaffNotifyProvider({ children }) {
  const [notifications, setNotifications] = useState(() => loadNotifications())

  useEffect(() => {
    const sync = () => setNotifications(loadNotifications())
    window.addEventListener('storage', sync)
    window.addEventListener(EVENT_NAME, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(EVENT_NAME, sync)
    }
  }, [])

  const notifyProfessor = useCallback(({
    childName,
    guardianName,
    message,
    callId,
    type = 'guardian-ack',
    title,
  }) => {
    const isAck = type === 'guardian-ack'
    const item = {
      id: Date.now(),
      callId: callId || null,
      type,
      title: title || (isAck ? 'Responsável ciente' : 'Sem resposta do responsável'),
      message: message
        || (isAck
          ? `${guardianName || 'Responsável'} confirmou ciência do aviso sobre ${childName || 'a criança'}.`
          : `${guardianName || 'Responsável'} não respondeu sobre ${childName || 'a criança'}.`),
      childName: childName || null,
      guardianName: guardianName || null,
      at: new Date().toISOString(),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    }
    const next = [item, ...loadNotifications()].slice(0, 40)
    persist(next)
    setNotifications(next)
    return item
  }, [])

  const markRead = useCallback((id) => {
    const next = loadNotifications().map(n => (n.id === id ? { ...n, read: true } : n))
    persist(next)
    setNotifications(next)
  }, [])

  const markAllRead = useCallback(() => {
    const next = loadNotifications().map(n => ({ ...n, read: true }))
    persist(next)
    setNotifications(next)
  }, [])

  const dismissNotification = useCallback((id) => {
    const next = loadNotifications().filter(n => n.id !== id)
    persist(next)
    setNotifications(next)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <StaffNotifyContext.Provider value={{
      notifications,
      unreadCount,
      notifyProfessor,
      markRead,
      markAllRead,
      dismissNotification,
    }}>
      {children}
    </StaffNotifyContext.Provider>
  )
}
