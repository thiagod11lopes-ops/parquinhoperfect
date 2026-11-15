import { BILLING_PLANS, getPlanById, getSubscriptionAccess, normalizePlanId } from '../billing/plans'

function money(value) {
  return Number(value || 0)
}

function formatBrl(value) {
  return money(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function daysBetween(fromIso, toDate = new Date()) {
  if (!fromIso) return null
  const from = new Date(fromIso)
  if (Number.isNaN(from.getTime())) return null
  return Math.max(0, Math.floor((toDate.getTime() - from.getTime()) / 86400000))
}

/**
 * Consolida métricas de todos os tenants para o painel do vendedor SaaS.
 * @param {Array} tenants
 */
export function buildSaasMetrics(tenants = []) {
  const list = Array.isArray(tenants) ? tenants : []
  const byPlan = {}
  BILLING_PLANS.forEach((p) => {
    byPlan[p.id] = {
      id: p.id,
      name: p.name,
      price: p.price || 0,
      subscribers: 0,
      active: 0,
      trialing: 0,
      expired: 0,
      canceled: 0,
      mrr: 0,
    }
  })

  let totalUnits = 0
  let totalManagers = 0
  let totalProfessors = 0
  let totalGuardians = 0
  let setupDone = 0
  let mrr = 0
  let arr = 0
  let paidAccounts = 0
  let trialAccounts = 0
  let expiredAccounts = 0
  let canceledAccounts = 0
  let newLast7 = 0
  let newLast30 = 0

  const rows = list.map((tenant) => {
    const sub = tenant.subscription || {}
    const access = getSubscriptionAccess(sub)
    const planId = normalizePlanId(access.planId || sub.planId || 'free')
    const plan = getPlanById(planId)
    const price = money(plan?.price)
    const status = access.status || sub.status || 'expired'
    const units = Array.isArray(tenant.units) ? tenant.units.length : 0
    const members = Array.isArray(tenant.members) ? tenant.members : []
    const managers = members.filter((m) => m.role === 'gerente' && m.status !== 'revoked').length
    const professors = members.filter((m) => m.role === 'professor' && m.status !== 'revoked').length
    const guardians = members.filter((m) => m.role === 'responsavel' && m.status !== 'revoked').length
    const ageDays = daysBetween(tenant.createdAt)

    totalUnits += units
    totalManagers += managers
    totalProfessors += professors
    totalGuardians += guardians
    if (tenant.setupCompleted) setupDone += 1
    if (ageDays != null && ageDays <= 7) newLast7 += 1
    if (ageDays != null && ageDays <= 30) newLast30 += 1

    if (!byPlan[planId]) {
      byPlan[planId] = {
        id: planId,
        name: plan?.name || planId,
        price,
        subscribers: 0,
        active: 0,
        trialing: 0,
        expired: 0,
        canceled: 0,
        mrr: 0,
      }
    }
    byPlan[planId].subscribers += 1

    if (status === 'active' && price > 0) {
      byPlan[planId].active += 1
      byPlan[planId].mrr += price
      mrr += price
      paidAccounts += 1
    } else if (status === 'trialing') {
      byPlan[planId].trialing += 1
      trialAccounts += 1
    } else if (status === 'canceled') {
      byPlan[planId].canceled += 1
      canceledAccounts += 1
    } else {
      byPlan[planId].expired += 1
      expiredAccounts += 1
    }

    return {
      id: tenant.id,
      adminEmail: tenant.adminEmail,
      adminName: tenant.adminName,
      createdAt: tenant.createdAt,
      setupCompleted: Boolean(tenant.setupCompleted),
      planId,
      planName: plan?.name || planId,
      planPrice: price,
      status,
      accessOk: Boolean(access.ok),
      endsAt: access.endsAt || sub.currentPeriodEnd || sub.trialEndsAt || null,
      units,
      managers,
      professors,
      guardians,
      members: members.length,
      ageDays,
    }
  })

  arr = mrr * 12
  const total = list.length
  const freeAccounts = byPlan.free?.subscribers || 0
  const conversionPaid = total > 0 ? Math.round((paidAccounts / total) * 100) : 0
  const conversionTrial = total > 0 ? Math.round((trialAccounts / total) * 100) : 0
  const setupRate = total > 0 ? Math.round((setupDone / total) * 100) : 0
  const arpu = paidAccounts > 0 ? mrr / paidAccounts : 0
  // LTV simplificado (ARPU × 12 meses) — proxy para vendedor SaaS
  const ltv = arpu * 12
  const churnProxy = total > 0
    ? Math.round(((canceledAccounts + expiredAccounts) / total) * 100)
    : 0
  const avgUnits = total > 0 ? Math.round((totalUnits / total) * 10) / 10 : 0

  const planBreakdown = BILLING_PLANS.map((p) => byPlan[p.id]).filter(Boolean)

  rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      tenants: total,
      paidAccounts,
      trialAccounts,
      expiredAccounts,
      canceledAccounts,
      freeAccounts,
      setupDone,
      setupPending: Math.max(0, total - setupDone),
      setupRate,
      units: totalUnits,
      avgUnits,
      managers: totalManagers,
      professors: totalProfessors,
      guardians: totalGuardians,
      newLast7,
      newLast30,
      mrr,
      arr,
      arpu,
      ltv,
      churnProxy,
      conversionPaid,
      conversionTrial,
      mrrLabel: formatBrl(mrr),
      arrLabel: formatBrl(arr),
      arpuLabel: formatBrl(arpu),
      ltvLabel: formatBrl(ltv),
    },
    planBreakdown,
    tenants: rows,
    formatBrl,
  }
}

export { formatBrl }
