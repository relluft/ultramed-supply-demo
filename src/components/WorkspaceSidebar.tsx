import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Home,
  Inbox,
  PackageCheck,
  PackageSearch,
  Receipt,
  ShoppingCart,
  Truck,
  Users,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useDemo } from '../context'
import { roleToRoomId } from '../lib/demoLogic'
import { cn } from '../lib/format'

const seniorNav = [
  { to: '/senior', label: 'Рабочий стол', icon: Inbox },
  { to: '/stock', label: 'Склад', icon: PackageSearch },
  { to: '/replenishment', label: 'Пополнение', icon: PackageCheck },
  { to: '/orders', label: 'Заказы', icon: ShoppingCart },
  { to: '/receipt', label: 'Приход', icon: Receipt },
  { to: '/suppliers', label: 'Поставщики', icon: Truck },
  { to: '/catalog', label: 'Справочник', icon: BookOpen },
  { to: '/journal', label: 'Журнал', icon: ClipboardList },
  { to: '/analytics', label: 'Аналитика', icon: BarChart3 },
]

const nurseNav = [
  { to: '/cabinet', label: 'Кабинет', icon: Home },
  { to: '/cabinet#my-requests', label: 'Мои заявки', icon: ClipboardList },
]

export function WorkspaceSidebar() {
  const {
    state: { role, rooms, requests, replenishment, orders },
  } = useDemo()
  const roomId = roleToRoomId(role)
  const room = rooms.find((item) => item.id === roomId)
  const nav = role === 'senior-nurse' ? seniorNav : nurseNav
  const activeReplenishment = replenishment.filter((line) => !line.closedAt).length
  const waitingReceipt = orders.filter((order) => order.status === 'waiting-receipt').length

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-[252px] lg:shrink-0">
      <div className="flex items-center gap-3 rounded-md bg-slate-50 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white font-semibold text-emerald-800">
          UM
        </div>
        <div>
          <div className="font-semibold text-slate-950">UltraMed</div>
          <div className="text-xs text-slate-500">Контур снабжения</div>
        </div>
      </div>

      <nav className="mt-3 grid gap-1">
        {nav.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition',
                  isActive
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                )
              }
            >
              <Icon size={17} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-sm">
        {room ? (
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Привязка</div>
            <div className="mt-1 font-semibold text-slate-950">Кабинет {room.number}</div>
            <div className="text-slate-500">{room.nurseName}, {room.title}</div>
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Рабочий режим</div>
            <div className="mt-1 font-semibold text-slate-950">Старшая медсестра</div>
            <div className="text-slate-500">Полный контур демо</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Заявки</div>
            <div className="text-lg font-semibold text-slate-950">{requests.length}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">{role === 'senior-nurse' ? 'Пополнение' : 'Мои'}</div>
            <div className="text-lg font-semibold text-slate-950">
              {role === 'senior-nurse' ? activeReplenishment : requests.filter((request) => request.roomId === roomId).length}
            </div>
          </div>
        </div>

        {role === 'senior-nurse' ? (
          <div className="rounded-md bg-amber-50 p-3 text-amber-900">
            <div className="text-xs font-semibold uppercase tracking-wide">Ожидают прихода</div>
            <div className="mt-1 text-lg font-semibold">{waitingReceipt}</div>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
