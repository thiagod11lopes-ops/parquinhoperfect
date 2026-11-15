import React, { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import Sidebar from './Sidebar'
import Header from './Header'
import IncomingCallOverlay from '../../pages/Responsavel/IncomingCallOverlay'
import ProfessorCallOverlay from '../staff/ProfessorCallOverlay'
import StaffNotifyBanner from '../common/StaffNotifyBanner'
import HandoverRatingGate from '../ratings/HandoverRatingGate'
import AdminOnboarding from '../../pages/Onboarding/AdminOnboarding'
import AdminUnitPicker from '../../pages/Unidades/AdminUnitPicker'
import SubscriptionGate from '../billing/SubscriptionGate'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import '../../styles/layout.scss'

const DRAWER_WIDTH = 280

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const {
    isAdmin, isResponsavel, isProfessor, isGerente, tenantId, unitId, clearActiveUnit,
  } = useAuth()
  const { getTenant } = useTenant()
  const tenant = isAdmin ? getTenant(tenantId) : null
  const needsOnboarding = Boolean(isAdmin && tenant && !tenant.setupCompleted)
  const unitStillExists = Boolean(
    !unitId || tenant?.units?.some((u) => u.id === unitId),
  )
  const needsUnitPick = Boolean(
    isAdmin && tenant?.setupCompleted && (!unitId || !unitStillExists),
  )

  useEffect(() => {
    if (isAdmin && unitId && tenant && !unitStillExists) {
      clearActiveUnit()
    }
  }, [isAdmin, unitId, tenant, unitStillExists, clearActiveUnit])

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev)

  if (needsOnboarding) {
    return <AdminOnboarding />
  }

  if (needsUnitPick) {
    return <AdminUnitPicker />
  }

  return (
    <Box className="layout-root">
      <Sidebar
        drawerWidth={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        onClose={handleDrawerToggle}
      />
      <Box className="layout-main">
        <Header onMenuClick={handleDrawerToggle} />
        <StaffNotifyBanner />
        <Box component="main" className="layout-content">
          <SubscriptionGate>
            <Outlet />
          </SubscriptionGate>
        </Box>
      </Box>
      {isResponsavel && <IncomingCallOverlay />}
      {(isProfessor || isGerente) && <ProfessorCallOverlay />}
      {(isResponsavel || isProfessor) && <HandoverRatingGate />}
    </Box>
  )
}
