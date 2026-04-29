import { LogOut, RotateCcw, UserRound } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDemo } from '../context'
import { roleLabels } from '../lib/demoLogic'
import { cn } from '../lib/format'
import { Button } from './ui'
import { WorkspaceSidebar } from './WorkspaceSidebar'

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    state: { role },
    resetDemo,
  } = useDemo()
  const isNurse = role.startsWith('nurse-')
  const isNurseRequestWorkspace = isNurse && location.pathname === '/cabinet' && location.hash === '#request'

  function handleResetDemo() {
    if (!window.confirm('Сбросить демо и удалить все произведенные действия?')) return

    resetDemo()
  }

  const header = (
    <header
      className={cn(
        'flex min-h-[58px] items-center justify-end rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm',
        isNurseRequestWorkspace && 'lg:ml-[194px]',
      )}
    >
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" className="min-h-8 px-2 py-1 text-xs font-semibold text-slate-400 hover:text-slate-700" onClick={handleResetDemo}>
          <RotateCcw size={14} />
          Сбросить демо
        </Button>
        <div className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
          <UserRound size={16} className="text-slate-500" />
          {roleLabels[role]}
        </div>
        <Button variant="secondary" className="min-h-9 px-3 py-1.5" onClick={() => navigate('/')}>
          <LogOut size={16} />
          Выйти
        </Button>
      </div>
    </header>
  )

  return (
    <div className="h-screen overflow-hidden bg-slate-100">
      <div className="relative flex h-full w-full flex-col gap-2 p-2 lg:flex-row lg:pl-1">
        <div className={cn(isNurseRequestWorkspace && 'lg:absolute lg:left-1 lg:top-0 lg:z-20')}>
          <WorkspaceSidebar />
        </div>

        <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-2', isNurseRequestWorkspace && 'lg:w-full')}>
          {header}

          <main className="min-h-0 min-w-0 flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
