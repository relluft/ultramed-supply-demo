import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  ListChecks,
  MapPin,
  PackagePlus,
  PackageSearch,
  Receipt,
  ShoppingCart,
  Truck,
  UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDemo } from '../context'
import { getStockQuantity, requestStatusLabels, statusTone } from '../lib/demoLogic'
import { formatNumber } from '../lib/format'
import type { DemoRole } from '../types/demo'
import { PageTransition } from './PageTransition'
import { StatusPill } from './ui'
import '../styles/role-home-dashboard.css'

type RoleHomeDashboardProps = {
  role: Extract<DemoRole, 'senior-nurse' | 'manager'>
}

const seniorQuickLinks = [
  {
    to: '/receipt',
    label: 'Приход',
    caption: 'Приём новых поставок',
    icon: Receipt,
  },
  {
    to: '/stock',
    label: 'Остатки',
    caption: 'Состояние склада',
    icon: PackageSearch,
  },
  {
    to: '/analytics',
    label: 'Аналитика',
    caption: 'Показатели снабжения',
    icon: BarChart3,
  },
  {
    to: '/journal',
    label: 'Журнал',
    caption: 'История операций',
    icon: ClipboardList,
  },
  {
    to: '/catalog',
    label: 'Материалы',
    caption: 'Каталог расходников',
    icon: BookOpen,
  },
  {
    to: '/suppliers',
    label: 'Поставщики',
    caption: 'Контрагенты и условия',
    icon: Truck,
  },
]

const managerQuickLinks = [
  {
    to: '/stock',
    label: 'Остатки',
    caption: 'Состояние склада',
    icon: PackageSearch,
  },
  {
    to: '/suppliers',
    label: 'Поставщики',
    caption: 'Контрагенты и условия',
    icon: Truck,
  },
  {
    to: '/journal',
    label: 'Журнал',
    caption: 'История операций',
    icon: ClipboardList,
  },
]

export function RoleHomeDashboard({ role }: RoleHomeDashboardProps) {
  const [showGreeting, setShowGreeting] = useState(true)
  const {
    state: { catalog, rooms, stock, requests },
  } = useDemo()
  const isManager = role === 'manager'
  const latestRequest = [...requests].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )[0]
  const pendingRequests = requests.filter((request) =>
    ['sent', 'partially-issued', 'waiting-replenishment', 'needs-clarification'].includes(request.status),
  )
  const latestRequestRoom = rooms.find((room) => room.id === latestRequest?.roomId)
  const activeCatalog = catalog.filter((item) => item.active)
  const healthyStockCount = activeCatalog.filter(
    (item) => getStockQuantity(stock, item.id) >= item.minStock,
  ).length
  const stockHealth = activeCatalog.length
    ? Math.round((healthyStockCount / activeCatalog.length) * 100)
    : 100
  const quickLinks = isManager ? managerQuickLinks : seniorQuickLinks
  const primaryActions = isManager
    ? [{ to: '/analytics', label: 'Открыть аналитику', icon: BarChart3 }]
    : [
        { to: '/senior#requests', label: 'Перейти к заявкам', icon: ClipboardList },
        { to: '/replenishment', label: 'Перейти к пополнению', icon: PackagePlus },
        { to: '/orders', label: 'Перейти к заказам', icon: ShoppingCart },
      ]

  useEffect(() => {
    setShowGreeting(true)
    const timer = window.setTimeout(() => setShowGreeting(false), 3000)

    return () => window.clearTimeout(timer)
  }, [role])

  return (
    <PageTransition className="role-home-page flex min-h-full">
      <section className="role-home-card flex w-full flex-1 flex-col justify-center overflow-hidden border px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-16">
        <div className="text-center">
          <div
            className={`role-home-greeting mb-3 h-6 text-sm font-medium ${
              showGreeting ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
            }`}
            aria-hidden={!showGreeting}
          >
            Добро пожаловать, {isManager ? 'Александр' : 'Екатерина'}!
          </div>
          <h1 className="role-home-title display-title text-[40px] sm:text-[48px] md:text-[54px]">
            Главная
          </h1>
          <p className="role-home-heading-caption mx-auto mt-3 text-[17px] font-medium">
            Выберите, с чего начать работу
          </p>
        </div>

        <nav
          className={`role-home-primary-row mx-auto mt-7 grid w-full gap-3.5 ${
            isManager ? 'max-w-[580px]' : 'max-w-[1320px] sm:grid-cols-3'
          }`}
          aria-label="Основные действия"
        >
          {primaryActions.map((action) => {
            const Icon = action.icon

            return (
              <Link
                key={action.to}
                to={action.to}
                className="role-home-primary inline-flex min-h-[66px] w-full items-center justify-center gap-3 rounded-[10px] border px-5 text-center text-[18px] font-medium xl:text-[20px]"
              >
                <Icon size={22} strokeWidth={2} />
                {action.label}
              </Link>
            )
          })}
        </nav>

        <div className="role-home-latest mx-auto mt-8 w-full max-w-[1320px] border-y py-4" role="status">
          {isManager ? (
            <div className="grid items-center gap-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
              <span className="role-home-muted text-[11px] font-semibold uppercase tracking-[0.08em]">
                Состояние склада
              </span>
              <div className="role-home-kicker min-w-0 text-[15px]">
                <span className="role-home-strong font-semibold">{formatNumber(healthyStockCount)}</span>
                <span className="role-home-separator mx-1.5" aria-hidden="true">·</span>
                <span>из {formatNumber(activeCatalog.length)} позиций в норме</span>
              </div>
              <StatusPill
                tone={stockHealth >= 85 ? 'success' : stockHealth >= 70 ? 'warning' : 'danger'}
                className="justify-self-start whitespace-nowrap sm:justify-self-end"
              >
                Индекс склада {stockHealth}%
              </StatusPill>
            </div>
          ) : latestRequest ? (
            <div className="role-home-request-summary grid gap-4 rounded-xl border px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-6">
              <div className="grid min-w-0 grid-cols-[52px_minmax(0,1fr)] items-center gap-4">
                <span className="role-home-request-icon">
                  <ClipboardList size={25} />
                </span>
                <div className="min-w-0">
                  <div className="role-home-muted text-[11px] font-semibold uppercase tracking-[0.09em]">
                    Последняя поступившая заявка
                  </div>
                  <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="role-home-strong text-[20px] font-semibold leading-6">{latestRequest.id}</span>
                    <span className="role-home-request-title min-w-0 truncate text-[15px] font-medium">
                      {latestRequest.title || 'Заявка на медицинские материалы'}
                    </span>
                  </div>
                  <div className="role-home-request-meta mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <span>
                      <CalendarDays size={15} />
                      {new Intl.DateTimeFormat('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(latestRequest.createdAt))}
                    </span>
                    <span>
                      <MapPin size={15} />
                      {latestRequestRoom
                        ? `Кабинет ${latestRequestRoom.number} · ${latestRequestRoom.title}`
                        : 'Кабинет не указан'}
                    </span>
                    <span>
                      <UserRound size={15} />
                      {latestRequest.createdBy}
                    </span>
                    <span>
                      <ListChecks size={15} />
                      {latestRequest.lines.length} позиций
                    </span>
                  </div>
                </div>
              </div>

              <div className="role-home-request-state flex min-w-[210px] items-center justify-between gap-4 border-t pt-3 lg:block lg:border-l lg:border-t-0 lg:py-1 lg:pl-6 lg:text-right">
                <div>
                  <div className="role-home-muted text-[11px] font-semibold uppercase tracking-[0.08em]">
                    Очередь обработки
                  </div>
                  <div className="role-home-strong mt-1 text-[18px] font-semibold">
                    {pendingRequests.length
                      ? `${pendingRequests.length} ${pendingRequests.length === 1 ? 'заявка' : pendingRequests.length < 5 ? 'заявки' : 'заявок'}`
                      : 'Очередь пуста'}
                  </div>
                  <div className="role-home-muted mt-0.5 text-xs">
                    {pendingRequests.length ? 'требуют внимания' : 'все заявки обработаны'}
                  </div>
                </div>
                <StatusPill
                  tone={statusTone(latestRequest.status)}
                  className="mt-0 justify-center whitespace-nowrap lg:mt-2 lg:inline-flex"
                >
                  {requestStatusLabels[latestRequest.status]}
                </StatusPill>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="role-home-muted text-[11px] font-semibold uppercase tracking-[0.08em]">
                Последняя заявка
              </span>
              <span className="role-home-muted text-sm">Заявок пока нет</span>
            </div>
          )}
        </div>

        <nav
          className={`role-home-actions role-home-actions--${isManager ? 'manager' : 'senior'} mx-auto mt-5 grid w-full max-w-[1320px] gap-3.5 ${
            isManager ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3'
          }`}
          aria-label="Все разделы"
        >
          {quickLinks.map((item) => {
            const Icon = item.icon

            return (
              <Link key={item.to} to={item.to} className="role-home-quick-link">
                <span className="role-home-quick-icon">
                  <Icon size={20} />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-[17px] font-semibold leading-6">{item.label}</span>
                  <span className="role-home-caption block text-[13px] font-medium leading-5">{item.caption}</span>
                </span>
              </Link>
            )
          })}
        </nav>
      </section>
    </PageTransition>
  )
}
