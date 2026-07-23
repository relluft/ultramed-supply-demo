import { BookOpen, ClipboardList, Home, LogOut, RotateCcw, Settings, UserRound } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDemo } from '../context'
import { getRoomByRole } from '../lib/demoLogic'
import { cn } from '../lib/format'
import { ConnectionStatus } from './ConnectionStatus'

const nurseNavigation = [
  { to: '/cabinet', label: 'Главная', icon: Home },
  { to: '/cabinet#request', label: 'Заявка', icon: Home },
  { to: '/cabinet#my-requests', label: 'История', icon: ClipboardList },
  { to: '/cabinet/materials', label: 'Материалы', icon: BookOpen },
  { to: '/cabinet/settings', label: 'Настройки', icon: Settings },
]

function isItemActive(to: string, pathname: string, hash: string) {
  if (to.includes('#')) {
    return `${pathname}${hash}` === to
  }

  return pathname === to && !hash
}

export function NurseWorkspaceSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    state: { role, rooms },
    resetDemo,
  } = useDemo()
  const effectiveRole = role.startsWith('nurse-') ? role : 'nurse-105'
  const room = getRoomByRole(rooms, effectiveRole)
  const accountName = room?.number ? `Кабинет ${room.number}` : 'Кабинет'
  const accountRole = room?.title ?? 'Стоматологический кабинет'

  function handleResetDemo() {
    if (!window.confirm('Сбросить демо и удалить все произведенные действия?')) return

    resetDemo()
  }

  return (
    <aside
      className="nurse-workspace-sidebar"
      data-surface="panel"
    >
      <div className="-mx-0.5 rounded-md">
        <div className="nurse-sidebar-brand flex h-[72px] flex-col items-center justify-center px-0">
          <img
            src="/brand/ultramed-main-logo.svg"
            alt="УльтраМед"
            className="nurse-sidebar-logo h-auto w-full max-w-none object-contain object-center"
          />
          <div className="nurse-sidebar-brand-caption mt-0.5 text-center text-[14px] font-normal leading-none">
            СНАБЖЕНИЕ
          </div>
        </div>
      </div>

      <div className="mt-4 py-2.5 pl-0.5 pr-1.5">
        <div className="nurse-sidebar-profile grid grid-cols-[40px_minmax(0,1fr)] items-center gap-1.5">
          <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200">
            <UserRound size={22} strokeWidth={1.9} />
          </div>
          <div className="nurse-sidebar-profile-copy min-w-0">
            <div className="nurse-sidebar-profile-name truncate whitespace-nowrap text-[14px] font-semibold leading-[1.12]">
              {accountName}
            </div>
            <div className="nurse-sidebar-profile-role mt-1 truncate text-[12.5px] font-medium leading-none">
              {accountRole}
            </div>
            <ConnectionStatus className="mt-1.5" />
          </div>
        </div>
      </div>

      <nav
        className="mt-3 grid flex-1 content-start gap-[11px] overflow-x-hidden overflow-y-auto px-2 pb-4"
        aria-label="Навигация кабинета"
      >
        <section className="nurse-sidebar-section grid gap-2 border-b pb-[13px]">
          <div className="nurse-sidebar-group-title ml-[11px] text-[15px] font-bold uppercase tracking-normal">
            Кабинет
          </div>
          <div className="grid gap-1">
            {nurseNavigation.map((item) => {
              const Icon = item.icon
              const active = isItemActive(item.to, location.pathname, location.hash)

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  className={cn(
                    'nurse-sidebar-link',
                    active && 'is-active',
                  )}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.25 : 1.8}
                    className="nurse-sidebar-nav-icon"
                  />
                  <span className="nurse-sidebar-label min-w-0 truncate">
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      </nav>

      <div className="nurse-sidebar-footer mt-auto grid gap-1.5 border-t px-2 pt-2">
        <button
          type="button"
          onClick={handleResetDemo}
          aria-label="Сбросить демо"
          className="nurse-sidebar-footer-button is-muted"
        >
          <RotateCcw size={17} strokeWidth={1.8} className="nurse-sidebar-nav-icon" />
          <span className="nurse-sidebar-footer-label truncate">Сбросить демо</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Выйти"
          className="nurse-sidebar-footer-button"
        >
          <LogOut size={17} strokeWidth={1.8} className="nurse-sidebar-nav-icon" />
          <span className="nurse-sidebar-footer-label truncate">Выйти</span>
        </button>
      </div>
    </aside>
  )
}
