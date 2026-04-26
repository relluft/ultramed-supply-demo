import { AnimatePresence } from 'framer-motion'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { DemoProvider } from './context'
import { DashboardPage } from './pages/DashboardPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { LandingPage } from './pages/LandingPage'
import { ManagerPage } from './pages/ManagerPage'
import { NeedPage } from './pages/NeedPage'
import { TablePage } from './pages/TablePage'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route index element={<LandingPage />} />
        <Route path="/manager" element={<ManagerPage />} />

        <Route path="/workspace" element={<AppLayout current="workspace" />}>
          <Route index element={<DashboardPage />} />
        </Route>

        <Route path="/workspace/purchase/cases/main/need" element={<AppLayout current="need" />}>
          <Route index element={<NeedPage />} />
        </Route>

        <Route path="/workspace/purchase/drafts/main" element={<AppLayout current="table" />}>
          <Route index element={<TablePage />} />
        </Route>

        <Route path="/workspace/purchase/documents/main" element={<AppLayout current="documents" />}>
          <Route index element={<DocumentsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <DemoProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </DemoProvider>
  )
}

export default App
