import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeContextProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { SampleDataProvider } from './context/SampleDataContext'
import { GuardianSessionProvider } from './context/GuardianSessionContext'
import { StaffNotifyProvider } from './context/StaffNotifyContext'
import { CallBridgeProvider } from './context/CallBridgeContext'
import { ParkSettingsProvider } from './context/ParkSettingsContext'
import { PresenceProvider } from './context/PresenceContext'
import { ChatProvider } from './context/ChatContext'
import { RatingsProvider } from './context/RatingsContext'
import { TenantProvider } from './context/TenantContext'
import { AppearanceProvider } from './context/AppearanceContext'
import { AppNotificationsProvider } from './context/AppNotificationsContext'
import NotificationBridge from './components/common/NotificationBridge'
import PhoneFrame from './components/layout/PhoneFrame'
import AppRouter from './router/AppRouter'

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <BrowserRouter basename={routerBasename || undefined}>
      <ThemeContextProvider>
        <AppearanceProvider>
          <TenantProvider>
            <AuthProvider>
              <AppNotificationsProvider>
                <SampleDataProvider>
                  <ParkSettingsProvider>
                    <PresenceProvider>
                      <StaffNotifyProvider>
                        <CallBridgeProvider>
                          <GuardianSessionProvider>
                            <ChatProvider>
                              <RatingsProvider>
                                <PhoneFrame>
                                  <NotificationBridge />
                                  <AppRouter />
                                </PhoneFrame>
                              </RatingsProvider>
                            </ChatProvider>
                          </GuardianSessionProvider>
                        </CallBridgeProvider>
                      </StaffNotifyProvider>
                    </PresenceProvider>
                  </ParkSettingsProvider>
                </SampleDataProvider>
              </AppNotificationsProvider>
            </AuthProvider>
          </TenantProvider>
        </AppearanceProvider>
      </ThemeContextProvider>
    </BrowserRouter>
  )
}
