import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Alert,
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import RefreshIcon from '@mui/icons-material/Refresh'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import GroupsIcon from '@mui/icons-material/Groups'
import PaymentsIcon from '@mui/icons-material/Payments'
import StorefrontIcon from '@mui/icons-material/Storefront'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import { buildSaasMetrics } from '../../saas/buildSaasMetrics'
import { SAAS_OWNER_EMAIL } from '../../saas/owner'
import './saas-owner.scss'

function StatCard({ label, value, hint, tone = 'default' }) {
  return (
    <Box className={`saas-stat saas-stat--${tone}`}>
      <Typography className="saas-stat-label">{label}</Typography>
      <Typography className="saas-stat-value">{value}</Typography>
      {hint ? <Typography className="saas-stat-hint">{hint}</Typography> : null}
    </Box>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

export default function SaasOwnerConsole() {
  const { user, logout, isSaasOwner } = useAuth()
  const { listAllTenants, tick } = useTenant()
  const [query, setQuery] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)

  const metrics = useMemo(() => {
    const tenants = listAllTenants()
    return buildSaasMetrics(tenants)
  }, [listAllTenants, tick, refreshKey])

  const filteredTenants = useMemo(() => {
    const q = query.trim().toLowerCase()
    return metrics.tenants.filter((row) => {
      if (planFilter !== 'all' && row.planId !== planFilter) return false
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (!q) return true
      return (
        String(row.adminEmail || '').includes(q)
        || String(row.adminName || '').toLowerCase().includes(q)
        || String(row.id || '').toLowerCase().includes(q)
      )
    })
  }, [metrics.tenants, query, planFilter, statusFilter])

  if (!isSaasOwner) {
    return <Navigate to="/dashboard" replace />
  }

  const t = metrics.totals

  return (
    <Box className="saas-shell">
      <Box className="saas-topbar">
        <Box>
          <Typography className="saas-kicker">Parquinho Perfect · Console SaaS</Typography>
          <Typography className="saas-title">Painel do vendedor</Typography>
          <Typography className="saas-sub">
            {user?.email || SAAS_OWNER_EMAIL} · visão consolidada de assinantes e receita
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            className="saas-btn-ghost"
            startIcon={<RefreshIcon />}
            onClick={() => setRefreshKey((n) => n + 1)}
          >
            Atualizar
          </Button>
          <Button
            className="saas-btn-ghost"
            startIcon={<LogoutIcon />}
            onClick={() => logout()}
          >
            Sair
          </Button>
        </Stack>
      </Box>

      <Box className="saas-grid-stats">
        <StatCard label="Contas (tenants)" value={t.tenants} hint={`${t.newLast7} em 7d · ${t.newLast30} em 30d`} tone="blue" />
        <StatCard label="MRR" value={t.mrrLabel} hint={`ARR ${t.arrLabel}`} tone="green" />
        <StatCard label="Pagantes ativos" value={t.paidAccounts} hint={`Conversão ${t.conversionPaid}%`} tone="orange" />
        <StatCard label="ARPU" value={t.arpuLabel} hint={`LTV est. ${t.ltvLabel}`} />
        <StatCard label="Em teste" value={t.trialAccounts} hint={`${t.conversionTrial}% da base`} tone="amber" />
        <StatCard label="Grátis" value={t.freeAccounts} hint={`Churn proxy ${t.churnProxy}%`} />
        <StatCard label="Unidades" value={t.units} hint={`Média ${t.avgUnits}/conta`} />
        <StatCard label="Setup" value={`${t.setupRate}%`} hint={`${t.setupDone} concluídos · ${t.setupPending} pendentes`} tone="blue" />
        <StatCard label="Equipe" value={t.managers + t.professors} hint={`${t.managers} ger. · ${t.professors} prof. · ${t.guardians} resp.`} />
        <StatCard label="Expirados / cancel." value={`${t.expiredAccounts} / ${t.canceledAccounts}`} hint="Contas sem acesso pago" tone="orange" />
      </Box>

      <Box className="saas-section">
        <Box className="saas-section-head">
          <StorefrontIcon fontSize="small" />
          <Typography className="saas-section-title">Assinantes por plano</Typography>
        </Box>
        <Box className="saas-plan-grid">
          {metrics.planBreakdown.map((plan) => (
            <Box key={plan.id} className="saas-plan-card">
              <Typography className="saas-plan-name">{plan.name}</Typography>
              <Typography className="saas-plan-price">
                {plan.price > 0
                  ? plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : 'Grátis'}
                {plan.price > 0 ? <span>/mês</span> : null}
              </Typography>
              <Typography className="saas-plan-count">{plan.subscribers} conta(s)</Typography>
              <Typography className="saas-plan-meta">
                Ativos {plan.active} · Teste {plan.trialing} · Exp. {plan.expired}
              </Typography>
              <Typography className="saas-plan-mrr">
                MRR {metrics.formatBrl(plan.mrr)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box className="saas-section">
        <Box className="saas-section-head">
          <PaymentsIcon fontSize="small" />
          <Typography className="saas-section-title">Balanço comercial</Typography>
        </Box>
        <Box className="saas-balance-grid">
          <Box className="saas-balance-card">
            <TrendingUpIcon fontSize="small" />
            <Typography className="saas-balance-label">Receita recorrente mensal</Typography>
            <Typography className="saas-balance-value">{t.mrrLabel}</Typography>
          </Box>
          <Box className="saas-balance-card">
            <GroupsIcon fontSize="small" />
            <Typography className="saas-balance-label">Setup concluído</Typography>
            <Typography className="saas-balance-value">{t.setupDone}/{t.tenants}</Typography>
          </Box>
          <Box className="saas-balance-card">
            <Typography className="saas-balance-label">Cancelados</Typography>
            <Typography className="saas-balance-value">{t.canceledAccounts}</Typography>
          </Box>
          <Box className="saas-balance-card">
            <Typography className="saas-balance-label">Responsáveis vinculados</Typography>
            <Typography className="saas-balance-value">{t.guardians}</Typography>
          </Box>
        </Box>
      </Box>

      <Box className="saas-section">
        <Box className="saas-section-head">
          <Typography className="saas-section-title">Contas / assinantes</Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} className="saas-filters">
          <TextField
            size="small"
            fullWidth
            placeholder="Buscar e-mail, nome ou id"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="saas-field"
          />
          <TextField
            select
            size="small"
            label="Plano"
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="saas-field saas-field--sm"
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="free">Grátis</MenuItem>
            <MenuItem value="basic">Básico</MenuItem>
            <MenuItem value="pro">Pro</MenuItem>
            <MenuItem value="premium">Premium</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="saas-field saas-field--sm"
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="active">Ativo</MenuItem>
            <MenuItem value="trialing">Teste</MenuItem>
            <MenuItem value="expired">Expirado</MenuItem>
            <MenuItem value="canceled">Cancelado</MenuItem>
            <MenuItem value="pending">Pendente</MenuItem>
          </TextField>
        </Stack>

        {filteredTenants.length === 0 ? (
          <Alert severity="info" className="saas-empty">
            Nenhuma conta encontrada com os filtros atuais.
            {t.tenants === 0
              ? ' Ainda não há administradores cadastrados neste dispositivo/nuvem.'
              : ''}
          </Alert>
        ) : (
          <Box className="saas-table-wrap">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Conta</th>
                  <th>Plano</th>
                  <th>Status</th>
                  <th>Valor</th>
                  <th>Unid.</th>
                  <th>Equipe</th>
                  <th>Criado</th>
                  <th>Válido até</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="saas-td-main">{row.adminName || '—'}</div>
                      <div className="saas-td-sub">{row.adminEmail}</div>
                    </td>
                    <td>{row.planName}</td>
                    <td>
                      <span className={`saas-pill saas-pill--${row.status}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      {row.planPrice > 0
                        ? row.planPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : '—'}
                    </td>
                    <td>{row.units}</td>
                    <td>
                      <div className="saas-td-sub">
                        G {row.managers} · P {row.professors} · R {row.guardians}
                      </div>
                    </td>
                    <td>{formatDate(row.createdAt)}</td>
                    <td>{formatDate(row.endsAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </Box>

      <Typography className="saas-footnote">
        Dados agregados dos tenants locais/sincronizados neste ambiente.
        Atualizado em {formatDate(metrics.generatedAt)} {new Date(metrics.generatedAt).toLocaleTimeString('pt-BR')}.
      </Typography>
    </Box>
  )
}
