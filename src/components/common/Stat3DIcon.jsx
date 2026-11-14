import React from 'react'
import { Box } from '@mui/material'

const ICONS = {
  children: (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id="gChildrenBodyBlue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A5B4FC" />
          <stop offset="55%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#312E81" />
        </linearGradient>
        <linearGradient id="gChildrenHeadBlue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E0E7FF" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
        <linearGradient id="gChildrenBodyPink" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FECDD3" />
          <stop offset="55%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#9F1239" />
        </linearGradient>
        <linearGradient id="gChildrenHeadPink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE4E6" />
          <stop offset="100%" stopColor="#FB7185" />
        </linearGradient>
        <filter id="shadowChildren" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#1E1B4B" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter="url(#shadowChildren)">
        <ellipse cx="32" cy="54" rx="18" ry="4" fill="rgba(0,0,0,0.18)" />
        {/* Boneco azul */}
        <path d="M10 48c0-9 4.8-14.5 11-14.5S32 39 32 48" fill="url(#gChildrenBodyBlue)" />
        <circle cx="21" cy="23" r="8.5" fill="url(#gChildrenHeadBlue)" />
        <circle cx="18.2" cy="22.2" r="1.3" fill="#1E1B4B" />
        <circle cx="23.8" cy="22.2" r="1.3" fill="#1E1B4B" />
        <path d="M18.5 26.2c1 1.2 4 1.2 5 0" stroke="#1E1B4B" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {/* Boneco rosa ao lado */}
        <path d="M32 48c0-9 4.8-14.5 11-14.5S54 39 54 48" fill="url(#gChildrenBodyPink)" />
        <circle cx="43" cy="23" r="8.5" fill="url(#gChildrenHeadPink)" />
        <circle cx="40.2" cy="22.2" r="1.3" fill="#881337" />
        <circle cx="45.8" cy="22.2" r="1.3" fill="#881337" />
        <path d="M40.5 26.2c1 1.2 4 1.2 5 0" stroke="#881337" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  ),
  staff: (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id="gStaffA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDA4AF" />
          <stop offset="50%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#9F1239" />
        </linearGradient>
        <linearGradient id="gStaffB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FECDD3" />
          <stop offset="100%" stopColor="#FB7185" />
        </linearGradient>
        <filter id="shadowStaff" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#881337" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter="url(#shadowStaff)">
        <ellipse cx="32" cy="54" rx="18" ry="4" fill="rgba(0,0,0,0.18)" />
        <circle cx="20" cy="24" r="7" fill="url(#gStaffB)" />
        <path d="M10 48c0-7 4.5-12 10-12s10 5 10 12" fill="url(#gStaffB)" />
        <circle cx="44" cy="24" r="7" fill="url(#gStaffB)" />
        <path d="M34 48c0-7 4.5-12 10-12s10 5 10 12" fill="url(#gStaffB)" />
        <circle cx="32" cy="20" r="9" fill="url(#gStaffA)" />
        <path d="M20 50c0-9 5.5-15 12-15s12 6 12 15" fill="url(#gStaffA)" />
      </g>
    </svg>
  ),
  attendance: (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id="gAttRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#86EFAC" />
          <stop offset="45%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#14532D" />
        </linearGradient>
        <linearGradient id="gAttCheck" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#BBF7D0" />
        </linearGradient>
        <filter id="shadowAtt" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#14532D" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter="url(#shadowAtt)">
        <ellipse cx="32" cy="54" rx="16" ry="4" fill="rgba(0,0,0,0.18)" />
        <circle cx="32" cy="30" r="18" fill="url(#gAttRing)" />
        <circle cx="32" cy="30" r="12" fill="rgba(255,255,255,0.18)" />
        <path
          d="M23 30.5l6 6 12-13"
          fill="none"
          stroke="url(#gAttCheck)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  ),
  activities: (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id="gActBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
        <linearGradient id="gActTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
        <filter id="shadowAct" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#78350F" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter="url(#shadowAct)">
        <ellipse cx="32" cy="54" rx="16" ry="4" fill="rgba(0,0,0,0.18)" />
        <rect x="14" y="18" width="36" height="30" rx="6" fill="url(#gActBody)" />
        <rect x="14" y="18" width="36" height="10" rx="6" fill="url(#gActTop)" />
        <rect x="22" y="14" width="4" height="10" rx="2" fill="#FDE68A" />
        <rect x="38" y="14" width="4" height="10" rx="2" fill="#FDE68A" />
        <rect x="20" y="34" width="10" height="3.5" rx="1.5" fill="rgba(255,255,255,0.75)" />
        <rect x="20" y="40" width="16" height="3.5" rx="1.5" fill="rgba(255,255,255,0.55)" />
      </g>
    </svg>
  ),
}

const THEMES = {
  children: { from: '#818CF8', to: '#4338CA' },
  staff: { from: '#FB7185', to: '#E11D48' },
  attendance: { from: '#4ADE80', to: '#15803D' },
  activities: { from: '#FBBF24', to: '#D97706' },
}

export default function Stat3DIcon({ name = 'children' }) {
  const theme = THEMES[name] || THEMES.children

  return (
    <Box
      className="stat-icon-3d"
      sx={{
        '--icon-from': theme.from,
        '--icon-to': theme.to,
      }}
    >
      <Box className="stat-icon-3d-inner">
        {ICONS[name] || ICONS.children}
      </Box>
    </Box>
  )
}
