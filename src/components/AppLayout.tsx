import { Outlet } from 'react-router-dom'
import { WorkspaceSidebar } from './WorkspaceSidebar'

export function AppLayout() {
  return (
    <div className="app-workspace-bg h-screen overflow-hidden">
      <div className="app-frame-shell relative z-10 flex h-full w-full flex-col items-stretch lg:flex-row">
        <div className="lg:flex lg:shrink-0">
          <WorkspaceSidebar />
        </div>

        <div className="app-workspace-surface flex min-h-0 min-w-0 flex-1 flex-col p-0">
          <main className="min-h-0 min-w-0 flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
