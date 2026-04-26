import { CircleHelp, FolderHeart, RotateCcw, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDemo } from '../context'
import { formatNumber } from '../lib/format'
import { Button } from './ui'

function formatTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function WorkspaceSidebar() {
  const {
    state: { recentCycles, rows },
    resetDemo,
  } = useDemo()

  return (
    <aside className="sticky top-5 flex h-[calc(100vh-2.5rem)] w-full flex-col overflow-hidden rounded-[30px] border border-neutral-200 bg-white/86 p-5 shadow-sm backdrop-blur">
      <Link to="/" className="rounded-[24px] border border-neutral-200 bg-white p-4 transition hover:bg-neutral-50">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-200 bg-white text-lg font-semibold text-neutral-950">
            А
          </div>
          <div>
            <div className="text-lg font-semibold text-neutral-950">Администратор</div>
            <div className="mt-1 text-sm text-neutral-500">Рабочая область</div>
          </div>
        </div>
      </Link>

      <div className="mt-5 space-y-2">
        {[
          { to: '/workspace', icon: FolderHeart, label: 'Рабочая область' },
          { icon: Settings2, label: 'Настройки' },
          { icon: CircleHelp, label: 'Помощь' },
        ].map((item) => {
          const Icon = item.icon
          const content = (
            <>
              <Icon size={16} />
              {item.label}
            </>
          )
          const className =
            'inline-flex w-full items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:-translate-y-0.5 hover:bg-neutral-50'

          return item.to ? (
            <Link key={item.label} to={item.to} className={className}>
              {content}
            </Link>
          ) : (
            <button key={item.label} className={className}>
              {content}
            </button>
          )
        })}
        <Button className="w-full" variant="secondary" onClick={resetDemo}>
          <RotateCcw size={16} />
          Сброс
        </Button>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between px-1">
          <div className="text-sm font-semibold text-neutral-950">Последние циклы</div>
          <div className="text-xs text-neutral-500">{formatNumber(recentCycles.length)} активных</div>
        </div>
        <div className="mt-3 space-y-2.5">
          {recentCycles.length ? (
            recentCycles.map((cycle) => (
              <Link
                key={cycle.id}
                to="/workspace/purchase/cases/main/need"
                className="block rounded-[22px] border border-neutral-200 bg-white px-4 py-4 transition hover:bg-neutral-50"
              >
                <div className="text-sm font-semibold text-neutral-950">{cycle.title}</div>
                <div className="mt-2 text-sm leading-6 text-neutral-500">{cycle.subtitle}</div>
                <div className="mt-3 text-xs text-neutral-400">{formatTime(cycle.createdAt)}</div>
              </Link>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">
              Пока пусто.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-1">
          <div className="text-sm font-semibold text-neutral-950">История</div>
          <div className="text-xs text-neutral-500">{rows.length} строк</div>
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-[22px] border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-500">
          {rows.length
            ? 'Демо-цикл загружен. Таблица готова к проверке и формированию документов.'
            : 'События появятся после создания закупочного цикла.'}
        </div>
      </div>
    </aside>
  )
}
