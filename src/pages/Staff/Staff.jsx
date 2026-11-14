import React from 'react'
import {
  Box, Button, Typography, Chip, Card, CardContent, Divider, Stack,
  IconButton, Collapse, ToggleButton, ToggleButtonGroup, Alert, Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PeopleIcon from '@mui/icons-material/People'
import { useSampleData } from '../../context/SampleDataContext'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import StaffForm from './StaffForm'
import StaffScheduleForm from './StaffScheduleForm'
import MonthScheduleDialog from './MonthScheduleDialog'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import ChildActions from '../Children/ChildActions'
import '../../styles/global.scss'

function formatDateLabel(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

function durationLabel(start, end) {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}h ${m}min`
  if (h) return `${h}h`
  return `${m}min`
}

function Field({ label, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem', lineHeight: 1.1 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word', fontSize: '0.8125rem', lineHeight: 1.25 }}>
        {children}
      </Typography>
    </Box>
  )
}

function StaffCard({ member, onEdit, onDelete, canEdit }) {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <Card variant="outlined" className="panel-card" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5, mb: 0.75 }}>
          <Box sx={{ minWidth: 0, flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.1 }}>
                Nome
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ wordBreak: 'break-word', lineHeight: 1.2, fontSize: '0.875rem' }}>
                {member.name}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.1 }}>
                E-mail
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ wordBreak: 'break-word', lineHeight: 1.2, fontSize: '0.875rem' }}>
                {member.email || '—'}
              </Typography>
            </Box>
          </Box>
          {canEdit && <ChildActions onEdit={onEdit} onDelete={onDelete} />}
        </Box>

        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mb: 0.25 }}>
          <Chip
            label={member.status}
            size="small"
            color={member.status === 'Ativo' ? 'success' : member.status === 'De Licença' ? 'warning' : 'default'}
            sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' } }}
          />
          <IconButton
            size="small"
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? 'Ocultar detalhes' : 'Mostrar detalhes'}
            sx={{ ml: 'auto', p: 0.25, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
          >
            <ExpandMoreIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 0.75 }} />
          <Stack spacing={0.75}>
            <Field label="Nome">{member.name || '—'}</Field>
            <Field label="E-mail">{member.email || '—'}</Field>
            <Field label="Telefone">{member.phone || '—'}</Field>
            <Field label="Status">{member.status || '—'}</Field>
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  )
}

function ScheduleShiftCard({ shift, member, onEdit, onDelete, canEdit }) {
  const duration = durationLabel(shift.startTime, shift.endTime)

  return (
    <Card className="panel-card schedule-shift-card" variant="outlined">
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography className="schedule-shift-name" variant="body2" fontWeight={700}>
              {shift.staffName}
            </Typography>
            {member?.phone && (
              <Typography variant="caption" display="block" sx={{ opacity: 0.95 }}>
                {member.phone}
              </Typography>
            )}
            <Box className="schedule-time-range">
              <AccessTimeIcon sx={{ fontSize: 16 }} />
              <Typography component="span" className="schedule-time-text">
                {shift.startTime}
              </Typography>
              <Typography component="span" className="schedule-time-sep">—</Typography>
              <Typography component="span" className="schedule-time-text">
                {shift.endTime}
              </Typography>
              {duration && (
                <Chip label={duration} size="small" className="schedule-duration-chip" />
              )}
            </Box>
          </Box>
          {canEdit && <ChildActions onEdit={onEdit} onDelete={onDelete} />}
        </Box>
      </CardContent>
    </Card>
  )
}

export default function Staff() {
  const { staffList, setStaffList, scheduleList, setScheduleList } = useSampleData()
  const {
    canEditStaff, canRegisterProfessor, unitId, unitName, tenantId, user,
  } = useAuth()
  const { inviteMember, revokeMember, changeMemberEmail, getTenant } = useTenant()
  const [view, setView] = React.useState('escala') // escala | professores
  const [formOpen, setFormOpen] = React.useState(false)
  const [editStaff, setEditStaff] = React.useState(null)
  const [deleteId, setDeleteId] = React.useState(null)
  const [linkError, setLinkError] = React.useState('')

  const [scheduleOpen, setScheduleOpen] = React.useState(false)
  const [editShift, setEditShift] = React.useState(null)
  const [deleteShiftId, setDeleteShiftId] = React.useState(null)
  const [monthView, setMonthView] = React.useState(null)

  const tenant = getTenant(tenantId)
  const canManageProfessors = Boolean(canRegisterProfessor)

  const handleAdd  = () => { setEditStaff(null); setFormOpen(true); setLinkError('') }
  const handleEdit = (s) => { setEditStaff(s); setFormOpen(true); setLinkError('') }

  const handleSave = (data) => {
    setLinkError('')
    if (canManageProfessors) {
      if (!unitId || !tenantId) {
        setLinkError('Seu login não está vinculado a uma unidade. Peça ao administrador.')
        return
      }
      if (editStaff?.memberId && editStaff.email !== data.email) {
        const changed = changeMemberEmail(tenantId, editStaff.memberId, data.email)
        if (!changed.success) {
          setLinkError(changed.error || 'Não foi possível atualizar o e-mail.')
          return
        }
      } else if (!editStaff?.memberId) {
        const linked = inviteMember({
          tenantId,
          unitId,
          email: data.email,
          name: data.name,
          role: 'professor',
          phone: data.phone,
          invitedByEmail: user.email,
          invitedByRole: 'gerente',
        })
        if (!linked.success) {
          setLinkError(linked.error || 'Não foi possível vincular o e-mail à unidade.')
          return
        }
        data.memberId = linked.member.id
      }
    }

    if (editStaff) setStaffList((p) => p.map((r) => (r.id === data.id ? { ...r, ...data } : r)))
    else setStaffList((p) => [...p, { ...data, id: Date.now(), unitId: unitId || null }])
    setFormOpen(false)
  }

  const handleDeleteConfirm = () => {
    const member = staffList.find((r) => r.id === deleteId)
    if (member?.memberId && tenantId) {
      revokeMember(tenantId, member.memberId)
    } else if (member?.email && tenant) {
      const found = tenant.members.find((m) => m.email === member.email && m.role === 'professor')
      if (found) revokeMember(tenantId, found.id)
    }
    setStaffList((p) => p.filter((r) => r.id !== deleteId))
    setScheduleList((p) => p.filter((s) => s.staffId !== deleteId))
    setDeleteId(null)
  }

  const handleSaveShift = (data) => {
    setScheduleList(p => {
      const exists = p.some(s => s.id === data.id)
      if (exists) return p.map(s => s.id === data.id ? data : s)
      return [...p, data]
    })
    setScheduleOpen(false)
  }

  const scheduleByDate = React.useMemo(() => {
    const sorted = [...scheduleList].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.startTime.localeCompare(b.startTime)
    })
    return sorted.reduce((acc, shift) => {
      if (!acc[shift.date]) acc[shift.date] = []
      acc[shift.date].push(shift)
      return acc
    }, {})
  }, [scheduleList])

  const dateKeys = Object.keys(scheduleByDate)

  return (
    <Box className="page-container">
      <Box className="page-header">
        {view === 'professores' && (
          <Typography variant="body2" fontWeight={700}>
            {`${staffList.length} professores da equipe`}
          </Typography>
        )}

        <ToggleButtonGroup
          exclusive
          size="small"
          value={view}
          onChange={(_, v) => v && setView(v)}
          className="staff-view-toggle"
          fullWidth
        >
          <ToggleButton value="escala">
            <CalendarMonthIcon sx={{ fontSize: 18, mr: 0.75 }} />
            Escala
          </ToggleButton>
          <ToggleButton value="professores">
            <PeopleIcon sx={{ fontSize: 18, mr: 0.75 }} />
            Professores
          </ToggleButton>
        </ToggleButtonGroup>

        {view === 'professores' && canManageProfessors && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            className="btn-orange-card"
          >
            Adicionar professor
          </Button>
        )}

        {unitName && (
          <Typography variant="caption" sx={{ color: 'var(--app-font-color, #fff)', opacity: 0.9 }}>
            Unidade: {unitName}
          </Typography>
        )}

        {linkError && (
          <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setLinkError('')}>
            {linkError}
          </Alert>
        )}
      </Box>

      {view === 'professores' && (
        staffList.length === 0 ? (
          <Typography variant="body2" sx={{ py: 4, textAlign: 'center', color: 'var(--app-font-color, #fff)', textShadow: '0 1px 2px #000' }}>
            Nenhum dado disponível
          </Typography>
        ) : (
          <Stack spacing={1}>
            {staffList.map(member => (
              <StaffCard
                key={member.id}
                member={member}
                canEdit={canManageProfessors}
                onEdit={() => handleEdit(member)}
                onDelete={() => setDeleteId(member.id)}
              />
            ))}
          </Stack>
        )
      )}

      {view === 'escala' && (
        <Stack spacing={2}>
          {dateKeys.length === 0 ? (
            <Card className="panel-card" sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" fontWeight={700} gutterBottom>
                Nenhuma escala cadastrada
              </Typography>
              <Typography variant="caption" display="block">
                {canEditStaff
                  ? 'Toque no ícone no canto superior direito para montar a escala.'
                  : 'Nenhuma escala cadastrada no momento.'}
              </Typography>
            </Card>
          ) : (
            <Stack spacing={2} className="schedule-board">
              {dateKeys.map(date => (
                <Box key={date} className="schedule-day-block">
                  <Box className="schedule-day-header">
                    <CalendarMonthIcon sx={{ fontSize: 18 }} />
                    <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1, minWidth: 0 }}>
                      {formatDateLabel(date)}
                    </Typography>
                    <Tooltip title="Ver escala do mês" arrow>
                      <IconButton
                        size="small"
                        className="schedule-month-view-btn"
                        aria-label="Ver escala do mês"
                        onClick={() => {
                          const [y, m] = date.split('-').map(Number)
                          setMonthView({ year: y, month: m, date })
                        }}
                      >
                        <CalendarMonthIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Chip
                      label={`${scheduleByDate[date].length} turno${scheduleByDate[date].length > 1 ? 's' : ''}`}
                      size="small"
                      sx={{ height: 22 }}
                    />
                  </Box>
                  <Stack spacing={1}>
                    {scheduleByDate[date].map(shift => (
                      <ScheduleShiftCard
                        key={shift.id}
                        shift={shift}
                        member={staffList.find(s => s.id === shift.staffId)}
                        canEdit={canEditStaff}
                        onEdit={() => { setEditShift(shift); setScheduleOpen(true) }}
                        onDelete={() => setDeleteShiftId(shift.id)}
                      />
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      )}

      <StaffForm open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSave} initial={editStaff} />
      <StaffScheduleForm
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSave={handleSaveShift}
        staffList={staffList}
        initial={editShift}
      />
      <MonthScheduleDialog
        open={!!monthView}
        onClose={() => setMonthView(null)}
        year={monthView?.year}
        month={monthView?.month}
        date={monthView?.date}
        scheduleList={scheduleList}
        staffList={staffList}
        readOnly={!canEditStaff}
        onMonthChange={(next) => setMonthView(prev => ({ ...prev, ...next }))}
        onEditShift={(shift) => {
          setEditShift(shift)
          setScheduleOpen(true)
        }}
        onDeleteShift={(shift) => setDeleteShiftId(shift.id)}
        onAddShift={() => {
          setEditShift(null)
          setScheduleOpen(true)
        }}
      />
      <ConfirmDialog
        open={!!deleteId} title="Remover professor da equipe"
        message="Tem certeza de que deseja remover este professor da equipe? Esta ação não pode ser desfeita."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
      <ConfirmDialog
        open={!!deleteShiftId} title="Remover turno"
        message="Tem certeza de que deseja remover este turno da escala?"
        onConfirm={() => {
          setScheduleList(p => p.filter(s => s.id !== deleteShiftId))
          setDeleteShiftId(null)
        }}
        onCancel={() => setDeleteShiftId(null)}
      />
    </Box>
  )
}
