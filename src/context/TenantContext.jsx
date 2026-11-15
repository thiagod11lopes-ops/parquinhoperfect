import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { syncedStorage } from '../firebase/syncedStorage'
import { normalizePhoneBr } from '../firebase/authMethods'

const TenantContext = createContext(null)

const INDEX_KEY = 'parquinhoTenantIndex'
const PHONE_INDEX_KEY = 'parquinhoPhoneIndex'
const tenantKey = (id) => `parquinhoTenant:${id}`

export function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase()
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
}

export function normalizePhone(phone = '') {
  return normalizePhoneBr(phone)
}

function loadIndex() {
  try {
    const raw = syncedStorage.getItem(INDEX_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistIndex(index) {
  syncedStorage.setItem(INDEX_KEY, JSON.stringify(index))
  window.dispatchEvent(new CustomEvent('parquinho-tenant'))
}

function loadPhoneIndex() {
  try {
    const raw = syncedStorage.getItem(PHONE_INDEX_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistPhoneIndex(index) {
  syncedStorage.setItem(PHONE_INDEX_KEY, JSON.stringify(index))
  window.dispatchEvent(new CustomEvent('parquinho-tenant'))
}

function setPhoneIndexEntry(phone, entry) {
  const key = normalizePhone(phone)
  if (!key) return
  const index = loadPhoneIndex()
  index[key] = entry
  persistPhoneIndex(index)
}

function clearPhoneIndexEntry(phone) {
  const key = normalizePhone(phone)
  if (!key) return
  const index = loadPhoneIndex()
  if (index[key]) {
    delete index[key]
    persistPhoneIndex(index)
  }
}

function loadTenant(tenantId) {
  if (!tenantId) return null
  try {
    const raw = syncedStorage.getItem(tenantKey(tenantId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return {
      id: parsed.id || tenantId,
      adminEmail: normalizeEmail(parsed.adminEmail),
      adminName: parsed.adminName || 'Administrador',
      createdAt: parsed.createdAt || new Date().toISOString(),
      units: Array.isArray(parsed.units) ? parsed.units : [],
      members: Array.isArray(parsed.members) ? parsed.members : [],
      setupCompleted: Boolean(parsed.setupCompleted),
    }
  } catch {
    return null
  }
}

function persistTenant(tenant) {
  syncedStorage.setItem(tenantKey(tenant.id), JSON.stringify(tenant))
  window.dispatchEvent(new CustomEvent('parquinho-tenant'))
}

function clearLegacyDemo() {
  try {
    localStorage.removeItem('parquinhoUnits')
  } catch {
    // ignore
  }
}

clearLegacyDemo()

function makeMember({
  email, name, role, unitId, invitedByEmail, invitedByRole, phone, childName,
  childAge, childPlan, childAllergies,
}) {
  return {
    id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email: normalizeEmail(email),
    name: String(name || '').trim() || normalizeEmail(email).split('@')[0],
    role,
    unitId: unitId || null,
    status: 'pending',
    invitedByEmail: normalizeEmail(invitedByEmail || ''),
    invitedByRole: invitedByRole || '',
    phone: phone || '',
    childName: childName || '',
    childAge: childAge != null && childAge !== '' ? Number(childAge) : null,
    childPlan: childPlan || '',
    childAllergies: childAllergies || '',
    createdAt: new Date().toISOString(),
    activatedAt: null,
  }
}

function memberAccessPayload(tenant, member, mail) {
  const unit = tenant.units.find((u) => u.id === member.unitId)
  return {
    kind: 'member',
    role: member.role,
    status: member.status,
    tenantId: tenant.id,
    adminEmail: tenant.adminEmail,
    adminName: tenant.adminName,
    unitId: member.unitId,
    unitName: unit?.name || '',
    email: mail || member.email,
    name: member.name,
    memberId: member.id,
    invitedByEmail: member.invitedByEmail,
    phone: member.phone,
    childName: member.childName,
    childAge: member.childAge ?? null,
    childPlan: member.childPlan || '',
    childAllergies: member.childAllergies || '',
  }
}

/** Lookup global por e-mail (login) */
export function resolveEmailAccess(email) {
  const mail = normalizeEmail(email)
  if (!mail) return null
  const index = loadIndex()
  const entry = index[mail]
  if (!entry) return null

  if (entry.role === 'administrador') {
    const tenant = loadTenant(entry.tenantId)
    if (!tenant) return null
    return {
      kind: 'admin',
      role: 'administrador',
      tenantId: tenant.id,
      adminEmail: tenant.adminEmail,
      adminName: tenant.adminName,
      email: mail,
      name: tenant.adminName,
      status: 'active',
      phone: null,
    }
  }

  const tenant = loadTenant(entry.tenantId)
  if (!tenant) return null
  const member = tenant.members.find((m) => m.email === mail && m.id === entry.memberId)
    || tenant.members.find((m) => m.email === mail)
  if (!member || member.status === 'revoked') {
    return { kind: 'revoked', email: mail }
  }

  return memberAccessPayload(tenant, member, mail)
}

/** Lookup global por telefone (login SMS, tipicamente responsável) */
export function resolvePhoneAccess(phone) {
  const key = normalizePhone(phone)
  if (!key) return null
  const phoneIndex = loadPhoneIndex()
  const entry = phoneIndex[key]
  if (entry?.tenantId && entry?.memberId) {
    const tenant = loadTenant(entry.tenantId)
    if (!tenant) return null
    const member = tenant.members.find((m) => m.id === entry.memberId)
    if (!member || member.status === 'revoked') {
      return { kind: 'revoked', phone: key }
    }
    return memberAccessPayload(tenant, member, member.email)
  }

  // Fallback: busca em tenants conhecidos do índice de e-mail
  const emailIndex = loadIndex()
  const tenantIds = [...new Set(Object.values(emailIndex).map((e) => e?.tenantId).filter(Boolean))]
  for (const tenantId of tenantIds) {
    const tenant = loadTenant(tenantId)
    if (!tenant) continue
    const member = tenant.members.find((m) => normalizePhone(m.phone) === key && m.status !== 'revoked')
    if (member) {
      setPhoneIndexEntry(key, { tenantId, memberId: member.id, role: member.role })
      return memberAccessPayload(tenant, member, member.email)
    }
  }
  return null
}

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within TenantProvider')
  return ctx
}

export function TenantProvider({ children }) {
  const [tick, setTick] = useState(0)
  const bump = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    const sync = () => bump()
    window.addEventListener('storage', sync)
    window.addEventListener('parquinho-tenant', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('parquinho-tenant', sync)
    }
  }, [bump])

  const getTenant = useCallback((tenantId) => loadTenant(tenantId), [tick]) // eslint-disable-line react-hooks/exhaustive-deps

  const createAdminTenant = useCallback((email, name) => {
    const mail = normalizeEmail(email)
    if (!isValidEmail(mail)) return { success: false, error: 'Informe um e-mail válido.' }

    const index = loadIndex()
    if (index[mail]) {
      if (index[mail].role === 'administrador') {
        const tenant = loadTenant(index[mail].tenantId)
        return { success: true, tenant, created: false }
      }
      return { success: false, error: 'Este e-mail já está vinculado a outro cadastro.' }
    }

    const tenant = {
      id: `tenant-${Date.now()}`,
      adminEmail: mail,
      adminName: String(name || '').trim() || mail.split('@')[0],
      createdAt: new Date().toISOString(),
      units: [],
      members: [],
      setupCompleted: false,
    }
    persistTenant(tenant)
    index[mail] = { tenantId: tenant.id, role: 'administrador' }
    persistIndex(index)
    bump()
    return { success: true, tenant, created: true }
  }, [bump])

  const ensureEmailFree = useCallback((email, { allowTenantId, allowMemberId } = {}) => {
    const mail = normalizeEmail(email)
    const index = loadIndex()
    const entry = index[mail]
    if (!entry) return { ok: true }
    if (entry.role === 'administrador') {
      if (allowTenantId && entry.tenantId === allowTenantId && entry.role === 'administrador') {
        return { ok: false, error: 'E-mail já é administrador deste banco.' }
      }
      return { ok: false, error: 'Este e-mail já é administrador de outro banco.' }
    }
    if (allowMemberId && entry.memberId === allowMemberId) return { ok: true }
    if (allowTenantId && entry.tenantId === allowTenantId) {
      const tenant = loadTenant(entry.tenantId)
      const member = tenant?.members.find((m) => m.id === entry.memberId)
      if (member && member.status === 'revoked') return { ok: true }
    }
    return { ok: false, error: 'Este e-mail já está vinculado a um cadastro.' }
  }, [])

  const inviteMember = useCallback(({
    tenantId, email, name, role, unitId, invitedByEmail, invitedByRole, phone, childName,
    childAge, childPlan, childAllergies,
  }) => {
    const mail = normalizeEmail(email)
    if (!isValidEmail(mail)) return { success: false, error: 'Informe um e-mail válido.' }
    if (!['gerente', 'professor', 'responsavel'].includes(role)) {
      return { success: false, error: 'Papel inválido.' }
    }

    const free = ensureEmailFree(mail, { allowTenantId: tenantId })
    if (!free.ok) {
      // allow re-invite if same tenant revoked
      const index = loadIndex()
      const entry = index[mail]
      if (!(entry && entry.tenantId === tenantId)) return { success: false, error: free.error }
      const tenantCheck = loadTenant(tenantId)
      const existing = tenantCheck?.members.find((m) => m.email === mail)
      if (existing && existing.status !== 'revoked') {
        return { success: false, error: free.error }
      }
    }

    const tenant = loadTenant(tenantId)
    if (!tenant) return { success: false, error: 'Banco do administrador não encontrado.' }

    if ((role === 'gerente' || role === 'professor' || role === 'responsavel') && unitId) {
      if (!tenant.units.some((u) => u.id === unitId)) {
        return { success: false, error: 'Unidade inválida.' }
      }
    }
    if (role === 'gerente' && !unitId) {
      return { success: false, error: 'Selecione a unidade do gerente.' }
    }

    const without = tenant.members.filter((m) => m.email !== mail)
    const member = makeMember({
      email: mail, name, role, unitId, invitedByEmail, invitedByRole, phone: normalizePhone(phone) || phone || '',
      childName, childAge, childPlan, childAllergies,
    })
    const next = { ...tenant, members: [member, ...without] }
    persistTenant(next)

    const index = loadIndex()
    index[mail] = { tenantId, role, memberId: member.id }
    persistIndex(index)
    if (member.phone) {
      setPhoneIndexEntry(member.phone, { tenantId, memberId: member.id, role })
    }
    bump()
    return { success: true, member }
  }, [bump, ensureEmailFree])

  const resendInvite = useCallback((tenantId, memberId) => {
    const tenant = loadTenant(tenantId)
    if (!tenant) return { success: false, error: 'Banco não encontrado.' }
    const next = {
      ...tenant,
      members: tenant.members.map((m) => (
        m.id === memberId
          ? { ...m, status: 'pending', activatedAt: null, createdAt: new Date().toISOString() }
          : m
      )),
    }
    persistTenant(next)
    bump()
    return { success: true }
  }, [bump])

  const revokeMember = useCallback((tenantId, memberId) => {
    const tenant = loadTenant(tenantId)
    if (!tenant) return { success: false, error: 'Banco não encontrado.' }
    const member = tenant.members.find((m) => m.id === memberId)
    if (!member) return { success: false, error: 'Cadastro não encontrado.' }

    const next = {
      ...tenant,
      members: tenant.members.map((m) => (
        m.id === memberId ? { ...m, status: 'revoked' } : m
      )),
    }
    persistTenant(next)

    const index = loadIndex()
    if (index[member.email]?.memberId === memberId) {
      delete index[member.email]
      persistIndex(index)
    }
    if (member.phone) clearPhoneIndexEntry(member.phone)
    bump()
    return { success: true }
  }, [bump])

  const changeMemberEmail = useCallback((tenantId, memberId, newEmail) => {
    const mail = normalizeEmail(newEmail)
    if (!isValidEmail(mail)) return { success: false, error: 'Informe um e-mail válido.' }
    const tenant = loadTenant(tenantId)
    if (!tenant) return { success: false, error: 'Banco não encontrado.' }
    const member = tenant.members.find((m) => m.id === memberId)
    if (!member) return { success: false, error: 'Cadastro não encontrado.' }

    const free = ensureEmailFree(mail, { allowMemberId: memberId, allowTenantId: tenantId })
    if (!free.ok) return { success: false, error: free.error }

    const oldEmail = member.email
    const next = {
      ...tenant,
      members: tenant.members.map((m) => (
        m.id === memberId
          ? { ...m, email: mail, status: 'pending', activatedAt: null }
          : m
      )),
    }
    persistTenant(next)

    const index = loadIndex()
    delete index[oldEmail]
    index[mail] = { tenantId, role: member.role, memberId }
    persistIndex(index)
    bump()
    return { success: true }
  }, [bump, ensureEmailFree])

  const updateMember = useCallback((tenantId, memberId, patch = {}) => {
    const tenant = loadTenant(tenantId)
    if (!tenant) return { success: false, error: 'Banco não encontrado.' }
    const member = tenant.members.find((m) => m.id === memberId)
    if (!member) return { success: false, error: 'Cadastro não encontrado.' }

    let nextEmail = member.email
    if (patch.email != null) {
      nextEmail = normalizeEmail(patch.email)
      if (!isValidEmail(nextEmail)) return { success: false, error: 'Informe um e-mail válido.' }
      const free = ensureEmailFree(nextEmail, { allowMemberId: memberId, allowTenantId: tenantId })
      if (!free.ok) return { success: false, error: free.error }
    }

    const nextPhone = patch.phone != null
      ? (normalizePhone(patch.phone) || String(patch.phone).trim())
      : member.phone

    const updated = {
      ...member,
      name: patch.name != null ? String(patch.name).trim() || member.name : member.name,
      email: nextEmail,
      phone: nextPhone,
      childName: patch.childName != null ? patch.childName : member.childName,
      childAge: patch.childAge !== undefined ? patch.childAge : member.childAge,
      childPlan: patch.childPlan != null ? patch.childPlan : member.childPlan,
      childAllergies: patch.childAllergies != null ? patch.childAllergies : member.childAllergies,
      unitId: patch.unitId != null ? patch.unitId : member.unitId,
    }

    const next = {
      ...tenant,
      members: tenant.members.map((m) => (m.id === memberId ? updated : m)),
    }
    persistTenant(next)

    if (nextEmail !== member.email) {
      const index = loadIndex()
      delete index[member.email]
      index[nextEmail] = { tenantId, role: member.role, memberId }
      persistIndex(index)
    }

    if (normalizePhone(member.phone) !== normalizePhone(updated.phone)) {
      if (member.phone) clearPhoneIndexEntry(member.phone)
      if (updated.phone) {
        setPhoneIndexEntry(updated.phone, { tenantId, memberId, role: member.role })
      }
    }

    bump()
    return { success: true, member: updated }
  }, [bump, ensureEmailFree])

  const activateInvite = useCallback((email) => {
    const access = resolveEmailAccess(email)
    if (!access || access.kind !== 'member') {
      return { success: false, error: 'Convite não encontrado.' }
    }
    if (access.status === 'revoked') {
      return { success: false, error: 'Este convite foi revogado.' }
    }
    const tenant = loadTenant(access.tenantId)
    if (!tenant) return { success: false, error: 'Banco não encontrado.' }

    const next = {
      ...tenant,
      members: tenant.members.map((m) => (
        m.email === access.email
          ? { ...m, status: 'active', activatedAt: new Date().toISOString() }
          : m
      )),
    }
    persistTenant(next)
    bump()
    return { success: true, access: resolveEmailAccess(email) }
  }, [bump])

  const createUnit = useCallback((tenantId, name) => {
    const trimmed = String(name || '').trim()
    if (!trimmed) return { success: false, error: 'Informe o nome da unidade.' }
    const tenant = loadTenant(tenantId)
    if (!tenant) return { success: false, error: 'Banco não encontrado.' }
    const unit = { id: `unit-${Date.now()}`, name: trimmed }
    const next = { ...tenant, units: [unit, ...tenant.units] }
    persistTenant(next)
    bump()
    return { success: true, unit }
  }, [bump])

  const completeSetup = useCallback((tenantId) => {
    const tenant = loadTenant(tenantId)
    if (!tenant) return { success: false, error: 'Banco não encontrado.' }
    persistTenant({ ...tenant, setupCompleted: true })
    bump()
    return { success: true }
  }, [bump])

  const renameUnit = useCallback((tenantId, unitId, name) => {
    const trimmed = String(name || '').trim()
    if (!trimmed) return { success: false, error: 'Informe o nome da unidade.' }
    const tenant = loadTenant(tenantId)
    if (!tenant) return { success: false, error: 'Banco não encontrado.' }
    const next = {
      ...tenant,
      units: tenant.units.map((u) => (u.id === unitId ? { ...u, name: trimmed } : u)),
    }
    persistTenant(next)
    bump()
    return { success: true }
  }, [bump])

  const deleteUnit = useCallback((tenantId, unitId) => {
    const tenant = loadTenant(tenantId)
    if (!tenant) return { success: false, error: 'Banco não encontrado.' }

    const removedMembers = tenant.members.filter((m) => m.unitId === unitId)
    const keptMembers = tenant.members.filter((m) => m.unitId !== unitId)
    const next = {
      ...tenant,
      units: tenant.units.filter((u) => u.id !== unitId),
      members: keptMembers,
    }
    persistTenant(next)

    const index = loadIndex()
    removedMembers.forEach((m) => {
      const mail = normalizeEmail(m.email)
      if (index[mail]?.tenantId === tenantId && index[mail]?.memberId === m.id) {
        delete index[mail]
      }
    })
    persistIndex(index)
    bump()
    return { success: true }
  }, [bump])

  const exportTenant = useCallback((tenantId) => {
    const tenant = loadTenant(tenantId)
    if (!tenant) return { success: false, error: 'Banco não encontrado.' }
    return {
      success: true,
      data: {
        version: 1,
        exportedAt: new Date().toISOString(),
        tenant,
      },
    }
  }, [])

  const importTenant = useCallback((tenantId, payload) => {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload
      const incoming = data?.tenant
      if (!incoming || !Array.isArray(incoming.units) || !Array.isArray(incoming.members)) {
        return { success: false, error: 'Arquivo de backup inválido.' }
      }
      const current = loadTenant(tenantId)
      if (!current) return { success: false, error: 'Banco atual não encontrado.' }

      const merged = {
        ...current,
        units: incoming.units,
        members: incoming.members,
        adminName: incoming.adminName || current.adminName,
      }
      persistTenant(merged)

      const index = loadIndex()
      // rebuild index entries for this tenant members
      Object.keys(index).forEach((mail) => {
        if (index[mail]?.tenantId === tenantId && index[mail]?.role !== 'administrador') {
          delete index[mail]
        }
      })
      merged.members.forEach((m) => {
        if (m.status === 'revoked') return
        index[m.email] = { tenantId, role: m.role, memberId: m.id }
      })
      persistIndex(index)
      bump()
      return { success: true }
    } catch {
      return { success: false, error: 'Não foi possível importar o backup.' }
    }
  }, [bump])

  const value = useMemo(() => ({
    tick,
    getTenant,
    createAdminTenant,
    inviteMember,
    resendInvite,
    revokeMember,
    changeMemberEmail,
    updateMember,
    activateInvite,
    createUnit,
    renameUnit,
    deleteUnit,
    completeSetup,
    exportTenant,
    importTenant,
    resolveEmailAccess,
    resolvePhoneAccess,
    normalizeEmail,
    normalizePhone,
    isValidEmail,
  }), [
    tick, getTenant, createAdminTenant, inviteMember, resendInvite, revokeMember,
    changeMemberEmail, updateMember, activateInvite, createUnit, renameUnit, deleteUnit,
    completeSetup, exportTenant, importTenant,
  ])

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}
