import React, { useMemo } from 'react'
import { Box, Button, Typography } from '@mui/material'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import { getPlanById, getSubscriptionAccess } from '../../billing/plans'

export default function AdminBillingBanner() {
  const navigate = useNavigate()
  const { isAdmin, tenantId } = useAuth()
  const { getTenant } = useTenant()

  const info = useMemo(() => {
    if (!isAdmin || !tenantId) return null
    const tenant = getTenant(tenantId)
    const access = getSubscriptionAccess(tenant?.subscription)
    const plan = getPlanById(access.planId)
    return { access, plan }
  }, [isAdmin, tenantId, getTenant])

  if (!isAdmin || !info) return null

  const { access, plan } = info
  const ends = access.endsAt ? new Date(access.endsAt).toLocaleDateString('pt-BR') : '—'
  const statusText = access.status === 'trialing'
    ? `Teste grátis até ${ends}`
    : access.ok
      ? `Plano ${plan?.name || access.planId} ativo até ${ends}`
      : 'Assinatura expirada — escolha um plano para continuar'

  return (
    <Box className={`admin-billing-banner ${access.ok ? 'is-ok' : 'is-expired'}`}>
      <Box className="admin-billing-banner-copy">
        <WorkspacePremiumIcon />
        <Box>
          <Typography className="admin-billing-banner-title">Cobrança Mercado Pago</Typography>
          <Typography className="admin-billing-banner-text">{statusText}</Typography>
        </Box>
      </Box>
      <Button
        className="admin-billing-banner-btn"
        variant="contained"
        disableElevation
        onClick={() => navigate('/planos')}
      >
        Ver planos
      </Button>
    </Box>
  )
}
