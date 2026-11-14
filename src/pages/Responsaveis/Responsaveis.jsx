import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Stack, TextField, Button, IconButton, Alert, Chip, MenuItem,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Collapse, Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import CloseIcon from '@mui/icons-material/Close'
import ChildCareIcon from '@mui/icons-material/ChildCare'
import MailOutlineIcon from '@mui/icons-material/MailOutline'
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import { useSampleData } from '../../context/SampleDataContext'
import { formatPhone, isValidPhone, PHONE_PLACEHOLDER } from '../../utils/phone'
import '../../styles/global.scss'

const PLANS = ['Mensal', 'Anual']

const STATUS_LABEL = {
  pending: 'Pendente',
  active: 'Ativo',
  revoked: 'Revogado',
}

export default function Responsaveis() {
  const {
    canRegisterResponsavel, isGerenteOnly, isAdmin,
    tenantId, unitId, user,
  } = useAuth()
  const { getTenant, inviteMember, revokeMember, updateMember } = useTenant()
  const { setChildrenList } = useSampleData()

  const tenant = getTenant(tenantId)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [childName, setChildName] = useState('')
  const [childAge, setChildAge] = useState('')
  const [childPlan, setChildPlan] = useState('')
  const [hasAllergies, setHasAllergies] = useState('')
  const [allergiesDetail, setAllergiesDetail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedUnit, setSelectedUnit] = useState(unitId || '')
  const [msg, setMsg] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [prevGuardianName, setPrevGuardianName] = useState('')
  const [prevChildName, setPrevChildName] = useState('')

  const list = useMemo(() => {
    if (!tenant) return []
    return tenant.members.filter((m) => {
      if (m.role !== 'responsavel') return false
      if (isAdmin) return true
      if (unitId) return m.unitId === unitId
      return true
    })
  }, [tenant, isAdmin, unitId])

  if (!canRegisterResponsavel && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  if (!tenant) {
    return (
      <Box className="page-container">
        <Alert severity="warning">Sem banco vinculado. Faça login novamente.</Alert>
      </Box>
    )
  }

  const targetUnitId = isAdmin ? selectedUnit : unitId
  const isEditing = Boolean(editingId)

  const resetForm = () => {
    setName('')
    setEmail('')
    setChildName('')
    setChildAge('')
    setChildPlan('')
    setHasAllergies('')
    setAllergiesDetail('')
    setPhone('')
    setEditingId(null)
    setPrevGuardianName('')
    setPrevChildName('')
    if (!isAdmin) setSelectedUnit(unitId || '')
  }

  const startEdit = (member) => {
    setEditingId(member.id)
    setName(member.name || '')
    setEmail(member.email || '')
    setPhone(formatPhone(member.phone || ''))
    setChildName(member.childName || '')
    setChildAge(member.childAge != null ? String(member.childAge) : '')
    setChildPlan(member.childPlan || '')
    const has = member.childAllergies && member.childAllergies !== 'Nenhuma'
    setHasAllergies(has ? 'sim' : (member.childAllergies === 'Nenhuma' ? 'nao' : ''))
    setAllergiesDetail(has ? member.childAllergies : '')
    setSelectedUnit(member.unitId || unitId || '')
    setPrevGuardianName(member.name || '')
    setPrevChildName(member.childName || '')
    setMsg(null)
    window.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  const syncChildRecord = ({
    guardianName, childLabel, ageNum, plan, allergies, phoneValue, previousGuardian, previousChild,
  }) => {
    const now = new Date()
    const entryTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    setChildrenList((prev) => {
      const matchPrev = (c) => (
        (c.name || '').toLowerCase() === (previousChild || childLabel).toLowerCase()
        && (c.guardian || '').toLowerCase() === (previousGuardian || guardianName).toLowerCase()
      )
      const matchCurrent = (c) => (
        (c.name || '').toLowerCase() === childLabel.toLowerCase()
        && (c.guardian || '').toLowerCase() === guardianName.toLowerCase()
      )
      if (prev.some(matchPrev) || prev.some(matchCurrent)) {
        return prev.map((c) => {
          if (matchPrev(c) || matchCurrent(c)) {
            return {
              ...c,
              name: childLabel,
              age: ageNum,
              plan,
              allergies,
              phone: phoneValue || c.phone,
              guardian: guardianName,
            }
          }
          return c
        })
      }
      return [
        {
          id: Date.now(),
          name: childLabel,
          age: ageNum,
          guardian: guardianName,
          phone: phoneValue || '',
          allergies,
          plan,
          entryTime,
          exitTime: null,
          image: null,
        },
        ...prev,
      ]
    })
  }

  const handleSave = () => {
    if (!targetUnitId) {
      setMsg({ ok: false, text: 'Selecione/defina a unidade.' })
      return
    }
    if (!String(name || '').trim()) {
      setMsg({ ok: false, text: 'Informe o nome do responsável.' })
      return
    }
    if (!String(childName || '').trim()) {
      setMsg({ ok: false, text: 'Informe o nome da criança.' })
      return
    }
    const ageNum = Number(childAge)
    if (!childAge || Number.isNaN(ageNum) || ageNum < 1 || ageNum > 12) {
      setMsg({ ok: false, text: 'Informe a idade da criança (1 a 12).' })
      return
    }
    if (!childPlan) {
      setMsg({ ok: false, text: 'Selecione o plano.' })
      return
    }
    if (!String(phone || '').trim()) {
      setMsg({ ok: false, text: 'Informe o telefone.' })
      return
    }
    if (!isValidPhone(phone)) {
      setMsg({ ok: false, text: `Telefone no formato: ${PHONE_PLACEHOLDER}` })
      return
    }
    if (!hasAllergies) {
      setMsg({ ok: false, text: 'Informe se a criança possui alergias.' })
      return
    }
    if (hasAllergies === 'sim' && !String(allergiesDetail || '').trim()) {
      setMsg({ ok: false, text: 'Descreva as alergias da criança.' })
      return
    }

    const allergies = hasAllergies === 'sim'
      ? String(allergiesDetail).trim()
      : 'Nenhuma'
    const guardianName = name.trim()
    const childLabel = childName.trim()

    if (isEditing) {
      const result = updateMember(tenantId, editingId, {
        email,
        name: guardianName,
        phone,
        childName: childLabel,
        childAge: ageNum,
        childPlan,
        childAllergies: allergies,
        unitId: targetUnitId,
      })
      if (!result.success) {
        setMsg({ ok: false, text: result.error })
        return
      }
      syncChildRecord({
        guardianName,
        childLabel,
        ageNum,
        plan: childPlan,
        allergies,
        phoneValue: phone,
        previousGuardian: prevGuardianName,
        previousChild: prevChildName,
      })
      resetForm()
      setMsg({ ok: true, text: 'Cadastro atualizado.' })
      return
    }

    const result = inviteMember({
      tenantId,
      unitId: targetUnitId,
      email,
      name: guardianName,
      role: 'responsavel',
      phone,
      childName: childLabel,
      childAge: ageNum,
      childPlan,
      childAllergies: allergies,
      invitedByEmail: user.email,
      invitedByRole: isAdmin ? 'administrador' : (isGerenteOnly ? 'gerente' : 'professor'),
    })
    if (!result.success) {
      setMsg({ ok: false, text: result.error })
      return
    }

    syncChildRecord({
      guardianName,
      childLabel,
      ageNum,
      plan: childPlan,
      allergies,
      phoneValue: phone,
      previousGuardian: guardianName,
      previousChild: childLabel,
    })

    resetForm()
    setMsg({ ok: true, text: 'Responsável convidado. No primeiro acesso verá o botão Iniciar.' })
  }

  return (
    <Box className="page-container unidades-page">
      <Box className="page-header">
        <Typography variant="body2" fontWeight={700}>Responsáveis</Typography>
      </Box>

      <Box className="unidade-create panel-card responsaveis-create">
        <Box className="responsaveis-create-head">
          <Typography className="info-section-title">
            {isEditing ? 'Editar responsável' : 'Novo responsável'}
          </Typography>
          {isEditing && (
            <IconButton size="small" className="responsavel-cancel-edit" onClick={resetForm} aria-label="Cancelar edição">
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
        {msg && (
          <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 1.25, borderRadius: 2 }}>{msg.text}</Alert>
        )}

        {isAdmin && (
          <TextField
            select
            fullWidth
            size="small"
            label="Unidade"
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="unidade-field responsavel-form-field"
            sx={{ mb: 1 }}
            SelectProps={{
              MenuProps: {
                disablePortal: true,
                PaperProps: { className: 'responsavel-form-menu' },
              },
            }}
          >
            <MenuItem value="">Selecione</MenuItem>
            {tenant.units.map((u) => (
              <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
            ))}
          </TextField>
        )}

        <Stack spacing={1}>
          <TextField size="small" label="Nome do responsável" value={name} onChange={(e) => setName(e.target.value)} className="unidade-field responsavel-form-field" />
          <TextField size="small" label="E-mail (login)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="unidade-field responsavel-form-field" />
          <TextField
            size="small"
            label="Telefone"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder={PHONE_PLACEHOLDER}
            inputProps={{ inputMode: 'numeric', maxLength: 16 }}
            className="unidade-field responsavel-form-field"
          />
          <TextField size="small" label="Nome da criança" value={childName} onChange={(e) => setChildName(e.target.value)} className="unidade-field responsavel-form-field" />
          <TextField
            size="small"
            type="number"
            label="Idade da criança"
            value={childAge}
            onChange={(e) => setChildAge(e.target.value)}
            inputProps={{ min: 1, max: 12 }}
            className="unidade-field responsavel-form-field"
          />
          <TextField
            select
            size="small"
            label="Plano"
            value={childPlan}
            onChange={(e) => setChildPlan(e.target.value)}
            className="unidade-field responsavel-form-field"
            SelectProps={{
              MenuProps: {
                disablePortal: true,
                PaperProps: { className: 'responsavel-form-menu' },
              },
            }}
          >
            <MenuItem value="">Selecione</MenuItem>
            {PLANS.map((p) => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </TextField>

          <FormControl className="responsavel-allergies-field">
            <FormLabel>Alergias</FormLabel>
            <RadioGroup
              row
              value={hasAllergies}
              onChange={(e) => {
                const value = e.target.value
                setHasAllergies(value)
                if (value === 'nao') setAllergiesDetail('')
              }}
            >
              <FormControlLabel value="nao" control={<Radio size="small" />} label="Não" />
              <FormControlLabel value="sim" control={<Radio size="small" />} label="Sim" />
            </RadioGroup>
          </FormControl>

          <Collapse in={hasAllergies === 'sim'}>
            <TextField
              size="small"
              fullWidth
              label="Quais alergias?"
              value={allergiesDetail}
              onChange={(e) => setAllergiesDetail(e.target.value)}
              className="unidade-field responsavel-form-field"
            />
          </Collapse>

          <Button className="btn-orange-card" startIcon={isEditing ? <EditRoundedIcon /> : <AddIcon />} onClick={handleSave}>
            {isEditing ? 'Salvar alterações' : 'Cadastrar responsável'}
          </Button>
        </Stack>
      </Box>

      <Stack spacing={1} className="responsavel-card-list" sx={{ mt: 2 }}>
        {list.length === 0 ? (
          <Box className="panel-card responsavel-empty-card">
            <Typography>Nenhum responsável cadastrado.</Typography>
          </Box>
        ) : list.map((m) => {
          const allergyLabel = !m.childAllergies
            ? null
            : (m.childAllergies === 'Nenhuma' ? 'Sem alergias' : m.childAllergies)
          return (
            <Box key={m.id} className={`responsavel-data-card panel-card is-compact is-${m.status || 'pending'}`}>
              <Box className="responsavel-data-header">
                <Box className="responsavel-data-title-row">
                  <Typography className="responsavel-data-name">{m.name}</Typography>
                  <Chip
                    size="small"
                    label={STATUS_LABEL[m.status] || m.status}
                    className={`responsavel-status-chip is-${m.status || 'pending'}`}
                  />
                </Box>
                <Box className="responsavel-data-actions">
                  <Tooltip title="Editar" arrow>
                    <IconButton
                      size="small"
                      className="responsavel-action-btn"
                      onClick={() => startEdit(m)}
                      aria-label="Editar"
                    >
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Revogar" arrow>
                    <IconButton
                      size="small"
                      className="responsavel-action-btn is-danger"
                      onClick={() => revokeMember(tenantId, m.id)}
                      aria-label="Revogar"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Box className="responsavel-data-grid">
                <Box className="responsavel-data-row">
                  <span className="responsavel-row-label">
                    <MailOutlineIcon /> E-mail
                  </span>
                  <span className="responsavel-row-value">{m.email}</span>
                </Box>
                {m.phone && (
                  <Box className="responsavel-data-row">
                    <span className="responsavel-row-label">
                      <PhoneIphoneIcon /> Telefone
                    </span>
                    <span className="responsavel-row-value">{m.phone}</span>
                  </Box>
                )}
                {m.childName && (
                  <Box className="responsavel-data-row">
                    <span className="responsavel-row-label">
                      <ChildCareIcon /> Criança
                    </span>
                    <span className="responsavel-row-value">{m.childName}</span>
                  </Box>
                )}
              </Box>

              {(m.childAge != null || m.childPlan || allergyLabel) && (
                <Box className="responsavel-data-tags">
                  {m.childAge != null && (
                    <span className="responsavel-data-tag">{m.childAge} anos</span>
                  )}
                  {m.childPlan && (
                    <span className="responsavel-data-tag is-plan">{m.childPlan}</span>
                  )}
                  {allergyLabel && (
                    <span className={`responsavel-data-tag ${allergyLabel === 'Sem alergias' ? 'is-ok' : 'is-alert'}`}>
                      {allergyLabel}
                    </span>
                  )}
                </Box>
              )}
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}
