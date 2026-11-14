import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { buildUnitsOccupancy } from './unitCapacity'
import { buildDailyHistory } from './unitOccupancyHistory'

function pad(n) {
  return String(n).padStart(2, '0')
}

function stamp() {
  const d = new Date()
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

function sheetToExcel(filename, sheetName, rows) {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  downloadBlob(filename, new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }))
}

function makePdf({ title, subtitle, columns, rows, fileName }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.text(title, 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(80)
  doc.text(subtitle || '', 14, 22)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 28,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ''))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 247, 237] },
  })

  doc.save(fileName)
}

function filterAttendanceByUnit(attendanceList, childrenList, unitId) {
  const list = Array.isArray(attendanceList) ? attendanceList : []
  if (!unitId) return list
  const childIds = new Set(
    (childrenList || [])
      .filter((c) => (c.unitId ? c.unitId === unitId : true))
      .map((c) => String(c.id)),
  )
  return list.filter((a) => {
    if (a.unitId) return a.unitId === unitId
    if (a.childId != null) return childIds.has(String(a.childId))
    return true
  })
}

function filterChildrenByUnit(childrenList, unitId) {
  const list = Array.isArray(childrenList) ? childrenList : []
  if (!unitId) return list
  return list.filter((c) => (c.unitId ? c.unitId === unitId : true))
}

/** Presença / histórico de entradas e saídas */
export function buildPresenceRows({
  attendanceList, childrenList, unitId, unitName,
}) {
  const rows = filterAttendanceByUnit(attendanceList, childrenList, unitId)
  return rows.map((a) => ({
    Data: a.date || '—',
    Criança: a.childName || '—',
    Entrada: a.entryTime || '—',
    Saída: a.exitTime || '—',
    Responsável: a.guardian || '—',
    Unidade: unitName || a.unitName || '—',
  }))
}

/** Crianças presentes / cadastradas na unidade (visão atual) */
export function buildChildrenRows({ childrenList, unitId, unitName }) {
  return filterChildrenByUnit(childrenList, unitId).map((c) => ({
    Nome: c.name || '—',
    Idade: c.age ?? '—',
    Responsável: c.guardian || '—',
    Telefone: c.phone || '—',
    Plano: c.plan || '—',
    Alergias: c.allergies || '—',
    Entrada: c.entryTime || '—',
    Unidade: unitName || '—',
  }))
}

/** Balanço de lotação por unidade + histórico diário */
export function buildBalanceRows({
  units, childrenList, tenantId, activeUnitId,
}) {
  const occ = buildUnitsOccupancy({
    units,
    children: childrenList,
    tenantId,
    activeUnitId,
  })
  const unitRows = occ.rows.map((r) => ({
    Unidade: r.name,
    Presentes: r.present,
    Capacidade: r.max,
    'Vagas livres': r.remaining,
    'Ocupação %': r.pct,
    Status: r.atLimit ? 'Lotação máxima' : (r.nearLimit ? 'Quase cheio' : 'Normal'),
  }))

  const history = buildDailyHistory(
    tenantId,
    (units || []).map((u) => u.id),
    14,
    occ.totals.max,
  ).map((h) => ({
    Data: h.label,
    Presentes: h.presentes,
    Capacidade: h.capacidade,
    'Ocupação %': h.pct,
  }))

  return { unitRows, history, totals: occ.totals }
}

export function exportPresenceExcel(ctx) {
  const rows = buildPresenceRows(ctx)
  if (!rows.length) return { success: false, error: 'Sem dados de presença para exportar.' }
  sheetToExcel(`presenca-${stamp()}.xlsx`, 'Presença', rows)
  return { success: true, count: rows.length }
}

export function exportPresencePdf(ctx) {
  const rows = buildPresenceRows(ctx)
  if (!rows.length) return { success: false, error: 'Sem dados de presença para exportar.' }
  makePdf({
    title: 'Relatório de presença',
    subtitle: `${ctx.unitName || 'Todas as unidades'} · gerado em ${new Date().toLocaleString('pt-BR')}`,
    columns: [
      { header: 'Data', key: 'Data' },
      { header: 'Criança', key: 'Criança' },
      { header: 'Entrada', key: 'Entrada' },
      { header: 'Saída', key: 'Saída' },
      { header: 'Responsável', key: 'Responsável' },
      { header: 'Unidade', key: 'Unidade' },
    ],
    rows,
    fileName: `presenca-${stamp()}.pdf`,
  })
  return { success: true, count: rows.length }
}

export function exportHistoryExcel(ctx) {
  // Histórico = attendance + crianças atuais
  const presence = buildPresenceRows(ctx)
  const children = buildChildrenRows(ctx)
  if (!presence.length && !children.length) {
    return { success: false, error: 'Sem histórico para exportar.' }
  }
  const wb = XLSX.utils.book_new()
  if (presence.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(presence), 'Entradas-Saidas')
  }
  if (children.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(children), 'Criancas')
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  downloadBlob(`historico-${stamp()}.xlsx`, new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }))
  return { success: true, count: presence.length + children.length }
}

export function exportHistoryPdf(ctx) {
  const presence = buildPresenceRows(ctx)
  const children = buildChildrenRows(ctx)
  if (!presence.length && !children.length) {
    return { success: false, error: 'Sem histórico para exportar.' }
  }
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.text('Relatório de histórico', 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(80)
  doc.text(`${ctx.unitName || 'Unidade'} · ${new Date().toLocaleString('pt-BR')}`, 14, 22)
  doc.setTextColor(0)

  let y = 28
  if (presence.length) {
    doc.setFontSize(11)
    doc.text('Entradas e saídas', 14, y)
    autoTable(doc, {
      startY: y + 4,
      head: [['Data', 'Criança', 'Entrada', 'Saída', 'Responsável']],
      body: presence.map((r) => [r.Data, r.Criança, r.Entrada, r.Saída, r.Responsável]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [249, 115, 22], textColor: 255 },
    })
    y = doc.lastAutoTable.finalY + 10
  }
  if (children.length) {
    if (y > 250) {
      doc.addPage()
      y = 16
    }
    doc.setFontSize(11)
    doc.text('Crianças cadastradas', 14, y)
    autoTable(doc, {
      startY: y + 4,
      head: [['Nome', 'Idade', 'Responsável', 'Plano', 'Entrada']],
      body: children.map((r) => [r.Nome, r.Idade, r.Responsável, r.Plano, r.Entrada]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [249, 115, 22], textColor: 255 },
    })
  }
  doc.save(`historico-${stamp()}.pdf`)
  return { success: true, count: presence.length + children.length }
}

export function exportBalanceExcel(ctx) {
  const { unitRows, history } = buildBalanceRows(ctx)
  if (!unitRows.length) return { success: false, error: 'Sem dados de balanço.' }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unitRows), 'Lotacao')
  if (history.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(history), 'Historico-14d')
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  downloadBlob(`balanco-lotacao-${stamp()}.xlsx`, new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }))
  return { success: true, count: unitRows.length }
}

export function exportBalancePdf(ctx) {
  const { unitRows, history, totals } = buildBalanceRows(ctx)
  if (!unitRows.length) return { success: false, error: 'Sem dados de balanço.' }
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.text('Balanço de lotação', 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(80)
  doc.text(
    `Total ${totals.present}/${totals.max} · ${totals.pct}% · ${new Date().toLocaleString('pt-BR')}`,
    14,
    22,
  )
  doc.setTextColor(0)
  autoTable(doc, {
    startY: 28,
    head: [['Unidade', 'Presentes', 'Capacidade', 'Vagas', '%', 'Status']],
    body: unitRows.map((r) => [
      r.Unidade, r.Presentes, r.Capacidade, r['Vagas livres'], r['Ocupação %'], r.Status,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [249, 115, 22], textColor: 255 },
  })
  if (history.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Data', 'Presentes', 'Capacidade', '%']],
      body: history.map((h) => [h.Data, h.Presentes, h.Capacidade, h['Ocupação %']]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [234, 88, 12], textColor: 255 },
    })
  }
  doc.save(`balanco-lotacao-${stamp()}.pdf`)
  return { success: true, count: unitRows.length }
}
