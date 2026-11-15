import React, { useEffect, useMemo, useState } from 'react'
import {
  Box, Button, CircularProgress, Typography,
} from '@mui/material'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import {
  BILLING_PLANS,
  formatPlanPrice,
  getPlanById,
  getSubscriptionAccess,
  normalizePlanId,
} from '../../billing/plans'
import { confirmMercadoPagoReturn, startMercadoPagoCheckout } from '../../billing/mercadoPago'
import '../../styles/global.scss'

function statusMeta(status) {
  if (status === 'active') return { label: 'Ativo', tone: 'ok' }
  if (status === 'trialing') return { label: 'Teste', tone: 'trial' }
  if (status === 'pending') return { label: 'Pendente', tone: 'warn' }
  if (status === 'canceled') return { label: 'Cancelado', tone: 'bad' }
  return { label: 'Expirado', tone: 'bad' }
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
  const status = statusMeta(access.status)

  useEffect(() => {
    const payStatus = params.get('status')
    const planId = normalizePlanId(params.get('plan'))
    const paymentId = params.get('payment_id') || params.get('collection_id')
    if (!payStatus || !tenantId) return undefined

    if (payStatus === 'success' && planId) {
      setConfirming(true)
      ;(async () => {
        const remote = await confirmMercadoPagoReturn({ tenantId, planId, paymentId })
        if (remote.success && remote.subscription) {
          updateSubscription(tenantId, remote.subscription)
          setMessage({ ok: true, text: 'Pagamento confirmado. Plano ativado.' })
        } else {
          activatePaidPlan(tenantId, planId, { mpPaymentId: paymentId || null })
          setMessage({
            ok: true,
            text: 'Retorno com sucesso. Plano ativado neste dispositivo.',
          })
        }
        setConfirming(false)
      })()
    } else if (payStatus === 'failure') {
      setMessage({ ok: false, text: 'Pagamento não concluído. Tente de novo.' })
    } else if (payStatus === 'pending') {
      updateSubscription(tenantId, { status: 'pending', planId: planId || access.planId })
      setMessage({ ok: false, text: 'Pagamento pendente no Mercado Pago.' })
    }
    return undefined
  }, [params, tenantId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAdmin) return <Navigate to="/dashboard" replace />

  const handleActivateFree = (planId) => {
    setMessage(null)
    setLoadingPlan(planId)
    try {
      activatePaidPlan(tenantId, planId, {})
      updateSubscription(tenantId, {
        planId,
        status: 'active',
        provider: 'local',
      })
      setMessage({ ok: true, text: 'Plano Grátis ativado.' })
    } catch {
      setMessage({ ok: false, text: 'Não foi possível ativar o plano Grátis.' })
    } finally {
      setLoadingPlan(null)
    }
  }

  const handleCheckout = async (planId) => {
    const plan = getPlanById(planId)
    if (!plan) return

    if (!plan.paid || plan.price <= 0) {
      handleActivateFree(plan.id)
      return
    }

    setMessage(null)
    setLoadingPlan(planId)
    try {
      const result = await startMercadoPagoCheckout({
        planId: plan.id,
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
          planId: plan.id,
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

  const endsLabel = access.endsAt
    ? new Date(access.endsAt).toLocaleDateString('pt-BR')
    : '—'

  return (
    <Box className="planos-shell">
      <Box className="planos-aurora" aria-hidden />
      <Box className="planos-aurora planos-aurora--two" aria-hidden />

      <Box className="planos-hero">
        <Typography className="planos-title">Seus planos</Typography>
        <Box className="planos-hero-row">
          <Box className={`planos-status planos-status--${status.tone}`}>
            <Box className="planos-status-dot" aria-hidden />
            <Box className="planos-status-copy">
              <Typography className="planos-status-label">{status.label}</Typography>
              <Typography className="planos-status-detail">
                {access.ok
                  ? `${currentPlan?.name || 'Plano'} · até ${endsLabel}`
                  : 'Escolha um plano para liberar o painel completo'}
              </Typography>
            </Box>
          </Box>
          <Box className="planos-lead-card">
            <Typography className="planos-lead">
              Os planos são sempre gratuitos para a equipe e os responsáveis cadastrados.
            </Typography>
          </Box>
        </Box>
      </Box>

      {(confirming || message) && (
        <Box className={`planos-toast ${message?.ok === false ? 'is-warn' : 'is-ok'}`}>
          <Typography>
            {confirming ? 'Confirmando pagamento…' : message?.text}
          </Typography>
          {message && !confirming && (
            <button type="button" className="planos-toast-close" onClick={() => setMessage(null)}>
              Fechar
            </button>
          )}
        </Box>
      )}

      <Box className="planos-cards" role="list" aria-label="Planos disponíveis">
        {BILLING_PLANS.map((plan, index) => {
          const current = normalizePlanId(access.planId) === plan.id && access.ok
          const loading = loadingPlan === plan.id
          return (
            <Box
              key={plan.id}
              role="listitem"
              className={[
                'planos-card',
                plan.highlight ? 'is-featured' : '',
                current ? 'is-current' : '',
              ].filter(Boolean).join(' ')}
              style={{ animationDelay: `${0.04 + index * 0.05}s` }}
            >
              <Box className="planos-card-top">
                <Typography className="planos-card-name">{plan.name}</Typography>
                {plan.highlight && <span className="planos-card-badge">Popular</span>}
                {current && <span className="planos-card-badge is-soft">Atual</span>}
              </Box>

              <Typography
                className={`planos-card-price${plan.price <= 0 && plan.compareAtPrice ? ' is-free-strike' : ''}`}
              >
                {plan.price <= 0 && plan.compareAtPrice ? (
                  <span className="planos-card-price-strike">{formatPlanPrice(plan)}</span>
                ) : (
                  formatPlanPrice(plan)
                )}
                {(plan.price > 0 || plan.compareAtPrice > 0) && (
                  <span className="planos-card-price-period">/mês</span>
                )}
              </Typography>

              <Typography className="planos-card-desc">{plan.description}</Typography>

              <Box className="planos-card-features">
                {plan.features.map((feature) => (
                  <Box key={feature} className="planos-card-feature">
                    <span className="planos-card-feature-icon" aria-hidden>
                      <CheckRoundedIcon />
                    </span>
                    <Typography>{feature}</Typography>
                  </Box>
                ))}
              </Box>

              <Button
                fullWidth
                disableElevation
                className="planos-card-cta"
                disabled={Boolean(loadingPlan) || current}
                onClick={() => handleCheckout(plan.id)}
                startIcon={!loading && !current ? <BoltRoundedIcon /> : null}
              >
                {loading
                  ? <CircularProgress size={22} color="inherit" />
                  : current
                    ? 'Este já é o seu plano'
                    : plan.paid
                      ? `Assinar ${plan.name}`
                      : `Usar ${plan.name}`}
              </Button>
            </Box>
          )
        })}
      </Box>

      <Typography className="planos-cta-note">
        Pagamentos dos planos pagos via Mercado Pago
      </Typography>
    </Box>
  )
}
