import { useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSampleData } from '../../context/SampleDataContext'
import { useParkSettings } from '../../context/ParkSettingsContext'
import { useAppNotifications } from '../../context/AppNotificationsContext'
import { todayKey } from '../../utils/unitOccupancyHistory'

/**
 * Observa lotação e dispara aviso quando a unidade ativa atinge o máximo.
 */
export default function NotificationBridge() {
  const { isAuthenticated, unitId, unitName, tenantId, isGerente, isProfessor, isAdmin } = useAuth()
  const { childrenList } = useSampleData()
  const { maxChildren } = useParkSettings()
  const { pushNotification } = useAppNotifications()
  const wasFullRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || !unitId) return
    if (!isGerente && !isProfessor && !isAdmin) return

    const present = childrenList.filter((c) => (
      c.unitId ? c.unitId === unitId : Boolean(unitId)
    )).length
    const full = present >= maxChildren && maxChildren > 0

    if (full && !wasFullRef.current) {
      pushNotification({
        type: 'capacity',
        title: 'Lotação máxima',
        message: `${unitName || 'Unidade'} atingiu ${present}/${maxChildren} crianças.`,
        path: '/dashboard',
        tenantId,
        unitId,
        forRoles: ['administrador', 'gerente', 'professor'],
        dedupeKey: `capacity-full:${unitId}:${todayKey()}`,
      })
    }
    wasFullRef.current = full
  }, [
    isAuthenticated, unitId, unitName, tenantId, maxChildren, childrenList,
    isGerente, isProfessor, isAdmin, pushNotification,
  ])

  return null
}
