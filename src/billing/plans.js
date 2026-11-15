/** Planos cobrados apenas do Administrador (SaaS B2B). */

export const TRIAL_DAYS = 7

export const BILLING_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 79.9,
    currency: 'BRL',
    period: 'month',
    description: 'Ideal para começar com uma unidade.',
    features: [
      '1 unidade',
      'Até 40 crianças',
      'Equipe e responsáveis',
      'Presença e chat',
    ],
    limits: { maxUnits: 1, maxChildren: 40 },
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149.9,
    currency: 'BRL',
    period: 'month',
    description: 'Para redes com mais unidades e demanda.',
    features: [
      'Até 5 unidades',
      'Até 200 crianças',
      'Relatórios avançados',
      'Prioridade de suporte',
    ],
    limits: { maxUnits: 5, maxChildren: 200 },
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299.9,
    currency: 'BRL',
    period: 'month',
    description: 'Capacidade ampliada para operação completa.',
    features: [
      'Unidades ilimitadas',
      'Crianças ilimitadas',
      'Onboarding assistido',
      'SLA comercial',
    ],
    limits: { maxUnits: null, maxChildren: null },
    highlight: false,
  },
]

export function getPlanById(planId) {
  return BILLING_PLANS.find((p) => p.id === planId) || null
}

export function formatPlanPrice(plan) {
  if (!plan) return '—'
  return plan.price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: plan.currency || 'BRL',
  })
}

export function createTrialSubscription(planId = 'starter') {
  const now = new Date()
  const trialEnds = new Date(now)
  trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS)
  return {
    planId,
    status: 'trialing',
    provider: 'mercado_pago',
    trialEndsAt: trialEnds.toISOString(),
    currentPeriodEnd: trialEnds.toISOString(),
    mpPreferenceId: null,
    mpPaymentId: null,
    mpPreapprovalId: null,
    updatedAt: now.toISOString(),
  }
}

export function normalizeSubscription(raw, createdAt) {
  if (raw && typeof raw === 'object') {
    return {
      planId: raw.planId || 'starter',
      status: raw.status || 'trialing',
      provider: raw.provider || 'mercado_pago',
      trialEndsAt: raw.trialEndsAt || null,
      currentPeriodEnd: raw.currentPeriodEnd || null,
      mpPreferenceId: raw.mpPreferenceId || null,
      mpPaymentId: raw.mpPaymentId || null,
      mpPreapprovalId: raw.mpPreapprovalId || null,
      updatedAt: raw.updatedAt || new Date().toISOString(),
    }
  }
  // Tenants antigos: concede trial a partir da criação
  const base = createdAt ? new Date(createdAt) : new Date()
  if (Number.isNaN(base.getTime())) return createTrialSubscription()
  const trialEnds = new Date(base)
  trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS)
  const now = Date.now()
  const activeTrial = trialEnds.getTime() > now
  return {
    planId: 'starter',
    status: activeTrial ? 'trialing' : 'expired',
    provider: 'mercado_pago',
    trialEndsAt: trialEnds.toISOString(),
    currentPeriodEnd: trialEnds.toISOString(),
    mpPreferenceId: null,
    mpPaymentId: null,
    mpPreapprovalId: null,
    updatedAt: new Date().toISOString(),
  }
}

/** status efetivo considerando datas */
export function getSubscriptionAccess(subscription) {
  const sub = normalizeSubscription(subscription)
  const now = Date.now()
  const end = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).getTime() : 0
  const trialEnd = sub.trialEndsAt ? new Date(sub.trialEndsAt).getTime() : 0

  if (sub.status === 'active' && end > now) {
    return { ok: true, status: 'active', planId: sub.planId, endsAt: sub.currentPeriodEnd }
  }
  if ((sub.status === 'trialing' || sub.status === 'active') && trialEnd > now && (!end || end <= trialEnd)) {
    return { ok: true, status: 'trialing', planId: sub.planId, endsAt: sub.trialEndsAt }
  }
  if (sub.status === 'active' && end > now) {
    return { ok: true, status: 'active', planId: sub.planId, endsAt: sub.currentPeriodEnd }
  }
  if (end > now) {
    return { ok: true, status: sub.status || 'active', planId: sub.planId, endsAt: sub.currentPeriodEnd }
  }
  if (trialEnd > now) {
    return { ok: true, status: 'trialing', planId: sub.planId, endsAt: sub.trialEndsAt }
  }
  return {
    ok: false,
    status: sub.status === 'canceled' ? 'canceled' : 'expired',
    planId: sub.planId,
    endsAt: sub.currentPeriodEnd || sub.trialEndsAt,
  }
}
