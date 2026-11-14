import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { syncedStorage } from '../firebase/syncedStorage'
import { useAuth } from './AuthContext'

const RatingsContext = createContext(null)

const STORAGE_KEY = 'parquinhoRatings'
const HANDOVER_KEY = 'parquinhoPendingHandover'

function todayIsoDate() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatClock(date = new Date()) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function loadRatings() {
  try {
    const raw = syncedStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistRatings(list) {
  syncedStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent('parquinho-ratings'))
}

function loadHandover() {
  try {
    const raw = syncedStorage.getItem(HANDOVER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persistHandover(handover) {
  if (!handover) syncedStorage.removeItem(HANDOVER_KEY)
  else syncedStorage.setItem(HANDOVER_KEY, JSON.stringify(handover))
  window.dispatchEvent(new CustomEvent('parquinho-handover'))
}

export function useRatings() {
  const ctx = useContext(RatingsContext)
  if (!ctx) throw new Error('useRatings must be used within RatingsProvider')
  return ctx
}

export function RatingsProvider({ children }) {
  const { user, isResponsavel, isProfessor, isGerente } = useAuth()
  const [ratings, setRatings] = useState(() => loadRatings())
  const [pendingHandover, setPendingHandover] = useState(() => loadHandover())

  const reload = useCallback(() => {
    setRatings(loadRatings())
    setPendingHandover(loadHandover())
  }, [])

  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || e.key === STORAGE_KEY || e.key === HANDOVER_KEY) reload()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('parquinho-ratings', reload)
    window.addEventListener('parquinho-handover', reload)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('parquinho-ratings', reload)
      window.removeEventListener('parquinho-handover', reload)
    }
  }, [reload])

  const startHandover = useCallback((payload) => {
    const handover = {
      id: `handover-${Date.now()}`,
      childId: payload.childId,
      childName: payload.childName,
      guardianName: payload.guardianName || 'Responsável',
      professorName: payload.professorName || 'Professor',
      sessionId: payload.sessionId || null,
      exitTime: payload.exitTime || formatClock(),
      at: new Date().toISOString(),
      date: todayIsoDate(),
      responsavelRated: false,
      professorRated: false,
    }
    persistHandover(handover)
    setPendingHandover(handover)
    return handover
  }, [])

  const submitRating = useCallback(({ stars, comment, authorRole, handover }) => {
    const n = Math.min(5, Math.max(1, Math.floor(Number(stars) || 0)))
    if (!handover || n < 1) return { success: false, error: 'Avaliação inválida.' }

    const role = authorRole === 'professor' ? 'professor' : 'responsavel'
    const authorName = role === 'professor'
      ? (user?.name || handover.professorName || 'Professor')
      : (user?.name || handover.guardianName || 'Responsável')

    const rating = {
      id: `rating-${Date.now()}-${role}`,
      handoverId: handover.id,
      stars: n,
      comment: String(comment || '').trim(),
      authorRole: role,
      authorName,
      childId: handover.childId,
      childName: handover.childName,
      guardianName: handover.guardianName,
      professorName: role === 'professor' ? authorName : handover.professorName,
      exitTime: handover.exitTime,
      at: new Date().toISOString(),
      date: todayIsoDate(),
      time: formatClock(),
    }

    const nextRatings = [rating, ...loadRatings()]
    persistRatings(nextRatings)
    setRatings(nextRatings)

    const current = loadHandover()
    if (current && current.id === handover.id) {
      const updated = {
        ...current,
        responsavelRated: role === 'responsavel' ? true : current.responsavelRated,
        professorRated: role === 'professor' ? true : current.professorRated,
        professorName: role === 'professor' ? authorName : current.professorName,
      }
      if (updated.responsavelRated && updated.professorRated) {
        persistHandover(null)
        setPendingHandover(null)
      } else {
        persistHandover(updated)
        setPendingHandover(updated)
      }
    }

    return { success: true, rating }
  }, [user])

  const dismissHandoverForRole = useCallback((role) => {
    const current = loadHandover()
    if (!current) return
    const updated = {
      ...current,
      responsavelRated: role === 'responsavel' ? true : current.responsavelRated,
      professorRated: role === 'professor' ? true : current.professorRated,
    }
    if (updated.responsavelRated && updated.professorRated) {
      persistHandover(null)
      setPendingHandover(null)
    } else {
      persistHandover(updated)
      setPendingHandover(updated)
    }
  }, [])

  const myPendingHandover = useMemo(() => {
    if (!pendingHandover) return null
    if (isResponsavel && !pendingHandover.responsavelRated) return pendingHandover
    if (isProfessor && !pendingHandover.professorRated) return pendingHandover
    return null
  }, [isProfessor, isResponsavel, pendingHandover])

  const value = {
    ratings: isGerente ? ratings : [],
    allRatingsCount: ratings.length,
    pendingHandover,
    myPendingHandover,
    startHandover,
    submitRating,
    dismissHandoverForRole,
  }

  return (
    <RatingsContext.Provider value={value}>
      {children}
    </RatingsContext.Provider>
  )
}
