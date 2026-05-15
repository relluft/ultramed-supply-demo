import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ZoomControl } from './components/ZoomControl'
import { DemoProvider, useDemo } from './context'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { CatalogPage } from './pages/CatalogPage'
import { JournalPage } from './pages/JournalPage'
import { NurseCabinetPage } from './pages/NurseCabinetPage'
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

  useEffect(() => {
    if (role !== 'nurse-105') {
      setRole('nurse-105')
    }
  }, [role, setRole])

  if (role !== 'nurse-105') return null

  return children
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <Routes location={location}>
      <Route index element={<StartPage />} />

      <Route element={<AppLayout />}>
        <Route
          path="/cabinet"
          element={
            <RequireNurse>
              <NurseCabinetPage />
            </RequireNurse>
          }
        />
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

function App() {
  return (
    <DemoProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
      <ZoomControl />
    </DemoProvider>
  )
}

export default App
