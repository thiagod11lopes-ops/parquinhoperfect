import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Stack, Button, Alert, MenuItem, TextField,
} from '@mui/material'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import TableViewIcon from '@mui/icons-material/TableView'
import AssessmentIcon from '@mui/icons-material/Assessment'
import HistoryIcon from '@mui/icons-material/History'
import GroupsIcon from '@mui/icons-material/Groups'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import { useSampleData } from '../../context/SampleDataContext'
import {
  exportPresenceExcel,
  exportPresencePdf,
  exportHistoryExcel,
  exportHistoryPdf,
  exportBalanceExcel,
  exportBalancePdf,
} from '../../utils/exportReports'
import '../../styles/global.scss'

const REPORTS = [
  {
    id: 'presence',
    title: 'Presença',
    hint: 'Entradas e saídas registradas',
    icon: <GroupsIcon fontSize="small" />,
    excel: exportPresenceExcel,
    pdf: exportPresencePdf,
  },
  {
    id: 'balance',
    title: 'Balanço de lotação',
    hint: 'Ocupação por unidade e histórico',
    icon: <AssessmentIcon fontSize="small" />,
    excel: exportBalanceExcel,
    pdf: exportBalancePdf,
  },
  {
    id: 'history',
    title: 'Histórico',
    hint: 'Entradas/saídas + crianças cadastradas',
    icon: <HistoryIcon fontSize="small" />,
    excel: exportHistoryExcel,
    pdf: exportHistoryPdf,
  },
]

export default function Relatorios() {
  const {
    isAdmin, tenantId, unitId, unitName, user,
  } = useAuth()
  const { getTenant } = useTenant()
  const { childrenList, attendanceList } = useSampleData()
  const tenant = getTenant(tenantId)
  const units = tenant?.units || []

  const [selectedUnitId, setSelectedUnitId] = useState(unitId || (units[0]?.id || ''))
  const [feedback, setFeedback] = useState(null)
  const [busy, setBusy] = useState(null)

  const selectedUnit = useMemo(
    () => units.find((u) => u.id === selectedUnitId) || null,
    [units, selectedUnitId],
  )

  const exportUnitId = isAdmin ? (selectedUnitId || null) : unitId
  const exportUnitName = isAdmin
    ? (selectedUnit?.name || 'Todas as unidades')
    : (unitName || 'Unidade')

  const ctx = useMemo(() => {
    const scopedUnits = isAdmin
      ? (selectedUnitId ? units.filter((u) => u.id === selectedUnitId) : units)
      : units.filter((u) => u.id === unitId)
    return {
      attendanceList,
      childrenList,
      units: scopedUnits,
      tenantId,
      activeUnitId: unitId,
      unitId: exportUnitId,
      unitName: exportUnitName,
    }
  }, [
    attendanceList, childrenList, units, isAdmin, tenantId, unitId,
    selectedUnitId, exportUnitId, exportUnitName,
  ])

  const runExport = async (report, format) => {
    setFeedback(null)
    setBusy(`${report.id}-${format}`)
    try {
      const fn = format === 'pdf' ? report.pdf : report.excel
      const result = fn(ctx)
      if (!result.success) {
        setFeedback({ ok: false, text: result.error || 'Falha ao exportar.' })
        return
      }
      setFeedback({
        ok: true,
        text: `${report.title} exportado em ${format.toUpperCase()} (${result.count} registro(s)).`,
      })
    } catch (err) {
      setFeedback({ ok: false, text: err?.message || 'Erro ao gerar o arquivo.' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Box className="page-container relatorios-page">
      <Box className="relatorios-intro panel-card">
        <Typography className="relatorios-intro-title">Relatórios exportáveis</Typography>
        <Typography className="relatorios-intro-sub">
          Gere PDF ou Excel de presença, balanço e histórico
          {exportUnitName ? ` · ${exportUnitName}` : ''}.
        </Typography>

        {isAdmin && units.length > 0 && (
          <TextField
            select
            size="small"
            fullWidth
            label="Unidade do relatório"
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            className="relatorios-unit-field"
            sx={{ mt: 1.5 }}
          >
            {units.map((u) => (
              <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      {feedback && (
        <Alert
          severity={feedback.ok ? 'success' : 'error'}
          sx={{ mt: 1.5, borderRadius: 2 }}
          onClose={() => setFeedback(null)}
        >
          {feedback.text}
        </Alert>
      )}

      <Stack spacing={1.25} sx={{ mt: 2 }}>
        {REPORTS.map((report) => (
          <Box key={report.id} className="relatorios-card panel-card">
            <Box className="relatorios-card-head">
              <span className="relatorios-card-icon" aria-hidden>{report.icon}</span>
              <Box className="relatorios-card-copy">
                <Typography className="relatorios-card-title">{report.title}</Typography>
                <Typography className="relatorios-card-hint">{report.hint}</Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1} className="relatorios-card-actions">
              <Button
                className="btn-orange-card"
                startIcon={<TableViewIcon />}
                disabled={Boolean(busy)}
                onClick={() => runExport(report, 'excel')}
                sx={{ flex: 1, minWidth: 0 }}
              >
                {busy === `${report.id}-excel` ? 'Gerando…' : 'Excel'}
              </Button>
              <Button
                className="btn-orange-card"
                startIcon={<PictureAsPdfIcon />}
                disabled={Boolean(busy)}
                onClick={() => runExport(report, 'pdf')}
                sx={{ flex: 1, minWidth: 0 }}
              >
                {busy === `${report.id}-pdf` ? 'Gerando…' : 'PDF'}
              </Button>
            </Stack>
          </Box>
        ))}
      </Stack>

      <Typography className="relatorios-footnote">
        Arquivos gerados no dispositivo de {user?.name || 'usuário'}.
        O Excel abre no Microsoft Excel / LibreOffice; o PDF no leitor padrão.
      </Typography>
    </Box>
  )
}
