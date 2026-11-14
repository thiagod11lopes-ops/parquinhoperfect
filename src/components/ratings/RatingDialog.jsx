import React, { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, IconButton,
} from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import CloseIcon from '@mui/icons-material/Close'

const getPhoneContainer = () => document.getElementById('phone-app-root') || document.body

export default function RatingDialog({
  open,
  onClose,
  onSubmit,
  title,
  subtitle,
  submitLabel = 'Enviar avaliação',
}) {
  const [stars, setStars] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setStars(0)
    setHover(0)
    setComment('')
    setSaving(false)
  }

  const handleClose = () => {
    reset()
    onClose?.()
  }

  const handleSubmit = async () => {
    if (stars < 1 || saving) return
    setSaving(true)
    await onSubmit?.({ stars, comment })
    reset()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      container={getPhoneContainer}
      fullWidth
      maxWidth="xs"
      className="rating-dialog"
      PaperProps={{ className: 'rating-dialog-paper' }}
    >
      <DialogTitle className="rating-dialog-title">
        <Box>
          <Typography className="rating-dialog-heading">{title}</Typography>
          {subtitle && (
            <Typography className="rating-dialog-sub">{subtitle}</Typography>
          )}
        </Box>
        <IconButton size="small" onClick={handleClose} aria-label="Fechar" className="rating-dialog-close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent className="rating-dialog-content">
        <Typography className="rating-stars-label">Quantas estrelas?</Typography>
        <Box className="rating-stars" role="radiogroup" aria-label="Avaliação em estrelas">
          {[1, 2, 3, 4, 5].map((value) => {
            const active = (hover || stars) >= value
            return (
              <IconButton
                key={value}
                className={`rating-star-btn ${active ? 'is-active' : ''}`}
                onMouseEnter={() => setHover(value)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setStars(value)}
                aria-label={`${value} estrela${value > 1 ? 's' : ''}`}
                aria-checked={stars === value}
                role="radio"
              >
                {active ? <StarIcon /> : <StarBorderIcon />}
              </IconButton>
            )
          })}
        </Box>

        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Seu comentário"
          placeholder="Conte como foi a entrega / retirada..."
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 400))}
          className="rating-comment-field"
          helperText={`${comment.length}/400`}
        />
      </DialogContent>

      <DialogActions className="rating-dialog-actions">
        <Button onClick={handleClose} className="rating-cancel-btn">
          Agora não
        </Button>
        <Button
          variant="contained"
          className="btn-orange-card"
          disabled={stars < 1 || saving}
          onClick={handleSubmit}
        >
          {saving ? 'Enviando...' : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
