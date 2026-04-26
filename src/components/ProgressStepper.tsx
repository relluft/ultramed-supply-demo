import { ClipboardList, FileInput, FileSpreadsheet, Files } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDemo } from '../context'
import { cn } from '../lib/format'
import type { StageId } from '../types/demo'

const stages: Array<{
  id: StageId
  label: string
  to: string
  icon: typeof ClipboardList
}> = [
  { id: 'workspace', label: 'Рабочая область', to: '/workspace', icon: ClipboardList },
  { id: 'need', label: 'Потребность', to: '/workspace/purchase/cases/main/need', icon: FileInput },
  { id: 'table', label: 'Рабочая таблица', to: '/workspace/purchase/drafts/main', icon: FileSpreadsheet },
  { id: 'documents', label: 'Документы', to: '/workspace/purchase/documents/main', icon: Files },
]

export function ProgressStepper({ current, compact = false }: { current: StageId; compact?: boolean }) {
  const {
    state: { completedStages },
  } = useDemo()

  if (compact) {
    return (
      <div className="rounded-[22px] border border-neutral-200 bg-white/88 px-3 py-2.5 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Путь закупки
          </div>
          {stages.map((stage, index) => {
            const Icon = stage.icon
            const isActive = stage.id === current
            const isCompleted = completedStages.includes(stage.id)

            return (
              <Link
                key={stage.id}
                to={stage.to}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition hover:bg-neutral-50',
                  isActive
                    ? 'border-neutral-900 bg-white text-neutral-950 shadow-sm'
                    : 'border-neutral-200 bg-white text-neutral-600',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
                    isCompleted || isActive ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500',
                  )}
                >
                  {isActive ? <Icon size={12} /> : index + 1}
                </span>
                {stage.label}
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[28px] border border-neutral-200 bg-white/86 p-4 shadow-sm backdrop-blur md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Путь закупки
          </div>
          <div className="mt-1 text-sm text-neutral-500">
            {completedStages.length} из {stages.length} этапов отмечены
          </div>
        </div>
        <div className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">
          Закупочный цикл
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {stages.map((stage, index) => {
          const Icon = stage.icon
          const isActive = stage.id === current
          const isCompleted = completedStages.includes(stage.id)

          return (
            <Link
              key={stage.id}
              to={stage.to}
              className={cn(
                'min-h-[112px] rounded-[22px] border bg-white p-3.5 transition hover:-translate-y-0.5 hover:bg-neutral-50',
                isActive ? 'border-neutral-900' : 'border-neutral-200',
              )}
            >
              <div className="flex h-full flex-col justify-between gap-5">
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border',
                      isCompleted || isActive
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-500',
                    )}
                  >
                    <Icon size={16} />
                  </div>
                  <div
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                      isCompleted
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-500',
                    )}
                  >
                    {index + 1}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-950">{stage.label}</div>
                  <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    {isActive ? 'Текущий этап' : isCompleted ? 'Готово' : 'Перейти'}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
