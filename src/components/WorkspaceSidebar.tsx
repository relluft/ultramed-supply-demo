import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Home,
  PackagePlus,
  PackageSearch,
  Receipt,
  ShoppingCart,
  Truck,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useDemo } from '../context'
import { cn } from '../lib/format'

type SidebarItem = {
  to: string
  label: string
  icon: typeof BarChart3
  disabled?: boolean
}

type SidebarGroup = {
  title: string
  icon: typeof BarChart3
  items: SidebarItem[]
}

const seniorGroups: SidebarGroup[] = [
  {
    title: 'Операции',
    icon: ClipboardList,
    items: [
      { to: '/senior#requests', label: 'Заявки', icon: ClipboardList },
      { to: '/replenishment', label: 'Пополнение', icon: PackagePlus },
      { to: '/orders', label: 'Заказы поставщикам', icon: ShoppingCart },
      { to: '/receipt', label: 'Приход', icon: Receipt },
    ],
  },
  {
    title: 'Склад',
    icon: PackageSearch,
    items: [
      { to: '/stock', label: 'Остатки', icon: PackageSearch },
    ],
  },
  {
    title: 'Контроль',
    icon: BarChart3,
    items: [
      { to: '/analytics', label: 'Аналитические отчеты', icon: BarChart3 },
    ],
  },
  {
    title: 'Справочники',
    icon: BookOpen,
    items: [
      { to: '/catalog', label: 'Материалы', icon: BookOpen },
      { to: '/suppliers', label: 'Поставщики', icon: Truck },
    ],
  },
]

const nurseGroups: SidebarGroup[] = [
  {
    title: 'Кабинет',
    icon: Home,
    items: [
      { to: '/cabinet', label: 'Главная', icon: Home },
      { to: '/cabinet#request', label: 'Заявка', icon: Home },
      { to: '/cabinet#my-requests', label: 'История заявок', icon: ClipboardList },
    ],
  },
]

const managerGroups: SidebarGroup[] = [
  {
    title: 'Контроль',
    icon: BarChart3,
    items: [
      { to: '/analytics', label: 'Аналитические отчеты', icon: BarChart3 },
      { to: '/journal', label: 'Журнал', icon: ClipboardList },
      { to: '/stock', label: 'Остатки', icon: PackageSearch },
      { to: '/suppliers', label: 'Поставщики', icon: Truck },
    ],
  },
]

function isItemActive(to: string, pathname: string, hash: string) {
  const current = `${pathname}${hash}`

  if (to.includes('#')) {
    return current === to
  }

  if (to === '/orders' && pathname.startsWith('/orders')) {
    return !hash
  }

  return pathname === to && !hash
}

export function WorkspaceSidebar() {
  const {
    state: { role },
  } = useDemo()
  const location = useLocation()
  const groups = role === 'manager' ? managerGroups : role === 'senior-nurse' ? seniorGroups : nurseGroups
  const isNurse = role.startsWith('nurse-')

  return (
    <aside
      className={cn(
        'app-sidebar rounded-lg border p-2 lg:sticky lg:top-3 lg:shrink-0',
        isNurse ? 'lg:h-auto lg:w-[186px] lg:self-start' : 'lg:h-[calc(100vh-1.5rem)] lg:w-[218px]',
      )}
    >
      <div className={cn('flex flex-col items-center justify-center rounded-md px-2.5', isNurse ? 'h-14' : 'h-16')}>
        <img
          src="/brand/ultramed-main-logo.svg"
          alt="УльтраМед"
          className={cn('h-auto max-w-full object-contain object-center', isNurse ? 'w-[132px]' : 'w-[156px]')}
        />
        <div className="mt-0.5 text-center text-[12px] font-normal leading-none text-[#6089bb]">
          СНАБЖЕНИЕ
        </div>
      </div>

      <nav className="mt-3 grid gap-3 overflow-y-auto pr-0.5">
        {groups.map((group) => {
          const GroupIcon = group.icon

          return (
            <section key={group.title}>
              <div className="mb-1.5 flex items-center gap-2 px-2 text-[11px] font-normal uppercase tracking-wide text-slate-500">
                <GroupIcon size={13} />
                {group.title}
              </div>
              <div className="relative grid gap-0.5 pl-2">
                <div className="absolute bottom-2 left-[13px] top-1 w-px bg-slate-200" />
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isItemActive(item.to, location.pathname, location.hash)
                  const className = cn(
                    'relative flex min-h-7 items-center gap-2 rounded-md py-1 pl-4 pr-2 text-[13px] font-normal leading-4 transition',
                    item.disabled
                      ? 'cursor-not-allowed text-slate-400 opacity-55'
                      : active
                        ? 'bg-slate-100 pr-6 text-slate-950 ring-1 ring-inset ring-slate-300'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
                  )
                  const content = (
                    <>
                      <span
                        className={cn(
                          'absolute left-[3px] top-1/2 h-px w-3 -translate-y-1/2',
                          active && !item.disabled ? 'bg-transparent' : 'bg-slate-200',
                        )}
                      />
                      <Icon size={15} className="shrink-0" />
                      <span className="min-w-0">{item.label}</span>
                      {active && !item.disabled ? (
                        <span className="absolute right-2 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-slate-500" />
                      ) : null}
                    </>
                  )

                  return item.disabled ? (
                    <span key={item.to} aria-disabled="true" className={className}>
                      {content}
                    </span>
                  ) : (
                    <Link key={item.to} to={item.to} className={className}>
                      {content}
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </nav>
    </aside>
  )
}
