const { onRequest } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const admin = require('firebase-admin')

admin.initializeApp()
const db = admin.firestore()

const MP_ACCESS_TOKEN = defineSecret('MP_ACCESS_TOKEN')

const PLANS = {
  free: { id: 'free', title: 'Parquinho Grátis', price: 0 },
  basic: { id: 'basic', title: 'Parquinho Básico', price: 29.9 },
  // aliases antigos
  starter: { id: 'basic', title: 'Parquinho Básico', price: 29.9 },
  pro: { id: 'pro', title: 'Parquinho Pro', price: 59.9 },
  premium: { id: 'premium', title: 'Parquinho Premium', price: 129.9 },
  enterprise: { id: 'premium', title: 'Parquinho Premium', price: 129.9 },
}

function tenantDocId(tenantId) {
  return `parquinhoTenant__${String(tenantId).replace(/[/:]/g, '__')}`
}

function cors(res) {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
}

function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function cleanAccessToken(token) {
  return String(token || '')
    .replace(/^\uFEFF/, '')
    .replace(/^Bearer\s+/i, '')
    .replace(/[\r\n\t\v\f\u00a0]/g, '')
    .trim()
}

async function mpFetch(path, { method = 'GET', body, token } = {}) {
  const accessToken = cleanAccessToken(token)
  if (!accessToken) {
    throw new Error('MP_ACCESS_TOKEN vazio ou inválido.')
  }
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Mercado Pago API error')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

async function writeTenantSubscription(tenantId, subscriptionPatch) {
  const ref = db.collection('appData').doc(tenantDocId(tenantId))
  const snap = await ref.get()
  const current = snap.exists ? (snap.data()?.value || {}) : {}
  const subscription = {
    ...(current.subscription || {}),
    ...subscriptionPatch,
    provider: 'mercado_pago',
    updatedAt: new Date().toISOString(),
  }
  const value = {
    ...current,
    id: current.id || tenantId,
    subscription,
  }
  await ref.set({
    key: `parquinhoTenant:${tenantId}`,
    value,
    clientUpdatedAt: new Date().toISOString(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })
  return subscription
}

exports.createMpCheckout = onRequest({ secrets: [MP_ACCESS_TOKEN], cors: true }, async (req, res) => {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).send('')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const {
      planId, tenantId, payerEmail, payerName, backUrls,
    } = req.body || {}
    const plan = PLANS[planId]
    if (!plan) return res.status(400).json({ error: 'Plano inválido.' })
    if (!plan.price || plan.price <= 0) {
      return res.status(400).json({ error: 'Plano gratuito não usa checkout.' })
    }
    if (!tenantId) return res.status(400).json({ error: 'tenantId obrigatório.' })

    const token = MP_ACCESS_TOKEN.value()
    const webhookUrl = 'https://us-central1-parquinhoperfect.cloudfunctions.net/mpWebhook'
    // Mercado Pago exige HTTPS nas back_urls; HTTP (localhost) causa "Ops, ocorreu um erro"
    const safeBackUrls = backUrls && typeof backUrls === 'object'
      ? Object.fromEntries(
        Object.entries(backUrls).filter(([, url]) => String(url || '').startsWith('https://')),
      )
      : null
    const hasHttpsSuccess = Boolean(safeBackUrls?.success)

    const preference = await mpFetch('/checkout/preferences', {
      method: 'POST',
      token,
      body: {
        items: [{
          id: plan.id,
          title: plan.title,
          description: 'Assinatura mensal do administrador — Parquinho Perfect',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: plan.price,
        }],
        // Não fixar payer: no sandbox isso conflita com conta Comprador / guest
        // e costuma gerar "Ops, ocorreu um erro".
        external_reference: `${tenantId}::${plan.id}`,
        metadata: {
          tenantId,
          planId: plan.id,
          payerEmail: payerEmail || null,
          payerName: payerName || null,
        },
        ...(hasHttpsSuccess ? { back_urls: safeBackUrls, auto_return: 'approved' } : {}),
        notification_url: webhookUrl,
        statement_descriptor: 'PARQUINHO',
      },
    })

    await writeTenantSubscription(tenantId, {
      planId: plan.id,
      status: 'pending',
      mpPreferenceId: preference.id,
    })

    return res.json({
      id: preference.id,
      preferenceId: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    })
  } catch (err) {
    console.error('createMpCheckout', err)
    return res.status(500).json({
      error: err.message || 'Falha ao criar checkout',
      code: err.status,
      detail: err.data || null,
    })
  }
})

exports.confirmMpPayment = onRequest({ secrets: [MP_ACCESS_TOKEN], cors: true }, async (req, res) => {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).send('')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { tenantId, planId, paymentId } = req.body || {}
    if (!tenantId || !planId) {
      return res.status(400).json({ error: 'tenantId e planId obrigatórios.' })
    }

    let approved = !paymentId // se não veio id, apenas reforça pelo retorno success do front
    let payment = null
    if (paymentId && paymentId !== 'null') {
      const token = MP_ACCESS_TOKEN.value()
      payment = await mpFetch(`/v1/payments/${paymentId}`, { token })
      approved = payment.status === 'approved'
      const ref = String(payment.external_reference || '')
      if (ref && !ref.startsWith(`${tenantId}::`)) {
        return res.status(400).json({ error: 'Pagamento não corresponde ao tenant.' })
      }
    }

    if (!approved) {
      return res.status(402).json({ error: 'Pagamento ainda não aprovado.', payment })
    }

    const subscription = await writeTenantSubscription(tenantId, {
      planId,
      status: 'active',
      currentPeriodEnd: addMonths(new Date(), 1).toISOString(),
      mpPaymentId: paymentId || null,
    })
    return res.json({ success: true, subscription })
  } catch (err) {
    console.error('confirmMpPayment', err)
    return res.status(500).json({ error: err.message || 'Falha ao confirmar pagamento' })
  }
})

exports.mpWebhook = onRequest({ secrets: [MP_ACCESS_TOKEN] }, async (req, res) => {
  try {
    const token = MP_ACCESS_TOKEN.value()
    const type = req.query.type || req.body?.type || req.body?.topic
    const id = req.query['data.id'] || req.body?.data?.id || req.query.id

    if ((type === 'payment' || type === 'topic_payment' || req.query.topic === 'payment') && id) {
      const payment = await mpFetch(`/v1/payments/${id}`, { token })
      const [tenantId, planId] = String(payment.external_reference || '').split('::')
      if (tenantId && planId && payment.status === 'approved') {
        await writeTenantSubscription(tenantId, {
          planId,
          status: 'active',
          currentPeriodEnd: addMonths(new Date(), 1).toISOString(),
          mpPaymentId: String(payment.id),
        })
      }
    }

    return res.status(200).send('ok')
  } catch (err) {
    console.error('mpWebhook', err)
    return res.status(200).send('ok')
  }
})
