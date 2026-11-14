import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { syncedStorage } from '../firebase/syncedStorage'
import { useAuth } from './AuthContext'
import { useSampleData } from './SampleDataContext'
import { useAppNotifications } from './AppNotificationsContext'

const ChatContext = createContext(null)

const STORAGE_KEY = 'parquinhoChats'
const READS_KEY = 'parquinhoChatReads'
const EVENT_NAME = 'parquinho-chats'
const READS_EVENT = 'parquinho-chat-reads'

function loadChats() {
  try {
    const raw = syncedStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persistChats(chats) {
  syncedStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function loadReads() {
  try {
    const raw = syncedStorage.getItem(READS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persistReads(reads) {
  syncedStorage.setItem(READS_KEY, JSON.stringify(reads))
  window.dispatchEvent(new CustomEvent(READS_EVENT))
}

function formatClock(date = new Date()) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function threadKey(childId) {
  return `child-${childId}`
}

function roleOfUser({ isResponsavel, isAdmin, isGerenteOnly, isProfessor }) {
  if (isResponsavel) return 'responsavel'
  if (isAdmin) return 'administrador'
  if (isGerenteOnly) return 'gerente'
  if (isProfessor) return 'professor'
  return 'user'
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}

export function ChatProvider({ children }) {
  const {
    user, isProfessor, isGerente, isGerenteOnly, isAdmin, isResponsavel,
    tenantId, unitId,
  } = useAuth()
  const { childrenList } = useSampleData()
  const { pushNotification } = useAppNotifications()
  const [chats, setChats] = useState(() => loadChats())
  const [reads, setReads] = useState(() => loadReads())
  const [activeThreadId, setActiveThreadId] = useState(null)

  const myRole = roleOfUser({ isResponsavel, isAdmin, isGerenteOnly, isProfessor })
  const userKey = user?.email || user?.id || null

  const sync = useCallback(() => setChats(loadChats()), [])
  const syncReads = useCallback(() => setReads(loadReads()), [])

  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || e.key === STORAGE_KEY) sync()
      if (!e.key || e.key === READS_KEY) syncReads()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(EVENT_NAME, sync)
    window.addEventListener(READS_EVENT, syncReads)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(EVENT_NAME, sync)
      window.removeEventListener(READS_EVENT, syncReads)
    }
  }, [sync, syncReads])

  const ensureThread = useCallback((child) => {
    if (!child?.id) return null
    const id = threadKey(child.id)
    const current = loadChats()
    if (current[id]) return current[id]
    const thread = {
      id,
      childId: child.id,
      childName: child.name,
      guardianName: child.guardian || 'Responsável',
      messages: [],
      updatedAt: new Date().toISOString(),
    }
    const next = { ...current, [id]: thread }
    persistChats(next)
    setChats(next)
    return thread
  }, [])

  // Professor, gerente e administrador veem todas as conversas
  const threads = useMemo(() => {
    if (isProfessor || isGerente) {
      return childrenList.map((child) => {
        const id = threadKey(child.id)
        const existing = chats[id]
        return existing || {
          id,
          childId: child.id,
          childName: child.name,
          guardianName: child.guardian || 'Responsável',
          messages: [],
          updatedAt: null,
        }
      }).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    }

    if (isResponsavel && user) {
      const mine = childrenList.filter((c) => (
        String(c.id) === String(user.childId)
        || (c.name || '').toLowerCase() === (user.childName || '').toLowerCase()
        || (c.guardian || '').toLowerCase() === (user.name || '').toLowerCase()
      ))
      const list = (mine.length ? mine : childrenList.slice(0, 1))
      return list.map((child) => {
        const id = threadKey(child.id)
        const existing = chats[id]
        return existing || {
          id,
          childId: child.id,
          childName: child.name,
          guardianName: child.guardian || user.name || 'Responsável',
          messages: [],
          updatedAt: null,
        }
      })
    }

    return []
  }, [chats, childrenList, isGerente, isProfessor, isResponsavel, user])

  const myReads = useMemo(
    () => (userKey ? (reads[userKey] || {}) : {}),
    [reads, userKey],
  )

  const threadUnread = useCallback((thread) => {
    if (!userKey || !thread) return 0
    const lastRead = myReads[thread.id] || 0
    const lastReadMs = typeof lastRead === 'number' ? lastRead : Date.parse(lastRead) || 0
    return (thread.messages || []).filter((msg) => {
      if (String(msg.senderId) === String(user?.id) || msg.senderEmail === userKey) return false
      const at = Date.parse(msg.at) || 0
      return at > lastReadMs
    }).length
  }, [myReads, user?.id, userKey])

  const unreadCount = useMemo(
    () => threads.reduce((sum, t) => sum + threadUnread(t), 0),
    [threadUnread, threads],
  )

  const unreadThreads = useMemo(
    () => threads
      .map((t) => ({ thread: t, count: threadUnread(t) }))
      .filter((x) => x.count > 0)
      .slice(0, 8),
    [threadUnread, threads],
  )

  const markThreadRead = useCallback((threadId) => {
    if (!userKey || !threadId) return
    const current = loadReads()
    const mine = { ...(current[userKey] || {}) }
    mine[threadId] = Date.now()
    const next = { ...current, [userKey]: mine }
    persistReads(next)
    setReads(next)
  }, [userKey])

  const activeThread = useMemo(() => {
    if (!activeThreadId) return null
    return threads.find((t) => t.id === activeThreadId) || chats[activeThreadId] || null
  }, [activeThreadId, chats, threads])

  useEffect(() => {
    if (activeThreadId) markThreadRead(activeThreadId)
  }, [activeThreadId, activeThread?.messages?.length, markThreadRead])

  const openThread = useCallback((threadOrChild) => {
    if (!threadOrChild) return
    if (threadOrChild.childId && !threadOrChild.messages) {
      const child = childrenList.find((c) => String(c.id) === String(threadOrChild.childId || threadOrChild.id))
        || threadOrChild
      const thread = ensureThread(child)
      setActiveThreadId(thread.id)
      markThreadRead(thread.id)
      return
    }
    const child = childrenList.find((c) => String(c.id) === String(threadOrChild.childId))
    if (child) ensureThread(child)
    const id = threadOrChild.id || threadKey(threadOrChild.childId)
    setActiveThreadId(id)
    markThreadRead(id)
  }, [childrenList, ensureThread, markThreadRead])

  const closeThread = useCallback(() => setActiveThreadId(null), [])

  const sendMessage = useCallback((text) => {
    const body = String(text || '').trim()
    if (!body || !activeThreadId || !user) return { success: false }

    const current = loadChats()
    let thread = current[activeThreadId]
    if (!thread) {
      const child = childrenList.find((c) => threadKey(c.id) === activeThreadId)
      if (!child) return { success: false, error: 'Conversa não encontrada.' }
      thread = {
        id: activeThreadId,
        childId: child.id,
        childName: child.name,
        guardianName: child.guardian || 'Responsável',
        messages: [],
        updatedAt: new Date().toISOString(),
      }
    }

    const roleLabel = {
      responsavel: 'Responsável',
      professor: 'Professor',
      gerente: 'Gerente',
      administrador: 'Administrador',
    }

    const msg = {
      id: Date.now(),
      text: body,
      senderRole: myRole,
      senderName: user.name || roleLabel[myRole] || 'Usuário',
      senderId: user.id,
      senderEmail: user.email || null,
      at: new Date().toISOString(),
      time: formatClock(),
    }

    const updated = {
      ...thread,
      messages: [...(thread.messages || []), msg],
      updatedAt: msg.at,
    }
    const next = { ...current, [activeThreadId]: updated }
    persistChats(next)
    setChats(next)
    markThreadRead(activeThreadId)

    const forRoles = myRole === 'responsavel'
      ? ['administrador', 'gerente', 'professor']
      : ['responsavel']
    pushNotification({
      type: 'chat',
      title: 'Nova mensagem no chat',
      message: `${msg.senderName}: ${body.length > 80 ? `${body.slice(0, 77)}…` : body}`,
      path: myRole === 'responsavel' ? '/chat' : '/responsavel/chat',
      tenantId,
      unitId,
      forRoles,
      meta: { threadId: activeThreadId, childName: updated.childName },
    })

    return { success: true, message: msg }
  }, [
    activeThreadId, childrenList, markThreadRead, myRole, user,
    pushNotification, tenantId, unitId,
  ])

  const chatPath = isResponsavel ? '/responsavel/chat' : '/chat'

  return (
    <ChatContext.Provider value={{
      threads,
      activeThread,
      activeThreadId,
      openThread,
      closeThread,
      sendMessage,
      unreadCount,
      unreadThreads,
      threadUnread,
      markThreadRead,
      myRole,
      chatPath,
    }}>
      {children}
    </ChatContext.Provider>
  )
}
