import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Button, TextField, Alert, Stack,
} from '@mui/material'
import BusinessIcon from '@mui/icons-material/Business'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import LogoutIcon from '@mui/icons-material/Logout'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import '../../styles/global.scss'

export default function AdminUnitPicker() {
  const navigate = useNavigate()
  const {
    tenantId, selectActiveUnit, logout, user,
  } = useAuth()
  const { getTenant, createUnit } = useTenant()
  const tenant = getTenant(tenantId)
  const units = useMemo(() => tenant?.units || [], [tenant])

  const [creating, setCreating] = useState(units.length === 0)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const enterUnit = (unit) => {
    const result = selectActiveUnit(unit.id, unit.name)
    if (!result.success) {
      setError(result.error || 'Não foi possível selecionar a unidade.')
      return
    }
    navigate('/dashboard', { replace: true })
  }

  const handleCreate = () => {
    setError('')
    const trimmed = newName.trim()
    if (!trimmed) {
      setError('Informe o nome da unidade.')
      return
    }
    setBusy(true)
    const result = createUnit(tenantId, trimmed)
    setBusy(false)
    if (!result.success) {
      setError(result.error || 'Não foi possível criar a unidade.')
      return
    }
    setNewName('')
    setCreating(false)
    enterUnit(result.unit)
  }

  return (
    <Box className="unit-picker">
      <Box className="unit-picker-panel">
        <Box className="unit-picker-badge" aria-hidden>
          <BusinessIcon fontSize="small" />
        </Box>
        <Typography className="unit-picker-title">Escolha a unidade</Typography>
        <Typography className="unit-picker-sub">
          Olá{user?.name ? `, ${String(user.name).split(' ')[0]}` : ''}.
          Selecione o parquinho para ver e editar só os dados dessa unidade.
        </Typography>

        {error && (
          <Alert severity="error" className="unit-picker-alert">{error}</Alert>
        )}

        {units.length > 0 && !creating && (
          <Stack spacing={1} className="unit-picker-list">
            {units.map((unit) => (
              <button
                key={unit.id}
                type="button"
                className="unit-picker-item"
                onClick={() => enterUnit(unit)}
              >
                <span className="unit-picker-item-icon" aria-hidden>
                  <BusinessIcon fontSize="small" />
                </span>
                <span className="unit-picker-item-copy">
                  <span className="unit-picker-item-name">{unit.name}</span>
                  <span className="unit-picker-item-hint">Entrar nesta unidade</span>
                </span>
                <ArrowForwardRoundedIcon className="unit-picker-item-arrow" />
              </button>
            ))}
          </Stack>
        )}

        {(creating || units.length === 0) ? (
          <Box className="unit-picker-create">
            {units.length === 0 && (
              <Typography className="unit-picker-empty">
                Nenhuma unidade cadastrada. Crie a primeira para continuar.
              </Typography>
            )}
            <TextField
              fullWidth
              label="Nome da unidade"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="unit-picker-field"
              autoFocus
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
              {units.length > 0 && (
                <Button
                  className="unit-picker-ghost"
                  onClick={() => { setCreating(false); setError('') }}
                  disabled={busy}
                >
                  Cancelar
                </Button>
              )}
              <Button
                className="btn-orange-card"
                fullWidth
                startIcon={<AddRoundedIcon />}
                onClick={handleCreate}
                disabled={busy}
              >
                Criar e entrar
              </Button>
            </Stack>
          </Box>
        ) : (
          <Button
            className="unit-picker-add"
            startIcon={<AddRoundedIcon />}
            onClick={() => setCreating(true)}
          >
            Nova unidade
          </Button>
        )}

        <Button
          className="unit-picker-logout"
          startIcon={<LogoutIcon />}
          onClick={() => { logout(); navigate('/', { replace: true }) }}
        >
          Sair
        </Button>
      </Box>
    </Box>
  )
}
