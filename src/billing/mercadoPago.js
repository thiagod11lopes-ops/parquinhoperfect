import { getPlanById } from './plans'

const FUNCTIONS_BASE = (
  import.meta.env.VITE_MP_FUNCTIONS_URL
  || `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'parquinhoperfect'}.cloudfunctions.net`
).replace(/\/$/, '')

function appOrigin() {
  if (typeof window === 'undefined') return ''
  return window.location.origin + (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
}

/**
 * Cria checkout no Mercado Pago via Cloud Function.
 * Fallback: links estáticos por plano (VITE_MP_PLAN_LINKS JSON).
 */
export async function startMercadoPagoCheckout({
  planId,
  tenantId,
  adminEmail,
  adminName,
}) {
  const plan = getPlanById(planId)
  if (!plan) return { success: false, error: 'Plano inválido.' }
  if (!tenantId) return { success: false, error: 'Tenant não encontrado.' }

  // Links manuais (opcional) — preferências/assinaturas já criadas no painel MP
  try {
    const rawLinks = import.meta.env.VITE_MP_PLAN_LINKS
    if (rawLinks) {
      const map = typeof rawLinks === 'string' ? JSON.parse(rawLinks) : rawLinks
      const url = map?.[planId]
      if (url) {
        return { success: true, initPoint: url, mode: 'static_link' }
      }
    }
  } catch {
    // ignore parse errors
  }

  const backBase = `${appOrigin()}planos`
  const payload = {
    planId,
    tenantId,
    payerEmail: adminEmail,
    payerName: adminName,
    backUrls: {
      success: `${backBase}?status=success&plan=${planId}`,
      failure: `${backBase}?status=failure&plan=${planId}`,
      pending: `${backBase}?status=pending&plan=${planId}`,
    },
  }

  try {
    const res = await fetch(`${FUNCTIONS_BASE}/createMpCheckout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Não foi possível iniciar o pagamento no Mercado Pago.',
        code: data.code,
      }
    }
    if (!data.init_point && !data.sandbox_init_point) {
      return { success: false, error: 'Checkout sem URL de retorno do Mercado Pago.' }
    }
    // Padrão: sandbox (teste). Só usa checkout real se VITE_MP_SANDBOX=false
    const useSandbox = import.meta.env.VITE_MP_SANDBOX !== 'false'
    return {
      success: true,
      initPoint: useSandbox
        ? (data.sandbox_init_point || data.init_point)
        : (data.init_point || data.sandbox_init_point),
      preferenceId: data.id || data.preferenceId || null,
      mode: 'cloud_function',
    }
  } catch (err) {
    return {
      success: false,
      error: 'Serviço de pagamento indisponível. Configure as Cloud Functions ou VITE_MP_PLAN_LINKS.',
      detail: err?.message,
    }
  }
}

/** Confirma retorno do checkout (reforço; webhook é a fonte principal). */
export async function confirmMercadoPagoReturn({ tenantId, planId, paymentId }) {
  if (!tenantId || !planId) return { success: false, error: 'Dados incompletos.' }
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/confirmMpPayment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, planId, paymentId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, error: data.error || 'Não foi possível confirmar o pagamento.' }
    }
    return { success: true, subscription: data.subscription || null }
  } catch {
    return { success: false, error: 'Falha ao confirmar pagamento.' }
  }
}
