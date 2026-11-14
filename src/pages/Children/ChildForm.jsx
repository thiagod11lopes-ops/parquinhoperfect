import React, { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Box, Typography, Alert,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Collapse, IconButton, Stack,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import { formatPhone, isValidPhone, PHONE_PLACEHOLDER } from '../../utils/phone'
import '../../styles/global.scss'

const PLANS = ['Mensal', 'Anual']
const empty = {
  name: '',
  age: '',
  guardian: '',
  phone: '',
  plan: '',
  hasAllergies: '',
  allergiesDetail: '',
}

const getPhoneContainer = () => document.getElementById('phone-app-root') || document.body

function getErrors(form) {
  const e = {}
  if (!form.name.trim()) e.name = 'Nome é obrigatório'
  if (!form.age || isNaN(form.age) || +form.age < 1 || +form.age > 12) e.age = 'A idade deve ser entre 1 e 12'
  if (!form.guardian.trim()) e.guardian = 'Nome do responsável é obrigatório'
  if (!form.phone.trim()) e.phone = 'Telefone é obrigatório'
  else if (!isValidPhone(form.phone)) e.phone = `Use o formato: ${PHONE_PLACEHOLDER}`
  if (!form.plan) e.plan = 'Selecione um plano'
  if (!form.hasAllergies) e.hasAllergies = 'Selecione Sim ou Não'
  else if (form.hasAllergies === 'sim' && !form.allergiesDetail.trim()) {
    e.allergiesDetail = 'Informe quais são as alergias'
  }
  return e
}

function mapInitial(initial) {
  if (!initial) return empty
  const has = initial.allergies && initial.allergies !== 'Nenhuma'
  return {
    ...empty,
    name: initial.name || '',
    age: initial.age ?? '',
    guardian: initial.guardian || '',
    phone: formatPhone(initial.phone || ''),
    plan: initial.plan || '',
    hasAllergies: has ? 'sim' : (initial.allergies === 'Nenhuma' ? 'nao' : ''),
    allergiesDetail: has ? initial.allergies : '',
    id: initial.id,
  }
}

export default function ChildForm({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(empty)
  const [touched, setTouched] = useState({})
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setForm(mapInitial(initial))
    setTouched({})
    setSuccess(false)
  }, [initial, open])

  const errors = getErrors(form)
  const isValid = Object.keys(errors).length === 0
  const isEdit = Boolean(initial?.id)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => {
      const next = {
        ...p,
        [name]: name === 'phone' ? formatPhone(value) : value,
      }
      if (name === 'hasAllergies' && value === 'nao') {
        next.allergiesDetail = ''
      }
      return next
    })
  }

  const handleBlur = (e) => setTouched((p) => ({ ...p, [e.target.name]: true }))

  const handleSubmit = () => {
    setTouched({
      name: true,
      age: true,
      guardian: true,
      phone: true,
      plan: true,
      hasAllergies: true,
      allergiesDetail: true,
    })
    if (!isValid) return
    setSuccess(true)
    setTimeout(() => {
      const entryTime = isEdit && initial.entryTime
        ? initial.entryTime
        : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
      onSave({
        id: form.id,
        name: form.name,
        age: Number(form.age),
        guardian: form.guardian,
        phone: form.phone,
        plan: form.plan,
        image: initial?.image || null,
        allergies: form.hasAllergies === 'sim' ? form.allergiesDetail.trim() : 'Nenhuma',
        entryTime,
      })
    }, 600)
  }

  const selectMenu = {
    MenuProps: {
      disablePortal: true,
      PaperProps: { className: 'responsavel-form-menu' },
    },
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      container={getPhoneContainer}
      className="child-form-dialog month-schedule-dialog"
      PaperProps={{
        className: 'child-form-paper unidades-page unidade-create',
      }}
    >
      <Box className="child-form-bg" aria-hidden>
        <Box className="child-form-bg-image" />
        <Box className="child-form-bg-wash" />
      </Box>

      <DialogTitle className="child-form-title">
        <Box className="responsaveis-create-head">
          <Typography className="info-section-title">
            {isEdit ? 'Editar criança' : 'Nova criança'}
          </Typography>
          <IconButton
            size="small"
            className="responsavel-cancel-edit"
            onClick={onClose}
            aria-label="Fechar"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent className="child-form-body">
        {success && (
          <Alert severity="success" sx={{ mb: 1.25, borderRadius: 2 }}>
            {isEdit ? 'Criança atualizada com sucesso!' : 'Criança adicionada com sucesso!'}
          </Alert>
        )}

        <Stack spacing={1} className="child-form-fields panel-card unidade-create">
          <TextField
            size="small"
            fullWidth
            label="Nome da criança"
            name="name"
            value={form.name}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.name && !!errors.name}
            helperText={touched.name ? errors.name : ' '}
            className="unidade-field responsavel-form-field"
          />
          <TextField
            size="small"
            fullWidth
            type="number"
            label="Idade"
            name="age"
            value={form.age}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.age && !!errors.age}
            helperText={touched.age ? errors.age : ' '}
            inputProps={{ min: 1, max: 12 }}
            className="unidade-field responsavel-form-field"
          />
          <TextField
            size="small"
            fullWidth
            label="Nome do responsável"
            name="guardian"
            value={form.guardian}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.guardian && !!errors.guardian}
            helperText={touched.guardian ? errors.guardian : ' '}
            className="unidade-field responsavel-form-field"
          />
          <TextField
            size="small"
            fullWidth
            label="Telefone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.phone && !!errors.phone}
            helperText={touched.phone ? errors.phone : ' '}
            placeholder={PHONE_PLACEHOLDER}
            inputProps={{ inputMode: 'numeric', maxLength: 17 }}
            className="unidade-field responsavel-form-field"
          />
          <TextField
            select
            size="small"
            fullWidth
            label="Plano"
            name="plan"
            value={form.plan}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.plan && !!errors.plan}
            helperText={touched.plan ? errors.plan : ' '}
            className="unidade-field responsavel-form-field"
            SelectProps={selectMenu}
          >
            <MenuItem value="">Selecione</MenuItem>
            {PLANS.map((p) => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </TextField>

          <FormControl
            className="responsavel-allergies-field"
            error={touched.hasAllergies && !!errors.hasAllergies}
          >
            <FormLabel>Alergias</FormLabel>
            <RadioGroup
              row
              name="hasAllergies"
              value={form.hasAllergies}
              onChange={handleChange}
              onBlur={handleBlur}
            >
              <FormControlLabel value="nao" control={<Radio size="small" />} label="Não" />
              <FormControlLabel value="sim" control={<Radio size="small" />} label="Sim" />
            </RadioGroup>
            {touched.hasAllergies && errors.hasAllergies && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                {errors.hasAllergies}
              </Typography>
            )}
          </FormControl>

          <Collapse in={form.hasAllergies === 'sim'}>
            <TextField
              size="small"
              fullWidth
              label="Quais alergias?"
              name="allergiesDetail"
              value={form.allergiesDetail}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.allergiesDetail && !!errors.allergiesDetail}
              helperText={touched.allergiesDetail ? (errors.allergiesDetail || ' ') : ' '}
              placeholder="Ex.: Amendoim, lactose..."
              className="unidade-field responsavel-form-field"
            />
          </Collapse>
        </Stack>
      </DialogContent>

      <DialogActions className="child-form-actions">
        <Button
          fullWidth
          className="btn-orange-card"
          startIcon={isEdit ? <EditRoundedIcon /> : <AddIcon />}
          onClick={handleSubmit}
          disabled={success}
        >
          {isEdit ? 'Salvar alterações' : 'Cadastrar criança'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

