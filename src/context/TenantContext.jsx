import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { syncedStorage } from '../firebase/syncedStorage'
import { normalizePhoneBr } from '../firebase/authMethods'
import { createTrialSubscription, normalizeSubscription } from '../billing/plans'
import { sampleManagersData, sampleUnitsData } from '../data/mockData'
import { saveUnitMaxChildren } from '../utils/unitCapacity'
import { isSaasOwnerEmail } from '../saas/owner'

const TenantContext = createContext(null)

const INDEX_KEY = 'parquinhoTenantIndex'
const PHONE_INDEX_KEY = 'parquinhoPhoneIndex'
const tenantKey = (id) => `parquinhoTenant:${id}`
const unitsSampleBackupKey = (tenantId) => `parquinhoUnitsBackupBeforeSample:${tenantId || 'tenant'}`

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
    const createdAt = parsed.createdAt || new Date().toISOString()
    return {
      id: parsed.id || tenantId,
      adminEmail: normalizeEmail(parsed.adminEmail),
      adminName: parsed.adminName || 'Administrador',
      createdAt,
      units: Array.isArray(parsed.units) ? parsed.units : [],
      members: Array.isArray(parsed.members) ? parsed.members : [],
      setupCompleted: Boolean(parsed.setupCompleted),
      subscription: normalizeSubscription(parsed.subscription, createdAt),
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

  const listAllTenants = useCallback(() => {
    const index = loadIndex()
    const seen = new Set()
    const out = []
    Object.values(index).forEach((entry) => {
      if (!entry?.tenantId || entry.role !== 'administrador') return
      if (seen.has(entry.tenantId)) return
      seen.add(entry.tenantId)
      const tenant = loadTenant(entry.tenantId)
      if (tenant) out.push(tenant)
    })
    out.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    return out
  }, [tick]) // eslint-disable-line react-hooks/exhaustive-deps

  const createAdminTenant = useCallback((email, name) => {
    const mail = normalizeEmail(email)
    if (!isValidEmail(mail)) return { success: false, error: 'Informe um e-mail válido.' }
    if (isSaasOwnerEmail(mail)) {
      return { success: false, error: 'Este e-mail é reservado ao console SaaS.' }
    }

    const index = loadIndex()
    if (index[mail]) {
      if (index[mail].role === 'administrador') {
        const tenant = loadTenant(index[mail].tenantId)
        return { success: true, tenant, created: false }
      }
      return { success: false, error: 'Este e-mail já está vinculado a outro cadastro.' }
    }

    const createdAt = new Date().toISOString()
    const tenant = {
      id: `tenant-${Date.now()}`,
      adminEmail: mail,
      adminName: String(name || '').trim() || mail.split('@')[0],
      createdAt,
      units: [],
      members: [],
      setupCompleted: false,
      subscription: createTrialSubscription('free'),
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

  /** Ativa 7 unidades + gerentes de exemplo (faz backup do que existia). */
  const seedSampleUnits = useCallback((tenantId) => {
    const tenant = loadTenant(tenantId)
    if (!tenant) return { success: false, error: 'Banco não encontrado.', units: [] }
    const backupKey = unitsSampleBackupKey(tenantId)
    const alreadySample = (tenant.units || []).some((u) => String(u.id || '').startsWith('sample-unit-'))
    if (!syncedStorage.getItem(backupKey)) {
      syncedStorage.setItem(backupKey, JSON.stringify({
        units: tenant.units || [],
        members: tenant.members || [],
      }))
    }

    const units = sampleUnitsData.map((u) => ({ ...u }))
    const now = new Date().toISOString()
    const sampleMembers = sampleManagersData.map((mgr) => ({
      id: mgr.id,
      email: normalizeEmail(mgr.email),
      name: mgr.name,
      role: 'gerente',
      unitId: mgr.unitId,
      status: 'active',
      invitedByEmail: tenant.adminEmail || '',
      invitedByRole: 'administrador',
      phone: '',
      childName: '',
      childAge: null,
      childPlan: '',
      childAllergies: '',
      createdAt: now,
      activatedAt: now,
      isSample: true,
    }))

    // Se já está em modo exemplo, evita regravar/bump desnecessário.
    if (alreadySample && (tenant.units || []).length === units.length) {
      const currentIds = new Set((tenant.units || []).map((u) => u.id))
      const sameIds = units.every((u) => currentIds.has(u.id))
      if (sameIds) return { success: true, units: tenant.units, members: tenant.members }
    }

    persistTenant({ ...tenant, units, members: sampleMembers })

    const index = loadIndex()
    Object.keys(index).forEach((mail) => {
      if (index[mail]?.tenantId === tenantId && String(index[mail]?.memberId || '').startsWith('sample-mgr-')) {
        delete index[mail]
      }
    })
    sampleMembers.forEach((m) => {
      index[m.email] = { tenantId, role: m.role, memberId: m.id }
    })
    persistIndex(index)

    units.forEach((u, indexNum) => {
      saveUnitMaxChildren(tenantId, u.id, 20 + indexNum * 2)
    })
    bump()
    return { success: true, units, members: sampleMembers }
  }, [bump])

  /** Restaura unidades e membros após desligar o modo exemplo. */
  const restoreUnitsAfterSample = useCallback((tenantId) => {
    const tenant = loadTenant(tenantId)
    if (!tenant) return { success: false, error: 'Banco não encontrado.' }
    const backupKey = unitsSampleBackupKey(tenantId)
    let units = []
    let members = []
    try {
      const raw = syncedStorage.getItem(backupKey)
      const parsed = raw ? JSON.parse(raw) : null
      if (Array.isArray(parsed)) {
        // backup legado: só units
        units = parsed
        members = (tenant.members || []).filter((m) => !m.isSample && !String(m.id || '').startsWith('sample-mgr-'))
      } else if (parsed && typeof parsed === 'object') {
        units = Array.isArray(parsed.units) ? parsed.units : []
        members = Array.isArray(parsed.members) ? parsed.members : []
      }
    } catch {
      units = []
      members = []
    }
    syncedStorage.removeItem(backupKey)
    persistTenant({ ...tenant, units, members })

    const index = loadIndex()
    Object.keys(index).forEach((mail) => {
      if (index[mail]?.tenantId === tenantId) delete index[mail]
    })
    index[normalizeEmail(tenant.adminEmail)] = { tenantId, role: 'administrador' }
    members.forEach((m) => {
      if (m.status === 'revoked') return
      index[normalizeEmail(m.email)] = { tenantId, role: m.role, memberId: m.id }
    })
    persistIndex(index)

    bump()
    return { success: true, units, members }
  }, [bump])

  const completeSetup = useCallback((tenantId) => {
    const tenant = loadTenant(tenantId)
    if (!tenant) return { success: false, error: 'Banco não encontrado.' }
    persistTenant({ ...tenant, setupCompleted: true })
    bump()
    return { success: true }
  }, [bump])

  const updateSubscription = useCallback((tenantId, patch = {}) => {
    const tenant = loadTenant(tenantId)
    if (!tenant) return { success: false, error: 'Banco não encontrado.' }
    const nextSub = normalizeSubscription({
      ...tenant.subscription,
      ...patch,
      updatedAt: new Date().toISOString(),
    }, tenant.createdAt)
    const next = { ...tenant, subscription: nextSub }
    persistTenant(next)
    bump()
    return { success: true, subscription: nextSub, tenant: next }
  }, [bump])

  const activatePaidPlan = useCallback((tenantId, planId, meta = {}) => {
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1)
    return updateSubscription(tenantId, {
      planId,
      status: 'active',
      provider: 'mercado_pago',
      currentPeriodEnd: periodEnd.toISOString(),
      mpPreferenceId: meta.mpPreferenceId || null,
      mpPaymentId: meta.mpPaymentId || null,
      mpPreapprovalId: meta.mpPreapprovalId || null,
    })
  }, [updateSubscription])

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

  /** Apaga o banco do administrador logado e todos os dados locais desse tenant. */
  const deleteTenantCompletely = useCallback((tenantId) => {
    const id = String(tenantId || '').trim()
    if (!id) return { success: false, error: 'Banco não encontrado.' }

    const tenant = loadTenant(id)
    if (!tenant) return { success: false, error: 'Banco não encontrado.' }

    const index = loadIndex()
    Object.keys(index).forEach((mail) => {
      if (index[mail]?.tenantId === id) delete index[mail]
    })
    persistIndex(index)

    const phoneIndex = loadPhoneIndex()
    Object.keys(phoneIndex).forEach((phone) => {
      if (phoneIndex[phone]?.tenantId === id) delete phoneIndex[phone]
    })
    persistPhoneIndex(phoneIndex)

    syncedStorage.removeItem(tenantKey(id))

    const scopedPrefixes = [
      `parquinhoPresence:${id}:`,
      `parquinhoChildren:${id}:`,
      `parquinhoStaff:${id}:`,
      `parquinhoActivities:${id}:`,
      `parquinhoSchedule:${id}:`,
      `parquinhoAttendance:${id}:`,
      `parquinhoMaxChildren:${id}:`,
      `parquinhoParkInfo:${id}:`,
      `parquinhoOccupancyHistory:${id}`,
    ]
    const toDelete = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key) continue
      if (scopedPrefixes.some((prefix) => key === prefix || key.startsWith(prefix))) {
        toDelete.push(key)
      }
    }
    toDelete.forEach((key) => {
      try {
        syncedStorage.removeItem(key)
      } catch {
        // ignore
      }
    })

    const filterJsonArray = (storageKey, predicate) => {
      try {
        const raw = syncedStorage.getItem(storageKey)
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return
        const next = parsed.filter(predicate)
        if (next.length === parsed.length) return
        if (next.length) syncedStorage.setItem(storageKey, JSON.stringify(next))
        else syncedStorage.removeItem(storageKey)
      } catch {
        // ignore
      }
    }

    filterJsonArray('parquinhoChats', (item) => item?.tenantId !== id)
    filterJsonArray('parquinhoAppNotifications', (item) => item?.tenantId !== id)
    filterJsonArray('parquinhoStaffNotifications', (item) => item?.tenantId !== id)
    filterJsonArray('parquinhoRatings', (item) => !item?.tenantId || item.tenantId !== id)

    window.dispatchEvent(new CustomEvent('parquinho-tenant'))
    window.dispatchEvent(new CustomEvent('parquinho-presence'))
    window.dispatchEvent(new CustomEvent('parquinho-chats'))
    window.dispatchEvent(new CustomEvent('parquinho-sample-data'))
    window.dispatchEvent(new CustomEvent('parquinho-park-settings'))

    bump()
    return { success: true }
  }, [bump])

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
    listAllTenants,
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
    seedSampleUnits,
    restoreUnitsAfterSample,
    completeSetup,
    updateSubscription,
    activatePaidPlan,
    exportTenant,
    importTenant,
    deleteTenantCompletely,
    resolveEmailAccess,
    resolvePhoneAccess,
    normalizeEmail,
    normalizePhone,
    isValidEmail,
  }), [
    tick, getTenant, listAllTenants, createAdminTenant, inviteMember, resendInvite, revokeMember,
    changeMemberEmail, updateMember, activateInvite, createUnit, renameUnit, deleteUnit,
    seedSampleUnits, restoreUnitsAfterSample,
    completeSetup, updateSubscription, activatePaidPlan, exportTenant, importTenant,
    deleteTenantCompletely,
  ])

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}
