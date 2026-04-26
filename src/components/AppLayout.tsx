import { CircleHelp, FolderHeart, RotateCcw, Settings2 } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { useDemo } from '../context'
import { cn } from '../lib/format'
import type { StageId } from '../types/demo'
import { ProgressStepper } from './ProgressStepper'
import { WorkspaceSidebar } from './WorkspaceSidebar'

function CompactWorkspaceSidebar() {
  const { resetDemo } = useDemo()

  return (
    <aside className="sticky top-4 flex h-auto flex-col items-center gap-2 rounded-[24px] border border-neutral-200 bg-white/90 px-2 py-3 shadow-sm backdrop-blur">
      <Link
        to="/workspace"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50"
        title="Рабочая область"
      >
        А
      </Link>
      <Link
        to="/workspace"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-950 transition hover:bg-neutral-50"
        title="Рабочая область"
      >
        <FolderHeart size={15} />
      </Link>
      <button
        className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50"
        title="Настройки"
      >
        <Settings2 size={15} />
      </button>
      <button
        className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50"
        title="Помощь"
      >
        <CircleHelp size={15} />
      </button>
      <button
        onClick={resetDemo}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50"
        title="Сброс"
      >
        <RotateCcw size={15} />
      </button>
    </aside>
  )
}

export function AppLayout({ current }: { current: StageId }) {
  const isTableWorkspace = current === 'table'

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className={cn(
          'mx-auto flex min-h-screen w-full items-start px-4 py-5 md:px-6 lg:px-8',
          isTableWorkspace ? 'max-w-none gap-3 lg:px-4' : 'max-w-[1880px] gap-6',
        )}
      >
        {isTableWorkspace ? (
          <div className="hidden w-[64px] shrink-0 xl:block">
            <CompactWorkspaceSidebar />
          </div>
        ) : (
          <div className="hidden w-[326px] shrink-0 xl:block">
            <WorkspaceSidebar />
          </div>
        )}

        <div className={cn('flex min-w-0 flex-1 flex-col', isTableWorkspace ? 'gap-3' : 'gap-5')}>
          <ProgressStepper current={current} compact={isTableWorkspace} />
          <main className="w-full flex-1 pb-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
