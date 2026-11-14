import React, { useMemo, useState } from 'react'
import {
  AppBar, Toolbar, IconButton, Typography, Box, Avatar,
  Menu, MenuItem, Divider, Badge, Button,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import PersonIcon from '@mui/icons-material/Person'
import BusinessIcon from '@mui/icons-material/Business'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import LoginIcon from '@mui/icons-material/Login'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import GroupsIcon from '@mui/icons-material/Groups'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import { useLocation, useNavigate } from 'react-router-dom'
import HeaderControls from '../common/HeaderControls'
import { useAuth } from '../../context/AuthContext'
import { useAppearance } from '../../context/AppearanceContext'
import { useChat } from '../../context/ChatContext'
import { useAppNotifications } from '../../context/AppNotificationsContext'
import logoParquinho from '../../assets/logo-parquinho.webp'
import '../../styles/global.scss'

const pageMeta = {
  '/dashboard': { title: 'Painel' },
  '/children':  { title: 'Cadastro' },
  '/staff':     { title: 'Equipe' },
  '/historico': { title: 'Histórico' },
  '/balanco':   { title: 'Balanço' },
  '/activities':{ title: 'Atividades' },
  '/chat': { title: 'Chat' },
  '/informacoes': { title: 'Informações' },
  '/avaliacoes': { title: 'Avaliações' },
  '/unidades': { title: 'Unidades' },
  '/configuracao': { title: 'Configuração' },
  '/relatorios': { title: 'Relatórios' },
  '/presenca': { title: 'Presença' },
  '/responsavel': { title: 'Responsável' },
  '/responsavel/qr': { title: 'QR Entrada' },
  '/responsavel/saida': { title: 'Saída' },
  '/responsavel/alertas': { title: 'Alertas' },
  '/responsavel/historico': { title: 'Histórico' },
  '/responsavel/chat': { title: 'Chat' },
  '/responsavel/informacoes': { title: 'Informações' },
}

const getPhoneContainer = () => document.getElementById('phone-app-root') || document.body

function notifyIcon(type) {
  if (type === 'entry') return <LoginIcon fontSize="small" />
  if (type === 'exit') return <LogoutRoundedIcon fontSize="small" />
  if (type === 'capacity') return <GroupsIcon fontSize="small" />
  if (type === 'chat') return <ChatBubbleOutlineIcon fontSize="small" />
  return <NotificationsActiveIcon fontSize="small" />
}

export default function Header({ onMenuClick }) {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    user, logout, isAdmin, isGerenteOnly, isProfessor, isResponsavel,
    unitName, clearActiveUnit,
  } = useAuth()
  const { logoSrc } = useAppearance()
  const { unreadCount: chatUnread, unreadThreads, openThread, chatPath } = useChat()
  const {
    notifications,
    unreadCount: appUnread,
    permission,
    markRead,
    markAllRead,
    requestBrowserPermission,
  } = useAppNotifications()
  const [anchorEl, setAnchorEl] = useState(null)
  const [bellEl, setBellEl] = useState(null)
  const open = Boolean(anchorEl)
  const bellOpen = Boolean(bellEl)

  const meta = pageMeta[location.pathname] || { title: 'Parquinho' }
  const roleLabel = isAdmin
    ? 'Administrador'
    : isGerenteOnly
      ? 'Gerente'
      : isProfessor
        ? 'Professor'
        : isResponsavel
          ? 'Responsável'
          : 'Usuário'
  const roleClass = isAdmin
    ? 'is-admin'
    : isGerenteOnly
      ? 'is-gerente'
      : isProfessor
        ? 'is-professor'
        : isResponsavel
          ? 'is-responsavel'
          : 'is-user'

  const badgeCount = appUnread + chatUnread
  const recentNotifications = useMemo(() => notifications.slice(0, 8), [notifications])

  const handleLogout = () => { logout(); navigate('/') }
  const handleSwitchUnit = () => {
    setAnchorEl(null)
    clearActiveUnit()
  }

  const openNotification = (item) => {
    markRead(item.id)
    setBellEl(null)
    if (item.type === 'chat' && item.meta?.threadId) {
      navigate(item.path || chatPath)
      openThread({ id: item.meta.threadId, childName: item.meta.childName })
      return
    }
    if (item.path) navigate(item.path)
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      className="app-header-panel"
      sx={{
        width: '100%',
        bgcolor: '#ffffff',
        color: 'text.primary',
      }}
    >
      <Box className={`header-role-bar ${roleClass}`} role="status" aria-label={`Acesso: ${roleLabel}`}>
        Acesso: {roleLabel}{unitName ? ` · ${unitName}` : ''}
      </Box>
      <Toolbar
        className="header-inner"
        sx={{ minHeight: '56px !important', px: 1.5, gap: 0.75, position: 'relative' }}
      >
        <IconButton edge="start" onClick={onMenuClick} size="small" aria-label="Abrir menu" sx={{ zIndex: 1 }}>
          <MenuIcon />
        </IconButton>

        <Box
          className="header-title-wrap"
          sx={{
            minWidth: 0,
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            overflow: 'visible',
            zIndex: 1,
          }}
        >
          <Typography
            className="header-title"
            color="text.primary"
            sx={{ lineHeight: 1.4, display: 'block', overflow: 'visible' }}
          >
            {meta.title}
          </Typography>
        </Box>

        <Box
          component="img"
          src={logoSrc || logoParquinho}
          alt="Logo Parquinho"
          className="app-brand-logo header-brand-logo"
          sx={{
            height: 41,
            width: 41,
            display: 'block',
            borderRadius: '6px',
            objectFit: 'cover',
            objectPosition: 'center',
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%) scale(var(--app-logo-scale, 1))',
            opacity: 'var(--app-logo-opacity, 1)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        <Box className="header-right" sx={{ zIndex: 1, display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <IconButton
            size="small"
            className="header-bell-btn"
            aria-label="Notificações"
            onClick={(e) => setBellEl(e.currentTarget)}
          >
            <Badge color="error" badgeContent={badgeCount} max={9}>
              <NotificationsNoneIcon />
            </Badge>
          </IconButton>

          <HeaderControls />

          <Avatar
            className="header-avatar"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </Avatar>
        </Box>

        <Menu
          anchorEl={bellEl}
          open={bellOpen}
          onClose={() => setBellEl(null)}
          container={getPhoneContainer}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          marginThreshold={8}
          MenuListProps={{ className: 'header-notify-menu-list', disablePadding: true }}
          PaperProps={{
            className: 'header-notify-menu-paper',
            elevation: 0,
            sx: {
              mt: 1.25,
              ml: 0.5,
              minWidth: 268,
              maxWidth: 'min(300px, calc(100vw - 40px))',
              overflow: 'hidden',
            },
          }}
        >
          <Box className="header-notify-head">
            <Box>
              <Typography className="header-notify-title">Notificações</Typography>
              <Typography className="header-notify-sub">
                {badgeCount
                  ? `${badgeCount} nova(s) · entrada, saída, lotação e chat`
                  : 'Tudo em dia'}
              </Typography>
            </Box>
            {appUnread > 0 && (
              <Button size="small" className="header-notify-mark" onClick={markAllRead}>
                Ler todas
              </Button>
            )}
          </Box>

          {permission !== 'granted' && typeof Notification !== 'undefined' && (
            <Box className="header-notify-permission">
              <Typography className="header-notify-permission-text">
                Ative avisos do navegador para lembretes mesmo fora da tela.
              </Typography>
              <Button
                size="small"
                className="btn-orange-card"
                onClick={() => requestBrowserPermission()}
              >
                Ativar alertas
              </Button>
            </Box>
          )}

          <Box className="header-notify-section">
            {recentNotifications.length === 0 && unreadThreads.length === 0 ? (
              <Typography className="header-notify-empty">Nenhuma notificação ainda</Typography>
            ) : (
              <>
                {recentNotifications.map((item) => (
                  <MenuItem
                    key={item.id}
                    className={`header-notify-item ${item.read ? '' : 'is-unread'}`}
                    onClick={() => openNotification(item)}
                  >
                    <span className={`header-notify-item-icon is-${item.type}`} aria-hidden>
                      {notifyIcon(item.type)}
                    </span>
                    <Box className="header-notify-item-copy">
                      <Typography className="header-notify-item-title" noWrap>
                        {item.title}
                      </Typography>
                      <Typography className="header-notify-item-msg">
                        {item.message}
                      </Typography>
                      <Typography className="header-notify-item-time">{item.time}</Typography>
                    </Box>
                  </MenuItem>
                ))}

                {unreadThreads.length > 0 && (
                  <>
                    <Divider />
                    {unreadThreads.map(({ thread, count }) => {
                      const last = thread.messages?.[thread.messages.length - 1]
                      return (
                        <MenuItem
                          key={`chat-${thread.id}`}
                          className="header-notify-item is-unread"
                          onClick={() => {
                            setBellEl(null)
                            navigate(chatPath)
                            openThread(thread)
                          }}
                        >
                          <span className="header-notify-item-icon is-chat" aria-hidden>
                            <ChatBubbleOutlineIcon fontSize="small" />
                          </span>
                          <Box className="header-notify-item-copy">
                            <Typography className="header-notify-item-title" noWrap>
                              Chat · {thread.childName} ({count})
                            </Typography>
                            <Typography className="header-notify-item-msg">
                              {last ? `${last.senderName}: ${last.text}` : 'Nova conversa'}
                            </Typography>
                          </Box>
                        </MenuItem>
                      )
                    })}
                  </>
                )}
              </>
            )}
          </Box>

          <Box className="header-notify-footer">
            <MenuItem
              className="header-notify-footer-item"
              onClick={() => {
                setBellEl(null)
                navigate(chatPath)
              }}
            >
              Abrir chat
            </MenuItem>
          </Box>
        </Menu>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={() => setAnchorEl(null)}
          container={getPhoneContainer}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          marginThreshold={8}
          MenuListProps={{ className: 'header-user-menu-list', disablePadding: true }}
          PaperProps={{
            className: 'header-user-menu-paper panel-card',
            elevation: 0,
            sx: {
              mt: 1.25,
              ml: 0.5,
              minWidth: 248,
              maxWidth: 'min(280px, calc(100vw - 40px))',
              overflow: 'hidden',
            },
          }}
        >
          <Box className="header-user-menu-head">
            <Avatar className="header-user-menu-avatar">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box className="header-user-menu-identity">
              <Typography className="header-user-menu-name" noWrap>
                {user?.name || 'Usuário'}
              </Typography>
              <Typography className="header-user-menu-email" noWrap>
                {user?.email || '—'}
              </Typography>
              <Box className="header-user-menu-meta">
                <span className={`header-user-menu-chip ${roleClass}`}>{roleLabel}</span>
                {unitName && (
                  <span className="header-user-menu-chip is-unit" title={unitName}>
                    {unitName}
                  </span>
                )}
              </Box>
            </Box>
          </Box>

          <Box className="header-user-menu-actions">
            <MenuItem
              className="header-user-menu-item"
              onClick={() => setAnchorEl(null)}
            >
              <span className="header-user-menu-item-icon" aria-hidden>
                <PersonIcon fontSize="small" />
              </span>
              <span className="header-user-menu-item-copy">
                <span className="header-user-menu-item-label">Perfil</span>
                <span className="header-user-menu-item-hint">Dados da conta</span>
              </span>
            </MenuItem>
            {isAdmin && (
              <MenuItem
                className="header-user-menu-item"
                onClick={handleSwitchUnit}
              >
                <span className="header-user-menu-item-icon" aria-hidden>
                  <BusinessIcon fontSize="small" />
                </span>
                <span className="header-user-menu-item-copy">
                  <span className="header-user-menu-item-label">Trocar unidade</span>
                  <span className="header-user-menu-item-hint">Escolher outro parquinho</span>
                </span>
              </MenuItem>
            )}
          </Box>

          <Box className="header-user-menu-footer">
            <MenuItem
              className="header-user-menu-item is-danger"
              onClick={handleLogout}
            >
              <span className="header-user-menu-item-icon is-danger" aria-hidden>
                <LogoutIcon fontSize="small" />
              </span>
              <span className="header-user-menu-item-copy">
                <span className="header-user-menu-item-label">Sair</span>
                <span className="header-user-menu-item-hint">Encerrar sessão</span>
              </span>
            </MenuItem>
          </Box>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
