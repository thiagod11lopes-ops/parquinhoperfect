import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './app'

const COLLECTION = 'appData'

/** Firestore doc id from a localStorage key */
export function toDocId(key) {
  return String(key).replace(/[/:]/g, '__')
}

export function fromDocId(docId) {
  // Best-effort reverse for known prefixes (not perfect for all keys)
  return String(docId)
}

function parseJson(raw) {
  if (raw == null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function serialize(value) {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

/** Write a key/value to Firestore (and keep localStorage in sync). */
export async function cloudSet(key, rawValue) {
  const value = typeof rawValue === 'string' ? parseJson(rawValue) : rawValue
  const id = toDocId(key)
  await setDoc(
    doc(db, COLLECTION, id),
    {
      key,
      value,
      updatedAt: serverTimestamp(),
      clientUpdatedAt: new Date().toISOString(),
    },
    { merge: true },
  )
}

export async function cloudGet(key) {
  const snap = await getDoc(doc(db, COLLECTION, toDocId(key)))
  if (!snap.exists()) return null
  return snap.data()?.value ?? null
}

/**
 * localStorage-compatible API that dual-writes to Firestore.
 * Reads stay sync from localStorage for existing call sites.
 */
export const syncedStorage = {
  getItem(key) {
    return localStorage.getItem(key)
  },

  setItem(key, value) {
    localStorage.setItem(key, value)
    void cloudSet(key, value).catch((err) => {
      console.warn('[firebase] falha ao sincronizar', key, err)
    })
  },

  removeItem(key) {
    localStorage.removeItem(key)
    void setDoc(
      doc(db, COLLECTION, toDocId(key)),
      {
        key,
        value: null,
        deleted: true,
        updatedAt: serverTimestamp(),
        clientUpdatedAt: new Date().toISOString(),
      },
      { merge: true },
    ).catch((err) => {
      console.warn('[firebase] falha ao remover', key, err)
    })
  },
}

/**
 * Pull remote docs into localStorage. Prefer remote when present.
 * Returns list of keys that changed.
 */
export async function hydrateFromCloud() {
  const changed = []
  const snap = await getDocs(collection(db, COLLECTION))
  snap.forEach((d) => {
    const data = d.data() || {}
    const key = data.key || d.id
    if (!key || data.deleted) return
    const next = serialize(data.value)
    const prev = localStorage.getItem(key)
    if (prev !== next) {
      localStorage.setItem(key, next)
      changed.push(key)
    }
  })
  return changed
}

/**
 * Push local-only keys that look like app data up to Firestore (one-time migrate).
 */
export async function migrateLocalToCloud(prefixes = [
  'parquinhoTenantIndex',
  'parquinhoPhoneIndex',
  'parquinhoTenant:',
  'parquinhoPresence:',
  'parquinhoMaxChildren',
  'parquinhoParkInfo',
  'parquinhoChats',
  'parquinhoChatReads',
  'parquinhoAppNotifications',
  'parquinhoStaffNotifications',
  'parquinhoRatings',
  'parquinhoPendingHandover',
  'parquinhoActiveCall',
  'parquinhoGuardianSession',
  'parquinhoAppearance',
  'parquinhoOccupancyHistory:',
  'parquinhoChildren:',
  'parquinhoStaff:',
  'parquinhoActivities:',
  'parquinhoSchedule:',
  'parquinhoAttendance:',
  'sampleDataEnabled',
]) {
  const tasks = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key) continue
    const match = prefixes.some((p) => key === p || key.startsWith(p))
    if (!match) continue
    const remoteId = toDocId(key)
    tasks.push(
      getDoc(doc(db, COLLECTION, remoteId)).then((snap) => {
        if (snap.exists() && !snap.data()?.deleted) return null
        return cloudSet(key, localStorage.getItem(key))
      }),
    )
  }
  await Promise.all(tasks)
}

/** Live sync: remote changes → localStorage + custom events */
export function subscribeCloudSync(onKeysChanged) {
  return onSnapshot(
    collection(db, COLLECTION),
    (snap) => {
      const changed = []
      snap.docChanges().forEach((change) => {
        if (change.type === 'removed') return
        const data = change.doc.data() || {}
        const key = data.key || change.doc.id
        if (!key) return
        if (data.deleted) {
          if (localStorage.getItem(key) != null) {
            localStorage.removeItem(key)
            changed.push(key)
          }
          return
        }
        const next = serialize(data.value)
        if (localStorage.getItem(key) !== next) {
          localStorage.setItem(key, next)
          changed.push(key)
        }
      })
      if (changed.length) onKeysChanged(changed)
    },
    (err) => {
      console.warn('[firebase] listener error', err)
    },
  )
}

export function dispatchSyncEvents(changedKeys = []) {
  const events = new Set(['parquinho-tenant', 'parquinho-presence', 'parquinho-chats', 'parquinho-chat-reads'])
  changedKeys.forEach((key) => {
    if (key.startsWith('parquinhoTenant') || key === 'parquinhoTenantIndex') {
      events.add('parquinho-tenant')
    }
    if (key.startsWith('parquinhoPresence:')) {
      events.add('parquinho-presence')
    }
    if (key === 'parquinhoChats') events.add('parquinho-chats')
    if (key === 'parquinhoChatReads') events.add('parquinho-chat-reads')
    if (key.startsWith('parquinhoChildren:')
      || key.startsWith('parquinhoStaff:')
      || key.startsWith('parquinhoActivities:')
      || key.startsWith('parquinhoSchedule:')
      || key.startsWith('parquinhoAttendance:')) {
      events.add('parquinho-sample-data')
    }
    if (key.includes('parquinhoMaxChildren') || key.includes('parquinhoParkInfo')) {
      events.add('parquinho-park-settings')
    }
  })
  events.forEach((name) => {
    window.dispatchEvent(new CustomEvent(name))
  })
  window.dispatchEvent(new CustomEvent('parquinho-cloud-sync', { detail: { keys: changedKeys } }))
}
