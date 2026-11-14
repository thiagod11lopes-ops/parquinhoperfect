import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Stack, TextField, Button, IconButton, Collapse, Alert, Chip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ReplayIcon from '@mui/icons-material/Replay'
import BusinessIcon from '@mui/icons-material/Business'
import CloseIcon from '@mui/icons-material/Close'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import { useSampleData } from '../../context/SampleDataContext'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import UnitsBalanceCard from './UnitsBalanceCard'
import '../../styles/global.scss'

const STATUS_LABEL = {
  pending: 'Pendente',
  active: 'Ativo',
  revoked: 'Revogado',
}

function UnitCard({
  unit, managers, expanded, onToggle, onRename, onDelete,
  onInviteManager, onResend, onRevoke, onChangeEmail,
  onEnter, isCurrent,
}) {
  const [managerEmail, setManagerEmail] = useState('')
  const [managerName, setManagerName] = useState('')
  const [unitName, setUnitName] = useState(unit.name)
  const [editEmailId, setEditEmailId] = useState(null)
  const [editEmailValue, setEditEmailValue] = useState('')
  const [msg, setMsg] = useState(null)
  const [addingManager, setAddingManager] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const closeAddManager = () => {
    setAddingManager(false)
    setManagerEmail('')
    setManagerName('')
  }

  const confirmDeleteUnit = () => {
    const r = onDelete(unit.id)
    setConfirmDelete(false)
    if (!r.success) {
      setMsg({ ok: false, text: r.error })
      return
    }
    setMsg({ ok: true, text: 'Unidade excluída.' })
  }

  const submitManager = () => {
    const result = onInviteManager(unit.id, { email: managerEmail, name: managerName })
    if (!result.success) {
      setMsg({ ok: false, text: result.error })
      return
    }
    closeAddManager()
    setMsg({ ok: true, text: 'Gerente convidado (pendente até o primeiro acesso).' })
  }

  return (
    <Box className={`unidade-card panel-card ${expanded ? 'is-open' : ''}`}>
      <button type="button" className="unidade-toggle" onClick={onToggle} aria-expanded={expanded}>
        <Box className="unidade-toggle-copy">
          <Typography className="unidade-name">{unit.name}</Typography>
          <Typography className="unidade-meta">{managers.length} gerente(s)</Typography>
        </Box>
        <ExpandMoreIcon className={`unidade-chevron ${expanded ? 'is-open' : ''}`} />
      </button>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box className="unidade-body">
          {msg && (
            <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 1.25, borderRadius: 2 }}>
              {msg.text}
            </Alert>
          )}

          <Typography className="unidade-section-label">Nome da unidade</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <TextField size="small" fullWidth value={unitName} onChange={(e) => setUnitName(e.target.value)} className="unidade-field" />
            <Button className="btn-orange-card" onClick={() => {
              const r = onRename(unit.id, unitName)
              setMsg(r.success ? { ok: true, text: 'Nome atualizado.' } : { ok: false, text: r.error })
            }}>Salvar</Button>
          </Stack>

          {isCurrent ? (
            <Alert severity="info" sx={{ mb: 1.5, borderRadius: 2 }}>
              Você está nesta unidade agora.
            </Alert>
          ) : (
            <Button
              fullWidth
              className="btn-orange-card"
              sx={{ mb: 1.5 }}
              onClick={() => onEnter?.(unit.id, unit.name)}
            >
              Usar esta unidade
            </Button>
          )}

          <Typography className="unidade-section-label">Gerentes</Typography>
          <Stack spacing={0.75} sx={{ mb: 1.25 }}>
            {managers.length === 0 ? (
              <Typography className="unidade-empty-line">Nenhum gerente vinculado.</Typography>
            ) : managers.map((m) => (
              <Box key={m.id} className="unidade-member-row">
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography className="unidade-member-email">{m.email}</Typography>
                  <Typography className="unidade-member-name">{m.name}</Typography>
                  <Chip size="small" label={STATUS_LABEL[m.status] || m.status} sx={{ mt: 0.5, height: 20 }} />
                  {editEmailId === m.id && (
                    <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
                      <TextField
                        size="small"
                        fullWidth
                        value={editEmailValue}
                        onChange={(e) => setEditEmailValue(e.target.value)}
                        className="unidade-field"
                      />
                      <Button size="small" className="btn-orange-card" onClick={() => {
                        const r = onChangeEmail(m.id, editEmailValue)
                        setMsg(r.success ? { ok: true, text: 'E-mail atualizado (volta a pendente).' } : { ok: false, text: r.error })
                        if (r.success) setEditEmailId(null)
                      }}>OK</Button>
                    </Stack>
                  )}
                </Box>
                <Stack direction="row" spacing={0.25}>
                  {m.status !== 'revoked' && (
                    <IconButton size="small" onClick={() => onResend(m.id)} aria-label="Reenviar convite">
                      <ReplayIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton size="small" onClick={() => { setEditEmailId(m.id); setEditEmailValue(m.email) }} aria-label="Trocar e-mail">
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#c2410c' }}>@</Typography>
                  </IconButton>
                  <IconButton size="small" className="unidade-remove-btn" onClick={() => onRevoke(m.id)} aria-label="Revogar">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            ))}
          </Stack>

          {!addingManager ? (
            <button
              type="button"
              className="unidade-plus-chip"
              onClick={() => setAddingManager(true)}
              aria-label="Adicionar gerente"
            >
              <span className="unidade-plus-chip-icon"><AddRoundedIcon /></span>
              <span>Novo gerente</span>
            </button>
          ) : (
            <Box className="unidade-add-manager">
              <Box className="unidade-add-manager-head">
                <Typography className="unidade-add-manager-title">Vincular gerente</Typography>
                <IconButton size="small" onClick={closeAddManager} aria-label="Fechar" className="unidade-add-close">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
              <TextField
                size="small"
                fullWidth
                label="Nome do gerente"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="unidade-field"
                sx={{ mb: 1 }}
              />
              <TextField
                size="small"
                fullWidth
                label="E-mail do gerente"
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                className="unidade-field"
                sx={{ mb: 1 }}
              />
              <Button fullWidth className="btn-orange-card" onClick={submitManager}>
                Vincular
              </Button>
            </Box>
          )}

          <Button
            fullWidth
            variant="outlined"
            color="error"
            sx={{ mt: 1.5 }}
            onClick={() => setConfirmDelete(true)}
            startIcon={<DeleteOutlineIcon />}
          >
            Excluir unidade
          </Button>
        </Box>
      </Collapse>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir unidade?"
        message={`Todos os dados da unidade "${unit.name}" serão perdidos, incluindo gerentes e vínculos. Esta ação não pode ser desfeita.`}
        onConfirm={confirmDeleteUnit}
        onCancel={() => setConfirmDelete(false)}
      />
    </Box>
  )
}

export default function Unidades() {
  const { isAdmin, tenantId, user, unitId, clearActiveUnit, selectActiveUnit } = useAuth()
  const {
    getTenant, createUnit, renameUnit, deleteUnit,
    inviteMember, resendInvite, revokeMember, changeMemberEmail,
  } = useTenant()
  const { childrenList } = useSampleData()

  const tenant = getTenant(tenantId)
  const [newName, setNewName] = useState('')
  const [openId, setOpenId] = useState(null)
  const [createMsg, setCreateMsg] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)

  const managersByUnit = useMemo(() => {
    const map = {}
    ;(tenant?.members || []).forEach((m) => {
      if (m.role !== 'gerente') return
      if (!map[m.unitId]) map[m.unitId] = []
      map[m.unitId].push(m)
    })
    return map
  }, [tenant])

  if (!isAdmin) return <Navigate to="/dashboard" replace />
  if (!tenant) {
    return (
      <Box className="page-container">
        <Alert severity="warning">Banco do administrador não encontrado. Saia e entre novamente com seu e-mail.</Alert>
      </Box>
    )
  }

  const handleCreate = () => {
    const result = createUnit(tenantId, newName)
    if (!result.success) {
      setCreateMsg({ ok: false, text: result.error })
      return
    }
    setNewName('')
    setOpenId(result.unit.id)
    setCreateOpen(false)
    setCreateMsg({ ok: true, text: 'Unidade criada. Vincule os e-mails dos gerentes.' })
  }

  const closeCreate = () => {
    setCreateOpen(false)
    setNewName('')
    setCreateMsg(null)
  }

  return (
    <Box className="page-container unidades-page">
      <Box className="unidade-create-fab-wrap">
        {!createOpen ? (
          <button
            type="button"
            className="unidade-create-fab"
            onClick={() => setCreateOpen(true)}
            aria-label="Adicionar unidade"
          >
            <span className="unidade-create-fab-glow" aria-hidden />
            <span className="unidade-create-fab-core">
              <AddRoundedIcon />
              <span className="unidade-create-fab-label">Adicionar unidade</span>
            </span>
          </button>
        ) : (
          <Box className="unidade-create panel-card unidade-create-panel">
            <Box className="unidade-create-panel-head">
              <Box className="info-section-head" sx={{ mb: 0 }}>
                <BusinessIcon fontSize="small" />
                <Typography className="info-section-title">Nova unidade</Typography>
              </Box>
              <IconButton size="small" className="unidade-create-close" onClick={closeCreate} aria-label="Fechar">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            {createMsg && (
              <Alert severity={createMsg.ok ? 'success' : 'error'} sx={{ mb: 1.25, borderRadius: 2 }}>{createMsg.text}</Alert>
            )}
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                label="Nome da unidade"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="unidade-field"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                }}
              />
              <Button className="btn-orange-card" startIcon={<AddIcon />} onClick={handleCreate}>Criar</Button>
            </Stack>
          </Box>
        )}
      </Box>

      {createMsg?.ok && !createOpen && (
        <Alert severity="success" sx={{ mt: 1.25, borderRadius: 2 }} onClose={() => setCreateMsg(null)}>
          {createMsg.text}
        </Alert>
      )}

      <Stack spacing={1.25} sx={{ mt: 2 }}>
        {(tenant.units || []).length === 0 ? (
          <Box className="panel-card" sx={{ p: 2, textAlign: 'center' }}>
            <Typography>Nenhuma unidade cadastrada.</Typography>
          </Box>
        ) : tenant.units.map((unit) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            managers={managersByUnit[unit.id] || []}
            expanded={openId === unit.id}
            onToggle={() => setOpenId((id) => (id === unit.id ? null : unit.id))}
            onRename={(id, name) => {
              const result = renameUnit(tenantId, id, name)
              if (result.success && unitId === id) selectActiveUnit(id, name)
              return result
            }}
            onDelete={(id) => {
              const result = deleteUnit(tenantId, id)
              if (result.success && unitId === id) clearActiveUnit()
              return result
            }}
            onEnter={(id, name) => selectActiveUnit(id, name)}
            isCurrent={unitId === unit.id}
            onInviteManager={(id, data) => inviteMember({
              tenantId,
              unitId: id,
              email: data.email,
              name: data.name,
              role: 'gerente',
              invitedByEmail: user.email,
              invitedByRole: 'administrador',
            })}
            onResend={(memberId) => resendInvite(tenantId, memberId)}
            onRevoke={(memberId) => revokeMember(tenantId, memberId)}
            onChangeEmail={(memberId, newEmail) => changeMemberEmail(tenantId, memberId, newEmail)}
          />
        ))}
      </Stack>

      {(tenant.units || []).length > 0 && (
        <Box sx={{ mt: 2 }}>
          <UnitsBalanceCard
            units={tenant.units}
            childrenList={childrenList}
            tenantId={tenantId}
            activeUnitId={unitId}
          />
        </Box>
      )}
    </Box>
  )
}
