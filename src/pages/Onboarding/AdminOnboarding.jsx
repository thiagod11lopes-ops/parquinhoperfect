import React, { useMemo, useRef, useState } from 'react'
import {
  Box, Typography, Button, TextField, Stack, Alert, Slider,
} from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import FontDownloadOutlinedIcon from '@mui/icons-material/FontDownloadOutlined'
import FormatColorTextOutlinedIcon from '@mui/icons-material/FormatColorTextOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import WallpaperOutlinedIcon from '@mui/icons-material/WallpaperOutlined'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import { useAppearance } from '../../context/AppearanceContext'
import { sampleImageFillColor } from '../../utils/sampleImageColor'
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
  { id: 'font', label: 'Fonte' },
  { id: 'fontColors', label: 'Cores' },
  { id: 'logo', label: 'Logo' },
  { id: 'background', label: 'Fundo' },
  { id: 'unit', label: 'Unidade' },
  { id: 'manager', label: 'Gerente' },
  { id: 'done', label: 'Pronto' },
]

export default function AdminOnboarding({ onComplete }) {
  const navigate = useNavigate()
  const { user, tenantId, selectActiveUnit } = useAuth()
  const { getTenant, createUnit, inviteMember, completeSetup } = useTenant()
  const {
    appearance, applyTheme, update, themes, fonts, logoSrc, bgImageSrc,
  } = useAppearance()

  const [step, setStep] = useState(0)
  const [unitName, setUnitName] = useState('')
  const [createdUnitId, setCreatedUnitId] = useState(null)
  const [managerName, setManagerName] = useState('')
  const [managerEmail, setManagerEmail] = useState('')
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
        themeId: 'custom',
      })
    } catch {
      setError('Não foi possível carregar a imagem de fundo.')
    }
    e.target.value = ''
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
  const activeFont = fonts.find((f) => f.id === appearance.fontId) || fonts[0]
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
    setStep((s) => Math.max(0, s - 1))
  }

  const ensureUnit = () => {
    const trimmed = unitName.trim()
    if (!trimmed) {
      setError('Informe o nome da primeira unidade.')
      return null
    }
    if (createdUnitId) {
      const existing = tenant?.units?.find((u) => u.id === createdUnitId)
      if (existing) return existing
    }
    const result = createUnit(tenantId, trimmed)
    if (!result.success) {
      setError(result.error || 'Não foi possível criar a unidade.')
      return null
    }
    setCreatedUnitId(result.unit.id)
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

    if (
      id === 'welcome' || id === 'theme' || id === 'font' || id === 'fontColors'
      || id === 'logo' || id === 'background'
    ) {
      goNext()
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

          {stepId === 'font' && (
            <Box className="onboard-panel">
              <Box className="onboard-kicker">
                <FontDownloadOutlinedIcon fontSize="small" />
                Aparência
              </Box>
              <Typography className="onboard-title">Fonte do sistema</Typography>
              <Typography className="onboard-sub">
                Toque para ver a tipografia aplicada em todo o app.
              </Typography>
              <Box
                className="onboard-font-preview"
                style={{ fontFamily: activeFont?.stack }}
              >
                Aa · Parquinho
              </Box>
              <Box className="onboard-font-grid">
                {fonts.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    className={`onboard-font-card ${appearance.fontId === font.id ? 'is-active' : ''}`}
                    style={{ fontFamily: font.stack }}
                    onClick={() => update({ fontId: font.id, themeId: appearance.themeId === 'custom' ? 'custom' : appearance.themeId })}
                  >
                    <strong>Aa</strong>
                    <span>{font.label}</span>
                  </button>
                ))}
              </Box>
            </Box>
          )}

          {stepId === 'fontColors' && (
            <Box className="onboard-panel">
              <Box className="onboard-kicker">
                <FormatColorTextOutlinedIcon fontSize="small" />
                Aparência
              </Box>
              <Typography className="onboard-title">Cores das fontes</Typography>
              <Typography className="onboard-sub">
                Ajuste texto e sombra para boa leitura sobre o fundo.
              </Typography>
              <Box
                className="onboard-font-preview"
                style={{
                  fontFamily: activeFont?.stack,
                  color: appearance.fontColor || '#fff',
                  textShadow: `0 1px 2px ${appearance.fontShadowColor || '#0f172a'}, 0 0 4px ${appearance.fontShadowColor || '#0f172a'}`,
                }}
              >
                Texto legível · Parquinho
              </Box>
              <Stack spacing={1.5} className="onboard-color-fields">
                <TextField
                  size="small"
                  type="color"
                  label="Cor da fonte"
                  value={appearance.fontColor || '#ffffff'}
                  onChange={(e) => update({ fontColor: e.target.value, themeId: 'custom' })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  size="small"
                  type="color"
                  label="Cor da sombra"
                  value={appearance.fontShadowColor || '#0f172a'}
                  onChange={(e) => update({ fontShadowColor: e.target.value, themeId: 'custom' })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>
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
              <Box
                className="onboard-bg-preview"
                style={{
                  backgroundColor: appearance.bgColor || '#f97316',
                  backgroundImage: `url(${bgImageSrc})`,
                  backgroundPosition: `${appearance.bgPosX ?? 50}% ${appearance.bgPosY ?? 50}%`,
                  backgroundSize: `${appearance.bgZoom ?? 100}%`,
                  opacity: (appearance.bgOpacity ?? 100) / 100,
                }}
              />
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
                  Imagem
                </Button>
                {appearance.bgImageCustom && (
                  <Button
                    size="small"
                    className="onboard-chip"
                    onClick={() => bgInputRef.current?.click()}
                  >
                    Trocar imagem
                  </Button>
                )}
              </Stack>
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
              <TextField
                fullWidth
                label="Nome da unidade"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="onboard-field"
                autoFocus
              />
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

          {stepId === 'done' && (
            <Box className="onboard-panel onboard-welcome">
              <Box className="onboard-badge is-success">
                <CheckRoundedIcon fontSize="small" />
                Tudo pronto
              </Box>
              <Typography className="onboard-brand">Parquinho</Typography>
              <Typography className="onboard-title">Seu espaço está configurado</Typography>
              <Typography className="onboard-sub">
                Aparência definida{unitName.trim() ? ` · unidade “${unitName.trim()}”` : ''}.
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
            disabled={busy}
          >
            {stepId === 'welcome' && 'Começar'}
            {(stepId === 'theme' || stepId === 'font' || stepId === 'fontColors' || stepId === 'logo' || stepId === 'background') && 'Continuar'}
            {stepId === 'unit' && 'Salvar unidade'}
            {stepId === 'manager' && 'Continuar'}
            {stepId === 'done' && 'Entrar no sistema'}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
