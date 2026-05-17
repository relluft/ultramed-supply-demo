import {
  BookOpen,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  ListFilter,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  PackageX,
  Receipt,
  Search,
  ShoppingCart,
  Truck,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BrandedLoadingModal } from '../components/BrandedLoadingModal'
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
const manualCategory = 'Ручные позиции'
const compactHeaderCell =
  'sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-normal uppercase tracking-wide text-slate-500'
const compactTableCell = 'border-b border-slate-100 px-3 py-1 align-middle text-sm leading-5 text-slate-700'
const overviewHeaderCell = cn(compactHeaderCell, 'border-r border-slate-200 last:border-r-0')
const overviewTableCell = cn(compactTableCell, 'border-r border-slate-100 last:border-r-0')
const detailHeaderCell = cn(compactHeaderCell, 'border-r border-slate-200 !text-center last:border-r-0')
const detailTableCell = cn(compactTableCell, 'border-r border-slate-100 last:border-r-0')

type IssueDraft =
  | { mode: 'full' }
  | { mode: 'partial'; quantity: string }
type IssueConfirmationStatus = 'idle' | 'loading' | 'done'

const seniorDashboardGroups = [
  {
    title: 'Операции',
    items: [
      { to: '/senior#requests', label: 'Заявки', caption: 'Входящие заявки кабинетов и выдача материалов', icon: ClipboardList },
      { to: '/replenishment', label: 'Пополнение', caption: 'Дефицит после обработки заявки', icon: PackagePlus },
      { to: '/orders', label: 'Заказы поставщикам', caption: 'Сформировать заказ из пополнения', icon: ShoppingCart },
      { to: '/receipt', label: 'Приход', caption: 'Принять поставку и обновить склад', icon: Receipt },
    ],
  },
  {
    title: 'Склад',
    items: [
      { to: '/stock', label: 'Остатки', caption: 'Контроль текущего склада после выдачи и прихода', icon: PackageSearch },
    ],
  },
  {
    title: 'Справочники',
    items: [
      { to: '/catalog', label: 'Материалы', caption: 'Карточки, упаковки и поставщики', icon: BookOpen },
      { to: '/suppliers', label: 'Поставщики', caption: 'Контакты и условия поставки', icon: Truck },
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

function matchesManualLineQuery(line: SupplyRequestLine, query: string) {
  const value = query.trim().toLowerCase()
  if (!value) return true

  return [line.manualName, line.comment, line.seniorComment].filter(Boolean).join(' ').toLowerCase().includes(value)
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
  icon,
  disabled,
  onClick,
  tone = 'neutral',
  className,
}: {
  label: string
  icon?: ReactNode
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
        'inline-flex min-h-7 shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 text-xs font-normal transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700/15 disabled:pointer-events-none disabled:opacity-35',
        tone === 'neutral' && 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950',
        tone === 'success' && 'border-emerald-300 bg-white text-emerald-800 hover:border-emerald-400 hover:bg-emerald-50',
        tone === 'warning' && 'border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100',
        tone === 'danger' && 'border-rose-300 bg-rose-50 text-rose-800 hover:border-rose-400 hover:bg-rose-100',
        className,
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      {label}
    </button>
  )
}

export function SeniorWorkspacePage() {
  const location = useLocation()
  const issueFinishTimerRef = useRef<number | null>(null)
  const {
    state: { rooms, catalog, stock, requests, replenishment, activeRequestId },
    setActiveRequest,
    issueFullLine,
    issuePartialLine,
    markLineOutOfStock,
    addItemToReplenishment,
  } = useDemo()
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(allCategory)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [issueDrafts, setIssueDrafts] = useState<Record<string, IssueDraft>>({})
  const [issueConfirmationStatus, setIssueConfirmationStatus] = useState<IssueConfirmationStatus>('idle')
  const [openedRequestId, setOpenedRequestId] = useState<string | null>(null)
  const [overviewFiltersOpen, setOverviewFiltersOpen] = useState(false)
  const [overviewQuery, setOverviewQuery] = useState('')
  const isRequestsMode = location.hash === '#requests'
  const isRequestOverview = isRequestsMode && !openedRequestId

  const sortedRequests = useMemo(
    () => [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [requests],
  )
  const visibleRequests = useMemo(() => {
    const value = overviewQuery.trim().toLowerCase()
    if (!value) return sortedRequests

    return sortedRequests.filter((request) => {
      const room = rooms.find((item) => item.id === request.roomId)
      const lineLabels = request.lines.map((line) => {
        const item = line.itemId ? catalog.find((candidate) => candidate.id === line.itemId) : undefined
        return [item?.fullName, item?.shortName, item?.category, line.manualName].filter(Boolean).join(' ')
      })
      const haystack = [
        request.id,
        request.title,
        request.comment,
        request.createdBy,
        room?.number,
        room?.title,
        room?.type,
        ...lineLabels,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(value)
    })
  }, [catalog, overviewQuery, rooms, sortedRequests])
  const openedRequest = openedRequestId ? sortedRequests.find((request) => request.id === openedRequestId) : undefined
  const selectedRequest = openedRequest ?? sortedRequests.find((request) => request.id === activeRequestId) ?? sortedRequests[0]

  const activeCatalog = useMemo(() => catalog.filter((item) => item.active), [catalog])
  const requestCatalog = useMemo(() => {
    if (!isRequestsMode || !selectedRequest) return activeCatalog

    return selectedRequest.lines
      .map((line) => (line.itemId ? catalog.find((item) => item.id === line.itemId) : undefined))
      .filter((item): item is CatalogItem => Boolean(item))
  }, [activeCatalog, catalog, isRequestsMode, selectedRequest])
  const manualRequestLines = useMemo(
    () => (isRequestsMode && openedRequestId && selectedRequest ? selectedRequest.lines.filter((line) => !line.itemId) : []),
    [isRequestsMode, openedRequestId, selectedRequest],
  )
  const categorySource = isRequestsMode && openedRequestId ? requestCatalog : activeCatalog
  const categories = useMemo(() => {
    const categoryNames = new Set(categorySource.map((item) => item.category))
    if (manualRequestLines.length) {
      categoryNames.add(manualCategory)
    }

    return [allCategory, ...Array.from(categoryNames).sort((a, b) => a.localeCompare(b, 'ru'))]
  }, [categorySource, manualRequestLines])
  const visibleCatalog = useMemo(
    () =>
      categorySource
        .filter((item) => selectedCategory === allCategory || item.category === selectedCategory)
        .filter((item) => matchesCatalogQuery(item, query)),
    [categorySource, query, selectedCategory],
  )
  const visibleManualLines = useMemo(
    () =>
      manualRequestLines
        .filter(() => selectedCategory === allCategory || selectedCategory === manualCategory)
        .filter((line) => matchesManualLineQuery(line, query)),
    [manualRequestLines, query, selectedCategory],
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
  const validIssueDrafts = selectedRequest
    ? Object.entries(issueDrafts).filter(([lineId, draft]) => {
        const line = selectedRequest.lines.find((item) => item.id === lineId)
        if (!line?.itemId) return false

        const remaining = line.quantity - line.issuedQuantity
        const available = getStockQuantity(stock, line.itemId)
        if (draft.mode === 'full') return remaining > 0 && available >= remaining

        const quantity = Math.round(Number(draft.quantity) || 0)
        return quantity > 0 && quantity <= Math.min(available, remaining)
      })
    : []
  const fullIssueDraftCount = validIssueDrafts.filter(([, draft]) => draft.mode === 'full').length
  const partialIssueDraftCount = validIssueDrafts.filter(([, draft]) => draft.mode === 'partial').length

  useEffect(() => {
    if (!activeRequestId && sortedRequests[0]) {
      setActiveRequest(sortedRequests[0].id)
    }
  }, [activeRequestId, setActiveRequest, sortedRequests])

  useEffect(() => {
    return () => {
      if (issueFinishTimerRef.current) {
        window.clearTimeout(issueFinishTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setIssueDrafts({})
  }, [selectedRequest?.id])

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

  function stageFullIssue(lineId: string) {
    setIssueDrafts((current) => {
      if (current[lineId]?.mode === 'full') {
        const { [lineId]: _removed, ...rest } = current
        return rest
      }

      return {
        ...current,
        [lineId]: { mode: 'full' },
      }
    })
  }

  function openPartialIssue(lineId: string) {
    setIssueDrafts((current) => {
      const existing = current[lineId]
      if (existing?.mode === 'partial') {
        const { [lineId]: _removed, ...rest } = current
        return rest
      }

      return {
        ...current,
        [lineId]: { mode: 'partial', quantity: '' },
      }
    })
  }

  function updatePartialIssue(lineId: string, quantity: string) {
    setIssueDrafts((current) => ({
      ...current,
      [lineId]: { mode: 'partial', quantity },
    }))
  }

  function confirmIssueDrafts() {
    if (!selectedRequest || !validIssueDrafts.length || issueConfirmationStatus === 'loading') return

    const requestId = selectedRequest.id
    const draftsToIssue = validIssueDrafts.map(([lineId, draft]) => [lineId, { ...draft }] as const)

    setIssueConfirmationStatus('loading')
    issueFinishTimerRef.current = window.setTimeout(() => {
      draftsToIssue.forEach(([lineId, draft]) => {
        if (draft.mode === 'full') {
          issueFullLine(requestId, lineId)
          return
        }

        issuePartialLine(requestId, lineId, Math.round(Number(draft.quantity) || 0))
      })
      setIssueDrafts({})
      setIssueConfirmationStatus('done')
      issueFinishTimerRef.current = null
    }, 1000)
  }

  function prepareAvailableIssue() {
    if (!selectedRequest) return

    const nextDrafts: Record<string, IssueDraft> = {}
    selectedRequest.lines.forEach((line) => {
      if (!line.itemId) return

      const remaining = line.quantity - line.issuedQuantity
      const available = getStockQuantity(stock, line.itemId)
      if (remaining <= 0 || available <= 0) return

      if (available >= remaining) {
        nextDrafts[line.id] = { mode: 'full' }
        return
      }

      nextDrafts[line.id] = { mode: 'partial', quantity: String(available) }
    })

    setIssueDrafts(nextDrafts)
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
    return room ? `${room.number} ${room.title}` : request.createdBy
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
      <div className="app-soft-card grid min-w-0 gap-3 rounded-md border px-3 py-2 text-xs text-slate-500 xl:grid-cols-[0.9fr_1.25fr_0.85fr_1.8fr]">
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
      <div className="app-section-band min-h-0 flex-1 overflow-auto p-3">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full table-fixed border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={cn(overviewHeaderCell, 'w-[94px]')}>
                  <div className="flex justify-center">Дата</div>
                </th>
                <th className={cn(overviewHeaderCell, 'w-[150px]')}>
                  <div className="flex justify-center">Кабинет</div>
                </th>
                <th className={cn(overviewHeaderCell, 'w-[360px]')}>
                  <div className="flex justify-center">Наименование заявки</div>
                </th>
                <th className={cn(overviewHeaderCell, 'w-[112px]')}>
                  <div className="flex justify-center">Статус</div>
                </th>
                <th className={cn(overviewHeaderCell, 'w-[86px]')}>
                  <div className="flex justify-center">Позиций</div>
                </th>
                <th className={cn(overviewHeaderCell, 'w-[700px]')}>
                  <div className="flex justify-center">Комментарий</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRequests.map((request) => {
                return (
                  <tr
                    key={request.id}
                    onClick={() => openRequest(request.id)}
                    className="cursor-pointer transition hover:bg-emerald-50/60"
                  >
                    <td className={cn(overviewTableCell, 'whitespace-nowrap text-left text-slate-500')}>{formatDateTime(request.createdAt)}</td>
                    <td className={cn(overviewTableCell, 'whitespace-nowrap text-slate-950')}>{requestCabinetLabel(request)}</td>
                    <td className={overviewTableCell}>
                      <div className="max-w-[410px] truncate text-slate-950" title={requestTitle(request)}>
                        {requestTitle(request)}
                      </div>
                    </td>
                    <td className={cn(overviewTableCell, 'text-center')}>
                      <div className="flex justify-center">
                        <StatusPill className="whitespace-nowrap !font-normal" tone={statusTone(request.status)}>
                          {requestStatusLabel(request)}
                        </StatusPill>
                      </div>
                    </td>
                    <td className={cn(overviewTableCell, 'text-center text-slate-950')}>{request.lines.length}</td>
                    <td className={overviewTableCell}>
                      <div className="whitespace-normal break-words text-slate-600" title={request.comment}>
                        {request.comment || ''}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!visibleRequests.length ? (
          <EmptyState>{sortedRequests.length ? 'По текущему фильтру заявок нет.' : 'Входящих заявок пока нет.'}</EmptyState>
        ) : null}
      </div>
    )
  }

  if (!location.hash) {
    return (
      <PageTransition className="grid gap-4">
        <section className="app-panel rounded-lg border p-4">
          <h1 className="text-2xl font-semibold text-slate-950">Главная</h1>
          <p className="mt-1 text-sm text-slate-500">Выберите, с чего начать</p>
        </section>

        <section className="grid gap-3">
          {seniorDashboardGroups.map((group) => (
            <div key={group.title} className="app-panel rounded-lg border p-4">
              <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{group.title}</div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {group.items.map((item) => {
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="app-soft-card group min-h-[126px] rounded-lg border p-4 transition hover:border-emerald-200 hover:bg-emerald-50/60 hover:shadow-sm"
                    >
                      <div className="app-soft-card flex h-9 w-9 items-center justify-center rounded-md border text-emerald-800 transition group-hover:border-emerald-200">
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
          <aside className="app-section-band hidden min-h-0 w-[270px] shrink-0 flex-col border-r border-slate-200 xl:flex">
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {isRequestsMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpenedRequestId(null)
                    setSelectedCategory(allCategory)
                    setQuery('')
                  }}
                  className="mb-3 inline-flex h-8 w-auto items-center gap-1.5 rounded-md border border-[#b9decf] bg-white/82 px-2.5 text-xs font-semibold text-[#587367] transition hover:border-emerald-300 hover:bg-white hover:text-emerald-800"
                  title="Вернуться к списку заявок"
                >
                  <ArrowLeft size={14} />
                  Назад
                </button>
              ) : null}

              {!isRequestsMode ? (
                <>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Разделы
                  </div>
                  <div className="mt-2 grid gap-1">
                    {categories.map((category) => {
                      const count = category === allCategory
                        ? categorySource.length + manualRequestLines.length
                        : category === manualCategory
                          ? manualRequestLines.length
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
                </>
              ) : null}

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
                          <span className="shrink-0">{request.lines.length} позиций</span>
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
                  {isRequestOverview ? (
                    <button
                      type="button"
                      onClick={() => setOverviewFiltersOpen((current) => !current)}
                      className={cn(
                        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20',
                        overviewFiltersOpen || overviewQuery
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950',
                      )}
                      title="Фильтры поиска"
                    >
                      <ListFilter size={15} />
                      Фильтры
                    </button>
                  ) : null}
                  {!isRequestOverview && selectedRequest ? (
                    <StatusPill tone={statusTone(selectedRequest.status)}>
                      {requestStatusLabel(selectedRequest)}
                    </StatusPill>
                  ) : null}
                </div>
                {!isRequestOverview && !isRequestsMode ? (
                  <div className="mt-1 text-sm text-slate-500">
                    Таблица материалов, остатки и действия по активной заявке на одном рабочем экране.
                  </div>
                ) : null}
              </div>
              {!isRequestOverview && selectedRequest ? (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="secondary" onClick={prepareAvailableIssue}>
                    <PackageCheck size={16} />
                    Подготовить выдачу доступного
                  </Button>
                </div>
              ) : null}
            </div>

            {isRequestOverview && overviewFiltersOpen ? (
              <div className="app-soft-card mt-3 flex flex-wrap items-center gap-2 rounded-md border p-2">
                <label className="relative min-w-[260px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    value={overviewQuery}
                    onChange={(event) => setOverviewQuery(event.target.value)}
                    className={cn(fieldStyles, 'h-9 px-3 py-2 pl-9 text-sm')}
                    placeholder="Поиск по кабинету, заявке или позиции"
                  />
                </label>
                {overviewQuery ? (
                  <button
                    type="button"
                    onClick={() => setOverviewQuery('')}
                    className="h-9 rounded-md border border-[#b9decf] bg-white/82 px-3 text-xs font-semibold text-[#587367] transition hover:bg-white hover:text-[#17362d]"
                  >
                    Сбросить
                  </button>
                ) : null}
              </div>
            ) : null}

            {!isRequestOverview ? (
              <div className="mt-4 grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-stretch">
                <div className="app-soft-card grid gap-2 rounded-md border p-2">
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
          <div className="app-section-band flex min-h-0 flex-1 flex-col p-3">
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="h-full overflow-y-auto overflow-x-hidden">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-[3%]" />
                <col className="w-[34%]" />
                <col className="w-[8%]" />
                <col className="w-[4%]" />
                <col className="w-[7%]" />
                <col className="w-[6%]" />
                <col className="w-[8%]" />
                <col className="w-[5%]" />
                <col className="w-[7%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className={cn(detailHeaderCell, '!px-1')}>№</th>
                  <th className={detailHeaderCell}>Наименование</th>
                  <th className={detailHeaderCell}>Раздел</th>
                  <th className={detailHeaderCell}>Ед.</th>
                  <th className={detailHeaderCell}>В заявке</th>
                  <th className={detailHeaderCell}>Остаток</th>
                  <th className={detailHeaderCell}>После выдачи</th>
                  <th className={detailHeaderCell}>Мин.</th>
                  <th className={detailHeaderCell}>Статус</th>
                  <th className={cn(detailHeaderCell, '!px-1')}>Действия</th>
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
                  const issueDraft = requestLine ? issueDrafts[requestLine.id] : undefined
                  const partialQuantity = issueDraft?.mode === 'partial' ? issueDraft.quantity : ''
                  const hasPartialQuantity = Math.round(Number(partialQuantity) || 0) > 0
                  const active = selectedItem?.id === item.id
                  const isIssued = requestLine?.status === 'issued'
                  const rowTone =
                    isIssued
                      ? 'bg-sky-100/80'
                      : issueDraft?.mode === 'full'
                      ? 'bg-emerald-50/80'
                      : issueDraft?.mode === 'partial' && hasPartialQuantity
                        ? 'bg-amber-50/80'
                        : active
                          ? 'bg-sky-50/45'
                          : requestLine
                            ? 'bg-sky-50/45'
                            : index % 2
                              ? 'bg-white'
                              : 'bg-slate-50/35'

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={cn('cursor-pointer transition hover:bg-slate-100/70', rowTone)}
                    >
                      <td className={cn(detailTableCell, '!px-1 text-center text-xs text-slate-500')}>
                        {index + 1}
                      </td>
                      <td className={cn(detailTableCell, 'min-w-0')}>
                        <div className="whitespace-normal break-words leading-5 text-slate-950" title={item.fullName}>
                          {item.fullName}
                        </div>
                      </td>
                      <td className={detailTableCell}>{item.category}</td>
                      <td className={cn(detailTableCell, 'text-center')}>{item.unit}</td>
                      <td className={cn(detailTableCell, 'text-center')}>
                        {requestLine ? (
                          <div>
                            <div className="whitespace-nowrap text-slate-950">
                              {formatNumber(requestLine.quantity)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className={cn(detailTableCell, 'whitespace-nowrap text-center', available < item.minStock ? 'text-rose-700' : 'text-slate-700')}>
                        <div className={cn(available < item.minStock ? 'text-rose-700' : 'text-slate-950')}>{formatNumber(available)}</div>
                      </td>
                      <td className={cn(detailTableCell, 'whitespace-nowrap text-center')}>
                        {requestLine ? (
                          <div>
                            <div className={cn(shortage > 0 ? 'text-rose-700' : afterIssue < item.minStock ? 'text-amber-700' : 'text-slate-950')}>
                              {formatNumber(afterIssue)}
                            </div>
                            <div className={cn('text-xs', shortage > 0 ? 'text-rose-600' : afterIssue < item.minStock ? 'text-amber-700' : 'hidden')}>
                              {shortage > 0 ? `не хватает ${formatNumber(shortage)}` : afterIssue < item.minStock ? 'ниже мин.' : 'норма'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-950">{formatNumber(available)}</span>
                        )}
                      </td>
                      <td className={cn(detailTableCell, 'text-center')}>{formatNumber(item.minStock)}</td>
                      <td className={detailTableCell}>
                        <div className="flex justify-center">
                          <StatusPill className="whitespace-nowrap !font-normal" tone={isIssued ? 'info' : statusTone(requestLine?.status ?? stockStatus)}>
                            {requestLine ? requestLineStatusLabels[requestLine.status] : stockStatusLabels[stockStatus]}
                          </StatusPill>
                        </div>
                      </td>
                      <td className={cn(detailTableCell, '!px-1 whitespace-nowrap')} onClick={(event) => event.stopPropagation()}>
                        {requestLine && selectedRequest ? (
                          <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-1">
                            <ToolIconButton
                              label={issueDraft?.mode === 'full' ? 'Отмена' : 'Выдать'}
                              icon={issueDraft?.mode === 'full' ? undefined : <Check size={13} strokeWidth={2.2} />}
                              tone={issueDraft?.mode === 'full' ? 'neutral' : 'success'}
                              className={cn('!min-h-5 !px-1.5 py-0 text-[10px]', issueDraft?.mode === 'full' && 'border-slate-300 bg-white text-slate-700')}
                              disabled={remaining <= 0 || available < remaining}
                              onClick={() => stageFullIssue(requestLine.id)}
                            />
                            <div className="inline-flex items-center gap-1">
                              <ToolIconButton
                                label={issueDraft?.mode === 'partial' ? 'Отмена' : 'Выдать часть'}
                                className={cn('!min-h-5 !px-1.5 py-0 text-[10px]', issueDraft?.mode === 'partial' && 'border-slate-300 bg-white text-slate-700')}
                                disabled={remaining <= 0 || available <= 0}
                                onClick={() => openPartialIssue(requestLine.id)}
                              />
                              {issueDraft?.mode === 'partial' ? (
                                <input
                                  type="number"
                                  min={1}
                                  max={Math.min(available, remaining)}
                                  value={partialQuantity}
                                  onInput={(event) => updatePartialIssue(requestLine.id, event.currentTarget.value)}
                                  onChange={(event) => updatePartialIssue(requestLine.id, event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      updatePartialIssue(requestLine.id, event.currentTarget.value)
                                      event.currentTarget.blur()
                                    }
                                  }}
                                  className="h-5 w-10 rounded-md border border-amber-300 bg-white px-1 text-center text-[11px] text-slate-900 outline-none focus:border-amber-500"
                                  aria-label="Количество для частичной выдачи"
                                />
                              ) : null}
                            </div>
                            {shortage > 0 ? (
                              <ToolIconButton
                                label={available <= 0 ? 'Нет на складе / В пополнение' : 'Не хватает / В пополнение'}
                                icon={<PackageX size={13} strokeWidth={2.2} />}
                                tone="danger"
                                className="!min-h-5 !px-1.5 py-0 text-[10px]"
                                onClick={() => markLineOutOfStock(selectedRequest.id, requestLine.id)}
                              />
                            ) : null}
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
                {visibleManualLines.map((line, index) => (
                  <tr
                    key={line.id}
                    className={cn(
                      'transition hover:bg-amber-50/70',
                      index % 2 ? 'bg-white' : 'bg-amber-50/35',
                    )}
                  >
                    <td className={cn(detailTableCell, '!px-1 text-center text-xs text-slate-500')}>
                      {visibleCatalog.length + index + 1}
                    </td>
                    <td className={cn(detailTableCell, 'min-w-0')}>
                      <div className="whitespace-normal break-words leading-5 text-slate-950" title={line.manualName}>
                        {line.manualName}
                      </div>
                      {line.seniorComment ? <div className="mt-1 text-xs text-slate-500">{line.seniorComment}</div> : null}
                    </td>
                    <td className={detailTableCell}>{manualCategory}</td>
                    <td className={cn(detailTableCell, 'text-center')}>шт.</td>
                    <td className={cn(detailTableCell, 'text-center')}>
                      <div className="whitespace-nowrap text-slate-950">
                        {formatNumber(line.quantity)}
                      </div>
                    </td>
                    <td className={cn(detailTableCell, 'text-center')}>—</td>
                    <td className={cn(detailTableCell, 'text-center')}>
                      <div className="text-amber-700">сверить</div>
                      <div className="text-xs text-slate-500">нет в справочнике</div>
                    </td>
                    <td className={cn(detailTableCell, 'text-center')}>—</td>
                    <td className={detailTableCell}>
                      <div className="flex justify-center">
                        <StatusPill className="whitespace-nowrap !font-normal" tone={statusTone(line.status)}>
                          {requestLineStatusLabels[line.status]}
                        </StatusPill>
                      </div>
                    </td>
                    <td className={detailTableCell} onClick={(event) => event.stopPropagation()}>
                      <span className="block text-center text-xs text-slate-400">—</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!visibleCatalog.length && !visibleManualLines.length ? (
              <EmptyState className="m-3">По текущему фильтру материалов нет.</EmptyState>
            ) : null}
              </div>
            </div>

            <div className="app-soft-card mt-2 flex shrink-0 flex-wrap items-center justify-end gap-3 rounded-md border px-3 py-2">
              <div className="text-right text-xs text-slate-500">
                {validIssueDrafts.length
                  ? `К выдаче: ${fullIssueDraftCount}; частично: ${partialIssueDraftCount}`
                  : 'Выберите строки для выдачи'}
              </div>
              <Button variant="primary" disabled={!validIssueDrafts.length || issueConfirmationStatus === 'loading'} onClick={confirmIssueDrafts}>
                <PackageCheck size={16} />
                Подтвердить и выдать
              </Button>
            </div>
          </div>
            </>
          )}
        </section>
      </section>

      {issueConfirmationStatus === 'loading' ? (
        <BrandedLoadingModal title="Проводим выдачу материалов" />
      ) : null}

      {issueConfirmationStatus === 'done' ? (
        <div className="app-modal-backdrop z-[60] flex items-center justify-center px-4 py-6 backdrop-blur-sm">
          <div className="app-panel flex w-full max-w-md flex-col items-center rounded-xl border px-7 py-7 text-center shadow-2xl">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={32} />
            </div>
            <div className="mt-4 text-2xl font-normal text-slate-950">Выдача произведена</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Материалы списаны со склада, статусы заявки обновлены.
            </div>
            <Button className="mt-6 w-full max-w-48" onClick={() => setIssueConfirmationStatus('idle')}>
              Закрыть
            </Button>
          </div>
        </div>
      ) : null}
    </PageTransition>
  )
}
