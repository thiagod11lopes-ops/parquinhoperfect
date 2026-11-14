import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import logoParquinho from '../assets/logo-parquinho.webp'

const AppearanceContext = createContext(null)
const STORAGE_KEY = 'parquinhoAppearance'

export const LOGO_PRESETS = [
  { id: 'parquinho', label: 'Logo Parquinho', src: logoParquinho },
]

export const FONT_OPTIONS = [
  { id: 'comic', label: 'Comic Sans', stack: "'Comic Sans MS', 'Comic Sans', cursive" },
  { id: 'nunito', label: 'Nunito', stack: "'Nunito', sans-serif" },
  { id: 'poppins', label: 'Poppins', stack: "'Poppins', sans-serif" },
  { id: 'fredoka', label: 'Fredoka', stack: "'Fredoka', sans-serif" },
  { id: 'quicksand', label: 'Quicksand', stack: "'Quicksand', sans-serif" },
  { id: 'rubik', label: 'Rubik', stack: "'Rubik', sans-serif" },
  { id: 'comfortaa', label: 'Comfortaa', stack: "'Comfortaa', cursive" },
  { id: 'outfit', label: 'Outfit', stack: "'Outfit', sans-serif" },
  { id: 'baloo', label: 'Baloo 2', stack: "'Baloo 2', cursive" },
  { id: 'caveat', label: 'Caveat', stack: "'Caveat', cursive" },
  { id: 'space', label: 'Space Grotesk', stack: "'Space Grotesk', sans-serif" },
  { id: 'dm', label: 'DM Sans', stack: "'DM Sans', sans-serif" },
]

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

/** Relative luminance 0–1 for #rrggbb */
function hexLuminance(hex) {
  const h = String(hex || '#000000').replace('#', '')
  if (h.length < 6) return 0
  const toLin = (n) => {
    const c = parseInt(n, 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * toLin(h.slice(0, 2)) + 0.7152 * toLin(h.slice(2, 4)) + 0.0722 * toLin(h.slice(4, 6))
}

/** Font + shadow that stay readable on a given surface color */
function readableFontPair(surfaceHex) {
  if (hexLuminance(surfaceHex) > 0.58) {
    return { fontColor: '#0f172a', fontShadowColor: '#f8fafc' }
  }
  return { fontColor: '#ffffff', fontShadowColor: '#0f172a' }
}

function buildTheme({
  id, name, accent, accentDeep, panelColor, sidebarColor, buttonColor,
  bgMode, bgColor, bgGradient, bgImagePreset,
}) {
  const panelHex = panelColor || accent
  const panel = hexToPanel(panelHex)
  const fontPair = readableFontPair(panelHex)
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
    bgImagePreset: 'parquinho',
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
    bgImagePreset: 'parquinho',
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
    bgImagePreset: 'parquinho',
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
    bgImagePreset: 'parquinho',
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
    bgImagePreset: 'parquinho',
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
    bgImagePreset: 'parquinho',
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
    bgImagePreset: 'parquinho',
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
    bgImagePreset: 'parquinho',
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
    bgImagePreset: 'parquinho',
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
    bgImagePreset: 'parquinho',
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
    bgImagePreset: 'parquinho',
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
    bgImagePreset: 'parquinho',
  }),
]

function logoSrcById(id) {
  return LOGO_PRESETS.find((l) => l.id === id)?.src || logoParquinho
}

function fontStackById(id) {
  return FONT_OPTIONS.find((f) => f.id === id)?.stack || FONT_OPTIONS[0].stack
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
    fontColor: theme.fontColor || '#ffffff',
    fontShadowColor: theme.fontShadowColor || '#0f172a',
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
    fontId: 'comic',
  }
}

function sanitizeLogoPreset(id) {
  return LOGO_PRESETS.some((l) => l.id === id) ? id : 'parquinho'
}

function loadAppearance() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultAppearance()
    const parsed = JSON.parse(raw)
    const next = { ...defaultAppearance(), ...parsed }
    next.logoPreset = sanitizeLogoPreset(next.logoPreset)
    next.bgImagePreset = sanitizeLogoPreset(next.bgImagePreset)
    return next
  } catch {
    return defaultAppearance()
  }
}

function persistAppearance(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
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
      const next = { ...prev, ...patch }
      persistAppearance(next)
      return next
    })
  }, [])

  const applyTheme = useCallback((themeId) => {
    const theme = SYSTEM_THEMES.find((t) => t.id === themeId)
    if (!theme) return
    // Aplica todas as cores/áreas do tema; mantém a fonte tipográfica escolhida
    // Aplica todas as cores/áreas; não altera a tipografia escolhida
    update(themeToAppearancePatch(theme))
  }, [update])

  const resetAppearance = useCallback(() => {
    const next = defaultAppearance()
    persistAppearance(next)
    setAppearance(next)
  }, [])

  const logoSrc = appearance.logoCustom || logoSrcById(appearance.logoPreset)
  const bgImageSrc = appearance.bgImageCustom || null
  const hasBgImage = Boolean(appearance.bgImageCustom)
  const fontStack = fontStackById(appearance.fontId)

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

    const zoom = Math.min(250, Math.max(40, Number(appearance.bgZoom) || 100))
    const posX = Math.min(100, Math.max(0, Number(appearance.bgPosX) ?? 50))
    const posY = Math.min(100, Math.max(0, Number(appearance.bgPosY) ?? 50))
    const opacityPct = Math.min(100, Math.max(0, Number(appearance.bgOpacity) ?? 100))
    const logoZoom = Math.min(160, Math.max(30, Number(appearance.logoZoom) || 100))
    const logoOpacity = Math.min(100, Math.max(0, Number(appearance.logoOpacity) ?? 100))

    const fontColor = appearance.fontColor || '#ffffff'
    const fontShadow = appearance.fontShadowColor || '#000000'

    const panelColor = appearance.panelColor || panelToHex(appearance.panel, appearance.accent)
    const panel = appearance.panel || hexToPanel(panelColor)
    // Abas/menu seguem a cor de fundo escolhida
    const sidebarColor = bgColor || appearance.sidebarColor || appearance.accent
    const buttonColor = appearance.buttonColor || appearance.accent

    return {
      '--app-accent': appearance.accent,
      '--app-accent-deep': appearance.accentDeep,
      '--app-panel': panel,
      '--app-panel-color': panelColor,
      '--app-sidebar': sidebarColor,
      '--app-button': buttonColor,
      '--app-bg-color': bgColor,
      '--app-bg-image': bgImage,
      '--app-bg-size': hasBgImage ? `${zoom}%` : 'cover',
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
  }

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  )
}
