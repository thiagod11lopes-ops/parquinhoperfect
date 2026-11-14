import React from 'react'
import { IconButton, Tooltip, Box } from '@mui/material'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import '../../styles/global.scss'

export default function ChildActions({ onView, onEdit, onDelete, onCall }) {
  return (
    <Box className="action-btns">
      {onCall && (
        <Tooltip title="Chamar responsável" arrow>
          <IconButton className="action-btn action-btn--call" onClick={onCall} aria-label="Chamar responsável">
            <PhoneInTalkIcon />
          </IconButton>
        </Tooltip>
      )}
      {onView && (
        <Tooltip title="Ver" arrow>
          <IconButton className="action-btn action-btn--view" onClick={onView} aria-label="Ver">
            <VisibilityRoundedIcon />
          </IconButton>
        </Tooltip>
      )}
      {onEdit && (
        <Tooltip title="Editar" arrow>
          <IconButton className="action-btn action-btn--edit" onClick={onEdit} aria-label="Editar">
            <EditRoundedIcon />
          </IconButton>
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip title="Excluir" arrow>
          <IconButton className="action-btn action-btn--delete" onClick={onDelete} aria-label="Excluir">
            <DeleteRoundedIcon />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}
