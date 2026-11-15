/** Planos cobrados apenas do Administrador (SaaS B2B). */

export const TRIAL_DAYS = 7

/** Alias de IDs antigos → atuais */
const PLAN_ID_ALIASES = {
  starter: 'basic',
  enterprise: 'premium',
}

export const BILLING_PLANS = [
  {
    id: 'free',
    name: 'Grátis',
    price: 0,
    compareAtPrice: 29.9,
    currency: 'BRL',
    period: 'month',
    description: 'Comece sem custo para conhecer o Parquinho.',
    features: [
      '1 unidade',
      'Até 15 crianças',
      'Presença e chat básicos',
      'Onboarding incluso',
    ],
    limits: { maxUnits: 1, maxChildren: 15 },
    highlight: false,
    paid: false,
  },
  {
    id: 'basic',
    name: 'Básico',
    price: 29.9,
    currency: 'BRL',
    period: 'month',
    description: 'Para um parquinho em operação diária.',
    features: [
      '1 unidade',
      'Até 40 crianças',
      'Presença, chat e histórico',
      'Onboarding incluso',
    ],
    limits: { maxUnits: 1, maxChildren: 40 },
    highlight: false,
    paid: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 59.9,
    currency: 'BRL',
    period: 'month',
    description: 'Para redes com mais unidades e demanda.',
    features: [
      'Até 5 unidades',
      'Até 200 crianças',
      'Chamadas com botão de emergência',
      'Relatórios avançados',
      'Onboarding incluso',
    ],
    limits: { maxUnits: 5, maxChildren: 200 },
    highlight: true,
    paid: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 129.9,
    currency: 'BRL',
    period: 'month',
    description: 'Capacidade ampliada para operação completa.',
    features: [
      'Unidades ilimitadas',
      'Crianças ilimitadas',
      'Chamadas com botão de emergência',
      'SLA comercial',
      'Onboarding incluso',
    ],
    limits: { maxUnits: null, maxChildren: null },
    highlight: false,
    paid: true,
  },
]

export function normalizePlanId(planId) {
  const id = String(planId || '').trim()
  return PLAN_ID_ALIASES[id] || id || 'free'
}

export function getPlanById(planId) {
  const id = normalizePlanId(planId)
  return BILLING_PLANS.find((p) => p.id === id) || null
}

export function formatPlanPrice(plan) {
  if (!plan) return '—'
  if (!plan.price || plan.price <= 0) {
    const compare = Number(plan.compareAtPrice)
    if (Number.isFinite(compare) && compare > 0) {
      return compare.toLocaleString('pt-BR', {
        style: 'currency',
        currency: plan.currency || 'BRL',
      })
    }
    return 'Grátis'
  }
  return plan.price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: plan.currency || 'BRL',
  })
}

export function createTrialSubscription(planId = 'free') {
  const now = new Date()
  const trialEnds = new Date(now)
  trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS)
  return {
    planId: normalizePlanId(planId),
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
      planId: normalizePlanId(raw.planId || 'free'),
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
    planId: 'free',
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
