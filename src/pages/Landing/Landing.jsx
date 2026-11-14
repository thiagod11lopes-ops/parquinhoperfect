import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Container, Typography, Button, Grid, Card, CardContent,
  AppBar, Toolbar, Divider
} from '@mui/material'
import ChildCareIcon from '@mui/icons-material/ChildCare'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PeopleIcon from '@mui/icons-material/People'
import EventNoteIcon from '@mui/icons-material/EventNote'
import BarChartIcon from '@mui/icons-material/BarChart'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { useAuth } from '../../context/AuthContext'
import HeaderControls from '../../components/common/HeaderControls'
import logoParquinho from '../../assets/logo-parquinho.webp'
import '../../styles/global.scss'

const features = [
  { icon: <DashboardIcon />,   title: 'Painel Inteligente',     desc: 'Análises em tempo real com gráficos interativos e métricas principais.' },
  { icon: <ChildCareIcon />,   title: 'Perfis das Crianças',    desc: 'Registros completos com fotos, dados do responsável e alergias.' },
  { icon: <PeopleIcon />,      title: 'Gestão de Equipe',       desc: 'Gerencie funções, escalas e atribuições da equipe.' },
  { icon: <EventNoteIcon />,   title: 'Planejamento de Atividades', desc: 'Agende e organize as atividades diárias da creche.' },
  { icon: <BarChartIcon />,    title: 'Relatórios e Análises',  desc: 'Acompanhe métricas e relatórios visuais.' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  React.useEffect(() => {
    if (isAuthenticated) navigate('/dashboard')
  }, [isAuthenticated, navigate])

  return (
    <Box className="landing-root">
      <AppBar
        position="sticky"
        elevation={0}
        className="landing-nav"
        sx={{ bgcolor: 'background.paper', color: 'text.primary' }}
      >
        <Toolbar sx={{ px: 1.5, minHeight: '52px !important', gap: 0.5 }}>
          <Box className="nav-brand" sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Box component="img" src={logoParquinho} alt="Logo Parquinho" className="landing-brand-logo" />
            <Typography variant="subtitle2" fontWeight={800} color="text.primary" noWrap>
              Parquinho
            </Typography>
          </Box>
          <Box className="nav-actions">
            <HeaderControls />
            <Button variant="outlined" size="small" onClick={() => navigate('/login')}>
              Entrar
            </Button>
            <Button variant="contained" size="small" onClick={() => navigate('/signup')}>
              Cadastrar
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box className="landing-hero" sx={{ bgcolor: 'transparent' }}>
        <Container maxWidth="sm" disableGutters sx={{ px: 2 }}>
          <Box className="hero-eyebrow">
            Gestão moderna de creche
          </Box>
          <Typography className="hero-title" color="text.primary">
            Gerencie sua creche com confiança
          </Typography>
          <Typography className="hero-desc" color="text.secondary">
            Plataforma completa para crianças, equipe e atividades — feita para creches modernas.
          </Typography>
          <Box className="hero-cta">
            <Button
              variant="contained"
              className="hero-btn-primary"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/signup')}
            >
              Começar gratuitamente
            </Button>
            <Button
              variant="outlined"
              className="hero-btn-secondary"
              onClick={() => navigate('/login')}
            >
              Entrar
            </Button>
          </Box>
          <Box className="hero-visual" sx={{ background: 'transparent !important', boxShadow: 'none !important' }}>
            <Box
              component="img"
              src={logoParquinho}
              alt="Logo Parquinho"
              sx={{ width: '70%', maxWidth: 220, borderRadius: 3, objectFit: 'cover', position: 'relative', zIndex: 1 }}
            />
          </Box>
        </Container>
      </Box>

      <Box className="landing-features" sx={{ bgcolor: 'transparent' }}>
        <Container maxWidth="sm" disableGutters sx={{ px: 2 }}>
          <Typography className="features-eyebrow" color="primary">Recursos</Typography>
          <Typography className="features-title" color="text.primary">
            Tudo para uma ótima creche
          </Typography>
          <Grid container spacing={2}>
            {features.map((f, i) => (
              <Grid item xs={12} key={i}>
                <Card className="feature-card" elevation={0} variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Box className="feature-icon-wrap">{f.icon}</Box>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>{f.title}</Typography>
                    <Typography variant="body2" color="text.secondary" lineHeight={1.5} fontSize="0.8125rem">{f.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box className="landing-cta-section" sx={{ bgcolor: 'transparent' }}>
        <Container maxWidth="sm" disableGutters sx={{ px: 2 }}>
          <Box className="cta-box">
            <Typography className="cta-title">Pronto para começar?</Typography>
            <Typography className="cta-sub">
              Junte-se a creches que já usam o Parquinho.
            </Typography>
            <Button
              className="cta-btn"
              variant="contained"
              size="large"
              onClick={() => navigate('/signup')}
              endIcon={<ArrowForwardIcon />}
            >
              Criar conta gratuita
            </Button>
          </Box>
        </Container>
      </Box>

      <Box sx={{ bgcolor: 'transparent' }}>
        <Divider />
        <Container maxWidth="sm" disableGutters sx={{ px: 2 }}>
          <Box className="landing-footer">
            <Typography variant="caption" sx={{ color: 'var(--app-font-color, #fff)', textShadow: '0 1px 2px #000' }}>
              © 2026 Parquinho — Gestão de Crianças.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}
