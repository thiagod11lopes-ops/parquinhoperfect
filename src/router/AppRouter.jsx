import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import Login      from '../pages/Login/Login'
import Signup     from '../pages/Signup/Signup'
import Dashboard  from '../pages/Dashboard/Dashboard'
import Children   from '../pages/Children/Children'
import Staff      from '../pages/Staff/Staff'
import Balanco    from '../pages/Balanco/Balanco'
import Historico  from '../pages/Historico/Historico'
import Activities from '../pages/Activities/Activities'
import ResponsavelHome from '../pages/Responsavel/ResponsavelHome'
import ResponsavelQr from '../pages/Responsavel/ResponsavelQr'
import ResponsavelSaida from '../pages/Responsavel/ResponsavelSaida'
import ResponsavelAlertas from '../pages/Responsavel/ResponsavelAlertas'
import ResponsavelHistorico from '../pages/Responsavel/ResponsavelHistorico'
import Chat from '../pages/Chat/Chat'
import Informacoes from '../pages/Informacoes/Informacoes'
import Avaliacoes from '../pages/Avaliacoes/Avaliacoes'
import Unidades from '../pages/Unidades/Unidades'
import Configuracao from '../pages/Configuracao/Configuracao'
import Relatorios from '../pages/Relatorios/Relatorios'
import Presenca from '../pages/Presenca/Presenca'
import Planos from '../pages/Planos/Planos'
import SaasOwnerConsole from '../pages/SaasOwner/SaasOwnerConsole'
import { useAuth } from '../context/AuthContext'

function AuthRedirect() {
  const { isAuthenticated, homeRoute } = useAuth()
  return isAuthenticated ? <Navigate to={homeRoute} replace /> : <Navigate to="/" replace />
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/"        element={<Login />} />
      <Route path="/login"   element={<Navigate to="/" replace />} />
      <Route path="/signup"  element={<Signup />} />

      {/* Console do vendedor SaaS — sistema separado do app da creche */}
      <Route
        path="/saas"
        element={(
          <ProtectedRoute>
            <SaasOwnerConsole />
          </ProtectedRoute>
        )}
      />

      <Route element={<Layout />}>
        <Route path="dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="children"   element={<ProtectedRoute><Children /></ProtectedRoute>} />
        <Route path="staff"      element={<ProtectedRoute><Staff /></ProtectedRoute>} />
        <Route path="historico"  element={<ProtectedRoute><Historico /></ProtectedRoute>} />
        <Route path="balanco"    element={<ProtectedRoute><Balanco /></ProtectedRoute>} />
        <Route path="activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
        <Route path="chat"       element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="informacoes" element={<ProtectedRoute><Informacoes /></ProtectedRoute>} />
        <Route path="avaliacoes" element={<ProtectedRoute><Avaliacoes /></ProtectedRoute>} />
        <Route path="unidades" element={<ProtectedRoute><Unidades /></ProtectedRoute>} />
        <Route path="configuracao" element={<ProtectedRoute><Configuracao /></ProtectedRoute>} />
        <Route path="planos" element={<ProtectedRoute><Planos /></ProtectedRoute>} />
        <Route path="relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
        <Route path="presenca" element={<ProtectedRoute><Presenca /></ProtectedRoute>} />

        <Route path="responsavel" element={<ProtectedRoute><ResponsavelHome /></ProtectedRoute>} />
        <Route path="responsavel/qr" element={<ProtectedRoute><ResponsavelQr /></ProtectedRoute>} />
        <Route path="responsavel/saida" element={<ProtectedRoute><ResponsavelSaida /></ProtectedRoute>} />
        <Route path="responsavel/alertas" element={<ProtectedRoute><ResponsavelAlertas /></ProtectedRoute>} />
        <Route path="responsavel/historico" element={<ProtectedRoute><ResponsavelHistorico /></ProtectedRoute>} />
        <Route path="responsavel/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="responsavel/informacoes" element={<ProtectedRoute><Informacoes /></ProtectedRoute>} />
        <Route path="parents" element={<Navigate to="/responsavel" replace />} />
      </Route>

      <Route path="*" element={<AuthRedirect />} />
    </Routes>
  )
}
