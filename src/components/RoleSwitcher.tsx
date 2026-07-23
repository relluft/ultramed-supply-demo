import { BriefcaseBusiness, UserRound, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDemo } from '../context'
import { roleLabels } from '../lib/demoLogic'
import { cn } from '../lib/format'
import type { DemoRole } from '../types/demo'

const roles: DemoRole[] = ['nurse-101', 'nurse-102', 'nurse-105', 'senior-nurse', 'manager']

export function RoleSwitcher({
  compact = false,
  selectedRole,
  onSelect,
}: {
  compact?: boolean
  selectedRole?: DemoRole
  onSelect?: (role: DemoRole) => void
}) {
  const {
    state: { role },
    setRole,
  } = useDemo()
  const navigate = useNavigate()
  const currentRole = selectedRole ?? role

  function handleSelect(nextRole: DemoRole) {
    if (onSelect) {
      onSelect(nextRole)
      return
    }

    setRole(nextRole)
    navigate(nextRole === 'senior-nurse' ? '/senior' : nextRole === 'manager' ? '/analytics' : '/cabinet')
  }

  return (
    <div className={cn('app-soft-card flex flex-wrap gap-1 rounded-md border p-1', compact && 'max-w-full')}>
      {roles.map((item) => {
        const active = currentRole === item
        const Icon = item === 'senior-nurse' ? UsersRound : item === 'manager' ? BriefcaseBusiness : UserRound

        return (
          <button
            key={item}
            type="button"
            onClick={() => handleSelect(item)}
            className={cn(
              'inline-flex min-h-8 items-center gap-1.5 rounded px-2.5 py-1 text-sm font-semibold transition',
              active ? 'bg-slate-100 text-slate-950 ring-1 ring-inset ring-slate-300' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
            )}
          >
            <Icon size={15} />
            {compact ? roleLabels[item].replace('Кабинет ', 'Каб. ').replace('Главная мед. сестра', 'Главная') : roleLabels[item]}
          </button>
        )
      })}
    </div>
  )
}
