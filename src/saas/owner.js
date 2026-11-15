/** E-mail do dono/vendedor do SaaS Parquinho Perfect */
export const SAAS_OWNER_EMAIL = 'thiagod11lopes@gmail.com'

export function normalizeSaasEmail(email = '') {
  return String(email || '').trim().toLowerCase()
}

export function isSaasOwnerEmail(email) {
  return normalizeSaasEmail(email) === SAAS_OWNER_EMAIL
}
