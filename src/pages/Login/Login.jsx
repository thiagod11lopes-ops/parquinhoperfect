import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box, Typography, Button, TextField, IconButton, Alert, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'
import GroupIcon from '@mui/icons-material/Group'
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import { useAppearance } from '../../context/AppearanceContext'
import { useSampleData } from '../../context/SampleDataContext'
import AdminOnboarding from '../Onboarding/AdminOnboarding'
import logoSplash from '../../assets/logo-splash.webp'
import '../../styles/global.scss'

function GoogleIcon() {
  return (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 20, height: 20, mr: 1.25, flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Box>
  )
}

const getPhoneContainer = () => document.getElementById('phone-app-root') || document.body

const ROLE_LABEL = {
  gerente: 'Gerente',
  professor: 'Professor',
  responsavel: 'Responsável',
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    loginWithEmail,
    loginAdminAfterCreate,
    activateAndLogin,
    logout,
    isAuthenticated,
    homeRoute,
  } = useAuth()
  const { createAdminTenant, activateInvite } = useTenant()
  const { resetAppearance } = useAppearance()
  const { enabled: sampleEnabled, toggleSampleData } = useSampleData()
  const splashDone = useRef(false)

  const [phase, setPhase] = useState('splash')
  const [role, setRole] = useState(null)
  const [email, setEmail] = useState('')
  const [adminName, setAdminName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [invite, setInvite] = useState(null)

  useEffect(() => {
    // Só limpa sessão antiga ao abrir o login — não durante o onboarding da 1ª vez
    if (isAuthenticated && phase !== 'onboarding') logout()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (splashDone.current) return
      splashDone.current = true
      setPhase('choose')
    }, 2200)
    return () => clearTimeout(t)
  }, [])

  const goBack = () => {
    setError('')
    setEmail('')
    setAdminName('')
    setInvite(null)
    setRole(null)
    setPhase('choose')
  }

  const afterLogin = (roleHome) => {
    navigate(location.state?.from || roleHome || homeRoute || '/dashboard', { replace: true })
  }

  const openRole = (nextRole) => {
    setError('')
    setEmail('')
    setAdminName('')
    setRole(nextRole)
    setPhase('email')
  }

  const handleContinue = async () => {
    setError('')
    setLoading(true)
    try {
      if (role === 'administrador') {
        const result = await loginWithEmail('administrador', { email, name: adminName })
        if (result.needsAdminCreate) {
          const created = createAdminTenant(result.email, result.name)
          if (!created.success) {
            setError(created.error || 'Não foi possível criar o banco.')
            return
          }
          // Banco novo: sem dados de exemplo e aparência padrão limpa
          resetAppearance()
          if (sampleEnabled) toggleSampleData()
          localStorage.setItem('sampleDataEnabled', 'false')
          loginAdminAfterCreate(created.tenant, result.email, result.name)
          setPhase('onboarding')
          return
        }
        if (result.success) {
          afterLogin(result.homeRoute)
          return
        }
        setError(result.error || 'Não foi possível entrar.')
        return
      }

      const result = await loginWithEmail(role, { email })
      if (result.needsStart && result.invite) {
        setInvite(result.invite)
        return
      }
      if (result.success) {
        afterLogin(result.homeRoute)
        return
      }
      setError(result.error || 'Não foi possível entrar.')
    } catch {
      setError('Falha no login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartInvite = () => {
    if (!invite?.email) return
    const activated = activateInvite(invite.email)
    if (!activated.success) {
      setError(activated.error || 'Não foi possível iniciar.')
      setInvite(null)
      return
    }
    const logged = activateAndLogin(activated.access)
    if (logged.success) afterLogin(logged.homeRoute)
  }

  if (phase === 'onboarding') {
    return (
      <AdminOnboarding
        onComplete={() => afterLogin('/dashboard')}
      />
    )
  }

  return (
    <Box className={`access-gate ${phase === 'splash' ? 'is-splash' : 'is-ready'}`}>
      <Box className="access-gate-bg" aria-hidden />
      <Box className="access-gate-glow" aria-hidden />

      {phase === 'splash' ? (
        <Box className="access-splash">
          <Box className="access-splash-logo-wrap">
            <Box component="img" src={logoSplash} alt="Parquinho" className="access-splash-logo" />
            <Box className="access-splash-ring" aria-hidden />
            <Box className="access-splash-shimmer" aria-hidden />
          </Box>
          <Typography className="access-splash-brand">Parquinho Perfect Body</Typography>
          <Box className="access-splash-loader"><span /><span /><span /></Box>
        </Box>
      ) : (
        <Box className="access-panel">
          <Box className="access-panel-mark">
            <Box component="img" src={logoSplash} alt="" className="access-panel-logo" />
          </Box>

          {phase === 'choose' && (
            <Box className="access-choose">
              <Typography className="access-title">Como deseja entrar?</Typography>
              <Typography className="access-sub">
                Use o e-mail cadastrado na sua hierarquia
              </Typography>

              <Button fullWidth disableElevation className="access-role-btn access-role-btn--admin"
                onClick={() => openRole('administrador')} startIcon={<AdminPanelSettingsIcon />}>
                Administrador
              </Button>
              <Button fullWidth disableElevation className="access-role-btn access-role-btn--gerente"
                onClick={() => openRole('gerente')} startIcon={<SupervisorAccountIcon />}>
                Gerente
              </Button>
              <Button fullWidth disableElevation className="access-role-btn access-role-btn--professor"
                onClick={() => openRole('professor')} startIcon={<GroupIcon />}>
                Professor
              </Button>
              <Button fullWidth disableElevation className="access-role-btn access-role-btn--responsavel"
                onClick={() => openRole('responsavel')} startIcon={<FamilyRestroomIcon />}>
                Responsável
              </Button>
            </Box>
          )}

          {phase === 'email' && (
            <Box className="access-professor">
              <IconButton className="access-back-btn" onClick={goBack} aria-label="Voltar" size="small">
                <ArrowBackIcon fontSize="small" />
              </IconButton>

              <Typography className="access-title">
                {role === 'administrador' ? 'Administrador' : ROLE_LABEL[role]}
              </Typography>
              <Typography className="access-sub">
                {role === 'administrador'
                  ? 'Na primeira vez, este e-mail cria o seu banco de dados.'
                  : 'Informe o e-mail que foi cadastrado para você.'}
              </Typography>

              {error && <Alert severity="error" className="access-alert">{error}</Alert>}

              {role === 'administrador' && (
                <TextField
                  fullWidth
                  label="Seu nome"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="access-field"
                  sx={{ mb: 1.5 }}
                />
              )}

              <TextField
                fullWidth
                label="E-mail"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                className="access-field"
                sx={{ mb: 1.5 }}
                autoFocus
              />

              <Button
                fullWidth
                className="access-google-btn"
                onClick={handleContinue}
                disabled={loading || !email.trim()}
              >
                {loading ? <CircularProgress size={22} /> : (<><GoogleIcon /> Continuar com Google</>)}
              </Button>
            </Box>
          )}
        </Box>
      )}

      <Dialog
        open={Boolean(invite)}
        onClose={() => setInvite(null)}
        container={getPhoneContainer}
        fullWidth
        maxWidth="xs"
        PaperProps={{ className: 'invite-start-paper' }}
      >
        <DialogTitle className="invite-start-title">Convite encontrado</DialogTitle>
        <DialogContent>
          <Typography className="invite-start-text">
            O e-mail <strong>{invite?.email}</strong> foi cadastrado pelo administrador
            {' '}<strong>{invite?.adminName || invite?.adminEmail}</strong>.
          </Typography>
          {invite?.unitName && (
            <Typography className="invite-start-text" sx={{ mt: 1 }}>
              Unidade: <strong>{invite.unitName}</strong>
            </Typography>
          )}
          <Typography className="invite-start-text" sx={{ mt: 1 }}>
            Papel: <strong>{ROLE_LABEL[invite?.role] || invite?.role}</strong>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setInvite(null)}>Cancelar</Button>
          <Button
            variant="contained"
            className="btn-orange-card"
            startIcon={<RocketLaunchIcon />}
            onClick={handleStartInvite}
          >
            Iniciar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
