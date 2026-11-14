import React, { useMemo } from 'react'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { ptBR as corePtBR } from '@mui/material/locale'
import { ptBR as dataGridPtBR } from '@mui/x-data-grid/locales'

export function ThemeContextProvider({ children }) {
  const getPhoneContainer = () => document.getElementById('phone-app-root') || document.body

  const theme = useMemo(() => createTheme({
    // Força layout mobile mesmo com o simulador aberto no desktop
    breakpoints: {
      values: { xs: 0, sm: 10000, md: 10000, lg: 10000, xl: 10000 },
    },
    palette: {
      mode: 'light',
      primary:   { main: '#6C63FF', dark: '#5A52D5', light: '#EEF0FF', contrastText: '#fff' },
      secondary: { main: '#FF6584', light: '#FFF0F3', contrastText: '#fff' },
      success:   { main: '#22C55E', light: '#DCFCE7' },
      warning:   { main: '#F59E0B', light: '#FEF3C7' },
      error:     { main: '#EF4444', light: '#FEE2E2' },
      info:      { main: '#3B82F6', light: '#DBEAFE' },
      background: { default: 'transparent', paper: '#ffffff' },
      text: { primary: '#0F172A', secondary: '#64748B' },
      divider: 'rgba(0,0,0,0.07)',
    },
    typography: {
      fontFamily: "var(--app-font, 'Comic Sans MS', 'Comic Sans', cursive)",
      h1: { fontWeight: 800, letterSpacing: '-0.03em' },
      h2: { fontWeight: 800, letterSpacing: '-0.03em' },
      h3: { fontWeight: 700, letterSpacing: '-0.02em' },
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.01em' },
      h6: { fontWeight: 700, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: { borderRadius: 12 },
    shadows: [
      'none',
      '0 1px 2px rgba(0,0,0,0.05)',
      '0 1px 3px rgba(0,0,0,0.08)',
      '0 4px 6px rgba(0,0,0,0.05)',
      '0 4px 6px rgba(0,0,0,0.07)',
      '0 10px 15px rgba(0,0,0,0.07)',
      '0 10px 15px rgba(0,0,0,0.08)',
      '0 20px 25px rgba(0,0,0,0.08)',
      '0 20px 25px rgba(0,0,0,0.10)',
      ...Array(16).fill('0 20px 25px rgba(0,0,0,0.10)'),
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { scrollBehavior: 'smooth', overflow: 'hidden' },
          '#root': { minHeight: '100vh' },
        },
      },
      MuiModal: {
        defaultProps: { container: getPhoneContainer },
      },
      MuiPopover: {
        defaultProps: { container: getPhoneContainer },
      },
      MuiPopper: {
        defaultProps: { container: getPhoneContainer },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 10,
            transition: 'all 0.2s ease',
          },
          contained: {
            boxShadow: 'none',
            '&:hover': { boxShadow: '0 4px 12px rgba(108,99,255,0.3)', transform: 'translateY(-1px)' },
            '&:active': { transform: 'translateY(0)' },
          },
          outlined: {
            '&:hover': { transform: 'translateY(-1px)' },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundColor: 'var(--app-panel, rgba(249, 115, 22, 0.5))',
            backgroundImage: 'none',
            opacity: 1,
            color: 'var(--app-font-color, #ffffff)',
            textShadow: 'var(--app-font-shadow-stack, 0 1px 2px #000, 0 0 4px #000, 1px 1px 0 #000)',
            borderColor: 'rgba(0,0,0,0.12)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            '& .MuiTypography-root': {
              color: 'var(--app-font-color, #ffffff)',
              textShadow: 'var(--app-font-shadow-stack, 0 1px 2px #000, 0 0 4px #000, 1px 1px 0 #000)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: '#ffffff',
          },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              transition: 'all 0.2s ease',
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6C63FF' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 2 },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, fontSize: '0.75rem' },
        },
      },
      MuiDialog: {
        defaultProps: {
          fullWidth: true,
          maxWidth: 'sm',
          PaperProps: { sx: { m: 1.5, width: 'calc(100% - 24px)', maxHeight: 'calc(100% - 24px)' } },
        },
        styleOverrides: {
          paper: {
            borderRadius: 16,
            backgroundImage: 'none',
            backgroundColor: '#ffffff',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { fontWeight: 700, fontSize: '1.125rem', padding: '20px 24px 12px' },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: { padding: '12px 24px' },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: { padding: '12px 24px 20px', gap: 8 },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 700,
              fontSize: '0.8125rem',
              letterSpacing: '0.02em',
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': { backgroundColor: 'rgba(108,99,255,0.03)' },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { fontWeight: 600, textTransform: 'none', fontSize: '0.9rem' },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: { borderRadius: 8, transition: 'all 0.15s ease' },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: '1px solid rgba(0,0,0,0.07)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderBottom: '1px solid rgba(0,0,0,0.07)',
          },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: 'none',
            borderRadius: 16,
            '& .MuiDataGrid-columnHeaders': { fontWeight: 700, fontSize: '0.8125rem' },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'rgba(108,99,255,0.04)',
            },
            '& .MuiDataGrid-cell': { borderColor: 'rgba(0,0,0,0.05)' },
            '& .MuiDataGrid-columnSeparator': { display: 'none' },
          },
        },
      },
    },
  }, corePtBR, dataGridPtBR), [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}
