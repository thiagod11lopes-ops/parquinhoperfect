/**
 * Full reset for first-start testing.
 * Clears tenants, session, appearance and operational data.
 * Sample/demo datasets stay available only via the example-data toggle.
 */
const WIPE_FLAG = 'parquinhoOperationalWipe_v3'

const KEYS_TO_REMOVE = [
  'daycareUser',
  'parquinhoAppearance',
  'parquinhoTenantIndex',
  'sampleDataEnabled',
  'parquinhoChats',
  'parquinhoChatReads',
  'parquinhoRatings',
  'parquinhoPendingHandover',
  'parquinhoGuardianSession',
  'parquinhoStaffNotifications',
  'parquinhoAppNotifications',
  'parquinhoNotifyPermissionAsked',
  'parquinhoActiveCall',
  // históricos por unidade (prefixos limpos abaixo)
  'parquinhoParkInfo',
  'parquinhoMaxChildren',
  'parquinhoUnits',
  // flags antigas de wipe
  'parquinhoOperationalWipe_v1',
  'parquinhoOperationalWipe_v2',
]

const KEY_PREFIXES_TO_REMOVE = [
  'parquinhoPresence:',
]

export function wipeOperationalDataOnce() {
  try {
    if (typeof localStorage === 'undefined') return
    if (localStorage.getItem(WIPE_FLAG) === '1') return

    KEYS_TO_REMOVE.forEach((key) => {
      try {
        localStorage.removeItem(key)
      } catch {
        // ignore
      }
    })

    // Remove bancos de tenant e presença por unidade
    const toDelete = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.startsWith('parquinhoTenant:')) toDelete.push(key)
      if (KEY_PREFIXES_TO_REMOVE.some((prefix) => key.startsWith(prefix))) toDelete.push(key)
    }
    toDelete.forEach((key) => {
      try {
        localStorage.removeItem(key)
      } catch {
        // ignore
      }
    })

    localStorage.setItem('sampleDataEnabled', 'false')
    localStorage.setItem(WIPE_FLAG, '1')
  } catch {
    // ignore storage errors
  }
}
