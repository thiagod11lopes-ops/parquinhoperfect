import React, { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box, Container, Card, CardContent, Typography, TextField,
  Button, Link, Alert, InputAdornment, IconButton, Divider, RadioGroup, Radio, FormControlLabel
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import PersonIcon from '@mui/icons-material/Person'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import { useAuth } from '../../context/AuthContext'
import logoParquinho from '../../assets/logo-parquinho.webp'
import '../../styles/global.scss'

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Signup() {
  const navigate = useNavigate()
  const { signup, isAuthenticated } = useAuth()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'admin' })
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirm: false })
  const [showPwd, setShowPwd] = useState(false)
  const [serverErr, setServerErr] = useState('')
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    if (isAuthenticated) navigate('/dashboard')
  }, [isAuthenticated, navigate])

  const errors = {
    name: !form.name.trim() ? 'Nome completo é obrigatório' : '',
    email: !form.email.trim() ? 'E-mail é obrigatório'
      : !emailRe.test(form.email) ? 'Informe um e-mail válido' : '',
    password: !form.password ? 'Senha é obrigatória'
      : form.password.length < 6 ? 'A senha deve ter pelo menos 6 caracteres' : '',
    confirm: !form.confirm ? 'Confirme sua senha'
      : form.confirm !== form.password ? 'As senhas não coincidem' : '',
  }

  const isValid = Object.values(errors).every(e => !e)

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    setServerErr('')
  }

  const handleBlur = (e) => setTouched(p => ({ ...p, [e.target.name]: true }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched({ name: true, email: true, password: true, confirm: true })
    if (!isValid) return

    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    const result = signup(form.name, form.email, form.password, form.role)
    setLoading(false)

    if (result.success) {
      navigate('/dashboard')
    } else {
      setServerErr('Falha no cadastro. Tente novamente.')
    }
  }

  return (
    <Box className="auth-page">
      <Container maxWidth="sm">
        <Box className="auth-wrapper">
          <Box className="auth-logo">
            <Box component="img" src={logoParquinho} alt="Logo Parquinho" className="auth-logo-img" />
            <Typography className="auth-logo-title" color="text.primary">Criar conta</Typography>
            <Typography className="auth-logo-sub" color="text.secondary">Junte-se ao Parquinho hoje</Typography>
          </Box>

          <Card className="auth-card">
            <CardContent className="auth-card-body">
              {serverErr && <Alert severity="error" className="error-alert">{serverErr}</Alert>}

              <Box component="form" onSubmit={handleSubmit} noValidate>
                <TextField
                  fullWidth label="Nome completo" name="name"
                  value={form.name} onChange={handleChange} onBlur={handleBlur}
                  error={touched.name && !!errors.name}
                  helperText={touched.name ? errors.name : ' '}
                  className="auth-field"
                  autoComplete="name"
                  InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" color="action" /></InputAdornment> }}
                />
                <TextField
                  fullWidth label="E-mail" name="email" type="email"
                  value={form.email} onChange={handleChange} onBlur={handleBlur}
                  error={touched.email && !!errors.email}
                  helperText={touched.email ? errors.email : ' '}
                  className="auth-field"
                  autoComplete="email"
                  InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" color="action" /></InputAdornment> }}
                />
                <TextField
                  fullWidth label="Senha" name="password"
                  type={showPwd ? 'text' : 'password'}
                  value={form.password} onChange={handleChange} onBlur={handleBlur}
                  error={touched.password && !!errors.password}
                  helperText={touched.password ? errors.password : ' '}
                  className="auth-field"
                  autoComplete="new-password"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" color="action" /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPwd(p => !p)} edge="end" size="small">
                          {showPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth label="Confirmar senha" name="confirm"
                  type={showPwd ? 'text' : 'password'}
                  value={form.confirm} onChange={handleChange} onBlur={handleBlur}
                  error={touched.confirm && !!errors.confirm}
                  helperText={touched.confirm ? errors.confirm : ' '}
                  className="auth-field-last"
                  autoComplete="new-password"
                  InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" color="action" /></InputAdornment> }}
                />

                <Divider sx={{ my: 2 }}>
                  <Typography variant="caption" color="text.secondary">TIPO DE CONTA</Typography>
                </Divider>

                <RadioGroup name="role" value={form.role} onChange={handleChange} sx={{ mb: 2 }}>
                  <FormControlLabel value="admin" control={<Radio size="small" />} label="Administrador (acesso completo)" />
                  <FormControlLabel value="parent" control={<Radio size="small" />} label="Responsável (apenas portal dos pais)" />
                </RadioGroup>

                <Button
                  type="submit" variant="contained" fullWidth size="large"
                  className="auth-submit" disabled={!isValid || loading}
                >
                  {loading ? 'Criando conta...' : 'Criar conta'}
                </Button>

                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Já tem uma conta?{' '}
                  <Link component={RouterLink} to="/login" fontWeight={600} underline="hover">
                    Entrar
                  </Link>
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Box className="auth-back">
            <Link component={RouterLink} to="/" color="text.secondary" underline="hover" fontSize="0.875rem">
              ← Voltar para o início
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
