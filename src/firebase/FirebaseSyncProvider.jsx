import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  dispatchSyncEvents,
  hydrateFromCloud,
  isLocalOnlyMode,
  migrateLocalToCloud,
  subscribeCloudSync,
} from './syncedStorage'

const FirebaseSyncContext = createContext({
  ready: false,
  error: null,
  localOnly: false,
})

export function useFirebaseSync() {
  return useContext(FirebaseSyncContext)
}

export function FirebaseSyncProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [localOnly, setLocalOnly] = useState(() => isLocalOnlyMode())

  useEffect(() => {
    let unsub = () => {}
    let cancelled = false

    async function bootCloud() {
      try {
        await hydrateFromCloud()
        if (cancelled) return
        await migrateLocalToCloud()
        if (cancelled) return
        unsub = subscribeCloudSync((keys) => {
          dispatchSyncEvents(keys)
        })
        dispatchSyncEvents(['parquinhoTenantIndex'])
        setError(null)
        setReady(true)
      } catch (err) {
        console.error('[firebase] sync boot failed', err)
        if (!cancelled) {
          setError(err?.message || 'Falha ao conectar ao Firestore')
          setReady(true) // allow app to run offline/local
        }
      }
    }

    function stopCloud() {
      unsub()
      unsub = () => {}
      setReady(true)
      setError(null)
    }

    if (isLocalOnlyMode()) {
      setLocalOnly(true)
      stopCloud()
    } else {
      setLocalOnly(false)
      bootCloud()
    }

    const onLocalOnly = (event) => {
      const enabled = Boolean(event?.detail?.enabled)
      setLocalOnly(enabled)
      if (enabled) {
        stopCloud()
      } else if (!cancelled) {
        bootCloud()
      }
    }

    window.addEventListener('parquinho-local-only', onLocalOnly)
    return () => {
      cancelled = true
      window.removeEventListener('parquinho-local-only', onLocalOnly)
      unsub()
    }
  }, [])

  const value = useMemo(() => ({ ready, error, localOnly }), [ready, error, localOnly])

  return (
    <FirebaseSyncContext.Provider value={value}>
      {children}
    </FirebaseSyncContext.Provider>
  )
}
