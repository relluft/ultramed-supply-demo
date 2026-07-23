import { Outlet, useLocation } from 'react-router-dom'
import { WorkspaceSidebar } from './WorkspaceSidebar'
import { useDemo } from '../context'
import { cn } from '../lib/format'

export function AppLayout() {
  const location = useLocation()
  const {
    state: { role },
  } = useDemo()
  const isNurseRequestWorkspace = role.startsWith('nurse-') && location.pathname === '/cabinet' && location.hash === '#request'

  return (
    <div className="app-workspace-bg h-screen overflow-hidden">
      <div className="app-frame-shell relative z-10 flex h-full w-full flex-col items-stretch lg:flex-row">
        <div className="lg:flex lg:shrink-0">
          <WorkspaceSidebar />
        </div>

        <div
          className={cn(
            'app-workspace-surface flex min-h-0 min-w-0 flex-1 flex-col',
            isNurseRequestWorkspace ? 'p-0' : 'p-3',
          )}
        >
          <main className="min-h-0 min-w-0 flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
