import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Home,
  LogOut,
  PackagePlus,
  PackageSearch,
  Receipt,
  RotateCcw,
  ShoppingCart,
  Truck,
  UserRound,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDemo } from '../context'
import { ZoomControl } from './ZoomControl'
import { getRoomByRole } from '../lib/demoLogic'
import { cn } from '../lib/format'
import type { DemoRole, Room } from '../types/demo'
import { ConnectionStatus } from './ConnectionStatus'

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
      { to: '/orders', label: 'Заказы', icon: ShoppingCart },
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
      { to: '/analytics', label: 'Аналитика', icon: BarChart3 },
      { to: '/journal', label: 'Журнал', icon: ClipboardList },
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
      { to: '/cabinet#my-requests', label: 'История', icon: ClipboardList },
      { to: '/cabinet/materials', label: 'Материалы', icon: BookOpen },
    ],
  },
]

const managerGroups: SidebarGroup[] = [
  {
    title: 'Контроль',
    icon: BarChart3,
    items: [
      { to: '/analytics', label: 'Аналитика', icon: BarChart3 },
      { to: '/journal', label: 'Журнал', icon: ClipboardList },
      { to: '/stock', label: 'Остатки', icon: PackageSearch },
      { to: '/suppliers', label: 'Поставщики', icon: Truck },
    ],
  },
]

const staffProfiles: Record<Exclude<DemoRole, `nurse-${string}`>, { name: string; role: string; initials: string }> = {
  'senior-nurse': {
    name: 'Екатерина Смирнова',
    role: 'Главная мед. сестра',
    initials: 'ЕС',
  },
  manager: {
    name: 'Александр Соколов',
    role: 'Руководитель',
    initials: 'АС',
  },
}


function getAccountProfile(role: DemoRole, room?: Room) {
  if (role.startsWith('nurse-')) {
    return {
      name: room?.number ? `Кабинет ${room.number}` : 'Кабинет',
      role: room?.title ?? 'Стоматологический кабинет',
      initials: room?.number ?? 'К',
    }
  }

  return role === 'senior-nurse' ? staffProfiles['senior-nurse'] : staffProfiles.manager
}

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
  const navigate = useNavigate()
  const {
    state: { role, rooms },
    resetDemo,
  } = useDemo()
  const location = useLocation()
  const groups = role === 'manager' ? managerGroups : role === 'senior-nurse' ? seniorGroups : nurseGroups
  const isNurse = role.startsWith('nurse-')
  const account = getAccountProfile(role, getRoomByRole(rooms, role))

  function handleResetDemo() {
    if (!window.confirm('Сбросить демо и удалить все произведенные действия?')) return

    resetDemo()
  }

  return (
    <aside
      className={cn(
        'app-sidebar flex h-auto flex-col rounded-none border-y-0 border-l-0 border-r p-2 lg:sticky lg:top-0 lg:h-screen lg:shrink-0',
        isNurse ? 'lg:w-[220px] lg:self-start' : 'lg:w-[220px]',
      )}
    >
      <div className="-mx-0.5 rounded-md">
        <div
          className={cn(
            'flex flex-col items-center justify-center px-0',
            isNurse ? 'h-[72px]' : 'h-[78px]',
          )}
        >
          <img
            src="/brand/ultramed-main-logo.svg"
            alt="УльтраМед"
            className="h-auto w-full max-w-none object-contain object-center"
          />
          <div className="mt-0.5 text-center text-[14px] font-normal leading-none text-[#6089bb]">
            СНАБЖЕНИЕ
          </div>
        </div>
      </div>

      <div className="mt-4 py-2.5 pl-0.5 pr-1.5">
        <div className="grid grid-cols-[38px_minmax(0,1fr)] items-center gap-1.5">
          <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200">
            <UserRound size={22} strokeWidth={1.9} />
          </div>
          <div className="min-w-0">
            <div className="truncate whitespace-nowrap text-[14px] font-semibold leading-[1.12] text-[#17212a]">{account.name}</div>
            <div className="mt-1 text-[12.5px] font-medium leading-none text-[#5d756b]">{account.role}</div>
            <ConnectionStatus className="mt-1.5" />
          </div>
        </div>
      </div>

      <nav className="mt-3 grid flex-1 content-start gap-[11px] overflow-x-hidden overflow-y-auto px-2 pb-4">
        {groups.map((group) => {
          return (
            <section key={group.title} className="grid gap-2 border-b border-[#edf3f0] pb-[13px] last:border-b-0">
              <div className="ml-[11px] text-[15px] font-bold uppercase tracking-normal text-[#59656d]">
                {group.title}
              </div>
              <div className="grid gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isItemActive(item.to, location.pathname, location.hash)
                  const className = cn(
                    'group relative grid h-[39px] grid-cols-[18px_minmax(0,1fr)] items-center gap-1.5 overflow-hidden rounded-[9px] px-[6px] pr-[27px] text-left text-[15.1px] leading-none transition-[background,box-shadow,color,transform] duration-150',
                    item.disabled
                      ? 'cursor-not-allowed font-medium text-slate-400 opacity-55'
                      : active
                        ? 'bg-[linear-gradient(135deg,#c9f8e8,#a6edcf)] font-semibold text-[#17212a] shadow-[0_10px_22px_rgba(78,118,96,0.16)] ring-1 ring-inset ring-[#8fddbf]'
                        : 'font-medium text-[#56636d] hover:translate-x-0.5 hover:bg-[rgba(233,243,238,0.84)] hover:text-[#17212a]',
                  )
                  const content = (
                    <>
                      <Icon
                        size={18}
                        strokeWidth={active && !item.disabled ? 2.25 : 1.8}
                        className="shrink-0 text-[#54636d]"
                      />
                      <span
                        className={cn(
                          'min-w-0 truncate',
                          item.disabled
                            ? 'text-slate-400'
                            : active
                              ? 'font-semibold text-[#111827]'
                              : 'text-[#56636d] group-hover:text-[#17212a]',
                        )}
                      >
                        {item.label}
                      </span>
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

      <div className="mt-auto grid gap-1.5 border-t border-[#edf3f0] px-2 pt-2">
        <ZoomControl />
        <button
          type="button"
          onClick={handleResetDemo}
          className="group grid h-8 grid-cols-[18px_minmax(0,1fr)] items-center gap-1.5 rounded-[9px] px-[6px] text-left text-[12.5px] font-medium text-[#64748b] transition hover:bg-[rgba(233,243,238,0.84)] hover:text-[#17212a]"
        >
          <RotateCcw size={17} strokeWidth={1.8} className="text-[#64748b] group-hover:text-[#54636d]" />
          <span className="truncate">Сбросить демо</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="group grid h-8 grid-cols-[18px_minmax(0,1fr)] items-center gap-1.5 rounded-[9px] px-[6px] text-left text-[12.5px] font-medium text-[#17212a] transition hover:bg-[rgba(233,243,238,0.84)]"
        >
          <LogOut size={17} strokeWidth={1.8} className="text-[#54636d]" />
          <span className="truncate">Выйти</span>
        </button>
      </div>
    </aside>
  )
}
