import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { NurseAppLayout } from './components/NurseAppLayout'
import { ZoomControl } from './components/ZoomControl'
import { DemoProvider, useDemo } from './context'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { CatalogPage } from './pages/CatalogPage'
import { JournalPage } from './pages/JournalPage'
import { NurseCabinetPage } from './pages/NurseCabinetPage'
import { NurseSettingsPage } from './pages/NurseSettingsPage'
import { ReceiptPage } from './pages/ReceiptPage'
import { ReplenishmentPage } from './pages/ReplenishmentPage'
import { SeniorWorkspacePage } from './pages/SeniorWorkspacePage'
import { StartPage } from './pages/StartPage'
import { StockPage } from './pages/StockPage'
import { SupplierOrderFormationPage } from './pages/SupplierOrderFormationPage'
import { SupplierOrdersPage } from './pages/SupplierOrdersPage'
import { SuppliersPage } from './pages/SuppliersPage'

function RequireSenior({ children }: { children: ReactNode }) {
  const {
    state: { role },
    setRole,
  } = useDemo()

  useEffect(() => {
    if (role !== 'senior-nurse' && role !== 'manager') {
      setRole('senior-nurse')
    }
  }, [role, setRole])

  return role === 'senior-nurse' || role === 'manager' ? children : null
}

function RequireNurse({ children }: { children: ReactNode }) {
  const {
    state: { role },
    setRole,
  } = useDemo()

  const isNurse = role.startsWith('nurse-')

  useEffect(() => {
    if (!isNurse) {
      setRole('nurse-105')
    }
  }, [isNurse, setRole])

  if (!isNurse) return null

  return children
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <Routes location={location}>
      <Route index element={<StartPage />} />

      <Route element={<NurseAppLayout />}>
        <Route
          path="/cabinet/journal"
          element={
            <RequireNurse>
              <JournalPage uiMode="workspace-v2" />
            </RequireNurse>
          }
        />
        <Route
          path="/cabinet/materials"
          element={
            <RequireNurse>
              <CatalogPage readOnly uiMode="workspace-v2" />
            </RequireNurse>
          }
        />
        <Route
          path="/cabinet/settings"
          element={
            <RequireNurse>
              <NurseSettingsPage />
            </RequireNurse>
          }
        />
        <Route
          path="/cabinet"
          element={
            <RequireNurse>
              <NurseCabinetPage />
            </RequireNurse>
          }
        />
      </Route>

      <Route element={<AppLayout />}>
        <Route
          path="/senior"
          element={
            <RequireSenior>
              <SeniorWorkspacePage />
            </RequireSenior>
          }
        />
        <Route
          path="/stock"
          element={
            <RequireSenior>
              <StockPage />
            </RequireSenior>
          }
        />
        <Route
          path="/replenishment"
          element={
            <RequireSenior>
              <ReplenishmentPage />
            </RequireSenior>
          }
        />
        <Route
          path="/orders/forming"
          element={
            <RequireSenior>
              <SupplierOrderFormationPage />
            </RequireSenior>
          }
        />
        <Route
          path="/orders"
          element={
            <RequireSenior>
              <SupplierOrdersPage />
            </RequireSenior>
          }
        />
        <Route
          path="/receipt"
          element={
            <RequireSenior>
              <ReceiptPage />
            </RequireSenior>
          }
        />
        <Route
          path="/suppliers"
          element={
            <RequireSenior>
              <SuppliersPage />
            </RequireSenior>
          }
        />
        <Route
          path="/catalog"
          element={
            <RequireSenior>
              <CatalogPage />
            </RequireSenior>
          }
        />
        <Route
          path="/journal"
          element={
            <RequireSenior>
              <JournalPage />
            </RequireSenior>
          }
        />
        <Route
          path="/analytics"
          element={
            <RequireSenior>
              <AnalyticsPage />
            </RequireSenior>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function LegacyZoomBoundary() {
  const location = useLocation()
  const isNurseRoute =
    location.pathname === '/cabinet' || location.pathname.startsWith('/cabinet/')

  return isNurseRoute ? null : <ZoomControl />
}

function App() {
  return (
    <DemoProvider>
      <BrowserRouter>
        <AnimatedRoutes />
        <LegacyZoomBoundary />
      </BrowserRouter>
    </DemoProvider>
  )
}

export default App
