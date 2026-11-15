import React, { useEffect, useRef, useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, Collapse, Alert, Slider,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PaletteIcon from '@mui/icons-material/Palette'
import ImageIcon from '@mui/icons-material/Image'
import ColorLensIcon from '@mui/icons-material/ColorLens'
import WallpaperIcon from '@mui/icons-material/Wallpaper'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import OpacityIcon from '@mui/icons-material/Opacity'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import SwapVertIcon from '@mui/icons-material/SwapVert'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen'
import BackupIcon from '@mui/icons-material/Backup'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import GroupsIcon from '@mui/icons-material/Groups'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import { useAppearance, hexToPanel, panelToHex } from '../../context/AppearanceContext'
import { useParkSettings, DEFAULT_MAX_CHILDREN } from '../../context/ParkSettingsContext'
import {
  loadUnitMaxChildren,
  saveUnitMaxChildren,
} from '../../utils/unitCapacity'
import { sampleImageFillColor } from '../../utils/sampleImageColor'
import { setLocalOnlyMode } from '../../firebase/syncedStorage'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import '../../styles/global.scss'

const OTHER_COLOR_FIELDS = [
  { key: 'bgColor', label: 'Fundo', hint: 'Cor de fundo da tela' },
  { key: 'accent', label: 'Cor principal', hint: 'Destaques gerais' },
  { key: 'accentDeep', label: 'Cor profunda', hint: 'Tons mais escuros' },
  { key: 'panelColor', label: 'Painéis', hint: 'Cards e blocos' },
  { key: 'sidebarColor', label: 'Menu lateral', hint: 'Fundo do menu' },
  { key: 'buttonColor', label: 'Botões', hint: 'Botões de ação' },
]

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Configuracao() {
  const navigate = useNavigate()
  const { isAdmin, user, tenantId, unitId, logout } = useAuth()
  const { getTenant, exportTenant, importTenant, deleteTenantCompletely } = useTenant()
  const {
    appearance, update, applyTheme, resetAppearance,
    logoSrc, hasBgImage, themes, backgrounds,
  } = useAppearance()
  const { maxChildren, setMaxChildren, setMaxChildrenForUnit } = useParkSettings()
  const [open, setOpen] = useState(false)
  const [otherColorsOpen, setOtherColorsOpen] = useState(false)
  const [savedHint, setSavedHint] = useState('')
  const [expanding, setExpanding] = useState(false)
  const [backupMsg, setBackupMsg] = useState(null)
  const [confirmRemoveBg, setConfirmRemoveBg] = useState(false)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [wiping, setWiping] = useState(false)
  /** choose = escolher fundo | frame = zoom/posição (só após escolher) */
  const [bgStep, setBgStep] = useState('choose')
  const [capacityDraft, setCapacityDraft] = useState(String(maxChildren || DEFAULT_MAX_CHILDREN))
  const [capacityUnitId, setCapacityUnitId] = useState('')
  const [capacityMsg, setCapacityMsg] = useState(null)
  const logoInputRef = useRef(null)
  const bgInputRef = useRef(null)
  const tenant = getTenant(tenantId)
  const units = tenant?.units || []

  useEffect(() => {
    const preferred = unitId || units[0]?.id || ''
    setCapacityUnitId((prev) => prev || preferred)
  }, [unitId, units])

  useEffect(() => {
    if (!capacityUnitId) {
      setCapacityDraft(String(DEFAULT_MAX_CHILDREN))
      return
    }
    if (capacityUnitId === unitId) {
      setCapacityDraft(String(maxChildren || DEFAULT_MAX_CHILDREN))
      return
    }
    setCapacityDraft(String(loadUnitMaxChildren(tenantId, capacityUnitId)))
  }, [capacityUnitId, maxChildren, tenantId, unitId])

  const saveCapacity = () => {
    const n = Number(capacityDraft)
    if (!capacityUnitId) {
      setCapacityMsg({ ok: false, text: 'Crie uma unidade antes de definir a lotação.' })
      return
    }
    if (!Number.isFinite(n) || n < 1) {
      setCapacityMsg({ ok: false, text: 'Informe um número válido (mínimo 1).' })
      return
    }
    const saved = setMaxChildrenForUnit
      ? setMaxChildrenForUnit(capacityUnitId, n)
      : saveUnitMaxChildren(tenantId, capacityUnitId, n)
    if (capacityUnitId === unitId) setMaxChildren(saved)
    setCapacityDraft(String(saved))
    setCapacityMsg({ ok: true, text: 'Lotação máxima atualizada.' })
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />

  const handleExportBackup = () => {
    if (!tenantId) {
      setBackupMsg({ ok: false, text: 'Banco do administrador não encontrado.' })
      return
    }
    const result = exportTenant(tenantId)
    if (!result.success) {
      setBackupMsg({ ok: false, text: result.error })
      return
    }
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `parquinho-backup-${tenant?.adminEmail || user?.email || 'banco'}.json`
    a.click()
    URL.revokeObjectURL(url)
    setBackupMsg({ ok: true, text: 'Backup exportado.' })
  }

  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !tenantId) return
    const text = await file.text()
    const result = importTenant(tenantId, text)
    setBackupMsg(result.success
      ? { ok: true, text: 'Backup importado com sucesso.' }
      : { ok: false, text: result.error })
    e.target.value = ''
  }

  const handleWipeAllData = async () => {
    if (!tenantId || wiping) return
    setWiping(true)
    try {
      const result = deleteTenantCompletely(tenantId)
      if (!result.success) {
        setBackupMsg({ ok: false, text: result.error || 'Não foi possível excluir os dados.' })
        setConfirmWipe(false)
        return
      }
      ;[
        'parquinhoGuardianSession',
        'parquinhoActiveCall',
        'parquinhoPendingHandover',
        'parquinhoChatReads',
        'sampleDataEnabled',
      ].forEach((key) => {
        try { localStorage.removeItem(key) } catch { /* ignore */ }
      })
      resetAppearance()
      setLocalOnlyMode(false)
      await logout()
      setConfirmWipe(false)
      navigate('/', { replace: true })
    } catch {
      setBackupMsg({ ok: false, text: 'Falha ao excluir os dados deste login.' })
      setConfirmWipe(false)
    } finally {
      setWiping(false)
    }
  }

  const flash = (text) => {
    setSavedHint(text)
    window.setTimeout(() => setSavedHint(''), 1600)
  }

  const onPickLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await readFileAsDataUrl(file)
    update({ logoCustom: dataUrl })
    flash('Logo atualizada')
    e.target.value = ''
  }

  const onPickBg = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await readFileAsDataUrl(file)
    update({
      bgMode: 'image',
      bgImageCustom: dataUrl,
      bgImagePreset: null,
      bgZoom: appearance.bgZoom ?? 100,
      bgPosX: appearance.bgPosX ?? 50,
      bgPosY: appearance.bgPosY ?? 50,
      themeId: 'custom',
    })
    setBgStep('frame')
    flash('Imagem de fundo atualizada')
    e.target.value = ''
  }

  const selectBgPreset = (presetId) => {
    update({
      bgMode: 'image',
      bgImagePreset: presetId,
      bgImageCustom: null,
      bgZoom: appearance.bgZoom ?? 100,
      bgPosX: appearance.bgPosX ?? 50,
      bgPosY: appearance.bgPosY ?? 50,
      bgExpanded: false,
      themeId: 'custom',
    })
    setBgStep('frame')
    flash('Fundo aplicado')
  }

  const confirmRemoveBgImage = () => {
    update({
      bgImageCustom: null,
      bgImagePreset: null,
      bgMode: 'color',
      bgExpanded: false,
      bgColorBeforeExpand: null,
      themeId: 'custom',
    })
    setBgStep('choose')
    setConfirmRemoveBg(false)
    flash('Imagem de fundo removida')
  }

  const bgZoom = appearance.bgZoom ?? 100
  const bgPosX = appearance.bgPosX ?? 50
  const bgPosY = appearance.bgPosY ?? 50
  const bgOpacity = appearance.bgOpacity ?? 100
  const logoZoom = appearance.logoZoom ?? 100
  const logoOpacity = appearance.logoOpacity ?? 100
  const bgExpanded = Boolean(appearance.bgExpanded)

  useEffect(() => {
    if (!hasBgImage && bgStep === 'frame') setBgStep('choose')
  }, [hasBgImage, bgStep])

  const onExpandFill = async () => {
    if (bgExpanded) {
      update({
        bgColor: appearance.bgColorBeforeExpand || appearance.bgColor,
        bgExpanded: false,
        bgColorBeforeExpand: null,
        bgMode: 'image',
        themeId: 'custom',
      })
      flash('Preenchimento contraído')
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
      flash('Fundo expandido com a cor da logo')
    } catch {
      flash('Não foi possível ler a cor da logo')
    } finally {
      setExpanding(false)
    }
  }

  return (
    <Box className="page-container config-page">
      <Box className="page-header">
        <Typography variant="body2" fontWeight={700}>Configuração</Typography>
        <Typography variant="caption" sx={{ color: 'var(--app-font-color, #fff)', opacity: 0.9 }}>
          Aparência do sistema · apenas administrador
        </Typography>
      </Box>

      <Box className={`config-card panel-card ${open ? 'is-open' : ''}`}>
        <button
          type="button"
          className={`config-toggle ${open ? 'is-open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <Box className="config-toggle-copy">
            <span className="config-card-icon" aria-hidden>
              <PaletteIcon fontSize="small" />
            </span>
            <Box className="config-toggle-text">
              <Typography className="config-toggle-title">Aparência do sistema</Typography>
              <Typography className="config-toggle-sub">
                Logo, fundo, fontes, cores e temas
              </Typography>
            </Box>
          </Box>
          <span className={`config-chevron-wrap ${open ? 'is-open' : ''}`}>
            <ExpandMoreIcon className="config-chevron" />
          </span>
        </button>

        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box className="config-body">
            {savedHint && (
              <Alert severity="success" sx={{ mb: 1.5, borderRadius: 2 }}>{savedHint}</Alert>
            )}

            <Typography className="config-section-title">
              <ImageIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
              Logo central
            </Typography>
            <Box
              className="config-logo-preview is-clickable"
              role="button"
              tabIndex={0}
              onClick={() => logoInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') logoInputRef.current?.click()
              }}
              title="Toque para carregar outra logo"
            >
              <Box
                component="img"
                src={logoSrc}
                alt="Logo atual"
                style={{
                  transform: `scale(${logoZoom / 100})`,
                  opacity: logoOpacity / 100,
                }}
              />
            </Box>
            <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={onPickLogo} />
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
              <Button
                fullWidth
                className="btn-orange-card"
                onClick={() => logoInputRef.current?.click()}
              >
                {appearance.logoCustom ? 'Trocar logo' : 'Carregar outra imagem'}
              </Button>
              {appearance.logoCustom && (
                <Button
                  size="small"
                  className="config-chip-btn"
                  onClick={() => {
                    update({ logoCustom: null, logoPreset: 'parquinho' })
                    flash('Logo padrão restaurada')
                  }}
                >
                  Usar padrão
                </Button>
              )}
            </Stack>
            <Box className="config-bg-frame" sx={{ mb: 1.5 }}>
              <Typography className="config-bg-frame-label">Enquadrar logo</Typography>
              <Box className="config-bg-slider">
                <Box className="config-bg-slider-head">
                  <ZoomInIcon fontSize="small" />
                  <Typography>Zoom</Typography>
                  <span>{logoZoom}%</span>
                </Box>
                <Slider
                  size="small"
                  min={30}
                  max={160}
                  step={1}
                  value={logoZoom}
                  onChange={(_, value) => update({ logoZoom: value, themeId: 'custom' })}
                  aria-label="Zoom da logo"
                />
              </Box>
              <Box className="config-bg-slider">
                <Box className="config-bg-slider-head">
                  <OpacityIcon fontSize="small" />
                  <Typography>Opacidade</Typography>
                  <span>{logoOpacity}%</span>
                </Box>
                <Slider
                  size="small"
                  min={0}
                  max={100}
                  step={1}
                  value={logoOpacity}
                  onChange={(_, value) => update({ logoOpacity: value, themeId: 'custom' })}
                  aria-label="Opacidade da logo"
                />
              </Box>
            </Box>

            <Typography className="config-section-title">
              <WallpaperIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
              Fundo do app
            </Typography>

            {bgStep === 'choose' && (
              <>
                <Typography className="config-hint" sx={{ mb: 1 }}>
                  Etapa 1 · Escolha um fundo pronto ou envie sua imagem
                </Typography>
                <Box className="config-bg-presets">
                  {backgrounds.map((bg) => {
                    const active = !appearance.bgImageCustom && appearance.bgImagePreset === bg.id
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        className={`config-bg-preset ${active ? 'is-active' : ''}`}
                        onClick={() => selectBgPreset(bg.id)}
                        aria-pressed={active}
                        aria-label={bg.label}
                      >
                        <span
                          className="config-bg-preset-thumb"
                          style={{ backgroundImage: `url(${bg.src})` }}
                        />
                        <span className="config-bg-preset-name">{bg.label}</span>
                      </button>
                    )
                  })}
                </Box>
                <input ref={bgInputRef} type="file" accept="image/*" hidden onChange={onPickBg} />
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ mb: 1.25, width: '100%' }}
                >
                  {hasBgImage && (
                    <Button
                      className="btn-orange-card"
                      onClick={() => setConfirmRemoveBg(true)}
                      sx={{ flex: 1, minWidth: 0 }}
                    >
                      Retirar imagem
                    </Button>
                  )}
                  <Button
                    className="btn-orange-card"
                    onClick={() => bgInputRef.current?.click()}
                    sx={{ flex: 1, minWidth: 0, width: hasBgImage ? undefined : '100%' }}
                  >
                    {hasBgImage ? 'Trocar imagem' : 'Carregar imagem'}
                  </Button>
                </Stack>
                {hasBgImage && (
                  <Button
                    fullWidth
                    className="btn-orange-card"
                    sx={{ mb: 1.25 }}
                    onClick={() => setBgStep('frame')}
                  >
                    Continuar para enquadramento
                  </Button>
                )}
              </>
            )}

            {bgStep === 'frame' && hasBgImage && (
              <Box className="config-bg-frame">
                <Typography className="config-bg-frame-label">Etapa 2 · Enquadrar fundo</Typography>
                <Typography className="config-bg-frame-hint">
                  Ajuste zoom e posição — a mudança aparece no app
                </Typography>
                <Button
                  size="small"
                  className="config-chip-btn"
                  sx={{ mb: 1 }}
                  onClick={() => setBgStep('choose')}
                >
                  Voltar à escolha de fundo
                </Button>

                <Box className="config-bg-slider">
                  <Box className="config-bg-slider-head">
                    <ZoomInIcon fontSize="small" />
                    <Typography>Zoom</Typography>
                    <span>{bgZoom}%</span>
                  </Box>
                  <Slider
                    size="small"
                    min={40}
                    max={250}
                    step={1}
                    value={bgZoom}
                    onChange={(_, value) => update({ bgZoom: value, bgMode: 'image', themeId: 'custom' })}
                    aria-label="Zoom do fundo"
                  />
                </Box>

                <Box className="config-bg-slider">
                  <Box className="config-bg-slider-head">
                    <OpacityIcon fontSize="small" />
                    <Typography>Opacidade</Typography>
                    <span>{bgOpacity}%</span>
                  </Box>
                  <Slider
                    size="small"
                    min={0}
                    max={100}
                    step={1}
                    value={bgOpacity}
                    onChange={(_, value) => update({ bgOpacity: value, themeId: 'custom' })}
                    aria-label="Opacidade do fundo"
                  />
                </Box>

                <Box className="config-bg-slider">
                  <Box className="config-bg-slider-head">
                    <SwapHorizIcon fontSize="small" />
                    <Typography>Esquerda → Direita</Typography>
                    <span>{bgPosX}%</span>
                  </Box>
                  <Slider
                    size="small"
                    min={0}
                    max={100}
                    step={1}
                    value={bgPosX}
                    onChange={(_, value) => update({ bgPosX: value, bgMode: 'image', themeId: 'custom' })}
                    aria-label="Posição horizontal do fundo"
                  />
                </Box>

                <Box className="config-bg-slider">
                  <Box className="config-bg-slider-head">
                    <SwapVertIcon fontSize="small" />
                    <Typography>Cima → Baixo</Typography>
                    <span>{bgPosY}%</span>
                  </Box>
                  <Slider
                    size="small"
                    min={0}
                    max={100}
                    step={1}
                    value={bgPosY}
                    onChange={(_, value) => update({ bgPosY: value, bgMode: 'image', themeId: 'custom' })}
                    aria-label="Posição vertical do fundo"
                  />
                </Box>

                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
                  <Button
                    size="small"
                    className={`config-chip-btn config-expand-btn ${bgExpanded ? 'is-active' : ''}`}
                    startIcon={bgExpanded ? <CloseFullscreenIcon /> : <OpenInFullIcon />}
                    disabled={expanding}
                    onClick={onExpandFill}
                  >
                    {expanding ? 'Expandindo…' : (bgExpanded ? 'Contrair' : 'Expandir')}
                  </Button>
                  <span
                    className="config-bg-fill-swatch"
                    style={{ backgroundColor: appearance.bgColor || '#f97316' }}
                    title={`Cor de preenchimento ${appearance.bgColor || ''}`}
                    aria-hidden
                  />
                  <Button
                    size="small"
                    className="config-chip-btn"
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

            <Box className="config-font-section">
              <button
                type="button"
                className={`config-font-toggle ${otherColorsOpen ? 'is-open' : ''}`}
                onClick={() => setOtherColorsOpen((v) => !v)}
                aria-expanded={otherColorsOpen}
              >
                <Box className="config-font-toggle-copy">
                  <ColorLensIcon fontSize="small" />
                  <Box>
                    <Typography className="config-font-toggle-title">Outras cores</Typography>
                    {!otherColorsOpen && (
                      <Typography className="config-font-toggle-sub">
                        Fundo, principal, painéis, menu e botões
                      </Typography>
                    )}
                  </Box>
                </Box>
                <ExpandMoreIcon className="config-font-chevron" />
              </button>

              <Collapse in={otherColorsOpen} timeout="auto" unmountOnExit>
                <Box className="config-font-body">
                  <Box className="config-other-colors">
                    {OTHER_COLOR_FIELDS.map((field) => {
                      let value = appearance[field.key] || appearance.accent
                      if (field.key === 'panelColor') {
                        value = appearance.panelColor || panelToHex(appearance.panel, appearance.accent)
                      } else if (field.key === 'bgColor') {
                        value = appearance.bgColor || appearance.accent || '#f97316'
                        if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
                          value = panelToHex(value, appearance.accent || '#f97316')
                        }
                      }
                      return (
                        <label key={field.key} className="config-other-color-row">
                          <span className="config-other-color-swatch" style={{ background: value }} aria-hidden />
                          <span className="config-other-color-copy">
                            <span className="config-other-color-label">{field.label}</span>
                            <span className="config-other-color-hint">{field.hint}</span>
                          </span>
                          <TextField
                            size="small"
                            type="color"
                            value={value}
                            onChange={(e) => {
                              const next = e.target.value
                              if (field.key === 'panelColor') {
                                update({
                                  panelColor: next,
                                  panel: hexToPanel(next),
                                  themeId: 'custom',
                                })
                              } else if (field.key === 'bgColor') {
                                update({
                                  bgColor: next,
                                  bgColorBeforeExpand: appearance.bgExpanded
                                    ? appearance.bgColorBeforeExpand
                                    : next,
                                  themeId: 'custom',
                                })
                              } else {
                                update({
                                  [field.key]: next,
                                  themeId: 'custom',
                                })
                              }
                              flash(`${field.label} atualizada`)
                            }}
                            className="config-field config-other-color-input"
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ 'aria-label': field.label }}
                          />
                        </label>
                      )
                    })}
                  </Box>
                </Box>
              </Collapse>
            </Box>

            <Typography className="config-section-title">Temas prontos</Typography>
            <Typography className="config-section-sub">
              12 temas · mudam fundo, painéis, menu, botões e cores de fonte (mantém a tipografia)
            </Typography>
            <Box className="config-theme-grid">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`config-theme-swatch ${appearance.themeId === theme.id ? 'is-active' : ''}`}
                  style={{
                    background: theme.bgGradient || theme.bgColor,
                  }}
                  onClick={() => {
                    applyTheme(theme.id)
                    flash(`Tema "${theme.name}" aplicado`)
                  }}
                >
                  <span className="config-theme-name">{theme.name}</span>
                </button>
              ))}
            </Box>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={() => {
                resetAppearance()
                flash('Aparência restaurada')
              }}
              sx={{ color: 'var(--app-font-color, #fff)', borderColor: 'rgba(255,255,255,0.55)', fontWeight: 800 }}
            >
              Restaurar aparência padrão
            </Button>
          </Box>
        </Collapse>
      </Box>

      <Box className="config-card panel-card config-backup-card">
        <Box className="config-backup-head">
          <span className="config-card-icon" aria-hidden>
            <GroupsIcon fontSize="small" />
          </span>
          <Box className="config-toggle-text">
            <Typography className="config-toggle-title">Lotação máxima</Typography>
            <Typography className="config-toggle-sub">
              Limite de crianças por unidade
            </Typography>
          </Box>
        </Box>
        {capacityMsg && (
          <Alert
            severity={capacityMsg.ok ? 'success' : 'error'}
            className="config-backup-alert"
            onClose={() => setCapacityMsg(null)}
          >
            {capacityMsg.text}
          </Alert>
        )}
        {units.length > 1 && (
          <TextField
            select
            size="small"
            fullWidth
            label="Unidade"
            value={capacityUnitId}
            onChange={(e) => setCapacityUnitId(e.target.value)}
            className="config-color-field"
            SelectProps={{ native: true }}
            sx={{ mb: 1.25 }}
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </TextField>
        )}
        <Stack direction="row" spacing={1} className="config-backup-actions">
          <TextField
            size="small"
            fullWidth
            type="number"
            label="Máximo de crianças"
            value={capacityDraft}
            onChange={(e) => setCapacityDraft(e.target.value)}
            inputProps={{ min: 1, max: 200, step: 1 }}
            className="config-color-field"
          />
          <Button className="btn-orange-card" onClick={saveCapacity} sx={{ minWidth: 96 }}>
            Salvar
          </Button>
        </Stack>
      </Box>

      <Box className="config-card panel-card config-backup-card">
        <Box className="config-backup-head">
          <span className="config-card-icon" aria-hidden>
            <BackupIcon fontSize="small" />
          </span>
          <Box className="config-toggle-text">
            <Typography className="config-toggle-title">Backup do banco</Typography>
            <Typography className="config-toggle-sub">
              {tenant?.adminEmail
                ? `Exportar ou importar · ${tenant.adminEmail}`
                : 'Exportar ou importar dados do administrador'}
            </Typography>
          </Box>
        </Box>
        {backupMsg && (
          <Alert
            severity={backupMsg.ok ? 'success' : 'error'}
            className="config-backup-alert"
          >
            {backupMsg.text}
          </Alert>
        )}
        <Stack direction="row" spacing={1} className="config-backup-actions">
          <Button className="btn-orange-card" onClick={handleExportBackup} sx={{ flex: 1, minWidth: 0 }}>
            Exportar JSON
          </Button>
          <Button
            className="btn-orange-card"
            component="label"
            sx={{ flex: 1, minWidth: 0 }}
          >
            Importar
            <input hidden type="file" accept="application/json,.json" onChange={handleImportBackup} />
          </Button>
        </Stack>
      </Box>

      <Box className="config-card panel-card config-danger-card">
        <Box className="config-backup-head">
          <span className="config-card-icon config-card-icon--danger" aria-hidden>
            <DeleteForeverIcon fontSize="small" />
          </span>
          <Box className="config-toggle-text">
            <Typography className="config-toggle-title">Zona de perigo</Typography>
            <Typography className="config-toggle-sub">
              Exclui unidades, equipes, crianças e demais dados deste login
              {tenant?.adminEmail ? ` (${tenant.adminEmail})` : ''}
            </Typography>
          </Box>
        </Box>
        <Button
          fullWidth
          className="config-wipe-btn"
          startIcon={<DeleteForeverIcon />}
          onClick={() => setConfirmWipe(true)}
          disabled={wiping || !tenantId}
        >
          Excluir todos os dados
        </Button>
      </Box>

      <ConfirmDialog
        open={confirmRemoveBg}
        title="Retirar imagem?"
        message="A imagem de fundo será removida. Você poderá carregar outra depois."
        onConfirm={confirmRemoveBgImage}
        onCancel={() => setConfirmRemoveBg(false)}
      />

      <ConfirmDialog
        open={confirmWipe}
        title="Excluir todos os dados?"
        message={`Esta ação apaga permanentemente o banco deste administrador${tenant?.adminEmail ? ` (${tenant.adminEmail})` : ''}: unidades, gerentes, professores, responsáveis, crianças, presença, chats e aparência. Não dá para desfazer. Você será desconectado.`}
        onConfirm={handleWipeAllData}
        onCancel={() => !wiping && setConfirmWipe(false)}
      />
    </Box>
  )
}
