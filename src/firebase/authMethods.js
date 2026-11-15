import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  linkWithCredential,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
  EmailAuthProvider,
} from 'firebase/auth'
import { auth } from './app'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

function mapAuthError(err) {
  const code = err?.code || ''
  const messages = {
    'auth/popup-closed-by-user': 'Login cancelado.',
    'auth/popup-blocked': 'Pop-up bloqueado pelo navegador. Permita pop-ups e tente de novo.',
    'auth/cancelled-popup-request': 'Login cancelado.',
    'auth/email-already-in-use': 'Este e-mail já possui uma senha cadastrada. Use Entrar.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'Conta não encontrada. Crie uma senha primeiro.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento.',
    'auth/invalid-phone-number': 'Telefone inválido. Use o formato com DDD, ex: (11) 99999-9999.',
    'auth/missing-phone-number': 'Informe o telefone.',
    'auth/invalid-verification-code': 'Código SMS inválido.',
    'auth/code-expired': 'Código SMS expirado. Solicite outro.',
    'auth/captcha-check-failed': 'Falha na verificação reCAPTCHA. Atualize a página.',
    'auth/operation-not-allowed': 'Este método de login ainda não foi ativado no Firebase Console.',
    'auth/unauthorized-domain': 'Domínio não autorizado no Firebase Authentication.',
    'auth/billing-not-enabled': 'SMS exige plano Blaze no Firebase (ou números de teste).',
  }
  return messages[code] || err?.message || 'Falha na autenticação.'
}

export function normalizePhoneBr(input = '') {
  const digits = String(input).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`
  if (String(input).trim().startsWith('+')) return `+${digits}`
  return `+${digits}`
}

export async function firebaseSignInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user
    return {
      success: true,
      provider: 'google',
      uid: user.uid,
      email: user.email,
      name: user.displayName || user.email?.split('@')[0] || 'Usuário',
      phone: user.phoneNumber || null,
      photoURL: user.photoURL || null,
    }
  } catch (err) {
    return { success: false, error: mapAuthError(err), code: err?.code }
  }
}

export async function firebaseSignInWithPassword(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password)
    const user = result.user
    return {
      success: true,
      provider: 'password',
      uid: user.uid,
      email: user.email,
      name: user.displayName || user.email?.split('@')[0] || 'Usuário',
      phone: user.phoneNumber || null,
      photoURL: user.photoURL || null,
    }
  } catch (err) {
    return { success: false, error: mapAuthError(err), code: err?.code }
  }
}

export async function firebaseSignUpWithPassword(email, password, name) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    if (name) {
      try {
        await updateProfile(result.user, { displayName: name })
      } catch {
        // ignore profile update failures
      }
    }
    const user = result.user
    return {
      success: true,
      provider: 'password',
      uid: user.uid,
      email: user.email,
      name: name || user.displayName || user.email?.split('@')[0] || 'Usuário',
      phone: user.phoneNumber || null,
      photoURL: user.photoURL || null,
    }
  } catch (err) {
    return { success: false, error: mapAuthError(err), code: err?.code }
  }
}

let recaptchaVerifier = null

export function clearRecaptcha() {
  try {
    recaptchaVerifier?.clear?.()
  } catch {
    // ignore
  }
  recaptchaVerifier = null
  const el = document.getElementById('firebase-recaptcha')
  if (el) el.innerHTML = ''
}

export function ensureRecaptcha(containerId = 'firebase-recaptcha') {
  if (recaptchaVerifier) return recaptchaVerifier
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => {
      clearRecaptcha()
    },
  })
  return recaptchaVerifier
}

export async function firebaseStartPhoneSignIn(phoneInput) {
  try {
    const phone = normalizePhoneBr(phoneInput)
    if (!phone || phone.length < 12) {
      return { success: false, error: 'Informe um telefone válido com DDD.' }
    }
    const verifier = ensureRecaptcha()
    const confirmation = await signInWithPhoneNumber(auth, phone, verifier)
    return { success: true, confirmation, phone }
  } catch (err) {
    clearRecaptcha()
    return { success: false, error: mapAuthError(err), code: err?.code }
  }
}

export async function firebaseConfirmPhoneCode(confirmation, code) {
  try {
    const result = await confirmation.confirm(String(code || '').trim())
    const user = result.user
    return {
      success: true,
      provider: 'phone',
      uid: user.uid,
      email: user.email || null,
      name: user.displayName || user.phoneNumber || 'Responsável',
      phone: user.phoneNumber || null,
      photoURL: user.photoURL || null,
    }
  } catch (err) {
    return { success: false, error: mapAuthError(err), code: err?.code }
  }
}

export async function firebaseSignOut() {
  try {
    await signOut(auth)
  } catch {
    // ignore
  }
}

/** Optional: link email/password to current Firebase user */
export async function firebaseLinkEmailPassword(email, password) {
  try {
    if (!auth.currentUser) return { success: false, error: 'Sem usuário autenticado.' }
    const credential = EmailAuthProvider.credential(email, password)
    await linkWithCredential(auth.currentUser, credential)
    return { success: true }
  } catch (err) {
    return { success: false, error: mapAuthError(err), code: err?.code }
  }
}
