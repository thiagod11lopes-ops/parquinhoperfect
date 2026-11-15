import React, { createContext, useCallback, useContext, useState, useEffect } from 'react'
import {
  resolveEmailAccess,
  resolvePhoneAccess,
  normalizeEmail,
  isValidEmail,
} from './TenantContext'
import {
  firebaseConfirmPhoneCode,
  firebaseSignInWithGoogle,
  firebaseSignInWithPassword,
  firebaseSignOut,
  firebaseSignUpWithPassword,
  firebaseStartPhoneSignIn,
} from '../firebase/authMethods'
import { setLocalOnlyMode } from '../firebase/syncedStorage'
import { isSaasOwnerEmail } from '../saas/owner'

const LOCAL_ADMIN_EMAIL = 'local@dispositivo.local'
const LOCAL_ROLE_NAME = {
  administrador: 'Administrador local',
  gerente: 'Gerente local',
  professor: 'Professor local',
  responsavel: 'Responsável local',
}

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export const ROLE_ROUTES = {
  saas_owner: ['/saas'],
  administrador: [
    '/dashboard', '/children', '/staff', '/historico', '/balanco', '/activities',
    '/chat', '/informacoes', '/avaliacoes', '/unidades', '/configuracao',
    '/relatorios', '/planos',
  ],
  admin: [
    '/dashboard', '/children', '/staff', '/historico', '/balanco', '/activities',
    '/chat', '/informacoes', '/avaliacoes', '/unidades', '/configuracao',
    '/relatorios', '/planos',
  ],
  gerente: [
    '/dashboard', '/children', '/staff', '/historico', '/balanco', '/activities',
    '/chat', '/informacoes', '/avaliacoes', '/relatorios',
    '/presenca',
  ],
  professor: [
    '/dashboard', '/children', '/staff', '/historico', '/balanco', '/chat',
    '/informacoes', '/relatorios', '/presenca', '/activities',
  ],
  responsavel: [
    '/responsavel',
    '/responsavel/qr',
    '/responsavel/saida',
    '/responsavel/alertas',
    '/responsavel/historico',
    '/responsavel/chat',
    '/responsavel/informacoes',
  ],
  parent: [
    '/responsavel',
    '/responsavel/qr',
    '/responsavel/saida',
    '/responsavel/alertas',
    '/responsavel/historico',
    '/responsavel/chat',
    '/responsavel/informacoes',
  ],
}

export const ROLE_HOME = {
  saas_owner: '/saas',
  administrador: '/dashboard',
  admin: '/dashboard',
  gerente: '/dashboard',
  professor: '/dashboard',
  responsavel: '/responsavel',
  parent: '/responsavel',
}

function buildSaasOwnerUser(email, name, authMeta = {}) {
  const mail = normalizeEmail(email)
  return {
    id: authMeta.uid || 'saas-owner',
    email: mail,
    name: String(name || authMeta.name || '').trim() || 'SaaS Owner',
    role: 'saas_owner',
    tenantId: null,
    adminEmail: null,
    adminName: null,
    unitId: null,
    unitName: null,
    authProvider: authMeta.provider || 'google',
    photoURL: authMeta.photoURL || null,
    phone: authMeta.phone || null,
    firebaseUid: authMeta.uid || null,
  }
}

function normalizeUser(raw) {
  if (!raw) return null
  let next = { ...raw }
  if (next.role === 'membro') next = { ...next, role: 'professor' }
  if (next.role === 'parent') next = { ...next, role: 'responsavel' }
  if (next.role === 'admin') next = { ...next, role: 'administrador' }
  if (isSaasOwnerEmail(next.email)) {
    return {
      ...next,
      role: 'saas_owner',
      tenantId: null,
      unitId: null,
      unitName: null,
      adminEmail: null,
      adminName: null,
    }
  }
  return next
}

function inviteErrorForRole(wanted) {
  if (wanted === 'gerente') return 'E-mail não cadastrado por um administrador. Peça o convite.'
  if (wanted === 'professor') return 'E-mail não cadastrado pelo gerente. Peça o convite.'
  return 'Cadastro não encontrado. Peça ao professor ou gerente o convite.'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingInvite, setPendingInvite] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('daycareUser')
    if (stored) {
      try {
        const parsed = normalizeUser(JSON.parse(stored))
        setUser(parsed)
        if (parsed) localStorage.setItem('daycareUser', JSON.stringify(parsed))
        if (parsed?.authProvider === 'local') setLocalOnlyMode(true)
      } catch {
        localStorage.removeItem('daycareUser')
      }
    }
    setLoading(false)
  }, [])

  const persist = (userData) => {
    const normalized = normalizeUser(userData)
    setUser(normalized)
    setPendingInvite(null)
    localStorage.setItem('daycareUser', JSON.stringify(normalized))
    return {
      success: true,
      role: normalized.role,
      homeRoute: ROLE_HOME[normalized.role] || '/',
      unitId: normalized.unitId || null,
      unitName: normalized.unitName || null,
      tenantId: normalized.tenantId || null,
    }
  }

  const buildUserFromAccess = (access, authMeta = {}) => ({
    id: authMeta.uid || `user-${access.email || access.phone || Date.now()}`,
    email: access.email || authMeta.email || null,
    name: authMeta.name || access.name,
    role: access.role,
    tenantId: access.tenantId,
    adminEmail: access.adminEmail,
    adminName: access.adminName,
    unitId: access.unitId || null,
    unitName: access.unitName || null,
    authProvider: authMeta.provider || 'password',
    photoURL: authMeta.photoURL || null,
    phone: authMeta.phone || access.phone || null,
    firebaseUid: authMeta.uid || null,
    childName: access.childName || null,
    childAge: access.childAge ?? null,
    childPlan: access.childPlan || null,
    childAllergies: access.childAllergies || null,
  })

  const resolveRoleAccess = (wanted, mail) => {
    const access = resolveEmailAccess(mail)
    if (!access) {
      return { success: false, error: inviteErrorForRole(wanted) }
    }
    if (access.kind === 'revoked') {
      return { success: false, error: 'Este convite foi revogado.' }
    }
    if (access.kind === 'admin') {
      return { success: false, error: 'Este e-mail é de administrador. Entre pela opção Administrador.' }
    }
    if (access.role !== wanted) {
      return {
        success: false,
        error: `Este e-mail está cadastrado como ${access.role}. Escolha o acesso correto.`,
      }
    }
    if (access.status === 'pending') {
      setPendingInvite(access)
      return { success: false, needsStart: true, invite: access }
    }
    return { success: true, access }
  }

  /**
   * Login legado / pós-Firebase por e-mail + papel.
   * Admin cria banco na 1ª vez.
   */
  const loginWithEmail = async (role, { email, name, authMeta } = {}) => {
    const mail = normalizeEmail(email)
    if (!isValidEmail(mail)) {
      return { success: false, error: 'Informe um e-mail válido.' }
    }

    const wanted = role === 'admin' ? 'administrador' : role

    if (wanted === 'administrador') {
      if (isSaasOwnerEmail(mail)) {
        return persist(buildSaasOwnerUser(
          mail,
          name || authMeta?.name,
          authMeta || { provider: 'password', email: mail },
        ))
      }
      const access = resolveEmailAccess(mail)
      if (access?.kind === 'admin') {
        return persist(buildUserFromAccess({
          ...access,
          name: name || authMeta?.name || access.name,
          unitId: null,
          unitName: null,
        }, authMeta || { provider: 'password', email: mail }))
      }
      if (access && access.kind !== 'admin') {
        return { success: false, error: 'Este e-mail já está cadastrado em outro papel.' }
      }
      return {
        success: false,
        needsAdminCreate: true,
        email: mail,
        name: String(name || authMeta?.name || '').trim() || mail.split('@')[0],
        authMeta: authMeta || null,
      }
    }

    const resolved = resolveRoleAccess(wanted, mail)
    if (!resolved.success) return resolved
    return persist(buildUserFromAccess(resolved.access, authMeta || { provider: 'password', email: mail }))
  }

  const finishWithFirebaseIdentity = async (role, identity) => {
    if (!identity?.success) {
      return { success: false, error: identity?.error || 'Falha na autenticação.' }
    }

    if (identity.provider === 'phone') {
      const wanted = role === 'admin' ? 'administrador' : role
      if (wanted === 'administrador') {
        return {
          success: false,
          error: 'Administrador deve entrar com Google ou e-mail e senha.',
        }
      }
      if (wanted !== 'responsavel') {
        return {
          success: false,
          error: 'Login por SMS está disponível para Responsáveis. Use Google ou e-mail e senha.',
        }
      }

      const access = resolvePhoneAccess(identity.phone)
      if (!access) {
        return {
          success: false,
          error: 'Telefone não cadastrado. Peça ao professor/gerente para incluir seu celular no convite.',
        }
      }
      if (access.kind === 'revoked') {
        return { success: false, error: 'Este convite foi revogado.' }
      }
      if (access.role !== 'responsavel') {
        return {
          success: false,
          error: `Este telefone está cadastrado como ${access.role}.`,
        }
      }
      if (access.status === 'pending') {
        setPendingInvite(access)
        return { success: false, needsStart: true, invite: access }
      }
      return persist(buildUserFromAccess(access, identity))
    }

    return loginWithEmail(role, {
      email: identity.email,
      name: identity.name,
      authMeta: identity,
    })
  }

  const loginLocalOnly = async (role) => {
    setLocalOnlyMode(true)
    await firebaseSignOut()

    const wanted = role === 'admin' ? 'administrador' : role
    const name = LOCAL_ROLE_NAME[wanted] || 'Usuário local'

    if (wanted === 'administrador') {
      return {
        success: false,
        needsAdminCreate: true,
        email: LOCAL_ADMIN_EMAIL,
        name,
        authMeta: {
          provider: 'local',
          uid: 'local-admin',
          email: LOCAL_ADMIN_EMAIL,
          name,
        },
      }
    }

    return {
      success: false,
      error: 'No modo sem senha, entre como Administrador. Os dados ficam só neste aparelho.',
    }
  }

  const loginWithGoogle = async (role) => {
    setLocalOnlyMode(false)
    const identity = await firebaseSignInWithGoogle()
    if (!identity?.success) return identity

    const wanted = role === 'admin' ? 'administrador' : role
    const mail = normalizeEmail(identity.email)

    // Dono do SaaS: console separado (não cria/entra em tenant de creche)
    if (wanted === 'administrador' && isSaasOwnerEmail(mail)) {
      return persist(buildSaasOwnerUser(mail, identity.name, identity))
    }

    // Valida a pirâmide logo após o Google, antes de liberar sessão do app
    if (wanted !== 'administrador') {
      const resolved = resolveRoleAccess(wanted, mail)
      if (!resolved.success && !resolved.needsStart) {
        await firebaseSignOut()
        return resolved
      }
    } else {
      const access = resolveEmailAccess(mail)
      if (access && access.kind !== 'admin') {
        await firebaseSignOut()
        return { success: false, error: 'Este e-mail já está cadastrado em outro papel.' }
      }
    }

    return finishWithFirebaseIdentity(role, identity)
  }

  const loginWithPassword = async (role, { email, password, name, mode = 'signin' } = {}) => {
    const mail = normalizeEmail(email)
    if (!isValidEmail(mail)) return { success: false, error: 'Informe um e-mail válido.' }
    if (!password || String(password).length < 6) {
      return { success: false, error: 'A senha precisa ter pelo menos 6 caracteres.' }
    }

    setLocalOnlyMode(false)
    const wanted = role === 'admin' ? 'administrador' : role

    // Valida a pirâmide ANTES do Firebase (exceto admin criando banco novo)
    if (wanted === 'administrador') {
      const access = resolveEmailAccess(mail)
      if (access && access.kind !== 'admin') {
        return { success: false, error: 'Este e-mail já está cadastrado em outro papel.' }
      }
    } else {
      const resolved = resolveRoleAccess(wanted, mail)
      if (!resolved.success) {
        // needsStart (convite pendente) ainda exige autenticar depois
        if (!resolved.needsStart) return resolved
      }
    }

    let identity
    if (mode === 'signup') {
      identity = await firebaseSignUpWithPassword(mail, password, name)
      if (!identity.success && identity.code === 'auth/email-already-in-use') {
        identity = await firebaseSignInWithPassword(mail, password)
      }
    } else {
      identity = await firebaseSignInWithPassword(mail, password)
      if (!identity.success && identity.code === 'auth/user-not-found') {
        return {
          success: false,
          error: 'Conta ainda sem senha. Use “Criar senha” na primeira vez.',
          needsSignup: true,
        }
      }
    }

    return finishWithFirebaseIdentity(role, {
      ...identity,
      name: name || identity.name,
    })
  }

  const startPhoneLogin = async (role, phone) => {
    const wanted = role === 'admin' ? 'administrador' : role
    if (wanted !== 'responsavel') {
      return {
        success: false,
        error: 'Login por SMS está disponível para Responsáveis.',
      }
    }

    // Valida a pirâmide ANTES de enviar SMS
    const access = resolvePhoneAccess(phone)
    if (!access) {
      return {
        success: false,
        error: 'Telefone não cadastrado. Peça ao professor ou gerente para incluir seu celular no convite.',
      }
    }
    if (access.kind === 'revoked') {
      return { success: false, error: 'Este convite foi revogado.' }
    }
    if (access.role !== 'responsavel') {
      return {
        success: false,
        error: `Este telefone está cadastrado como ${access.role}. Escolha o acesso correto.`,
      }
    }

    return firebaseStartPhoneSignIn(phone)
  }

  const confirmPhoneLogin = async (role, confirmation, code) => {
    setLocalOnlyMode(false)
    const identity = await firebaseConfirmPhoneCode(confirmation, code)
    return finishWithFirebaseIdentity(role, identity)
  }

  const activateAndLogin = (activatedAccess, authMeta = {}) => {
    if (!activatedAccess || activatedAccess.kind !== 'member') {
      return { success: false, error: 'Convite inválido.' }
    }
    return persist(buildUserFromAccess(activatedAccess, authMeta))
  }

  const loginAdminAfterCreate = (tenant, email, name, authMeta = {}) => persist({
    id: authMeta.uid || `user-${email}`,
    email: normalizeEmail(email),
    name: name || tenant.adminName,
    role: 'administrador',
    tenantId: tenant.id,
    adminEmail: tenant.adminEmail,
    adminName: tenant.adminName,
    unitId: null,
    unitName: null,
    authProvider: authMeta.provider || 'password',
    photoURL: authMeta.photoURL || null,
    phone: authMeta.phone || null,
    firebaseUid: authMeta.uid || null,
  })

  const selectActiveUnit = useCallback((nextUnitId, unitName) => {
    const id = String(nextUnitId || '').trim()
    if (!id) return { success: false, error: 'Selecione uma unidade.' }
    try {
      const raw = localStorage.getItem('daycareUser')
      const prev = raw ? JSON.parse(raw) : null
      if (!prev || typeof prev !== 'object') {
        return { success: false, error: 'Sessão inválida.' }
      }
      const next = {
        ...prev,
        unitId: id,
        unitName: String(unitName || '').trim() || 'Unidade',
      }
      localStorage.setItem('daycareUser', JSON.stringify(next))
      setUser(next)
      return { success: true, unitId: id, unitName: next.unitName }
    } catch {
      return { success: false, error: 'Sessão inválida.' }
    }
  }, [])

  const clearActiveUnit = useCallback(() => {
    try {
      const raw = localStorage.getItem('daycareUser')
      const prev = raw ? JSON.parse(raw) : null
      if (!prev || typeof prev !== 'object') return { success: false }
      const next = { ...prev, unitId: null, unitName: null }
      localStorage.setItem('daycareUser', JSON.stringify(next))
      setUser(next)
      return { success: true }
    } catch {
      return { success: false }
    }
  }, [])

  const logout = async () => {
    setUser(null)
    setPendingInvite(null)
    localStorage.removeItem('daycareUser')
    await firebaseSignOut()
  }

  const canAccess = (path) => {
    if (!user) return false
    const allowed = ROLE_ROUTES[user.role] || []
    if (allowed.includes(path)) return true
    if (user.role === 'responsavel' || user.role === 'parent') {
      return path.startsWith('/responsavel')
    }
    return false
  }

  const isSaasOwner = user?.role === 'saas_owner' || isSaasOwnerEmail(user?.email)
  const isAdmin = !isSaasOwner && (user?.role === 'administrador' || user?.role === 'admin')
  const isGerenteOnly = user?.role === 'gerente'
  const isGerente = isGerenteOnly || isAdmin
  const isProfessor = user?.role === 'professor'
  const isResponsavel = user?.role === 'responsavel' || user?.role === 'parent'

  return (
    <AuthContext.Provider value={{
      user,
      loginWithEmail,
      loginWithGoogle,
      loginLocalOnly,
      loginWithPassword,
      startPhoneLogin,
      confirmPhoneLogin,
      loginAdminAfterCreate,
      activateAndLogin,
      selectActiveUnit,
      clearActiveUnit,
      pendingInvite,
      setPendingInvite,
      logout,
      canAccess,
      isAuthenticated: !!user,
      isSaasOwner,
      isAdmin,
      isGerente,
      isGerenteOnly,
      isProfessor,
      isResponsavel,
      isMembro: isProfessor,
      isParent: isResponsavel,
      canEditStaff: isGerenteOnly || isAdmin,
      canRegisterProfessor: isGerenteOnly,
      canRegisterResponsavel: isGerenteOnly || isProfessor,
      unitId: user?.unitId || null,
      unitName: user?.unitName || null,
      tenantId: user?.tenantId || null,
      adminEmail: user?.adminEmail || null,
      homeRoute: user ? (ROLE_HOME[user.role] || '/dashboard') : '/',
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
