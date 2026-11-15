import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import logoParquinho from '../assets/logo-parquinho.webp'
import fundoSoftplay from '../assets/fundo-softplay.webp'
import fundoBrand from '../assets/fundo-brand.webp'
import fundoParque from '../assets/fundo-parque.webp'
import fundoBolinhas from '../assets/fundo-bolinhas.webp'
import { syncedStorage } from '../firebase/syncedStorage'

const AppearanceContext = createContext(null)
const STORAGE_KEY = 'parquinhoAppearance'

export const LOGO_PRESETS = [
  { id: 'parquinho', label: 'Logo Parquinho', src: logoParquinho },
]

export const BG_PRESETS = [
  { id: 'softplay', label: 'Soft play', src: fundoSoftplay },
  { id: 'brand', label: 'Parquinho Perfect', src: fundoBrand },
  { id: 'parque', label: 'Parque', src: fundoParque },
  { id: 'bolinhas', label: 'Piscina de bolinhas', src: fundoBolinhas },
]

export const SYSTEM_FONT_ID = 'comfortaa'
export const SYSTEM_FONT_STACK = "'Comfortaa', cursive"
export const SYSTEM_FONT_COLOR = '#ffffff'
export const SYSTEM_FONT_SHADOW_COLOR = '#000000'

/** Mantido só para compatibilidade; a tipografia do app é sempre Comfortaa. */
export const FONT_OPTIONS = [
  { id: SYSTEM_FONT_ID, label: 'Comfortaa', stack: SYSTEM_FONT_STACK },
]

function lockedFontColors() {
  return {
    fontColor: SYSTEM_FONT_COLOR,
    fontShadowColor: SYSTEM_FONT_SHADOW_COLOR,
  }
}

/** Hex #rrggbb → panel rgba/hex with ~50% opacity for CSS backgrounds */
export function hexToPanel(hex) {
  const h = String(hex || '#f97316').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(h)) return `${h}80`
  return h
}

/** Extract #rrggbb from panel string (hex8 or rgba) */
export function panelToHex(panel, fallback = '#f97316') {
  const p = String(panel || '')
  if (/^#[0-9a-fA-F]{6}/.test(p)) return p.slice(0, 7).toLowerCase()
  const m = p.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (m) {
    const h = (n) => Number(n).toString(16).padStart(2, '0')
    return `#${h(m[1])}${h(m[2])}${h(m[3])}`
  }
  return fallback
}

function buildTheme({
  id, name, accent, accentDeep, panelColor, sidebarColor, buttonColor,
  bgMode, bgColor, bgGradient, bgImagePreset,
}) {
  const panelHex = panelColor || accent
  const panel = hexToPanel(panelHex)
  const fontPair = lockedFontColors()
  return {
    id,
    name,
    accent,
    accentDeep,
    panelColor: panelHex,
    panel,
    sidebarColor: sidebarColor || accent,
    buttonColor: buttonColor || accentDeep || accent,
    bgMode,
    bgColor,
    bgGradient,
    bgImagePreset,
    ...fontPair,
  }
}

export const SYSTEM_THEMES = [
  buildTheme({
    id: 'laranja-classic',
    name: 'Laranja Classic',
    accent: '#f97316',
    accentDeep: '#c2410c',
    panelColor: '#ea580c',
    sidebarColor: '#f97316',
    buttonColor: '#ea580c',
    bgMode: 'image',
    bgColor: '#fb923c',
    bgGradient: 'linear-gradient(160deg, #fdba74, #f97316 45%, #c2410c)',
    bgImagePreset: null,
  }),
  buildTheme({
    id: 'sol-tropical',
    name: 'Sol Tropical',
    accent: '#f59e0b',
    accentDeep: '#b45309',
    panelColor: '#d97706',
    sidebarColor: '#f59e0b',
    buttonColor: '#ea580c',
    bgMode: 'image',
    bgColor: '#fbbf24',
    bgGradient: 'linear-gradient(160deg, #fde68a, #f59e0b 55%, #ea580c)',
    bgImagePreset: null,
  }),
  buildTheme({
    id: 'oceano',
    name: 'Oceano',
    accent: '#0ea5e9',
    accentDeep: '#0369a1',
    panelColor: '#0284c7',
    sidebarColor: '#0ea5e9',
    buttonColor: '#0284c7',
    bgMode: 'image',
    bgColor: '#0284c7',
    bgGradient: 'linear-gradient(160deg, #7dd3fc, #0ea5e9 50%, #0369a1)',
    bgImagePreset: null,
  }),
  buildTheme({
    id: 'floresta',
    name: 'Floresta',
    accent: '#22c55e',
    accentDeep: '#15803d',
    panelColor: '#16a34a',
    sidebarColor: '#22c55e',
    buttonColor: '#15803d',
    bgMode: 'image',
    bgColor: '#15803d',
    bgGradient: 'linear-gradient(160deg, #86efac, #22c55e 50%, #14532d)',
    bgImagePreset: null,
  }),
  buildTheme({
    id: 'uva',
    name: 'Uva',
    accent: '#a855f7',
    accentDeep: '#6b21a8',
    panelColor: '#7e22ce',
    sidebarColor: '#a855f7',
    buttonColor: '#7e22ce',
    bgMode: 'image',
    bgColor: '#6b21a8',
    bgGradient: 'linear-gradient(160deg, #e9d5ff, #a855f7 55%, #581c87)',
    bgImagePreset: null,
  }),
  buildTheme({
    id: 'rosa-chiclete',
    name: 'Rosa Chiclete',
    accent: '#ec4899',
    accentDeep: '#be185d',
    panelColor: '#db2777',
    sidebarColor: '#ec4899',
    buttonColor: '#be185d',
    bgMode: 'image',
    bgColor: '#be185d',
    bgGradient: 'linear-gradient(160deg, #fbcfe8, #ec4899 50%, #9d174d)',
    bgImagePreset: null,
  }),
  buildTheme({
    id: 'noite',
    name: 'Noite',
    accent: '#818cf8',
    accentDeep: '#312e81',
    panelColor: '#4338ca',
    sidebarColor: '#4f46e5',
    buttonColor: '#6366f1',
    bgMode: 'image',
    bgColor: '#1e1b4b',
    bgGradient: 'linear-gradient(160deg, #1e1b4b, #4338ca 55%, #6366f1)',
    bgImagePreset: null,
  }),
  buildTheme({
    id: 'menta',
    name: 'Menta',
    accent: '#14b8a6',
    accentDeep: '#0f766e',
    panelColor: '#0d9488',
    sidebarColor: '#14b8a6',
    buttonColor: '#0f766e',
    bgMode: 'image',
    bgColor: '#0f766e',
    bgGradient: 'linear-gradient(160deg, #99f6e4, #14b8a6 50%, #115e59)',
    bgImagePreset: null,
  }),
  buildTheme({
    id: 'cafe',
    name: 'Café',
    accent: '#b45309',
    accentDeep: '#78350f',
    panelColor: '#92400e',
    sidebarColor: '#a16207',
    buttonColor: '#854d0e',
    bgMode: 'image',
    bgColor: '#78350f',
    bgGradient: 'linear-gradient(160deg, #fcd34d, #a16207)',
    bgImagePreset: null,
  }),
  buildTheme({
    id: 'ceu',
    name: 'Céu',
    accent: '#3b82f6',
    accentDeep: '#1e40af',
    panelColor: '#2563eb',
    sidebarColor: '#3b82f6',
    buttonColor: '#1d4ed8',
    bgMode: 'image',
    bgColor: '#1d4ed8',
    bgGradient: 'linear-gradient(160deg, #93c5fd, #3b82f6 50%, #1e3a8a)',
    bgImagePreset: null,
  }),
  buildTheme({
    id: 'coral',
    name: 'Coral',
    accent: '#f43f5e',
    accentDeep: '#9f1239',
    panelColor: '#e11d48',
    sidebarColor: '#f43f5e',
    buttonColor: '#be123c',
    bgMode: 'image',
    bgColor: '#be123c',
    bgGradient: 'linear-gradient(160deg, #fecdd3, #f43f5e 55%, #9f1239)',
    bgImagePreset: null,
  }),
  buildTheme({
    id: 'limao',
    name: 'Limão',
    accent: '#65a30d',
    accentDeep: '#3f6212',
    panelColor: '#4d7c0f',
    sidebarColor: '#84cc16',
    buttonColor: '#65a30d',
    bgMode: 'image',
    bgColor: '#3f6212',
    bgGradient: 'linear-gradient(160deg, #bef264, #84cc16 50%, #3f6212)',
    bgImagePreset: null,
  }),
]

function logoSrcById(id) {
  return LOGO_PRESETS.find((l) => l.id === id)?.src || logoParquinho
}

function bgSrcById(id) {
  if (!id) return null
  return BG_PRESETS.find((b) => b.id === id)?.src || null
}

function fontStackById() {
  return SYSTEM_FONT_STACK
}

function themeToAppearancePatch(theme) {
  return {
    themeId: theme.id,
    accent: theme.accent,
    accentDeep: theme.accentDeep,
    panel: theme.panel,
    panelColor: theme.panelColor || panelToHex(theme.panel, theme.accent),
    sidebarColor: theme.sidebarColor || theme.accent,
    buttonColor: theme.buttonColor || theme.accent,
    bgMode: theme.bgMode,
    bgColor: theme.bgColor,
    bgGradient: theme.bgGradient,
    bgImagePreset: theme.bgImagePreset,
    bgImageCustom: null,
    bgExpanded: false,
    bgColorBeforeExpand: null,
    ...lockedFontColors(),
  }
}

function defaultAppearance() {
  const base = SYSTEM_THEMES[0]
  return {
    ...themeToAppearancePatch(base),
    bgZoom: 100,
    bgPosX: 50,
    bgPosY: 50,
    bgOpacity: 100,
    logoZoom: 100,
    logoOpacity: 100,
    logoPreset: 'parquinho',
    logoCustom: null,
    fontId: SYSTEM_FONT_ID,
  }
}

function sanitizeLogoPreset(id) {
  return LOGO_PRESETS.some((l) => l.id === id) ? id : 'parquinho'
}

function sanitizeBgPreset(id) {
  if (!id) return null
  return BG_PRESETS.some((b) => b.id === id) ? id : null
}

function loadAppearance() {
  try {
    const raw = syncedStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultAppearance()
    const parsed = JSON.parse(raw)
    const next = { ...defaultAppearance(), ...parsed }
    next.logoPreset = sanitizeLogoPreset(next.logoPreset)
    next.bgImagePreset = sanitizeBgPreset(next.bgImagePreset)
    next.fontId = SYSTEM_FONT_ID
    Object.assign(next, lockedFontColors())
    return next
  } catch {
    return defaultAppearance()
  }
}

function persistAppearance(next) {
  syncedStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('parquinho-appearance'))
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useAppearance must be used within AppearanceProvider')
  return ctx
}

export function AppearanceProvider({ children }) {
  const [appearance, setAppearance] = useState(() => loadAppearance())

  const reload = useCallback(() => setAppearance(loadAppearance()), [])

  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || e.key === STORAGE_KEY) reload()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('parquinho-appearance', reload)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('parquinho-appearance', reload)
    }
  }, [reload])

  const update = useCallback((patch) => {
    setAppearance((prev) => {
      const next = {
        ...prev,
        ...patch,
        fontId: SYSTEM_FONT_ID,
        ...lockedFontColors(),
      }
      persistAppearance(next)
      return next
    })
  }, [])

  const applyTheme = useCallback((themeId) => {
    const theme = SYSTEM_THEMES.find((t) => t.id === themeId)
    if (!theme) return
    update({
      ...themeToAppearancePatch(theme),
      fontId: SYSTEM_FONT_ID,
      ...lockedFontColors(),
    })
  }, [update])

  const resetAppearance = useCallback(() => {
    const next = defaultAppearance()
    persistAppearance(next)
    setAppearance(next)
  }, [])

  const logoSrc = appearance.logoCustom || logoSrcById(appearance.logoPreset)
  const bgImageSrc = appearance.bgImageCustom || bgSrcById(appearance.bgImagePreset)
  const hasBgImage = Boolean(bgImageSrc)
  const fontStack = fontStackById()

  const cssVars = useMemo(() => {
    let bgImage = 'none'
    let bgColor = appearance.bgColor || appearance.accent || '#f97316'

    if (hasBgImage && bgImageSrc) {
      bgImage = `url(${bgImageSrc})`
      bgColor = appearance.bgColor || '#f97316'
    } else if (appearance.bgMode === 'gradient' && !hasBgImage) {
      bgImage = appearance.bgGradient || `linear-gradient(160deg, ${appearance.accent}, ${appearance.accentDeep})`
      bgColor = appearance.bgColor || appearance.accent
    } else {
      bgImage = 'none'
      bgColor = appearance.bgColor || appearance.accent
    }

    const zoomRaw = Number(appearance.bgZoom)
    const zoom = Math.min(250, Math.max(40, Number.isFinite(zoomRaw) ? zoomRaw : 100))
    const posXRaw = Number(appearance.bgPosX)
    const posYRaw = Number(appearance.bgPosY)
    const posX = Math.min(100, Math.max(0, Number.isFinite(posXRaw) ? posXRaw : 50))
    const posY = Math.min(100, Math.max(0, Number.isFinite(posYRaw) ? posYRaw : 50))
    const opacityRaw = Number(appearance.bgOpacity)
    const opacityPct = Math.min(100, Math.max(0, Number.isFinite(opacityRaw) ? opacityRaw : 100))
    const logoZoomRaw = Number(appearance.logoZoom)
    const logoZoom = Math.min(160, Math.max(30, Number.isFinite(logoZoomRaw) ? logoZoomRaw : 100))
    const logoOpacityRaw = Number(appearance.logoOpacity)
    const logoOpacity = Math.min(100, Math.max(0, Number.isFinite(logoOpacityRaw) ? logoOpacityRaw : 100))

    const fontColor = SYSTEM_FONT_COLOR
    const fontShadow = SYSTEM_FONT_SHADOW_COLOR

    const panelColor = appearance.panelColor || panelToHex(appearance.panel, appearance.accent)
    const panel = appearance.panel || hexToPanel(panelColor)
    // Abas/menu seguem a cor de fundo escolhida
    const sidebarColor = bgColor || appearance.sidebarColor || appearance.accent
    const buttonColor = appearance.buttonColor || appearance.accent

    // Em 100%, "cover" permite pan horizontal/vertical.
    // Com "100%" a largura cola no container e a barra esquerda/direita não move a imagem.
    const bgSize = !hasBgImage
      ? 'cover'
      : (zoom === 100 ? 'cover' : `${zoom}%`)

    return {
      '--app-accent': appearance.accent,
      '--app-accent-deep': appearance.accentDeep,
      '--app-panel': panel,
      '--app-panel-color': panelColor,
      '--app-sidebar': sidebarColor,
      '--app-button': buttonColor,
      '--app-bg-color': bgColor,
      '--app-bg-image': bgImage,
      '--app-bg-size': bgSize,
      '--app-bg-pos': hasBgImage ? `${posX}% ${posY}%` : 'center center',
      '--app-bg-opacity': String(opacityPct / 100),
      '--app-font': fontStack,
      '--app-font-color': fontColor,
      '--app-font-shadow': fontShadow,
      '--app-font-shadow-stack': `0 1px 2px ${fontShadow}, 0 0 4px ${fontShadow}, 1px 1px 0 ${fontShadow}`,
      '--app-logo': `url(${logoSrc})`,
      '--app-logo-scale': String(logoZoom / 100),
      '--app-logo-opacity': String(logoOpacity / 100),
    }
  }, [appearance, bgImageSrc, fontStack, hasBgImage, logoSrc])

  useEffect(() => {
    const root = document.getElementById('phone-app-root')
    if (!root) return undefined
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
    root.style.fontFamily = fontStack
    return undefined
  }, [cssVars, fontStack])

  const value = {
    appearance,
    update,
    applyTheme,
    resetAppearance,
    logoSrc,
    bgImageSrc,
    hasBgImage,
    fontStack,
    cssVars,
    themes: SYSTEM_THEMES,
    fonts: FONT_OPTIONS,
    logos: LOGO_PRESETS,
    backgrounds: BG_PRESETS,
  }

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  )
}
