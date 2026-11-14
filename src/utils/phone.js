/** Formato: (21) 9 9999-9999 */
export const PHONE_PLACEHOLDER = '(21) 9 9999-9999'
export const PHONE_REGEX = /^\(\d{2}\) 9 \d{4}-\d{4}$/

export function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '').slice(0, 11)
}

export function formatPhone(value = '') {
  let digits = onlyDigits(value)
  // Garante o 9 após o DDD quando o usuário digita o restante do número
  if (digits.length >= 3 && digits[2] !== '9') {
    digits = `${digits.slice(0, 2)}9${digits.slice(2)}`.slice(0, 11)
  }
  const len = digits.length

  if (len === 0) return ''
  if (len <= 2) return `(${digits}`
  if (len === 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (len <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

export function isValidPhone(value = '') {
  return PHONE_REGEX.test(value)
}
