import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Badge,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ChildCareIcon from '@mui/icons-material/ChildCare'
import PeopleIcon from '@mui/icons-material/People'
import InsightsIcon from '@mui/icons-material/Insights'
import AssessmentIcon from '@mui/icons-material/Assessment'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import EventNoteIcon from '@mui/icons-material/EventNote'
import HomeIcon from '@mui/icons-material/Home'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import LogoutIcon from '@mui/icons-material/Logout'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import HistoryIcon from '@mui/icons-material/History'
import ChatIcon from '@mui/icons-material/Chat'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import StarRateIcon from '@mui/icons-material/StarRate'
import BusinessIcon from '@mui/icons-material/Business'
import SettingsIcon from '@mui/icons-material/Settings'
import { useAuth } from '../../context/AuthContext'
import { useAppearance } from '../../context/AppearanceContext'
import { useChat } from '../../context/ChatContext'
import logoParquinho from '../../assets/logo-parquinho.webp'
import '../../styles/global.scss'

const GERENTE_ITEMS = [
  { label: 'Painel', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Presença', path: '/presenca', icon: <HowToRegIcon /> },
  { label: 'Cadastro', path: '/children', icon: <ChildCareIcon /> },
  { label: 'Equipe', path: '/staff', icon: <PeopleIcon /> },
  { label: 'Chat', path: '/chat', icon: <ChatIcon /> },
  { label: 'Histórico', path: '/historico', icon: <HistoryIcon /> },
  { label: 'Balanço', path: '/balanco', icon: <InsightsIcon /> },
  { label: 'Relatórios', path: '/relatorios', icon: <AssessmentIcon /> },
  { label: 'Avaliações', path: '/avaliacoes', icon: <StarRateIcon /> },
  { label: 'Atividades', path: '/activities', icon: <EventNoteIcon /> },
  { label: 'Informações', path: '/informacoes', icon: <InfoOutlinedIcon /> },
]

const ADMIN_ITEMS = [
  { label: 'Unidades', path: '/unidades', icon: <BusinessIcon /> },
  ...GERENTE_ITEMS.filter((item) => item.path !== '/presenca'),
  { label: 'Configuração', path: '/configuracao', icon: <SettingsIcon /> },
]

const PROFESSOR_ITEMS = [
  { label: 'Painel', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Presença', path: '/presenca', icon: <HowToRegIcon /> },
  { label: 'Cadastro', path: '/children', icon: <ChildCareIcon /> },
  { label: 'Equipe', path: '/staff', icon: <PeopleIcon /> },
  { label: 'Chat', path: '/chat', icon: <ChatIcon /> },
  { label: 'Histórico', path: '/historico', icon: <HistoryIcon /> },
  { label: 'Balanço', path: '/balanco', icon: <InsightsIcon /> },
  { label: 'Relatórios', path: '/relatorios', icon: <AssessmentIcon /> },
  { label: 'Atividades', path: '/activities', icon: <EventNoteIcon /> },
  { label: 'Informações', path: '/informacoes', icon: <InfoOutlinedIcon /> },
]

const RESPONSAVEL_ITEMS = [
  { label: 'Início', path: '/responsavel', icon: <HomeIcon /> },
  { label: 'QR Entrada', path: '/responsavel/qr', icon: <QrCode2Icon /> },
  { label: 'Saída', path: '/responsavel/saida', icon: <LogoutIcon /> },
  { label: 'Chat', path: '/responsavel/chat', icon: <ChatIcon /> },
  { label: 'Alertas', path: '/responsavel/alertas', icon: <NotificationsActiveIcon /> },
  { label: 'Histórico', path: '/responsavel/historico', icon: <HistoryIcon /> },
  { label: 'Informações', path: '/responsavel/informacoes', icon: <InfoOutlinedIcon /> },
]

const getPhoneContainer = () => document.getElementById('phone-app-root') || document.body

export default function Sidebar({ drawerWidth, mobileOpen, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, isGerenteOnly, isProfessor, isResponsavel, unitName } = useAuth()
  const { logoSrc, hasBgImage } = useAppearance()
  const { unreadCount } = useChat()

  const navItems = isAdmin
    ? ADMIN_ITEMS
    : isGerenteOnly
      ? GERENTE_ITEMS
      : isProfessor
        ? PROFESSOR_ITEMS
        : isResponsavel
          ? RESPONSAVEL_ITEMS
          : RESPONSAVEL_ITEMS

  const menuLabel = isAdmin
    ? 'Menu do administrador'
    : isGerenteOnly
      ? 'Menu do gerente'
      : isProfessor
        ? 'Menu do professor'
        : 'Menu do responsável'

  const content = (
    <Box className="sidebar-wrap">
      <Box className="sidebar-brand panel-card">
        <Box
          component="img"
          src={logoSrc || logoParquinho}
          alt="Logo Parquinho"
          className="sidebar-brand-logo"
        />
        <Box className="brand-text">
          <Typography className="brand-name">Parquinho</Typography>
          <Typography className="brand-tagline" title={unitName || undefined}>
            {unitName || 'Unidade'}
          </Typography>
        </Box>
      </Box>

      <Typography className="sidebar-section-label">
        {menuLabel}
      </Typography>

      <List className="sidebar-nav" disablePadding>
        {navItems.map(item => {
          const active = location.pathname === item.path
          const isChat = item.path === '/chat' || item.path === '/responsavel/chat'
          return (
            <ListItem key={item.path} disablePadding className="nav-item">
              <ListItemButton
                className={`nav-btn panel-card ${active ? 'active' : ''}`}
                onClick={() => { navigate(item.path); onClose() }}
              >
                <ListItemIcon className="nav-icon">
                  {isChat ? (
                    <Badge color="error" badgeContent={unreadCount} max={9}>
                      {item.icon}
                    </Badge>
                  ) : item.icon}
                </ListItemIcon>
                <ListItemText
                  className="nav-label"
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                  }}
                />
                {isChat && unreadCount > 0 && (
                  <Box className="nav-chat-dot" aria-hidden />
                )}
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </Box>
  )

  return (
    <Drawer
      variant="temporary"
      open={mobileOpen}
      onClose={onClose}
      className="sidebar-drawer"
      ModalProps={{
        keepMounted: true,
        container: getPhoneContainer,
      }}
      sx={{
        // O Drawer é o Modal: precisa cobrir só o phone-screen
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 50,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          maxHeight: '100%',
          overflow: 'hidden',
          isolation: 'isolate',
          backgroundColor: 'transparent',
          backgroundImage: 'none',
          borderRight: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.25)',
          // Fundo do menu = fundo do sistema (cor/imagem/enquadramento/opacidade)
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            backgroundColor: 'var(--app-bg-color, #f97316)',
            backgroundImage: 'var(--app-bg-image, none)',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'var(--app-bg-pos, center center)',
            backgroundSize: hasBgImage ? 'var(--app-bg-size, cover)' : 'cover',
            opacity: 'var(--app-bg-opacity, 1)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--app-bg-color, #f97316) 72%, transparent), color-mix(in srgb, var(--app-bg-color, #f97316) 55%, #000))',
          },
          '& > *': {
            position: 'relative',
            zIndex: 1,
          },
        },
        '& .MuiBackdrop-root': {
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.35)',
        },
      }}
    >
      {content}
    </Drawer>
  )
}
