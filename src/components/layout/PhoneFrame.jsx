import React, { useEffect, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { useAppearance } from '../../context/AppearanceContext'

/** Simulador de celular só em desktop (mouse/trackpad + tela larga). */
function useDesktopPhoneSim() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)')
    const apply = () => setEnabled(mq.matches)
    apply()
    if (mq.addEventListener) mq.addEventListener('change', apply)
    else mq.addListener(apply)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', apply)
      else mq.removeListener(apply)
    }
  }, [])

  return enabled
}

export default function PhoneFrame({ children }) {
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const { cssVars, fontStack } = useAppearance()
  const screenRef = useRef(null)
  const simulatePhone = useDesktopPhoneSim()

  useEffect(() => {
    const root = screenRef.current
    if (!root) return
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
    root.style.fontFamily = fontStack
  }, [cssVars, fontStack])

  return (
    <Box className={`phone-stage ${simulatePhone ? 'is-desktop-sim' : 'is-native'}`}>
      <Box
        className={`phone-device ${simulatePhone ? '' : 'is-native'}`}
        aria-label={simulatePhone ? 'Simulador de celular' : undefined}
      >
        {simulatePhone && (
          <>
            <Box className="phone-notch" aria-hidden />
            <Box className="phone-status-bar" aria-hidden>
              <Typography component="span" className="phone-status-time">{now}</Typography>
              <Box className="phone-status-icons">
                <span className="phone-signal" />
                <span className="phone-wifi" />
                <span className="phone-battery" />
              </Box>
            </Box>
          </>
        )}
        <Box
          id="phone-app-root"
          ref={screenRef}
          className="phone-screen"
          style={cssVars}
        >
          {children}
        </Box>
        {simulatePhone && <Box className="phone-home-indicator" aria-hidden />}
      </Box>
    </Box>
  )
}
