import React, { useEffect, useRef, useState } from 'react'
import {
  Box, Typography, Stack, TextField, IconButton, Avatar, InputAdornment, Badge,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import { useChat } from '../../context/ChatContext'
import { useAuth } from '../../context/AuthContext'
import '../../styles/global.scss'

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'
}

function roleTitle(role) {
  if (role === 'responsavel') return 'Responsável'
  if (role === 'professor') return 'Professor'
  if (role === 'gerente') return 'Gerente'
  if (role === 'administrador') return 'Administrador'
  return 'Usuário'
}

function ThreadList({ threads, onOpen, isResponsavel, threadUnread }) {
  if (!threads.length) {
    return (
      <Box className="wa-empty panel-card">
        <ChatBubbleOutlineIcon sx={{ fontSize: 40, opacity: 0.85 }} />
        <Typography>Nenhuma conversa disponível.</Typography>
      </Box>
    )
  }

  return (
    <Stack spacing={0} className="wa-thread-list">
      {threads.map((thread) => {
        const last = thread.messages?.[thread.messages.length - 1]
        const unread = threadUnread?.(thread) || 0
        const title = isResponsavel
          ? 'Equipe do Parquinho'
          : thread.guardianName
        const subtitle = isResponsavel
          ? thread.childName
          : `Sobre ${thread.childName}`

        return (
          <button
            key={thread.id}
            type="button"
            className={`wa-thread-item ${unread ? 'has-unread' : ''}`}
            onClick={() => onOpen(thread)}
          >
            <Badge
              color="error"
              badgeContent={unread}
              overlap="circular"
              className="wa-thread-badge"
            >
              <Avatar className="wa-avatar">{initials(title)}</Avatar>
            </Badge>
            <Box className="wa-thread-copy">
              <Box className="wa-thread-top">
                <Typography className="wa-thread-name">{title}</Typography>
                {last?.time && (
                  <Typography className="wa-thread-time">{last.time}</Typography>
                )}
              </Box>
              <Typography className="wa-thread-sub">{subtitle}</Typography>
              <Typography className="wa-thread-preview">
                {last
                  ? `${roleTitle(last.senderRole)}: ${last.text}`
                  : 'Toque para iniciar a conversa'}
              </Typography>
            </Box>
          </button>
        )
      })}
    </Stack>
  )
}

function Conversation({ thread, onBack, onSend, myRole, user }) {
  const [text, setText] = useState('')
  const endRef = useRef(null)
  const isResponsavel = myRole === 'responsavel'

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread?.messages?.length, thread?.id])

  if (!thread) return null

  const headerTitle = isResponsavel
    ? 'Equipe do Parquinho'
    : thread.guardianName
  const headerSub = isResponsavel
    ? `Criança: ${thread.childName}`
    : `Criança: ${thread.childName} · você pode participar`

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onSend(text)
    setText('')
  }

  return (
    <Box className="wa-conversation">
      <Box className="wa-chat-header">
        <IconButton onClick={onBack} size="small" className="wa-back-btn" aria-label="Voltar">
          <ArrowBackIcon />
        </IconButton>
        <Avatar className="wa-avatar wa-avatar--sm">{initials(headerTitle)}</Avatar>
        <Box className="wa-chat-header-copy">
          <Typography className="wa-chat-header-title">{headerTitle}</Typography>
          <Typography className="wa-chat-header-sub">{headerSub}</Typography>
        </Box>
      </Box>

      <Box className="wa-messages">
        {(thread.messages || []).length === 0 ? (
          <Typography className="wa-messages-empty">
            Envie a primeira mensagem desta conversa.
          </Typography>
        ) : (
          thread.messages.map((msg) => {
            const mine = String(msg.senderId) === String(user?.id)
              || msg.senderEmail === user?.email
            return (
              <Box
                key={msg.id}
                className={`wa-bubble-row ${mine ? 'is-mine' : 'is-theirs'}`}
              >
                <Box className={`wa-bubble ${mine ? 'is-mine' : 'is-theirs'}`}>
                  {!mine && (
                    <Typography className="wa-bubble-author">
                      {msg.senderName}
                      {msg.senderRole ? ` · ${roleTitle(msg.senderRole)}` : ''}
                    </Typography>
                  )}
                  <Typography className="wa-bubble-text">{msg.text}</Typography>
                  <Typography className="wa-bubble-time">{msg.time}</Typography>
                </Box>
              </Box>
            )
          })
        )}
        <div ref={endRef} />
      </Box>

      <Box component="form" className="wa-composer" onSubmit={submit}>
        <TextField
          fullWidth
          size="small"
          placeholder="Mensagem"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="wa-input"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton type="submit" className="wa-send-btn" aria-label="Enviar" disabled={!text.trim()}>
                  <SendIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Box>
  )
}

export default function Chat() {
  const {
    threads, activeThread, openThread, closeThread, sendMessage, threadUnread, myRole,
  } = useChat()
  const { user, isResponsavel } = useAuth()

  return (
    <Box className="page-container wa-page">
      {!activeThread ? (
        <>
          <Box className="page-header">
            <Typography variant="body2" fontWeight={700}>
              Conversas
            </Typography>
            {!isResponsavel && (
              <Typography variant="caption" sx={{ color: 'var(--app-font-color, #fff)', opacity: 0.9 }}>
                Professor, gerente e administrador participam juntos
              </Typography>
            )}
          </Box>
          <ThreadList
            threads={threads}
            onOpen={openThread}
            isResponsavel={isResponsavel}
            threadUnread={threadUnread}
          />
        </>
      ) : (
        <Conversation
          thread={activeThread}
          onBack={closeThread}
          onSend={sendMessage}
          myRole={myRole}
          user={user}
        />
      )}
    </Box>
  )
}
