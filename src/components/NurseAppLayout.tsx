import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NurseWorkspaceSidebar } from './NurseWorkspaceSidebar'
import { WorkspaceUiProvider, useWorkspaceUi } from './workspace-v2'

function NurseWorkspaceFrame() {
  const location = useLocation()
  const { density } = useWorkspaceUi()
  const isRequestWorkspace = location.pathname === '/cabinet' && location.hash === '#request'

  return (
    <div className="nurse-workspace-shell" data-density={density}>
      <div className="nurse-workspace-frame">
        <NurseWorkspaceSidebar />

        <div
          className="nurse-workspace-content"
          data-request-workspace={isRequestWorkspace || undefined}
        >
          <main
            className="nurse-workspace-main"
            data-request-workspace={isRequestWorkspace || undefined}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export function NurseAppLayout() {
  useEffect(() => {
    try {
      const settings = JSON.parse(window.localStorage.getItem('ultramed-nurse-settings') ?? '{}')
      document.documentElement.dataset.nurseContrast = settings.highContrast ? 'high' : 'standard'
      document.documentElement.dataset.nurseMotion = settings.reducedMotion ? 'reduced' : 'standard'
    } catch {
      document.documentElement.dataset.nurseContrast = 'standard'
      document.documentElement.dataset.nurseMotion = 'standard'
    }
  }, [])

  return (
    <WorkspaceUiProvider>
      <NurseWorkspaceFrame />
    </WorkspaceUiProvider>
  )
}

