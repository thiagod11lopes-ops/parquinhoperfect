import React from 'react'
import {
  Box, Button, Typography, Chip, Card, CardContent, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import { QRCodeSVG } from 'qrcode.react'
import { useSampleData } from '../../context/SampleDataContext'
import { useAuth } from '../../context/AuthContext'
import { useCallBridge } from '../../context/CallBridgeContext'
import { useParkSettings } from '../../context/ParkSettingsContext'
import { useAppNotifications } from '../../context/AppNotificationsContext'
import { usePresence } from '../../context/PresenceContext'
import ChildForm from './ChildForm'
import ChildViewDialog from './ChildViewDialog'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import CallTypeDialog from '../../components/staff/CallTypeDialog'
import ChildActions from './ChildActions'
import '../../styles/global.scss'

function ChildCard({
  child,
  presentSession,
  onView,
  onEdit,
  onDelete,
  onCall,
  onRelease,
  canRelease,
}) {
  const inPark = Boolean(presentSession)

  return (
    <Card variant="outlined" className="panel-card" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5, mb: 0.75 }}>
          <Box sx={{ minWidth: 0, flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="caption"
                display="block"
                sx={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.1 }}
              >
                Criança
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ wordBreak: 'break-word', lineHeight: 1.2, fontSize: '0.875rem' }}>
                {child.name}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="caption"
                display="block"
                sx={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.1 }}
              >
                Responsável
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ wordBreak: 'break-word', lineHeight: 1.2, fontSize: '0.875rem' }}>
                {child.guardian || '—'}
              </Typography>
            </Box>
          </Box>
          <ChildActions onView={onView} onEdit={onEdit} onDelete={onDelete} onCall={onCall} />
        </Box>

        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mb: inPark && canRelease ? 1 : 0.25 }}>
          <Chip label={`${child.age} anos`} size="small" variant="outlined" sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' } }} />
          <Chip label={child.plan || '—'} size="small" color="primary" variant="outlined" sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' } }} />
          {child.allergies && child.allergies !== 'Nenhuma' ? (
            <Chip label={child.allergies} size="small" color="warning" sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' } }} />
          ) : (
            <Chip label="Sem alergias" size="small" variant="outlined" sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' } }} />
          )}
          <Chip
            label={inPark ? `No parquinho · ${presentSession.entryTime}` : 'Fora do parquinho'}
            size="small"
            color={inPark ? 'success' : 'default'}
            variant="outlined"
            sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' } }}
          />
        </Stack>

        {inPark && canRelease && (
          <Button
            fullWidth
            variant="contained"
            className="btn-orange-card"
            startIcon={<QrCode2Icon />}
            onClick={onRelease}
            sx={{ mt: 0.5, textTransform: 'none', fontWeight: 800 }}
          >
            Liberar para o responsável
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function Children() {
  const { childrenList, setChildrenList } = useSampleData()
  const {
    isProfessor, isGerente, canEditStaff, unitId, unitName, tenantId, user,
  } = useAuth()
  const { startCall, isCalling } = useCallBridge()
  const { maxChildren } = useParkSettings()
  const { pushNotification } = useAppNotifications()
  const {
    findActiveByChild,
    setExitTarget,
    clearExitTarget,
    pendingExit,
    exitPayload,
  } = usePresence()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editChild, setEditChild] = React.useState(null)
  const [viewChild, setViewChild] = React.useState(null)
  const [deleteId, setDeleteId] = React.useState(null)
  const [callChild, setCallChild] = React.useState(null)
  const [capacityError, setCapacityError] = React.useState('')
  const [releaseOpen, setReleaseOpen] = React.useState(false)
  const [releaseError, setReleaseError] = React.useState('')

  const unitChildren = React.useMemo(
    () => childrenList.filter((c) => (
      c.unitId ? c.unitId === unitId : Boolean(unitId)
    )),
    [childrenList, unitId],
  )

  const canManage = canEditStaff || isGerente
  const canAdd = isProfessor || isGerente || canManage
  const canCall = isProfessor || isGerente
  const canRelease = isProfessor || isGerente
  const atLimit = unitChildren.length >= maxChildren

  const handleAdd = () => {
    setCapacityError('')
    if (atLimit) {
      setCapacityError(`Lotação máxima atingida (${maxChildren}).`)
      return
    }
    setEditChild(null)
    setFormOpen(true)
  }
  const handleEdit = (c) => { setEditChild(c); setFormOpen(true) }
  const handleView = (c) => setViewChild(c)
  const handleDelete = (id) => setDeleteId(id)
  const handleCall = (c) => {
    if (isCalling) return
    setCallChild(c)
  }
  const handleCallType = (kind) => {
    if (!callChild || isCalling) return
    const c = callChild
    setCallChild(null)
    startCall({
      childId: c.id,
      childName: c.name,
      guardianName: c.guardian || 'Responsável',
      kind,
    })
  }

  const handleRelease = (child) => {
    setReleaseError('')
    const session = findActiveByChild(child.id, child.name)
    if (!session) {
      setReleaseError('Esta criança não está no parquinho no momento.')
      setReleaseOpen(true)
      return
    }
    const result = setExitTarget(session, user?.name || 'Equipe')
    if (!result.success) {
      setReleaseError(result.error || 'Não foi possível gerar o QR.')
      setReleaseOpen(true)
      return
    }
    setReleaseOpen(true)
  }

  const handleCloseRelease = () => {
    setReleaseOpen(false)
    setReleaseError('')
    clearExitTarget()
  }

  const handleSave = (data) => {
    if (editChild) {
      setChildrenList((p) => p.map((r) => (r.id === data.id ? {
        ...r,
        ...data,
        entryTime: data.entryTime || r.entryTime,
        unitId: r.unitId || unitId || null,
      } : r)))
    } else {
      if (unitChildren.length >= maxChildren) {
        setCapacityError(`Lotação máxima atingida (${maxChildren}).`)
        setFormOpen(false)
        return
      }
      const entryTime = data.entryTime || new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      const childName = data.name || 'Criança'
      setChildrenList((p) => [...p, {
        ...data,
        id: Date.now(),
        entryTime,
        unitId: unitId || null,
      }])
      setCapacityError('')
      pushNotification({
        type: 'entry',
        title: 'Entrada / cadastro',
        message: `${childName} registrada às ${entryTime}${unitName ? ` · ${unitName}` : ''}.`,
        path: '/children',
        tenantId,
        unitId,
        forRoles: ['administrador', 'gerente', 'professor'],
      })
    }
    setFormOpen(false)
  }

  const handleDeleteConfirm = () => {
    setChildrenList((p) => p.filter((r) => r.id !== deleteId))
    setDeleteId(null)
  }

  return (
    <Box className="page-container">
      <Box className="page-header">
        <Box>
          <Typography variant="body2" fontWeight={700}>
            {unitChildren.length} / {maxChildren} crianças no parquinho
          </Typography>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: 'var(--app-font-color, #fff)',
              textShadow: '0 1px 2px #000',
              fontWeight: 700,
              opacity: 0.95,
            }}
          >
            Lotação máxima: {maxChildren}
            {atLimit ? ' · limite atingido' : ''}
          </Typography>
        </Box>
        {canAdd && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            className="btn-orange-card"
            disabled={atLimit}
          >
            Adicionar criança
          </Button>
        )}
      </Box>

      {capacityError ? (
        <Typography
          variant="body2"
          sx={{ mb: 1, color: 'var(--app-font-color, #fff)', textShadow: '0 1px 2px #000', fontWeight: 800 }}
        >
          {capacityError}
        </Typography>
      ) : null}

      {unitChildren.length === 0 ? (
        <Typography variant="body2" sx={{ py: 4, textAlign: 'center', color: 'var(--app-font-color, #fff)', textShadow: '0 1px 2px #000' }}>
          Nenhum dado disponível
        </Typography>
      ) : (
        <Stack spacing={1}>
          {unitChildren.map((child) => (
            <ChildCard
              key={child.id}
              child={child}
              presentSession={findActiveByChild(child.id, child.name)}
              onView={() => handleView(child)}
              onEdit={canManage ? () => handleEdit(child) : undefined}
              onDelete={canManage ? () => handleDelete(child.id) : undefined}
              onCall={canCall ? () => handleCall(child) : undefined}
              canRelease={canRelease}
              onRelease={() => handleRelease(child)}
            />
          ))}
        </Stack>
      )}

      <ChildForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initial={editChild}
      />
      <ChildViewDialog
        open={!!viewChild}
        child={viewChild}
        onClose={() => setViewChild(null)}
      />
      <ConfirmDialog
        open={!!deleteId}
        title="Excluir criança"
        message="Tem certeza de que deseja remover esta criança? Esta ação não pode ser desfeita."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
      <CallTypeDialog
        open={!!callChild}
        child={callChild}
        onClose={() => setCallChild(null)}
        onSelect={handleCallType}
      />

      <Dialog open={releaseOpen} onClose={handleCloseRelease} fullWidth maxWidth="xs">
        <DialogTitle>Liberar para o responsável</DialogTitle>
        <DialogContent>
          {releaseError ? (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>{releaseError}</Alert>
          ) : (
            <Box sx={{ textAlign: 'center', pt: 1 }}>
              <Typography variant="subtitle1" fontWeight={800}>
                {pendingExit?.childName}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1.5, opacity: 0.85 }}>
                Mostre este QR ao responsável ({pendingExit?.guardian || 'cadastrado'}) para liberar a saída.
              </Typography>
              {exitPayload ? (
                <Box
                  sx={{
                    display: 'inline-flex',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: '#fff',
                  }}
                >
                  <QRCodeSVG value={exitPayload} size={200} level="M" includeMargin />
                </Box>
              ) : null}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRelease}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
