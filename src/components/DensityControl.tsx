import { cn } from '../lib/format'
import { useWorkspaceUi, type Density } from './workspace-v2'

const densityOptions: Array<{
  value: Density
  label: string
  shortLabel: string
  ariaLabel: string
}> = [
  {
    value: 'compact',
    label: 'Компакт.',
    shortLabel: 'К',
    ariaLabel: 'Компактная плотность интерфейса',
  },
  {
    value: 'standard',
    label: 'Стандарт',
    shortLabel: 'С',
    ariaLabel: 'Стандартная плотность интерфейса',
  },
  {
    value: 'comfortable',
    label: 'Комфорт',
    shortLabel: 'У',
    ariaLabel: 'Комфортная плотность интерфейса',
  },
]

export function DensityControl() {
  const { density, setDensity } = useWorkspaceUi()

  return (
    <div className="nurse-density-control grid gap-1.5" data-density-control>
      <div className="nurse-density-label px-1 text-[12px] font-semibold">Плотность</div>
      <div
        className="nurse-density-options grid grid-cols-3 overflow-visible rounded-[9px] border border-slate-200 bg-white"
        role="group"
        aria-label="Плотность интерфейса"
      >
        {densityOptions.map((option) => {
          const active = density === option.value

          return (
            <button
              key={option.value}
              type="button"
              aria-label={option.ariaLabel}
              aria-pressed={active}
              title={option.ariaLabel}
              onClick={() => setDensity(option.value)}
              className={cn(
                'min-h-10 min-w-0 border-r border-slate-200 px-1 text-[11px] font-medium transition-colors first:rounded-l-[8px] last:rounded-r-[8px] last:border-r-0 focus-visible:z-10',
                active
                  ? 'bg-emerald-50 text-emerald-900'
                  : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <span className="nurse-density-full block truncate">{option.label}</span>
              <span className="nurse-density-short">{option.shortLabel}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
