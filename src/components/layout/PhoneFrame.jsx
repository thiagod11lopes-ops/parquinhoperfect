import React, { useEffect, useRef } from 'react'
import { Box, Typography } from '@mui/material'
import { useAppearance } from '../../context/AppearanceContext'

export default function PhoneFrame({ children }) {
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const { cssVars, fontStack } = useAppearance()
  const screenRef = useRef(null)

  useEffect(() => {
    const root = screenRef.current
    if (!root) return
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
    root.style.fontFamily = fontStack
  }, [cssVars, fontStack])

  return (
    <Box className="phone-stage">
      <Box className="phone-device" aria-label="Simulador de celular">
        <Box className="phone-notch" aria-hidden />
        <Box className="phone-status-bar" aria-hidden>
          <Typography component="span" className="phone-status-time">{now}</Typography>
          <Box className="phone-status-icons">
            <span className="phone-signal" />
            <span className="phone-wifi" />
            <span className="phone-battery" />
          </Box>
        </Box>
        <Box
          id="phone-app-root"
          ref={screenRef}
          className="phone-screen"
          style={cssVars}
        >
          {children}
        </Box>
        <Box className="phone-home-indicator" aria-hidden />
      </Box>
    </Box>
  )
}
