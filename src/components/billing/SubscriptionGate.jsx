import React, { useMemo } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import { getSubscriptionAccess } from '../../billing/plans'

/**
 * Bloqueia o admin (e só o admin) quando a assinatura/trial acabou.
 * Outros papéis continuam usando normalmente.
 */
export default function SubscriptionGate({ children }) {
  const { isAdmin, tenantId } = useAuth()
  const { getTenant } = useTenant()
  const location = useLocation()

  const access = useMemo(() => {
    if (!isAdmin || !tenantId) return { ok: true }
    const tenant = getTenant(tenantId)
    return getSubscriptionAccess(tenant?.subscription)
  }, [isAdmin, tenantId, getTenant])

  if (!isAdmin) return children

  const onBillingPage = location.pathname === '/planos'
  if (!access.ok && !onBillingPage) {
    return <Navigate to="/planos" replace state={{ from: location }} />
  }

  return children
}
