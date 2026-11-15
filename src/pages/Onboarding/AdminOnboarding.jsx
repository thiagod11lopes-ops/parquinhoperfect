import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box, Typography, Button, TextField, Stack, Alert, Slider,
} from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import WallpaperOutlinedIcon from '@mui/icons-material/WallpaperOutlined'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import { useAppearance } from '../../context/AppearanceContext'
import { useParkSettings, DEFAULT_MAX_CHILDREN } from '../../context/ParkSettingsContext'
import { sampleImageFillColor } from '../../utils/sampleImageColor'
import {
  BILLING_PLANS,
  createTrialSubscription,
  formatPlanPrice,
  getPlanById,
} from '../../billing/plans'
import '../../styles/onboarding.scss'

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const STEPS = [
  { id: 'welcome', label: 'Olá' },
  { id: 'theme', label: 'Tema' },
  { id: 'logo', label: 'Logo' },
  { id: 'background', label: 'Fundo' },
  { id: 'bgFrame', label: 'Enquadrar' },
  { id: 'unit', label: 'Unidade' },
  { id: 'manager', label: 'Gerente' },
  { id: 'plan', label: 'Plano' },
  { id: 'done', label: 'Pronto' },
]

export default function AdminOnboarding({ onComplete }) {
  const navigate = useNavigate()
  const { user, tenantId, selectActiveUnit } = useAuth()
  const {
    getTenant, createUnit, inviteMember, completeSetup,
    updateSubscription, activatePaidPlan,
  } = useTenant()
  const { setMaxChildrenForUnit } = useParkSettings()
  const {
    appearance, applyTheme, update, themes, logoSrc, backgrounds, hasBgImage,
  } = useAppearance()

  const [step, setStep] = useState(0)
  const [unitName, setUnitName] = useState('')
  const [unitMaxChildren, setUnitMaxChildren] = useState(String(DEFAULT_MAX_CHILDREN))
  const [createdUnitId, setCreatedUnitId] = useState(null)
  const [managerName, setManagerName] = useState('')
  const [managerEmail, setManagerEmail] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [expanding, setExpanding] = useState(false)
  const logoInputRef = useRef(null)
  const bgInputRef = useRef(null)

  const tenant = getTenant(tenantId)
  const bgExpanded = Boolean(appearance.bgExpanded)

  const onPickLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await readFileAsDataUrl(file)
      update({ logoCustom: dataUrl, themeId: 'custom' })
    } catch {
      setError('Não foi possível carregar a logo.')
    }
    e.target.value = ''
  }

  const onPickBg = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await readFileAsDataUrl(file)
      update({
        bgMode: 'image',
        bgImageCustom: dataUrl,
        bgImagePreset: null,
        themeId: 'custom',
      })
    } catch {
      setError('Não foi possível carregar a imagem de fundo.')
    }
    e.target.value = ''
  }

  const selectBgPreset = (presetId) => {
    setError('')
    update({
      bgMode: 'image',
      bgImagePreset: presetId,
      bgImageCustom: null,
      bgExpanded: false,
      themeId: 'custom',
    })
  }

  const onExpandFill = async () => {
    setError('')
    if (bgExpanded) {
      update({
        bgColor: appearance.bgColorBeforeExpand || appearance.bgColor,
        bgExpanded: false,
        bgColorBeforeExpand: null,
        bgMode: 'image',
        themeId: 'custom',
      })
      return
    }

    setExpanding(true)
    try {
      const fill = await sampleImageFillColor(logoSrc)
      update({
        bgColorBeforeExpand: appearance.bgColor,
        bgColor: fill,
        bgExpanded: true,
        bgMode: 'image',
        themeId: 'custom',
      })
    } catch {
      setError('Não foi possível expandir com a cor da logo.')
    } finally {
      setExpanding(false)
    }
  }
  const progress = ((step + 1) / STEPS.length) * 100

  const greeting = useMemo(() => {
    const name = user?.name || tenant?.adminName || 'Admin'
    return name.split(' ')[0]
  }, [user, tenant])

  const goNext = () => {
    setError('')
    setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }

  const goBack = () => {
    setError('')
    setStep((s) => {
      const currentId = STEPS[s]?.id
      if (currentId === 'unit' && !hasBgImage) {
        const bgIndex = STEPS.findIndex((item) => item.id === 'background')
        return bgIndex >= 0 ? bgIndex : Math.max(0, s - 1)
      }
      return Math.max(0, s - 1)
    })
  }

  useEffect(() => {
    if (STEPS[step]?.id === 'bgFrame' && !hasBgImage) {
      const unitIndex = STEPS.findIndex((item) => item.id === 'unit')
      if (unitIndex >= 0) setStep(unitIndex)
    }
  }, [step, hasBgImage])

  const ensureUnit = () => {
    const trimmed = unitName.trim()
    if (!trimmed) {
      setError('Informe o nome da primeira unidade.')
      return null
    }
    const maxRaw = Number(unitMaxChildren)
    if (!Number.isFinite(maxRaw) || maxRaw < 1) {
      setError('Informe a lotação máxima (mínimo 1 criança).')
      return null
    }
    if (createdUnitId) {
      const existing = tenant?.units?.find((u) => u.id === createdUnitId)
      if (existing) {
        setMaxChildrenForUnit(existing.id, maxRaw)
        return existing
      }
    }
    const result = createUnit(tenantId, trimmed)
    if (!result.success) {
      setError(result.error || 'Não foi possível criar a unidade.')
      return null
    }
    setCreatedUnitId(result.unit.id)
    setMaxChildrenForUnit(result.unit.id, maxRaw)
    return result.unit
  }

  const finishSetup = () => {
    completeSetup(tenantId)
    const fresh = getTenant(tenantId)
    const unit = createdUnitId
      ? fresh?.units?.find((u) => u.id === createdUnitId)
      : fresh?.units?.[0]
    if (unit) selectActiveUnit(unit.id, unit.name)
    if (typeof onComplete === 'function') {
      onComplete()
      return
    }
    navigate('/dashboard', { replace: true })
  }

  const handlePrimary = async () => {
    const id = STEPS[step].id
    setError('')

    if (id === 'welcome' || id === 'theme' || id === 'logo' || id === 'bgFrame') {
      goNext()
      return
    }

    if (id === 'background') {
      if (hasBgImage) {
        goNext()
        return
      }
      // Sem fundo: pula a etapa de enquadramento
      const unitIndex = STEPS.findIndex((s) => s.id === 'unit')
      if (unitIndex >= 0) setStep(unitIndex)
      else goNext()
      return
    }

    if (id === 'unit') {
      const unit = ensureUnit()
      if (!unit) return
      goNext()
      return
    }

    if (id === 'manager') {
      setBusy(true)
      try {
        const unit = ensureUnit()
        if (!unit) return
        const email = managerEmail.trim()
        const name = managerName.trim()
        if (email || name) {
          if (!email || !name) {
            setError('Preencha nome e e-mail do gerente, ou deixe ambos em branco para pular.')
            return
          }
          const invited = inviteMember({
            tenantId,
            email,
            name,
            role: 'gerente',
            unitId: unit.id,
            invitedByEmail: user?.email,
            invitedByRole: 'administrador',
          })
          if (!invited.success) {
            setError(invited.error || 'Não foi possível convidar o gerente.')
            return
          }
        }
        goNext()
      } finally {
        setBusy(false)
      }
      return
    }

    if (id === 'plan') {
      if (!selectedPlanId) {
        setError('Escolha um plano para continuar.')
        return
      }
      const plan = getPlanById(selectedPlanId)
      if (!plan) {
        setError('Plano inválido. Selecione novamente.')
        return
      }
      setBusy(true)
      try {
        if (!plan.paid || plan.price <= 0) {
          activatePaidPlan(tenantId, plan.id, {})
          updateSubscription(tenantId, {
            planId: plan.id,
            status: 'active',
            provider: 'local',
          })
        } else {
          // Planos pagos: período de teste no plano escolhido; assinatura em Planos depois
          updateSubscription(tenantId, createTrialSubscription(plan.id))
        }
        goNext()
      } finally {
        setBusy(false)
      }
      return
    }

    if (id === 'done') {
      finishSetup()
    }
  }

  const skipManager = () => {
    setError('')
    setManagerName('')
    setManagerEmail('')
    goNext()
  }

  const stepId = STEPS[step].id

  return (
    <Box className="onboard-root" style={{ '--onboard-progress': `${progress}%` }}>
      <Box className="onboard-aurora" aria-hidden />
      <Box className="onboard-shell">
        <Box className="onboard-progress" aria-hidden>
          <span />
        </Box>

        <Box className="onboard-stepper" aria-label="Progresso da configuração">
          {STEPS.map((item, index) => (
            <span
              key={item.id}
              className={`onboard-dot ${index === step ? 'is-active' : ''} ${index < step ? 'is-done' : ''}`}
            />
          ))}
        </Box>

        <Box className="onboard-stage" key={stepId}>
          {stepId === 'welcome' && (
            <Box className="onboard-panel onboard-welcome">
              <Box className="onboard-badge">
                <AutoAwesomeOutlinedIcon fontSize="small" />
                Primeira abertura
              </Box>
              <Typography className="onboard-brand">Parquinho</Typography>
              <Typography className="onboard-title">
                Olá, {greeting}
              </Typography>
              <Typography className="onboard-sub">
                Vamos deixar o sistema com a sua cara — como configurar um celular novo.
                Leva só alguns minutos.
              </Typography>
            </Box>
          )}

          {stepId === 'theme' && (
            <Box className="onboard-panel">
              <Box className="onboard-kicker">
                <PaletteOutlinedIcon fontSize="small" />
                Aparência
              </Box>
              <Typography className="onboard-title">Escolha um tema</Typography>
              <Typography className="onboard-sub">
                O visual muda na hora. Você pode ajustar tudo depois em Configuração.
              </Typography>
              <Box className="onboard-theme-grid">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`onboard-theme ${appearance.themeId === theme.id ? 'is-active' : ''}`}
                    style={{ background: theme.bgGradient || theme.bgColor }}
                    onClick={() => applyTheme(theme.id)}
                  >
                    <span>{theme.name}</span>
                  </button>
                ))}
              </Box>
            </Box>
          )}

          {stepId === 'logo' && (
            <Box className="onboard-panel">
              <Box className="onboard-kicker">
                <ImageOutlinedIcon fontSize="small" />
                Aparência
              </Box>
              <Typography className="onboard-title">Logo</Typography>
              <Typography className="onboard-sub">
                Carregue outra imagem ou use a padrão. Depois ajuste zoom e opacidade.
              </Typography>
              <button
                type="button"
                className="onboard-logo-stage is-upload"
                onClick={() => logoInputRef.current?.click()}
                aria-label="Carregar outra logo"
              >
                <Box
                  component="img"
                  src={logoSrc}
                  alt="Prévia da logo"
                  style={{
                    transform: `scale(${(appearance.logoZoom ?? 100) / 100})`,
                    opacity: (appearance.logoOpacity ?? 100) / 100,
                  }}
                />
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onPickLogo}
              />
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
                <Button
                  size="small"
                  className="onboard-chip is-active"
                  startIcon={<UploadFileRoundedIcon />}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {appearance.logoCustom ? 'Trocar imagem' : 'Carregar imagem'}
                </Button>
                {appearance.logoCustom && (
                  <Button
                    size="small"
                    className="onboard-chip"
                    onClick={() => update({ logoCustom: null, logoPreset: 'parquinho' })}
                  >
                    Usar padrão
                  </Button>
                )}
              </Stack>
              <Box className="onboard-slider-block">
                <Box className="onboard-slider-head">
                  <Typography>Zoom</Typography>
                  <span>{appearance.logoZoom ?? 100}%</span>
                </Box>
                <Slider
                  size="small"
                  min={30}
                  max={160}
                  value={appearance.logoZoom ?? 100}
                  onChange={(_, value) => update({ logoZoom: value, themeId: 'custom' })}
                />
              </Box>
              <Box className="onboard-slider-block">
                <Box className="onboard-slider-head">
                  <Typography>Opacidade</Typography>
                  <span>{appearance.logoOpacity ?? 100}%</span>
                </Box>
                <Slider
                  size="small"
                  min={0}
                  max={100}
                  value={appearance.logoOpacity ?? 100}
                  onChange={(_, value) => update({ logoOpacity: value, themeId: 'custom' })}
                />
              </Box>
            </Box>
          )}

          {stepId === 'background' && (
            <Box className="onboard-panel">
              <Box className="onboard-kicker">
                <WallpaperOutlinedIcon fontSize="small" />
                Aparência
              </Box>
              <Typography className="onboard-title">Imagem de fundo</Typography>
              <Typography className="onboard-sub">
                Escolha um fundo pronto ou envie sua própria imagem. A prévia aparece no app.
              </Typography>
              <Box className="onboard-bg-presets">
                {backgrounds.map((bg) => {
                  const active = !appearance.bgImageCustom && appearance.bgImagePreset === bg.id
                  return (
                    <button
                      key={bg.id}
                      type="button"
                      className={`onboard-bg-preset ${active ? 'is-active' : ''}`}
                      onClick={() => selectBgPreset(bg.id)}
                      aria-pressed={active}
                    >
                      <span
                        className="onboard-bg-preset-thumb"
                        style={{ backgroundImage: `url(${bg.src})` }}
                      />
                      <span className="onboard-bg-preset-name">{bg.label}</span>
                    </button>
                  )
                })}
              </Box>
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onPickBg}
              />
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
                <Button
                  size="small"
                  className="onboard-chip is-active"
                  startIcon={<UploadFileRoundedIcon />}
                  onClick={() => {
                    update({ bgMode: 'image', themeId: 'custom' })
                    bgInputRef.current?.click()
                  }}
                >
                  Enviar imagem
                </Button>
                {hasBgImage && (
                  <Button
                    size="small"
                    className="onboard-chip"
                    onClick={() => bgInputRef.current?.click()}
                  >
                    Trocar arquivo
                  </Button>
                )}
              </Stack>
              {hasBgImage && (
                <Typography className="onboard-sub" sx={{ mt: 0.5 }}>
                  Fundo escolhido. Em seguida você ajusta zoom e posição.
                </Typography>
              )}
            </Box>
          )}

          {stepId === 'bgFrame' && (
            <Box className="onboard-panel">
              <Box className="onboard-kicker">
                <WallpaperOutlinedIcon fontSize="small" />
                Aparência
              </Box>
              <Typography className="onboard-title">Enquadrar fundo</Typography>
              <Typography className="onboard-sub">
                Ajuste zoom, opacidade e posição. A mudança aparece no app.
              </Typography>
              <Box className="onboard-slider-block">
                <Box className="onboard-slider-head">
                  <Typography>Zoom</Typography>
                  <span>{appearance.bgZoom ?? 100}%</span>
                </Box>
                <Slider
                  size="small"
                  min={40}
                  max={250}
                  value={appearance.bgZoom ?? 100}
                  onChange={(_, value) => update({ bgZoom: value, bgMode: 'image', themeId: 'custom' })}
                />
              </Box>
              <Box className="onboard-slider-block">
                <Box className="onboard-slider-head">
                  <Typography>Opacidade</Typography>
                  <span>{appearance.bgOpacity ?? 100}%</span>
                </Box>
                <Slider
                  size="small"
                  min={0}
                  max={100}
                  value={appearance.bgOpacity ?? 100}
                  onChange={(_, value) => update({ bgOpacity: value, themeId: 'custom' })}
                />
              </Box>
              <Box className="onboard-slider-block">
                <Box className="onboard-slider-head">
                  <Typography>Esquerda → Direita</Typography>
                  <span>{appearance.bgPosX ?? 50}%</span>
                </Box>
                <Slider
                  size="small"
                  min={0}
                  max={100}
                  value={appearance.bgPosX ?? 50}
                  onChange={(_, value) => update({ bgPosX: value, bgMode: 'image', themeId: 'custom' })}
                />
              </Box>
              <Box className="onboard-slider-block">
                <Box className="onboard-slider-head">
                  <Typography>Cima → Baixo</Typography>
                  <span>{appearance.bgPosY ?? 50}%</span>
                </Box>
                <Slider
                  size="small"
                  min={0}
                  max={100}
                  value={appearance.bgPosY ?? 50}
                  onChange={(_, value) => update({ bgPosY: value, bgMode: 'image', themeId: 'custom' })}
                />
              </Box>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mt: 1.25 }}>
                <Button
                  size="small"
                  className={`onboard-chip ${bgExpanded ? 'is-active' : ''}`}
                  startIcon={bgExpanded ? <CloseFullscreenIcon /> : <OpenInFullIcon />}
                  disabled={expanding}
                  onClick={onExpandFill}
                >
                  {expanding ? 'Expandindo…' : (bgExpanded ? 'Contrair' : 'Expandir')}
                </Button>
                <span
                  className="onboard-fill-swatch"
                  style={{ backgroundColor: appearance.bgColor || '#f97316' }}
                  title="Cor de preenchimento"
                  aria-hidden
                />
                <Button
                  size="small"
                  className="onboard-chip"
                  onClick={() => update({
                    bgZoom: 100,
                    bgPosX: 50,
                    bgPosY: 50,
                    bgMode: 'image',
                    themeId: 'custom',
                  })}
                >
                  Centralizar
                </Button>
              </Stack>
            </Box>
          )}

          {stepId === 'unit' && (
            <Box className="onboard-panel">
              <Box className="onboard-kicker">
                <BusinessOutlinedIcon fontSize="small" />
                Estrutura
              </Box>
              <Typography className="onboard-title">Primeira unidade</Typography>
              <Typography className="onboard-sub">
                Ex.: Unidade Centro, Filial Sul… Você pode criar outras depois.
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 0.5 }}>
                <TextField
                  fullWidth
                  label="Nome da unidade"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className="onboard-field"
                  autoFocus
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Lotação máxima"
                  value={unitMaxChildren}
                  onChange={(e) => setUnitMaxChildren(e.target.value)}
                  className="onboard-field"
                  inputProps={{ min: 1, max: 200, step: 1 }}
                  helperText="Quantidade máxima de crianças nesta unidade"
                />
              </Stack>
            </Box>
          )}

          {stepId === 'manager' && (
            <Box className="onboard-panel">
              <Box className="onboard-kicker">
                <PersonAddAlt1OutlinedIcon fontSize="small" />
                Estrutura
              </Box>
              <Typography className="onboard-title">Primeiro gerente</Typography>
              <Typography className="onboard-sub">
                Convide quem vai gerir a unidade. O e-mail receberá acesso ao entrar no app.
              </Typography>
              <Alert severity="info" className="onboard-notice">
                Você pode adicionar mais unidades e gerentes depois, e alterar tudo em
                Unidades e Configuração a qualquer momento.
              </Alert>
              <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                <TextField
                  fullWidth
                  label="Nome do gerente"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="onboard-field"
                />
                <TextField
                  fullWidth
                  label="E-mail do gerente"
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  className="onboard-field"
                />
              </Stack>
            </Box>
          )}

          {stepId === 'plan' && (
            <Box className="onboard-panel">
              <Box className="onboard-kicker">
                <WorkspacePremiumOutlinedIcon fontSize="small" />
                Assinatura
              </Box>
              <Typography className="onboard-title">Escolha o seu plano</Typography>
              <Typography className="onboard-sub">
                Esta etapa é obrigatória. Selecione um plano para liberar o sistema.
              </Typography>
              <Alert severity="info" className="onboard-notice">
                Planos pagos começam com período de teste. Você pode assinar pelo Mercado Pago
                depois em Planos.
              </Alert>
              <Box className="onboard-plan-grid" role="list" aria-label="Planos disponíveis">
                {BILLING_PLANS.map((plan) => {
                  const selected = selectedPlanId === plan.id
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      role="listitem"
                      className={[
                        'onboard-plan-card',
                        plan.highlight ? 'is-featured' : '',
                        selected ? 'is-selected' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => {
                        setError('')
                        setSelectedPlanId(plan.id)
                      }}
                    >
                      <span className="onboard-plan-name">{plan.name}</span>
                      {plan.highlight ? <span className="onboard-plan-badge">Popular</span> : null}
                      <span className={`onboard-plan-price${plan.price <= 0 && plan.compareAtPrice ? ' is-free-strike' : ''}`}>
                        {plan.price <= 0 && plan.compareAtPrice ? (
                          <span className="onboard-plan-price-strike">{formatPlanPrice(plan)}</span>
                        ) : (
                          formatPlanPrice(plan)
                        )}
                        {(plan.price > 0 || plan.compareAtPrice > 0) && (
                          <span className="onboard-plan-period">/mês</span>
                        )}
                      </span>
                      <span className="onboard-plan-desc">{plan.description}</span>
                      {selected ? (
                        <span className="onboard-plan-check">
                          <CheckRoundedIcon fontSize="inherit" />
                          Selecionado
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </Box>
            </Box>
          )}

          {stepId === 'done' && (
            <Box className="onboard-panel onboard-welcome">
              <Box className="onboard-badge is-success">
                <CheckRoundedIcon fontSize="small" />
                Tudo pronto
              </Box>
              <Typography className="onboard-brand">Parquinho</Typography>
              <Typography className="onboard-title">Seu espaço está configurado</Typography>
              <Typography className="onboard-sub">
                Aparência definida
                {unitName.trim() ? ` · unidade “${unitName.trim()}”` : ''}
                {selectedPlanId ? ` · plano ${getPlanById(selectedPlanId)?.name || ''}` : ''}.
                Explore o menu e continue personalizando quando quiser.
              </Typography>
            </Box>
          )}
        </Box>

        {error && (
          <Alert severity="error" className="onboard-error">{error}</Alert>
        )}

        <Box className="onboard-actions">
          {step > 0 && stepId !== 'done' && (
            <Button
              className="onboard-btn-ghost"
              startIcon={<ArrowBackRoundedIcon />}
              onClick={goBack}
              disabled={busy}
            >
              Voltar
            </Button>
          )}
          <Box className="onboard-actions-spacer" />
          {stepId === 'manager' && (
            <Button className="onboard-btn-ghost" onClick={skipManager} disabled={busy}>
              Pular
            </Button>
          )}
          <Button
            className="onboard-btn-primary"
            endIcon={stepId === 'done' ? <CheckRoundedIcon /> : <ArrowForwardRoundedIcon />}
            onClick={handlePrimary}
            disabled={busy || (stepId === 'plan' && !selectedPlanId)}
          >
            {stepId === 'welcome' && 'Começar'}
            {(stepId === 'theme' || stepId === 'logo' || stepId === 'background' || stepId === 'bgFrame') && 'Continuar'}
            {stepId === 'unit' && 'Salvar unidade'}
            {stepId === 'manager' && 'Continuar'}
            {stepId === 'plan' && 'Confirmar plano'}
            {stepId === 'done' && 'Entrar no sistema'}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
