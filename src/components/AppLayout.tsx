import { LogOut, RotateCcw, UserRound } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDemo } from '../context'
import { getRoomByRole, roleLabels } from '../lib/demoLogic'
import { cn } from '../lib/format'
import { Button } from './ui'
import { WorkspaceSidebar } from './WorkspaceSidebar'

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    state: { role, rooms },
    resetDemo,
  } = useDemo()
  const isNurse = role.startsWith('nurse-')
  const isNurseCabinet = isNurse && location.pathname === '/cabinet'
  const isNurseRequestWorkspace = isNurse && location.pathname === '/cabinet' && location.hash === '#request'
  const room = getRoomByRole(rooms, role)
  const cabinetSubtitle = [room?.title, room?.type].filter(Boolean).join(' · ')

  function handleResetDemo() {
    if (!window.confirm('Сбросить демо и удалить все произведенные действия?')) return

    resetDemo()
  }

  const header = (
    <header
      className={cn(
        'app-topbar flex min-h-[58px] items-center justify-between gap-3 rounded-lg border px-4 py-2',
        isNurseRequestWorkspace && 'lg:ml-[194px]',
      )}
    >
      {isNurseCabinet ? (
        <div className="app-content-layer min-w-0">
          <div className="truncate text-lg font-normal text-slate-950">Кабинет {room?.number ?? ''}</div>
          {cabinetSubtitle ? <div className="mt-0.5 truncate text-sm text-slate-600">{cabinetSubtitle}</div> : null}
        </div>
      ) : (
        <div />
      )}
      <div className="app-content-layer flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" className="min-h-8 px-2 py-1 text-xs font-normal text-slate-400 hover:text-slate-700" onClick={handleResetDemo}>
          <RotateCcw size={14} />
          Сбросить демо
        </Button>
        {!isNurseCabinet ? (
          <div className="app-soft-card flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-normal text-slate-700">
            <UserRound size={16} className="text-slate-500" />
            {roleLabels[role]}
          </div>
        ) : null}
        <Button variant="secondary" className="min-h-9 px-3 py-1.5" onClick={() => navigate('/')}>
          <LogOut size={16} />
          Выйти
        </Button>
      </div>
    </header>
  )

  return (
    <div className="app-workspace-bg h-screen overflow-hidden">
      <div className="relative z-10 flex h-full w-full flex-col items-stretch gap-3 p-3 lg:flex-row lg:pl-2">
        <div className={cn('lg:flex lg:shrink-0 lg:self-start', isNurseRequestWorkspace && 'lg:absolute lg:left-2 lg:top-3 lg:z-20')}>
          <WorkspaceSidebar />
        </div>

        <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-3', isNurseRequestWorkspace && 'lg:w-full')}>
          {header}

          <main className="min-h-0 min-w-0 flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
