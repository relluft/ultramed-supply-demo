import {
  BarChart3,
  BookOpen,
  ChevronRight,
  ClipboardList,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  Receipt,
  Search,
  ShoppingCart,
  Truck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { Button, EmptyState, StatusPill, fieldStyles } from '../components/ui'
import { useDemo } from '../context'
import {
  getStockQuantity,
  getStockStatus,
  requestLineStatusLabels,
  requestStatusLabels,
  statusTone,
  stockStatusLabels,
} from '../lib/demoLogic'
import { cn, formatDateTime, formatNumber } from '../lib/format'
import type { CatalogItem, SupplyRequestLine } from '../types/demo'

const allCategory = 'Все разделы'
const compactHeaderCell =
  'sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500'
const compactTableCell = 'border-b border-slate-100 px-3 py-1 align-middle text-sm leading-5 text-slate-700'

const seniorDashboardGroups = [
  {
    title: 'Отчеты',
    items: [
      { to: '/stock', label: 'Остатки', caption: 'Текущие количества и минимумы', icon: PackageSearch },
      { to: '/journal#turnover', label: 'Оборот', caption: 'Движение материалов по журналу', icon: ClipboardList },
      { to: '/analytics#stock', label: 'Анализ остатков', caption: 'Проблемные позиции и дефицит', icon: BarChart3 },
      { to: '/analytics#inventory', label: 'Анализ инвентаризации', caption: 'Контроль расхождений', icon: BarChart3 },
    ],
  },
  {
    title: 'Накладные',
    items: [
      { to: '/orders', label: 'Закупка', caption: 'Сформировать заказы поставщикам', icon: ShoppingCart },
      { to: '/senior#issue', label: 'Выдача', caption: 'Обработать заявки кабинетов', icon: PackageCheck },
      { to: '/journal#writeoff', label: 'Списание', caption: 'Посмотреть списания', icon: ClipboardList },
      { to: '/stock#inventory', label: 'Инвентаризация', caption: 'Проверить фактические остатки', icon: PackageSearch },
      { to: '/receipt', label: 'Приход', caption: 'Принять поставку на склад', icon: Receipt },
      { to: '/senior#requests', label: 'Заявки', caption: 'Открыть входящие заявки', icon: ClipboardList },
      { to: '/journal#sales', label: 'Продажа', caption: 'Операции продаж', icon: Receipt },
      { to: '/suppliers#settlements', label: 'Расчеты с поставщиками', caption: 'Контроль взаиморасчетов', icon: Truck },
    ],
  },
  {
    title: 'Справочники',
    items: [
      { to: '/catalog', label: 'Материалы', caption: 'Карточки, упаковки и поставщики', icon: BookOpen },
      { to: '/suppliers', label: 'Поставщики', caption: 'Контакты и условия поставки', icon: Truck },
    ],
  },
  {
    title: 'Аналитика',
    items: [
      { to: '/analytics', label: 'Аналитические отчеты', caption: 'Сводная картина снабжения', icon: BarChart3 },
    ],
  },
]

function matchesCatalogQuery(item: CatalogItem, query: string) {
  const value = query.trim().toLowerCase()
  if (!value) return true

  return [item.shortName, item.fullName, item.category, item.unit, item.packageLabel, ...item.searchSynonyms]
    .join(' ')
    .toLowerCase()
    .includes(value)
}

function SidebarButton({
  active,
  label,
  count,
  onClick,
}: {
  active?: boolean
  label: string
  count?: number
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition',
        active ? 'bg-emerald-50 font-semibold text-emerald-900' : 'text-slate-600 hover:bg-white hover:text-slate-950',
      )}
    >
      <ChevronRight size={14} className={active ? 'text-emerald-700' : 'text-slate-400'} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {typeof count === 'number' ? <span className="text-xs text-slate-400">{count}</span> : null}
    </button>
  )
}

function ToolIconButton({
  label,
  disabled,
  onClick,
  tone = 'neutral',
  className,
}: {
  label: string
  disabled?: boolean
  onClick?: () => void
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={cn(
        'inline-flex min-h-7 shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-md border px-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20 disabled:pointer-events-none disabled:opacity-35',
        tone === 'neutral' && 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
        tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
        tone === 'danger' && 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100',
        className,
      )}
    >
      {label}
    </button>
  )
}

export function SeniorWorkspacePage() {
  const location = useLocation()
  const {
    state: { rooms, catalog, stock, requests, replenishment, activeRequestId },
    setActiveRequest,
    issueFullLine,
    issuePartialLine,
    markLineOutOfStock,
    markLineNeedsClarification,
    addItemToReplenishment,
  } = useDemo()
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(allCategory)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [partialQuantities, setPartialQuantities] = useState<Record<string, number>>({})
  const [openedRequestId, setOpenedRequestId] = useState<string | null>(null)
  const isRequestsMode = location.hash === '#requests'
  const isRequestOverview = isRequestsMode && !openedRequestId

  const sortedRequests = useMemo(
    () => [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [requests],
  )
  const openedRequest = openedRequestId ? sortedRequests.find((request) => request.id === openedRequestId) : undefined
  const selectedRequest = openedRequest ?? sortedRequests.find((request) => request.id === activeRequestId) ?? sortedRequests[0]

  const activeCatalog = useMemo(() => catalog.filter((item) => item.active), [catalog])
  const requestCatalog = useMemo(() => {
    if (!isRequestsMode || !selectedRequest) return activeCatalog

    return selectedRequest.lines
      .map((line) => (line.itemId ? catalog.find((item) => item.id === line.itemId) : undefined))
      .filter((item): item is CatalogItem => Boolean(item))
  }, [activeCatalog, catalog, isRequestsMode, selectedRequest])
  const categorySource = isRequestsMode && openedRequestId ? requestCatalog : activeCatalog
  const categories = useMemo(
    () => [allCategory, ...Array.from(new Set(categorySource.map((item) => item.category))).sort((a, b) => a.localeCompare(b, 'ru'))],
    [categorySource],
  )
  const visibleCatalog = useMemo(
    () =>
      categorySource
        .filter((item) => selectedCategory === allCategory || item.category === selectedCategory)
        .filter((item) => matchesCatalogQuery(item, query)),
    [categorySource, query, selectedCategory],
  )
  const requestLineByItem = useMemo(() => {
    const result = new Map<string, SupplyRequestLine>()
    selectedRequest?.lines.forEach((line) => {
      if (line.itemId) result.set(line.itemId, line)
    })
    return result
  }, [selectedRequest])

  const selectedItem = selectedItemId
    ? catalog.find((item) => item.id === selectedItemId) ?? null
    : visibleCatalog[0] ?? null
  const selectedRequestStats = selectedRequest ? getRequestStats(selectedRequest) : undefined
  const selectedRequestRoom = selectedRequest ? requestRoom(selectedRequest) : undefined
  const canIssueCount =
    selectedRequest?.lines.filter((line) => {
      if (!line.itemId) return false
      return getStockQuantity(stock, line.itemId) >= line.quantity - line.issuedQuantity
    }).length ?? 0

  useEffect(() => {
    if (!activeRequestId && sortedRequests[0]) {
      setActiveRequest(sortedRequests[0].id)
    }
  }, [activeRequestId, setActiveRequest, sortedRequests])

  useEffect(() => {
    if (isRequestsMode) {
      setOpenedRequestId(null)
      setSelectedCategory(allCategory)
      setQuery('')
    }
  }, [isRequestsMode, location.key])

  useEffect(() => {
    if (!categories.includes(selectedCategory)) {
      setSelectedCategory(allCategory)
    }
  }, [categories, selectedCategory])

  useEffect(() => {
    if (isRequestOverview) {
      setSelectedItemId(null)
      return
    }

    if (!visibleCatalog.length) {
      setSelectedItemId(null)
      return
    }

    if (!selectedItemId) {
      const requestItemId = selectedRequest?.lines.find((line) =>
        line.itemId ? visibleCatalog.some((item) => item.id === line.itemId) : false,
      )?.itemId
      setSelectedItemId(requestItemId ?? visibleCatalog[0].id)
      return
    }

    if (!visibleCatalog.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(visibleCatalog[0].id)
    }
  }, [isRequestOverview, selectedItemId, selectedRequest, visibleCatalog])

  function issueAllAvailable() {
    if (!selectedRequest) return

    selectedRequest.lines.forEach((line) => {
      if (!line.itemId) return
      const remaining = line.quantity - line.issuedQuantity
      if (remaining > 0 && getStockQuantity(stock, line.itemId) >= remaining) {
        issueFullLine(selectedRequest.id, line.id)
      }
    })
  }

  function requestRoom(request: typeof sortedRequests[number]) {
    return rooms.find((item) => item.id === request.roomId)
  }

  function requestTitle(request?: typeof sortedRequests[number]) {
    if (!request) return 'Заявка'

    if (request.title?.trim()) return request.title.trim().replace(/_/g, ' ')

    const numericId = request.id.match(/\d+/)?.[0]
    return `Заявка №${numericId ? Number(numericId) : request.id}`
  }

  function requestCabinetLabel(request?: typeof sortedRequests[number]) {
    if (!request) return '—'

    const room = requestRoom(request)
    return room ? `${room.number} · ${room.title}` : request.createdBy
  }

  function requestStatusLabel(request: typeof sortedRequests[number]) {
    return request.status === 'sent' ? 'Ожидает' : requestStatusLabels[request.status]
  }

  function openRequest(requestId: string) {
    setOpenedRequestId(requestId)
    setActiveRequest(requestId)
    setSelectedCategory(allCategory)
    setQuery('')
  }

  function getRequestStats(request: typeof sortedRequests[number]) {
    const knownLines = request.lines.filter((line) => line.itemId)
    const manualCount = request.lines.length - knownLines.length
    const canIssue = knownLines.filter((line) => {
      if (!line.itemId) return false
      return getStockQuantity(stock, line.itemId) >= line.quantity - line.issuedQuantity
    }).length
    const deficit = knownLines.filter((line) => {
      if (!line.itemId) return false
      return getStockQuantity(stock, line.itemId) < line.quantity - line.issuedQuantity
    }).length

    return { canIssue, deficit, manualCount }
  }

  function renderRequestContext() {
    if (!selectedRequest) return null

    const creatorName = selectedRequestRoom?.nurseName || selectedRequest.createdBy

    return (
      <div className="grid min-w-0 gap-3 rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-500 xl:grid-cols-[0.9fr_1.25fr_0.85fr_1.8fr]">
        <div className="min-w-0 border-r border-slate-200 pr-3">
          <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">Кабинет</div>
          <div className="text-sm font-semibold text-slate-950">{requestCabinetLabel(selectedRequest)}</div>
          <div className="mt-0.5 truncate">{selectedRequestRoom?.type ?? 'кабинет'}</div>
        </div>
        <div className="min-w-0 border-r border-slate-200 pr-3">
          <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">Запрос создан</div>
          <div className="whitespace-nowrap text-sm font-semibold text-slate-950">{creatorName}</div>
          <div className="mt-0.5 truncate">медсестра</div>
        </div>
        <div className="min-w-0 border-r border-slate-200 pr-3">
          <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">Подана</div>
          <div className="text-sm font-semibold text-slate-950">
            {formatDateTime(selectedRequest.createdAt)}
          </div>
          <div className="mt-0.5 truncate">подана заявка</div>
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">Комментарий</div>
          <div className="truncate text-sm font-semibold text-slate-950">
            {requestTitle(selectedRequest)}
          </div>
          <div className="mt-0.5 line-clamp-2 leading-4">
            {selectedRequest.comment || 'Комментарий не указан'}
          </div>
        </div>
      </div>
    )
  }

  function renderRequestsOverview() {
    return (
      <div className="min-h-0 flex-1 overflow-auto bg-slate-50/60 p-3">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full table-fixed border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={cn(compactHeaderCell, 'w-[180px]')}>Кабинет</th>
                <th className={cn(compactHeaderCell, 'w-[230px]')}>Заявка</th>
                <th className={cn(compactHeaderCell, 'w-[112px]')}>Статус</th>
                <th className={cn(compactHeaderCell, 'w-[82px] text-center')}>Позиций</th>
                <th className={cn(compactHeaderCell, 'w-[260px]')}>Состав</th>
                <th className={compactHeaderCell}>Комментарий</th>
                <th className={cn(compactHeaderCell, 'w-[132px] text-right')}>Отправлено</th>
              </tr>
            </thead>
            <tbody>
              {sortedRequests.map((request) => {
                const stats = getRequestStats(request)
                const firstLine = request.lines[0]
                const firstItem = firstLine?.itemId ? catalog.find((candidate) => candidate.id === firstLine.itemId) : undefined
                const preview = firstLine
                  ? `${firstItem?.fullName ?? firstLine.manualName ?? 'Позиция'} (${formatNumber(firstLine.quantity)} ${firstItem?.unit ?? ''})`
                  : '—'

              return (
                <tr
                  key={request.id}
                  onClick={() => openRequest(request.id)}
                  className="cursor-pointer transition hover:bg-emerald-50/60"
                >
                  <td className={cn(compactTableCell, 'whitespace-nowrap font-semibold text-slate-950')}>{requestCabinetLabel(request)}</td>
                  <td className={compactTableCell}>
                    <div className="max-w-[300px] truncate font-semibold text-slate-950" title={requestTitle(request)}>
                      {requestTitle(request)}
                    </div>
                  </td>
                  <td className={compactTableCell}>
                    <StatusPill className="whitespace-nowrap" tone={statusTone(request.status)}>
                      {requestStatusLabel(request)}
                    </StatusPill>
                  </td>
                  <td className={cn(compactTableCell, 'text-center font-semibold text-slate-950')}>{request.lines.length}</td>
                  <td className={compactTableCell}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-slate-600">
                        {preview}
                      </span>
                      {stats.manualCount ? (
                        <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                          ручн. {stats.manualCount}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className={compactTableCell}>
                    <div className="truncate text-slate-600" title={request.comment}>
                      {request.comment || ''}
                    </div>
                  </td>
                  <td className={cn(compactTableCell, 'whitespace-nowrap text-right text-slate-500')}>{formatDateTime(request.createdAt)}</td>
                </tr>
              )
            })}
            </tbody>
          </table>
        </div>

        {!sortedRequests.length ? <EmptyState>Входящих заявок пока нет.</EmptyState> : null}
      </div>
    )
  }

  if (!location.hash) {
    return (
      <PageTransition className="grid gap-3">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-950">Главная</h1>
          <p className="mt-1 text-sm text-slate-500">Выберите, с чего начать</p>
        </section>

        <section className="grid gap-3">
          {seniorDashboardGroups.map((group) => (
            <div key={group.title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{group.title}</div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {group.items.map((item) => {
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="group min-h-[126px] rounded-lg border border-slate-200 bg-slate-50/60 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/60 hover:shadow-sm"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-emerald-800 transition group-hover:border-emerald-200">
                        <Icon size={18} />
                      </div>
                      <div className="mt-3 text-base font-semibold text-slate-950">{item.label}</div>
                      <div className="mt-1 text-sm leading-5 text-slate-500">{item.caption}</div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      </PageTransition>
    )
  }

  return (
    <PageTransition className="h-full min-h-0 overflow-hidden">
      <section className="flex h-full min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {!isRequestOverview ? (
          <aside className="hidden min-h-0 w-[270px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/80 xl:flex">
            <div className="shrink-0 border-b border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <PackageSearch size={18} className="text-emerald-700" />
                <div>
                  <div className="text-sm font-semibold text-slate-950">
                    {isRequestsMode ? requestTitle(selectedRequest) : 'Рабочий список'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {isRequestsMode ? 'состав и фильтр по разделам' : 'материалы и заявки'}
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              {isRequestsMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpenedRequestId(null)
                    setSelectedCategory(allCategory)
                    setQuery('')
                  }}
                  className="mb-3 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                >
                  Вернуться к списку заявок
                </button>
              ) : null}

              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {isRequestsMode ? 'Разделы в заявке' : 'Разделы'}
              </div>
              <div className="mt-2 grid gap-1">
                {categories.map((category) => {
                  const count = category === allCategory
                    ? categorySource.length
                    : categorySource.filter((item) => item.category === category).length

                  return (
                    <SidebarButton
                      key={category}
                      active={selectedCategory === category}
                      label={category}
                      count={count}
                      onClick={() => setSelectedCategory(category)}
                    />
                  )
                })}
              </div>

              <div className="mt-4 border-t border-slate-200 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Заявки</div>
                <div className="mt-2 grid gap-2">
                  {sortedRequests.map((request) => {
                    const active = selectedRequest?.id === request.id

                    return (
                      <button
                        key={request.id}
                        type="button"
                        onClick={() => (isRequestsMode ? openRequest(request.id) : setActiveRequest(request.id))}
                        className={cn(
                          'w-full min-w-0 overflow-hidden rounded-md border p-2 text-left transition',
                          active
                            ? 'border-emerald-300 bg-white shadow-sm'
                            : 'border-transparent hover:border-slate-200 hover:bg-white',
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="min-w-0 flex-1 truncate font-semibold text-slate-950">{requestCabinetLabel(request)}</span>
                          <StatusPill className="shrink-0" tone={statusTone(request.status)}>{requestStatusLabel(request)}</StatusPill>
                        </div>
                        <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-slate-500">
                          <span className="min-w-0 flex-1 truncate">{requestTitle(request)}</span>
                          <span className="shrink-0">{request.lines.length} строк</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </aside>
        ) : null}

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-start 2xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-semibold leading-none text-slate-950">
                    {isRequestOverview ? 'Заявки кабинетов' : isRequestsMode ? `Состав заявки: ${requestTitle(selectedRequest)}` : 'Материалы и выдача'}
                  </h1>
                  {!isRequestOverview && selectedRequest ? (
                    <StatusPill tone={statusTone(selectedRequest.status)}>
                      {requestStatusLabel(selectedRequest)}
                    </StatusPill>
                  ) : null}
                </div>
                {!isRequestOverview ? (
                  <div className="mt-1 text-sm text-slate-500">
                    {isRequestsMode
                      ? 'Здесь показаны только позиции выбранной заявки; разделы слева фильтруют ее состав.'
                      : 'Таблица материалов, остатки и действия по активной заявке на одном рабочем экране.'}
                  </div>
                ) : null}
              </div>

            </div>

            {!isRequestOverview ? (
              <div className="mt-4 grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-stretch">
                <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50/70 p-2">
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className={cn(fieldStyles, 'h-10 px-3 py-2 text-sm')}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>

                  <label className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className={cn(fieldStyles, 'h-10 px-3 py-2 pl-9 text-sm')}
                      placeholder={isRequestsMode ? 'Поиск в заявке' : 'Поиск материала'}
                    />
                  </label>
                </div>

                {isRequestsMode ? renderRequestContext() : <div />}
              </div>
            ) : null}
          </div>

          {isRequestOverview ? (
            renderRequestsOverview()
          ) : (
            <>
          <div className="flex min-h-0 flex-1 flex-col bg-slate-50/60 p-3">
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="h-full overflow-y-auto overflow-x-hidden">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-[2%]" />
                <col className="w-[25%]" />
                <col className="w-[8%]" />
                <col className="w-[4%]" />
                <col className="w-[9%]" />
                <col className="w-[7%]" />
                <col className="w-[9%]" />
                <col className="w-[5%]" />
                <col className="w-[8%]" />
                <col className="w-[23%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className={compactHeaderCell}></th>
                  <th className={compactHeaderCell}>Наименование</th>
                  <th className={compactHeaderCell}>Раздел</th>
                  <th className={compactHeaderCell}>Ед.</th>
                  <th className={compactHeaderCell}>В заявке</th>
                  <th className={compactHeaderCell}>Остаток</th>
                  <th className={compactHeaderCell}>После выдачи</th>
                  <th className={compactHeaderCell}>Мин.</th>
                  <th className={compactHeaderCell}>Статус</th>
                  <th className={compactHeaderCell}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {visibleCatalog.map((item, index) => {
                  const requestLine = requestLineByItem.get(item.id)
                  const available = getStockQuantity(stock, item.id)
                  const remaining = requestLine ? requestLine.quantity - requestLine.issuedQuantity : 0
                  const afterIssue = requestLine ? available - remaining : available
                  const shortage = requestLine ? Math.max(remaining - available, 0) : 0
                  const stockStatus = getStockStatus(item, stock, replenishment)
                  const partialQuantity = requestLine
                    ? partialQuantities[requestLine.id] ?? Math.min(available, remaining)
                    : 0
                  const active = selectedItem?.id === item.id
                  const rowTone =
                    active ? 'bg-emerald-50/80' : requestLine ? 'bg-sky-50/45' : index % 2 ? 'bg-white' : 'bg-slate-50/35'

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={cn('cursor-pointer transition hover:bg-emerald-50/60', rowTone)}
                    >
                      <td className={compactTableCell}>
                        <div className={cn('h-2.5 w-2.5 rounded-full', requestLine ? 'bg-sky-500' : 'bg-slate-300')} />
                      </td>
                      <td className={cn(compactTableCell, 'min-w-0')}>
                        <div className="whitespace-normal break-words font-semibold leading-5 text-slate-950" title={item.fullName}>
                          {item.fullName}
                        </div>
                      </td>
                      <td className={compactTableCell}>{item.category}</td>
                      <td className={compactTableCell}>{item.unit}</td>
                      <td className={compactTableCell}>
                        {requestLine ? (
                          <div>
                            <div className="whitespace-nowrap font-semibold text-slate-950">
                              {formatNumber(requestLine.quantity)} {item.unit}
                            </div>
                            <div className="text-xs text-slate-500">Выдано {formatNumber(requestLine.issuedQuantity)}, осталось {formatNumber(remaining)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className={cn(compactTableCell, 'whitespace-nowrap', available < item.minStock ? 'text-rose-700' : 'text-slate-700')}>
                        <div className={cn('font-semibold', available < item.minStock ? 'text-rose-700' : 'text-slate-950')}>{formatNumber(available)}</div>
                      </td>
                      <td className={cn(compactTableCell, 'whitespace-nowrap')}>
                        {requestLine ? (
                          <div>
                            <div className={cn('font-semibold', shortage > 0 ? 'text-rose-700' : afterIssue < item.minStock ? 'text-amber-700' : 'text-emerald-800')}>
                              {formatNumber(afterIssue)}
                            </div>
                            <div className={cn('text-xs', shortage > 0 ? 'text-rose-600' : afterIssue < item.minStock ? 'text-amber-700' : 'text-slate-500')}>
                              {shortage > 0 ? `не хватает ${formatNumber(shortage)}` : afterIssue < item.minStock ? 'ниже мин.' : 'норма'}
                            </div>
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-950">{formatNumber(available)}</span>
                        )}
                      </td>
                      <td className={compactTableCell}>{formatNumber(item.minStock)}</td>
                      <td className={compactTableCell}>
                        <StatusPill className="whitespace-nowrap" tone={statusTone(requestLine?.status ?? stockStatus)}>
                          {requestLine ? requestLineStatusLabels[requestLine.status] : stockStatusLabels[stockStatus]}
                        </StatusPill>
                      </td>
                      <td className={compactTableCell} onClick={(event) => event.stopPropagation()}>
                        {requestLine && selectedRequest ? (
                          <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1fr)] gap-1.5">
                            <ToolIconButton
                              label="Выдать всё"
                              tone="success"
                              className="w-full min-w-0 px-2"
                              disabled={remaining <= 0 || available < remaining}
                              onClick={() => issueFullLine(selectedRequest.id, requestLine.id)}
                            />
                            <input
                              type="number"
                              min={0}
                              max={Math.min(available, remaining)}
                              value={partialQuantity}
                              onChange={(event) =>
                                setPartialQuantities((current) => ({
                                  ...current,
                                  [requestLine.id]: Number(event.target.value),
                                }))
                              }
                              className="h-7 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-center text-sm outline-none focus:border-emerald-700"
                            />
                            <ToolIconButton
                              label="Выдать"
                              className="w-full min-w-0 px-2"
                              disabled={remaining <= 0 || available <= 0}
                              onClick={() => issuePartialLine(selectedRequest.id, requestLine.id, partialQuantity)}
                            />
                            <ToolIconButton
                              label="Нет на складе"
                              tone="danger"
                              className="w-full min-w-0 px-2"
                              onClick={() => markLineOutOfStock(selectedRequest.id, requestLine.id)}
                            />
                            <ToolIconButton
                              label="Уточнить"
                              tone="warning"
                              className="col-span-2 w-full min-w-0 px-2"
                              onClick={() => markLineNeedsClarification(selectedRequest.id, requestLine.id)}
                            />
                          </div>
                        ) : (
                          <div className="grid w-full min-w-0 grid-cols-1 gap-1.5">
                            <ToolIconButton className="w-full min-w-0" label="В пополнение" onClick={() => addItemToReplenishment(item.id)} />
                            <span className="text-xs text-slate-400">нет в заявке</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {!visibleCatalog.length ? <EmptyState className="m-3">По текущему фильтру материалов нет.</EmptyState> : null}
              </div>
            </div>

            <div className="mt-2 flex shrink-0 flex-wrap justify-end gap-2">
              <Button variant="success" disabled={!canIssueCount} onClick={issueAllAvailable}>
                <PackageCheck size={16} />
                Выдать доступное
              </Button>
              <Button variant="secondary" disabled={!selectedItem} onClick={() => selectedItem && addItemToReplenishment(selectedItem.id)}>
                <PackagePlus size={16} />
                Пополнение
              </Button>
            </div>
          </div>
            </>
          )}
        </section>
      </section>
    </PageTransition>
  )
}
