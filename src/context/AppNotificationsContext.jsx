import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { useAuth } from './AuthContext'

const AppNotificationsContext = createContext(null)

const STORAGE_KEY = 'parquinhoAppNotifications'
const EVENT_NAME = 'parquinho-app-notify'
const PERMISSION_KEY = 'parquinhoNotifyPermissionAsked'

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persist(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function formatClock() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function canShowToUser(item, user) {
  if (!user) return false
  if (item.tenantId && user.tenantId && item.tenantId !== user.tenantId) return false
  if (item.unitId && user.unitId && item.unitId !== user.unitId) {
    // Admin sem unidade ativa ou trocando: ainda vê se for admin
    if (user.role !== 'administrador' && user.role !== 'admin') return false
  }
  if (!item.forRoles || !item.forRoles.length) return true
  const role = user.role === 'admin' ? 'administrador' : user.role
  return item.forRoles.includes(role)
}

function showBrowserNotification(title, body) {
  try {
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: `parquinho-${Date.now()}`,
    })
    window.setTimeout(() => n.close(), 6000)
  } catch {
    // ignore
  }
}

export function useAppNotifications() {
  const ctx = useContext(AppNotificationsContext)
  if (!ctx) throw new Error('useAppNotifications must be used within AppNotificationsProvider')
  return ctx
}

export function AppNotificationsProvider({ children }) {
  const { user, tenantId, unitId, isAuthenticated } = useAuth()
  const [items, setItems] = useState(() => loadAll())
  const [permission, setPermission] = useState(() => (
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  ))

  useEffect(() => {
    const sync = () => setItems(loadAll())
    window.addEventListener('storage', sync)
    window.addEventListener(EVENT_NAME, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(EVENT_NAME, sync)
    }
  }, [])

  const pushNotification = useCallback((payload) => {
    const type = payload?.type || 'info'
    const title = String(payload?.title || 'Parquinho').trim()
    const message = String(payload?.message || '').trim()
    if (!title && !message) return null

    const dedupeKey = payload?.dedupeKey || null
    const current = loadAll()
    if (dedupeKey && current.some((n) => n.dedupeKey === dedupeKey && !n.read)) {
      return null
    }

    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title,
      message,
      at: new Date().toISOString(),
      time: formatClock(),
      read: false,
      path: payload?.path || null,
      tenantId: payload?.tenantId || tenantId || null,
      unitId: payload?.unitId || unitId || null,
      forRoles: Array.isArray(payload?.forRoles) ? payload.forRoles : null,
      dedupeKey,
      meta: payload?.meta || null,
    }

    const next = [item, ...current].slice(0, 80)
    persist(next)
    setItems(next)

    if (payload?.browser !== false) {
      showBrowserNotification(title, message)
    }
    return item
  }, [tenantId, unitId])

  const markRead = useCallback((id) => {
    const next = loadAll().map((n) => (n.id === id ? { ...n, read: true } : n))
    persist(next)
    setItems(next)
  }, [])

  const markAllRead = useCallback(() => {
    const next = loadAll().map((n) => ({ ...n, read: true }))
    persist(next)
    setItems(next)
  }, [])

  const dismissNotification = useCallback((id) => {
    const next = loadAll().filter((n) => n.id !== id)
    persist(next)
    setItems(next)
  }, [])

  const clearAll = useCallback(() => {
    persist([])
    setItems([])
  }, [])

  const requestBrowserPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      setPermission('denied')
      return 'denied'
    }
    try {
      localStorage.setItem(PERMISSION_KEY, '1')
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        showBrowserNotification('Notificações ativas', 'Você receberá avisos de entrada, saída, lotação e chat.')
      }
      return result
    } catch {
      setPermission('denied')
      return 'denied'
    }
  }, [])

  const visible = useMemo(() => {
    if (!isAuthenticated || !user) return []
    return items.filter((n) => canShowToUser(n, user))
  }, [items, isAuthenticated, user])

  const unreadCount = useMemo(
    () => visible.filter((n) => !n.read).length,
    [visible],
  )

  const value = {
    notifications: visible,
    unreadCount,
    permission,
    pushNotification,
    markRead,
    markAllRead,
    dismissNotification,
    clearAll,
    requestBrowserPermission,
  }

  return (
    <AppNotificationsContext.Provider value={value}>
      {children}
    </AppNotificationsContext.Provider>
  )
}
