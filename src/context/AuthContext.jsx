import React, { createContext, useContext, useState, useEffect } from 'react'
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

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export const ROLE_ROUTES = {
  administrador: [
    '/dashboard', '/children', '/staff', '/historico', '/balanco', '/activities',
    '/chat', '/informacoes', '/avaliacoes', '/unidades', '/configuracao',
    '/relatorios',
  ],
  admin: [
    '/dashboard', '/children', '/staff', '/historico', '/balanco', '/activities',
    '/chat', '/informacoes', '/avaliacoes', '/unidades', '/configuracao',
    '/relatorios',
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
  administrador: '/dashboard',
  admin: '/dashboard',
  gerente: '/dashboard',
  professor: '/dashboard',
  responsavel: '/responsavel',
  parent: '/responsavel',
}

function normalizeUser(raw) {
  if (!raw) return null
  if (raw.role === 'membro') return { ...raw, role: 'professor' }
  if (raw.role === 'parent') return { ...raw, role: 'responsavel' }
  if (raw.role === 'admin') return { ...raw, role: 'administrador' }
  return raw
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

  const loginWithGoogle = async (role) => {
    const identity = await firebaseSignInWithGoogle()
    if (!identity?.success) return identity

    const wanted = role === 'admin' ? 'administrador' : role
    const mail = normalizeEmail(identity.email)

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

  const selectActiveUnit = (unitId, unitName) => {
    if (!user) return { success: false, error: 'Sessão inválida.' }
    const id = String(unitId || '').trim()
    if (!id) return { success: false, error: 'Selecione uma unidade.' }
    const next = {
      ...user,
      unitId: id,
      unitName: String(unitName || '').trim() || 'Unidade',
    }
    setUser(next)
    localStorage.setItem('daycareUser', JSON.stringify(next))
    return { success: true }
  }

  const clearActiveUnit = () => {
    if (!user) return { success: false }
    const next = { ...user, unitId: null, unitName: null }
    setUser(next)
    localStorage.setItem('daycareUser', JSON.stringify(next))
    return { success: true }
  }

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

  const isAdmin = user?.role === 'administrador' || user?.role === 'admin'
  const isGerenteOnly = user?.role === 'gerente'
  const isGerente = isGerenteOnly || isAdmin
  const isProfessor = user?.role === 'professor'
  const isResponsavel = user?.role === 'responsavel' || user?.role === 'parent'

  return (
    <AuthContext.Provider value={{
      user,
      loginWithEmail,
      loginWithGoogle,
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
