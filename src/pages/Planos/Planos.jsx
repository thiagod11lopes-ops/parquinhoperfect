import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Stack, Typography,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import {
  BILLING_PLANS,
  formatPlanPrice,
  getPlanById,
  getSubscriptionAccess,
} from '../../billing/plans'
import { confirmMercadoPagoReturn, startMercadoPagoCheckout } from '../../billing/mercadoPago'
import '../../styles/global.scss'

function statusLabel(status) {
  if (status === 'active') return 'Assinatura ativa'
  if (status === 'trialing') return 'Período de teste'
  if (status === 'pending') return 'Pagamento pendente'
  if (status === 'canceled') return 'Cancelada'
  return 'Expirada'
}

export default function Planos() {
  const { isAdmin, user, tenantId } = useAuth()
  const { getTenant, activatePaidPlan, updateSubscription } = useTenant()
  const [params] = useSearchParams()
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [message, setMessage] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const tenant = getTenant(tenantId)
  const access = useMemo(
    () => getSubscriptionAccess(tenant?.subscription),
    [tenant?.subscription],
  )
  const currentPlan = getPlanById(access.planId)

  useEffect(() => {
    const status = params.get('status')
    const planId = params.get('plan')
    const paymentId = params.get('payment_id') || params.get('collection_id')
    if (!status || !tenantId) return undefined

    if (status === 'success' && planId) {
      setConfirming(true)
      ;(async () => {
        const remote = await confirmMercadoPagoReturn({ tenantId, planId, paymentId })
        if (remote.success && remote.subscription) {
          updateSubscription(tenantId, remote.subscription)
          setMessage({ ok: true, text: 'Pagamento confirmado. Seu plano foi ativado.' })
        } else {
          // Reforço local: se o MP redirecionou com success, libera 30 dias
          // (webhook/Cloud Function continua sendo a fonte oficial).
          activatePaidPlan(tenantId, planId, { mpPaymentId: paymentId || null })
          setMessage({
            ok: true,
            text: remote.error
              ? 'Pagamento retornou com sucesso. Ativamos o plano neste dispositivo; a confirmação final virá do Mercado Pago.'
              : 'Pagamento confirmado. Seu plano foi ativado.',
          })
        }
        setConfirming(false)
      })()
    } else if (status === 'failure') {
      setMessage({ ok: false, text: 'Pagamento não concluído. Você pode tentar novamente.' })
    } else if (status === 'pending') {
      updateSubscription(tenantId, { status: 'pending', planId: planId || access.planId })
      setMessage({ ok: false, text: 'Pagamento pendente. Assim que o Mercado Pago confirmar, o plano será liberado.' })
    }
    return undefined
  }, [params, tenantId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAdmin) return <Navigate to="/dashboard" replace />

  const handleCheckout = async (planId) => {
    setMessage(null)
    setLoadingPlan(planId)
    try {
      const result = await startMercadoPagoCheckout({
        planId,
        tenantId,
        adminEmail: user?.email || tenant?.adminEmail,
        adminName: user?.name || tenant?.adminName,
      })
      if (!result.success) {
        setMessage({ ok: false, text: result.error || 'Falha ao abrir o Mercado Pago.' })
        return
      }
      if (result.preferenceId) {
        updateSubscription(tenantId, {
          planId,
          status: access.ok ? access.status : 'pending',
          mpPreferenceId: result.preferenceId,
        })
      }
      window.location.href = result.initPoint
    } catch {
      setMessage({ ok: false, text: 'Não foi possível iniciar o checkout.' })
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <Box className="page-container planos-page">
      <Box className="page-header">
        <Box>
          <Typography className="page-title">Planos e cobrança</Typography>
          <Typography className="page-subtitle">
            Somente o administrador paga. Gerentes, professores e responsáveis usam sem cobrança.
          </Typography>
        </Box>
      </Box>

      {confirming && (
        <Alert severity="info" sx={{ mb: 2 }}>Confirmando pagamento no Mercado Pago…</Alert>
      )}
      {message && (
        <Alert severity={message.ok ? 'success' : 'warning'} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Box className="planos-status-card">
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <WorkspacePremiumIcon color="warning" />
          <Typography fontWeight={800}>
            Status: {statusLabel(access.status)}
          </Typography>
          <Chip
            size="small"
            color={access.ok ? 'success' : 'error'}
            label={currentPlan?.name || access.planId}
          />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {access.ok
            ? `Válido até ${access.endsAt ? new Date(access.endsAt).toLocaleString('pt-BR') : '—'}`
            : 'Seu acesso administrativo está bloqueado para uso pleno até a renovação do plano.'}
        </Typography>
      </Box>

      <Stack spacing={1.5} className="planos-grid">
        {BILLING_PLANS.map((plan) => {
          const isCurrent = access.planId === plan.id && access.ok
          return (
            <Box
              key={plan.id}
              className={`planos-card ${plan.highlight ? 'is-highlight' : ''} ${isCurrent ? 'is-current' : ''}`}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography className="planos-card-name">{plan.name}</Typography>
                {plan.highlight && <Chip size="small" color="warning" label="Mais escolhido" />}
              </Stack>
              <Typography className="planos-card-price">
                {formatPlanPrice(plan)}
                <span>/mês</span>
              </Typography>
              <Typography className="planos-card-desc">{plan.description}</Typography>
              <Stack spacing={0.75} sx={{ my: 1.5 }}>
                {plan.features.map((f) => (
                  <Stack key={f} direction="row" spacing={0.75} alignItems="center">
                    <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main' }} />
                    <Typography variant="body2">{f}</Typography>
                  </Stack>
                ))}
              </Stack>
              <Button
                fullWidth
                variant={plan.highlight ? 'contained' : 'outlined'}
                className={plan.highlight ? 'btn-orange-card' : ''}
                disabled={Boolean(loadingPlan) || isCurrent}
                onClick={() => handleCheckout(plan.id)}
              >
                {loadingPlan === plan.id
                  ? <CircularProgress size={22} color="inherit" />
                  : isCurrent
                    ? 'Plano atual'
                    : 'Assinar com Mercado Pago'}
              </Button>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}
