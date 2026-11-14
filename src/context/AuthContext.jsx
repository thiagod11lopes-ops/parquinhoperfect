import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  resolveEmailAccess,
  normalizeEmail,
  isValidEmail,
} from './TenantContext'

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

  const buildUserFromAccess = (access) => ({
    id: `user-${access.email}`,
    email: access.email,
    name: access.name,
    role: access.role,
    tenantId: access.tenantId,
    adminEmail: access.adminEmail,
    adminName: access.adminName,
    unitId: access.unitId || null,
    unitName: access.unitName || null,
    authProvider: 'google',
    photoURL: null,
    childName: access.childName || null,
    childAge: access.childAge ?? null,
    childPlan: access.childPlan || null,
    childAllergies: access.childAllergies || null,
  })

  /**
   * Login por e-mail + papel escolhido.
   * Admin cria banco na 1ª vez.
   * Convidados com status pending retornam needsStart + dados do convite.
   */
  const loginWithEmail = async (role, { email, name } = {}) => {
    await new Promise((r) => setTimeout(r, 500))
    const mail = normalizeEmail(email)
    if (!isValidEmail(mail)) {
      return { success: false, error: 'Informe um e-mail válido.' }
    }

    const wanted = role === 'admin' ? 'administrador' : role

    if (wanted === 'administrador') {
      // create or open tenant — done by caller via TenantContext.createAdminTenant
      // Auth only persists after tenant exists
      const access = resolveEmailAccess(mail)
      if (access?.kind === 'admin') {
        // Sempre escolher unidade ao entrar
        return persist(buildUserFromAccess({
          ...access,
          name: name || access.name,
          unitId: null,
          unitName: null,
        }))
      }
      if (access && access.kind !== 'admin') {
        return { success: false, error: 'Este e-mail já está cadastrado em outro papel.' }
      }
      return {
        success: false,
        needsAdminCreate: true,
        email: mail,
        name: String(name || '').trim() || mail.split('@')[0],
      }
    }

    const access = resolveEmailAccess(mail)
    if (!access) {
      return {
        success: false,
        error: wanted === 'gerente'
          ? 'E-mail não cadastrado por um administrador. Peça o convite.'
          : wanted === 'professor'
            ? 'E-mail não cadastrado pelo gerente. Peça o convite.'
            : 'E-mail não cadastrado. Peça ao professor ou gerente o convite.',
      }
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

    return persist(buildUserFromAccess(access))
  }

  const activateAndLogin = (activatedAccess) => {
    if (!activatedAccess || activatedAccess.kind !== 'member') {
      return { success: false, error: 'Convite inválido.' }
    }
    return persist(buildUserFromAccess(activatedAccess))
  }

  const loginAdminAfterCreate = (tenant, email, name) => persist({
    id: `user-${email}`,
    email: normalizeEmail(email),
    name: name || tenant.adminName,
    role: 'administrador',
    tenantId: tenant.id,
    adminEmail: tenant.adminEmail,
    adminName: tenant.adminName,
    unitId: null,
    unitName: null,
    authProvider: 'google',
    photoURL: null,
  })

  /** Admin escolhe a unidade ativa antes de usar o sistema */
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

  const logout = () => {
    setUser(null)
    setPendingInvite(null)
    localStorage.removeItem('daycareUser')
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
