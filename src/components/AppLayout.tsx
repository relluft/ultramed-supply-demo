import { RotateCcw } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { useDemo } from '../context'
import { roleLabels } from '../lib/demoLogic'
import { Button, StatusPill } from './ui'
import { RoleSwitcher } from './RoleSwitcher'
import { WorkspaceSidebar } from './WorkspaceSidebar'

export function AppLayout() {
  const {
    state: { role, uiMessage },
    resetDemo,
  } = useDemo()

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-3 px-3 py-3 lg:flex-row lg:gap-4 lg:px-4">
        <WorkspaceSidebar />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <header className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-sm font-bold text-white">
                UM
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold text-slate-950">UltraMed Supply</div>
                  <StatusPill tone="info">Демо на mock-данных</StatusPill>
                </div>
                <div className="mt-0.5 truncate text-sm text-slate-500">
                  Роль: {roleLabels[role]}
                  {uiMessage ? <span className="ml-2 text-emerald-700">{uiMessage}</span> : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <RoleSwitcher compact />
              <Button variant="secondary" onClick={resetDemo}>
                <RotateCcw size={16} />
                Сброс
              </Button>
            </div>
          </header>

          <main className="min-w-0 flex-1 pb-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
