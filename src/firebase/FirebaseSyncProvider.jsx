import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  dispatchSyncEvents,
  hydrateFromCloud,
  migrateLocalToCloud,
  subscribeCloudSync,
} from './syncedStorage'

const FirebaseSyncContext = createContext({
  ready: false,
  error: null,
})

export function useFirebaseSync() {
  return useContext(FirebaseSyncContext)
}

export function FirebaseSyncProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let unsub = () => {}
    let cancelled = false

    async function boot() {
      try {
        await hydrateFromCloud()
        if (cancelled) return
        await migrateLocalToCloud()
        if (cancelled) return
        unsub = subscribeCloudSync((keys) => {
          dispatchSyncEvents(keys)
        })
        dispatchSyncEvents(['parquinhoTenantIndex'])
        setReady(true)
      } catch (err) {
        console.error('[firebase] sync boot failed', err)
        if (!cancelled) {
          setError(err?.message || 'Falha ao conectar ao Firestore')
          setReady(true) // allow app to run offline/local
        }
      }
    }

    boot()
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  const value = useMemo(() => ({ ready, error }), [ready, error])

  return (
    <FirebaseSyncContext.Provider value={value}>
      {children}
    </FirebaseSyncContext.Provider>
  )
}
