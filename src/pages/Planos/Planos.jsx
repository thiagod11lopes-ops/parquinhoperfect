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
  const [selectedPlanId, setSelectedPlanId] = useState(null)
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
    const preferred = BILLING_PLANS.find((p) => p.highlight)?.id
      || access.planId
      || BILLING_PLANS[0]?.id
    setSelectedPlanId(preferred)
  }, [access.planId])

  useEffect(() => {
    const payStatus = params.get('status')
    const planId = params.get('plan')
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

  const selected = getPlanById(selectedPlanId) || BILLING_PLANS[0]
  const isCurrentSelected = access.planId === selected?.id && access.ok

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

  const endsLabel = access.endsAt
    ? new Date(access.endsAt).toLocaleDateString('pt-BR')
    : '—'

  return (
    <Box className="planos-shell">
      <Box className="planos-aurora" aria-hidden />
      <Box className="planos-aurora planos-aurora--two" aria-hidden />

      <Box className="planos-hero">
        <Typography className="planos-kicker">Parquinho · Admin</Typography>
        <Typography className="planos-title">Seu plano</Typography>
        <Typography className="planos-lead">
          Só o administrador paga. A equipe e os responsáveis usam sem cobrança.
        </Typography>
      </Box>

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

      <Box className="planos-picker" role="listbox" aria-label="Planos disponíveis">
        {BILLING_PLANS.map((plan, index) => {
          const active = selectedPlanId === plan.id
          const current = access.planId === plan.id && access.ok
          return (
            <button
              key={plan.id}
              type="button"
              role="option"
              aria-selected={active}
              className={[
                'planos-option',
                active ? 'is-active' : '',
                plan.highlight ? 'is-featured' : '',
                current ? 'is-current' : '',
              ].filter(Boolean).join(' ')}
              style={{ animationDelay: `${0.05 + index * 0.06}s` }}
              onClick={() => setSelectedPlanId(plan.id)}
            >
              <Box className="planos-option-top">
                <Typography className="planos-option-name">{plan.name}</Typography>
                {plan.highlight && <span className="planos-option-badge">Popular</span>}
                {current && <span className="planos-option-badge is-soft">Atual</span>}
              </Box>
              <Typography className="planos-option-price">
                {formatPlanPrice(plan)}
                <span>/mês</span>
              </Typography>
            </button>
          )
        })}
      </Box>

      {selected && (
        <Box className="planos-detail" key={selected.id}>
          <Typography className="planos-detail-desc">{selected.description}</Typography>
          <Box className="planos-features">
            {selected.features.map((feature) => (
              <Box key={feature} className="planos-feature">
                <span className="planos-feature-icon" aria-hidden>
                  <CheckRoundedIcon />
                </span>
                <Typography>{feature}</Typography>
              </Box>
            ))}
          </Box>

          <Button
            fullWidth
            disableElevation
            className="planos-cta"
            disabled={Boolean(loadingPlan) || isCurrentSelected}
            onClick={() => handleCheckout(selected.id)}
            startIcon={!loadingPlan && !isCurrentSelected ? <BoltRoundedIcon /> : null}
          >
            {loadingPlan === selected.id
              ? <CircularProgress size={22} color="inherit" />
              : isCurrentSelected
                ? 'Este já é o seu plano'
                : `Assinar ${selected.name}`}
          </Button>
          <Typography className="planos-cta-note">
            Pagamento seguro via Mercado Pago
          </Typography>
        </Box>
      )}
    </Box>
  )
}
