import {
  BookOpen,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
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
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
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
import type { CatalogItem, RequestStatus, SupplyRequestLine } from '../types/demo'

const allCategory = 'Все разделы'
const manualCategory = 'Ручные позиции'
const compactHeaderCell =
  'sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-normal uppercase tracking-wide text-slate-500'
const compactTableCell = 'border-b border-slate-100 px-3 py-1 align-middle text-sm leading-5 text-slate-700'
const overviewHeaderCell = cn(
  compactHeaderCell,
  '!border-b-2 !border-b-[#66c99d] !border-r-[#8fddbf] !bg-[#c9f8e8] !px-1.5 !py-2.5 !text-[13px] !font-bold !leading-[1.25] !tracking-[0.04em] !text-[#17362d] [font-family:Manrope,var(--font-sans)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),inset_0_-1px_0_rgba(38,138,104,0.14)] last:!border-r-0',
)
const overviewHeaderLabel = 'flex min-h-[30px] items-center justify-center text-center'
const overviewTableCell = cn(compactTableCell, '!px-1.5 !text-[13px] border-r border-slate-100 last:border-r-0')
const detailHeaderCell = cn(compactHeaderCell, 'border-r border-slate-200 !text-center last:border-r-0')
const detailTableCell = cn(compactTableCell, 'border-r border-slate-100 last:border-r-0')
const overviewFilterControl =
  'h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none transition hover:border-slate-300 hover:bg-slate-50 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-700/10'
const allOverviewFilter = 'all'
type OverviewDatePreset = 'all' | 'latest-week' | 'latest-month' | 'latest-year' | 'custom'

type IssueDraft =
  | { mode: 'full' }
  | { mode: 'partial'; quantity: string }
type IssueConfirmationStatus = 'idle' | 'loading' | 'done'
const requestPaneEase = [0.22, 1, 0.36, 1] as const
const compactRequestPaneWidth = 224
const requestMorphDurationMs = 360

function overviewRequestStatusRank(status: RequestStatus) {
  if (status === 'partially-issued') return 0
  if (status === 'sent') return 1
  if (status === 'issued') return 3
  return 2
}

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

function formatPersonInitials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? []
  if (!parts.length) return '—'

  if (parts.length >= 3) {
    const [firstName, middleName] = parts
    const lastName = parts[parts.length - 1]
    return `${lastName} ${firstName.charAt(0)}.${middleName.charAt(0)}.`
  }

  if (parts.length === 2) {
    const [firstName, lastName] = parts
    return `${lastName} ${firstName.charAt(0)}.`
  }

  return parts[0]
}

function formatRequestDateLabel(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value)).replace(/\.$/, '')
}

function formatRequestTimeLabel(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function overviewStatusBadgeClass(tone: ReturnType<typeof statusTone>) {
  const classes = {
    neutral: 'bg-slate-100 text-slate-600',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-rose-100 text-rose-700',
    info: 'bg-sky-100 text-sky-700',
  }[tone]

  return cn('inline-flex min-h-6 items-center justify-center rounded-md px-2.5 text-xs font-normal', classes)
}

function overviewStatusRailClass(tone: ReturnType<typeof statusTone>) {
  return {
    neutral: 'overview-request-rail--neutral',
    success: 'overview-request-rail--success',
    warning: 'overview-request-rail--warning',
    danger: 'overview-request-rail--danger',
    info: 'overview-request-rail--info',
  }[tone]
}

function overviewStatusHoverClass(tone: ReturnType<typeof statusTone>) {
  return {
    neutral: 'hover:bg-slate-50/80',
    success: 'hover:bg-green-50/70',
    warning: 'hover:bg-amber-50/70',
    danger: 'hover:bg-rose-50/70',
    info: 'hover:bg-sky-50/70',
  }[tone]
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function addYears(date: Date, years: number) {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
}

function dateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateInput(value: string, boundary: 'start' | 'end') {
  if (!value) return null

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null

  const date = new Date(year, month - 1, day)
  return boundary === 'start' ? startOfDay(date) : endOfDay(date)
}

function overviewDateLabel(preset: OverviewDatePreset) {
  if (preset === 'latest-week') return 'За неделю'
  if (preset === 'latest-month') return 'За месяц'
  if (preset === 'latest-year') return 'За год'
  if (preset === 'custom') return 'Свой период'
  return 'Все даты'
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
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
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
        tone === 'info' && 'border-sky-300 bg-sky-50 text-sky-800 hover:border-sky-400 hover:bg-sky-100',
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
  const shouldReduceMotion = useReducedMotion()
  const issueFinishTimerRef = useRef<number | null>(null)
  const overviewDateMenuRef = useRef<HTMLDivElement | null>(null)
  const requestWorkspaceRef = useRef<HTMLElement | null>(null)
  const requestWorkspaceHeaderRef = useRef<HTMLDivElement | null>(null)
  const compactRequestListRef = useRef<HTMLDivElement | null>(null)
  const selectedCompactRequestRef = useRef<HTMLButtonElement | null>(null)
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
  const [overviewQuery, setOverviewQuery] = useState('')
  const [overviewStatusFilter, setOverviewStatusFilter] = useState<RequestStatus | typeof allOverviewFilter>(allOverviewFilter)
  const [overviewRoomFilter, setOverviewRoomFilter] = useState(allOverviewFilter)
  const [overviewDatePreset, setOverviewDatePreset] = useState<OverviewDatePreset>('all')
  const [overviewDateMenuOpen, setOverviewDateMenuOpen] = useState(false)
  const [overviewCustomStartDate, setOverviewCustomStartDate] = useState('')
  const [overviewCustomEndDate, setOverviewCustomEndDate] = useState('')
  const [requestWorkspaceWidth, setRequestWorkspaceWidth] = useState(0)
  const [requestOverviewHeaderHeight, setRequestOverviewHeaderHeight] = useState(0)
  const isRequestsMode = location.hash === '#requests'
  const isRequestOverview = isRequestsMode && !openedRequestId
  const requestPaneTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: requestMorphDurationMs / 1000, ease: requestPaneEase }
  const requestContentTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: requestPaneEase }

  const sortedRequests = useMemo(
    () =>
      [...requests].sort((a, b) => {
        const statusRank = overviewRequestStatusRank(a.status) - overviewRequestStatusRank(b.status)
        if (statusRank !== 0) return statusRank

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }),
    [requests],
  )
  const requestNumberById = useMemo(() => {
    const requestsByCreatedAt = [...requests].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    return new Map(requestsByCreatedAt.map((request, index) => [request.id, index + 1]))
  }, [requests])
  const overviewStatusOptions = useMemo(
    () => Array.from(new Set(sortedRequests.map((request) => request.status))),
    [sortedRequests],
  )
  const overviewRoomOptions = useMemo(() => {
    const requestRoomIds = new Set(sortedRequests.map((request) => request.roomId))
    return rooms.filter((room) => requestRoomIds.has(room.id))
  }, [rooms, sortedRequests])
  const overviewDateBounds = useMemo(() => {
    if (!sortedRequests.length) return null

    const dates = sortedRequests.map((request) => new Date(request.createdAt).getTime())
    return {
      start: startOfDay(new Date(Math.min(...dates))),
      end: endOfDay(new Date(Math.max(...dates))),
      latest: new Date(Math.max(...dates)),
    }
  }, [sortedRequests])
  const overviewCustomStartValue = overviewCustomStartDate || (overviewDateBounds ? dateInputValue(overviewDateBounds.start) : '')
  const overviewCustomEndValue = overviewCustomEndDate || (overviewDateBounds ? dateInputValue(overviewDateBounds.end) : '')
  const overviewDateRange = useMemo(() => {
    if (!overviewDateBounds || overviewDatePreset === 'all') return null

    const latest = overviewDateBounds.latest
    if (overviewDatePreset === 'latest-week') {
      return { start: startOfDay(addDays(latest, -6)), end: endOfDay(latest) }
    }

    if (overviewDatePreset === 'latest-month') {
      return { start: startOfDay(addMonths(latest, -1)), end: endOfDay(latest) }
    }

    if (overviewDatePreset === 'latest-year') {
      return { start: startOfDay(addYears(latest, -1)), end: endOfDay(latest) }
    }

    const start = parseDateInput(overviewCustomStartValue, 'start')
    const end = parseDateInput(overviewCustomEndValue, 'end')

    if (start && end) {
      return start.getTime() <= end.getTime() ? { start, end } : { start: end, end: start }
    }

    if (start) return { start, end: endOfDay(overviewDateBounds.latest) }
    if (end) return { start: overviewDateBounds.start, end }

    return null
  }, [overviewCustomEndValue, overviewCustomStartValue, overviewDateBounds, overviewDatePreset])
  const overviewFiltersActive =
    Boolean(overviewQuery.trim()) ||
    overviewStatusFilter !== allOverviewFilter ||
    overviewRoomFilter !== allOverviewFilter ||
    overviewDatePreset !== 'all'
  const visibleRequests = useMemo(() => {
    const titleValue = overviewQuery.trim().toLowerCase()

    return sortedRequests.filter((request) => {
      if (overviewStatusFilter !== allOverviewFilter && request.status !== overviewStatusFilter) return false
      if (overviewRoomFilter !== allOverviewFilter && request.roomId !== overviewRoomFilter) return false

      if (overviewDateRange) {
        const createdAt = new Date(request.createdAt).getTime()
        if (createdAt < overviewDateRange.start.getTime() || createdAt > overviewDateRange.end.getTime()) return false
      }

      if (titleValue && !requestTitle(request).toLowerCase().includes(titleValue)) return false

      return true
    })
  }, [overviewDateRange, overviewQuery, overviewRoomFilter, overviewStatusFilter, sortedRequests])
  const openedRequest = openedRequestId ? sortedRequests.find((request) => request.id === openedRequestId) : undefined
  const selectedRequest = openedRequest ?? sortedRequests.find((request) => request.id === activeRequestId) ?? sortedRequests[0]
  const compactRequests = isRequestsMode && openedRequest
    ? visibleRequests.some((request) => request.id === openedRequest.id)
      ? visibleRequests
      : [openedRequest, ...visibleRequests]
    : sortedRequests

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
    if (!overviewDateMenuOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (overviewDateMenuRef.current?.contains(event.target as Node)) return
      setOverviewDateMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [overviewDateMenuOpen])

  useEffect(() => {
    setIssueDrafts({})
  }, [selectedRequest?.id])

  useEffect(() => {
    if (!isRequestsMode || !requestWorkspaceRef.current) return

    const workspace = requestWorkspaceRef.current
    const updateWidth = () => setRequestWorkspaceWidth(workspace.clientWidth)
    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(workspace)
    return () => observer.disconnect()
  }, [isRequestsMode])

  useEffect(() => {
    if (!isRequestOverview || !requestWorkspaceHeaderRef.current) return

    const header = requestWorkspaceHeaderRef.current
    const updateHeight = () => setRequestOverviewHeaderHeight(header.offsetHeight)
    updateHeight()

    const observer = new ResizeObserver(updateHeight)
    observer.observe(header)
    return () => observer.disconnect()
  }, [isRequestOverview])

  useEffect(() => {
    if (!isRequestsMode || !openedRequestId) return

    const timer = window.setTimeout(() => {
      const container = compactRequestListRef.current
      const selected = selectedCompactRequestRef.current
      if (!container || !selected) return

      const containerRect = container.getBoundingClientRect()
      const selectedRect = selected.getBoundingClientRect()
      const topOverflow = selectedRect.top - containerRect.top
      const bottomOverflow = selectedRect.bottom - containerRect.bottom

      if (topOverflow < 0) {
        container.scrollTo({
          top: Math.max(0, container.scrollTop + topOverflow - 4),
          behavior: shouldReduceMotion ? 'auto' : 'smooth',
        })
      } else if (bottomOverflow > 0) {
        container.scrollTo({
          top: container.scrollTop + bottomOverflow + 4,
          behavior: shouldReduceMotion ? 'auto' : 'smooth',
        })
      }
    }, shouldReduceMotion ? 0 : requestMorphDurationMs)

    return () => window.clearTimeout(timer)
  }, [isRequestsMode, openedRequestId, selectedRequest?.id, shouldReduceMotion])

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
    if (isRequestsMode) {
      const workspaceWidth = requestWorkspaceRef.current?.clientWidth
      const headerHeight = requestWorkspaceHeaderRef.current?.offsetHeight
      if (workspaceWidth) setRequestWorkspaceWidth(workspaceWidth)
      if (headerHeight) setRequestOverviewHeaderHeight(headerHeight)
    }

    setOpenedRequestId(requestId)
    setActiveRequest(requestId)
    setSelectedCategory(allCategory)
    setQuery('')
  }

  function resetOverviewFilters() {
    setOverviewQuery('')
    setOverviewStatusFilter(allOverviewFilter)
    setOverviewRoomFilter(allOverviewFilter)
    setOverviewDatePreset('all')
    setOverviewDateMenuOpen(false)
    setOverviewCustomStartDate('')
    setOverviewCustomEndDate('')
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

    const creatorName = selectedRequest.createdBy

    return (
      <div className="app-soft-card grid min-w-0 gap-x-3 gap-y-2 rounded-md border px-3 py-2 text-xs text-slate-500 xl:grid-cols-[120px_215px_105px_minmax(0,1fr)]">
        <div className="min-w-0 border-r border-slate-200 pr-3">
          <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">Кабинет</div>
          <div className="text-sm font-semibold leading-5 text-slate-950">{requestCabinetLabel(selectedRequest)}</div>
          <div className="mt-0.5 leading-4">{selectedRequestRoom?.type ?? 'кабинет'}</div>
        </div>
        <div className="min-w-0 border-r border-slate-200 pr-3">
          <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">Запрос создан</div>
          <div className="break-words text-sm font-semibold leading-5 text-slate-950">{creatorName}</div>
          <div className="mt-0.5 leading-4">медсестра</div>
        </div>
        <div className="min-w-0 border-r border-slate-200 pr-3">
          <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">Подана</div>
          <div className="text-sm font-semibold leading-5 text-slate-950">
            {formatDateTime(selectedRequest.createdAt)}
          </div>
          <div className="mt-0.5 leading-4">подана заявка</div>
        </div>
        <div className="min-w-0 xl:col-span-4 xl:border-t xl:border-slate-200 xl:pt-2 min-[1700px]:!col-span-1 min-[1700px]:!border-t-0 min-[1700px]:!pt-0">
          <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">Комментарий</div>
          <div className="whitespace-normal break-words text-sm font-semibold leading-5 text-slate-950">
            {requestTitle(selectedRequest)}
          </div>
          <div className="mt-1 whitespace-normal break-words text-sm leading-5 text-slate-800">
            {selectedRequest.comment || 'Комментарий не указан'}
          </div>
        </div>
      </div>
    )
  }

  function renderRequestsOverview() {
    return (
      <div className="app-section-band flex min-h-0 flex-1 flex-col p-3">
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full table-fixed border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={cn(overviewHeaderCell, 'w-[36px]')}>
                  <div className={overviewHeaderLabel}>№</div>
                </th>
                <th className={cn(overviewHeaderCell, 'w-[92px]')}>
                  <div className={overviewHeaderLabel}>Дата и время</div>
                </th>
                <th className={cn(overviewHeaderCell, 'w-[90px]')}>
                  <div className={overviewHeaderLabel}>Кабинет</div>
                </th>
                <th className={cn(overviewHeaderCell, 'w-[260px]')}>
                  <div className={overviewHeaderLabel}>Наименование заявки</div>
                </th>
                <th className={cn(overviewHeaderCell, 'w-[88px]')}>
                  <div className={overviewHeaderLabel}>Статус</div>
                </th>
                <th className={cn(overviewHeaderCell, 'w-[50px]')}>
                  <div className={overviewHeaderLabel}>Поз.</div>
                </th>
                <th className={cn(overviewHeaderCell, 'w-[122px]')}>
                  <div className={overviewHeaderLabel}>Автор</div>
                </th>
                <th className={cn(overviewHeaderCell, 'w-[262px]')}>
                  <div className={overviewHeaderLabel}>Комментарий</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRequests.map((request) => {
                const requestNumber = requestNumberById.get(request.id) ?? '—'
                const authorName = formatPersonInitials(request.createdBy)
                const requestTone = statusTone(request.status)

                return (
                  <tr
                    key={request.id}
                    data-testid={`request-row-${request.id}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${requestCabinetLabel(request)}, ${formatDateTime(request.createdAt)}, ${request.lines.length} позиций, статус: ${requestStatusLabel(request)}`}
                    onClick={() => openRequest(request.id)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      openRequest(request.id)
                    }}
                    className={cn(
                      'cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600/40',
                      overviewStatusHoverClass(requestTone),
                    )}
                  >
                    <td
                      className={cn(
                        overviewTableCell,
                        'overview-request-rail relative !border-l-0 text-center text-slate-950',
                        overviewStatusRailClass(requestTone),
                      )}
                    >
                      {requestNumber}
                    </td>
                    <td className={cn(overviewTableCell, 'whitespace-nowrap text-center text-slate-500')} title={formatDateTime(request.createdAt)}>
                      <span className="inline-flex items-center whitespace-nowrap">
                        <span className="font-medium text-slate-950">{formatRequestDateLabel(request.createdAt)}</span>
                        <span className="mx-1 text-slate-300">·</span>
                        <span>{formatRequestTimeLabel(request.createdAt)}</span>
                      </span>
                    </td>
                    <td className={cn(overviewTableCell, 'whitespace-nowrap text-slate-950')}>
                      <span className="block truncate">
                        {requestCabinetLabel(request)}
                      </span>
                    </td>
                    <td className={overviewTableCell}>
                      <div className="whitespace-normal break-words text-slate-950" title={requestTitle(request)}>
                        {requestTitle(request)}
                      </div>
                    </td>
                    <td className={cn(overviewTableCell, 'text-center')}>
                      <div className="flex justify-center">
                        <span className={overviewStatusBadgeClass(requestTone)}>
                          {requestStatusLabel(request)}
                        </span>
                      </div>
                    </td>
                    <td className={cn(overviewTableCell, 'text-center text-slate-950')}>
                      <span className="inline-block whitespace-nowrap">
                        {request.lines.length}
                      </span>
                    </td>
                    <td className={cn(overviewTableCell, 'whitespace-nowrap text-center text-slate-950')} title={request.createdBy}>
                      {authorName}
                    </td>
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
      <section
        ref={isRequestsMode ? requestWorkspaceRef : undefined}
        className="relative flex h-full min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
      >
        <AnimatePresence initial={false}>
          {isRequestOverview ? (
            <motion.div
              key="requests-table-morph"
              initial={shouldReduceMotion ? false : { width: compactRequestPaneWidth, opacity: 1 }}
              animate={{ width: requestWorkspaceWidth || '100%', opacity: 1 }}
              exit={shouldReduceMotion
                ? { opacity: 0 }
                : { width: compactRequestPaneWidth, opacity: [1, 1, 0] }}
              transition={shouldReduceMotion
                ? { duration: 0 }
                : {
                    width: requestPaneTransition,
                    opacity: { duration: requestMorphDurationMs / 1000, times: [0, 0.74, 1], ease: 'linear' },
                  }}
              className="absolute bottom-0 left-0 z-30 overflow-hidden bg-white"
              style={{
                top: requestOverviewHeaderHeight || 98,
                transformOrigin: 'left top',
                willChange: shouldReduceMotion ? 'auto' : 'width, opacity',
              }}
            >
              <div
                className="flex h-full flex-col"
                style={{ width: requestWorkspaceWidth || '100%' }}
              >
                {renderRequestsOverview()}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence initial={false} mode="popLayout">
          {!isRequestOverview ? (
          <motion.aside
            layout
            key={isRequestsMode ? 'compact-requests-pane' : 'workspace-sidebar'}
            initial={isRequestsMode || shouldReduceMotion ? false : { width: 0, opacity: 0 }}
            animate={{ width: isRequestsMode ? compactRequestPaneWidth : 270, opacity: 1 }}
            exit={isRequestsMode ? { opacity: 0 } : shouldReduceMotion ? { width: 0 } : { width: 0, opacity: 0 }}
            transition={requestPaneTransition}
            className="app-section-band hidden min-h-0 shrink-0 flex-col overflow-hidden border-r border-slate-200 xl:flex"
            style={{ willChange: shouldReduceMotion ? 'auto' : 'width, opacity' }}
          >
            <motion.div
              initial={shouldReduceMotion ? false : isRequestsMode ? { opacity: 0 } : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...requestContentTransition, delay: shouldReduceMotion ? 0 : 0.12 }}
              className={cn(
                'min-h-0 flex-1 p-2.5',
                isRequestsMode ? 'flex flex-col overflow-hidden' : 'overflow-auto',
              )}
              style={{ width: isRequestsMode ? compactRequestPaneWidth : 270 }}
            >
              {isRequestsMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpenedRequestId(null)
                    setSelectedCategory(allCategory)
                    setQuery('')
                  }}
                  className="mb-3 inline-flex h-8 w-auto items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30"
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

              <div className={cn(
                'mt-4 border-t border-slate-200 pt-3',
                isRequestsMode && 'flex min-h-0 flex-1 flex-col',
              )}>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Заявки</div>
                <motion.div
                  ref={isRequestsMode ? compactRequestListRef : undefined}
                  className={cn(
                    'mt-2 grid gap-2',
                    isRequestsMode && 'min-h-0 flex-1 content-start overflow-y-auto pr-1',
                  )}
                >
                  {compactRequests.map((request) => {
                    const active = selectedRequest?.id === request.id
                    const requestTone = statusTone(request.status)

                    return (
                      <button
                        key={request.id}
                        ref={isRequestsMode && active ? selectedCompactRequestRef : undefined}
                        type="button"
                        data-testid={isRequestsMode ? `compact-request-${request.id}` : undefined}
                        aria-pressed={isRequestsMode ? active : undefined}
                        aria-label={isRequestsMode
                          ? `${requestCabinetLabel(request)}, ${formatDateTime(request.createdAt)}, ${request.lines.length} позиций, статус: ${requestStatusLabel(request)}`
                          : undefined}
                        title={isRequestsMode ? `Статус: ${requestStatusLabel(request)}` : undefined}
                        onClick={() => (isRequestsMode ? openRequest(request.id) : setActiveRequest(request.id))}
                        className={cn(
                          'w-full min-w-0 overflow-hidden rounded-md border text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2',
                          isRequestsMode
                            ? cn(
                                'overview-request-rail relative min-h-[58px] px-2.5 py-2 pl-3 focus-visible:ring-slate-400/40',
                                overviewStatusRailClass(requestTone),
                                overviewStatusHoverClass(requestTone),
                              )
                            : 'p-2 focus-visible:ring-slate-400/40',
                          active
                            ? 'border-slate-400 bg-slate-50 shadow-sm'
                            : isRequestsMode
                              ? 'border-slate-200/80 bg-white/70 hover:border-slate-300'
                              : 'border-transparent hover:border-slate-200 hover:bg-white',
                        )}
                      >
                        {isRequestsMode ? (
                          <>
                            <div className="min-w-0 truncate text-sm font-semibold text-slate-950">
                              {requestCabinetLabel(request)}
                            </div>
                            <div className="mt-1.5 flex min-w-0 items-center justify-start gap-2 text-xs text-slate-500">
                              <time className="shrink-0" dateTime={request.createdAt}>
                                {formatRequestDateLabel(request.createdAt)} · {formatRequestTimeLabel(request.createdAt)}
                              </time>
                              <span className="shrink-0 font-medium text-slate-600">
                                {request.lines.length} поз.
                              </span>
                            </div>
                            <span className="sr-only">Статус: {requestStatusLabel(request)}</span>
                          </>
                        ) : (
                          <>
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="min-w-0 flex-1 truncate font-semibold text-slate-950">{requestCabinetLabel(request)}</span>
                              <StatusPill className="shrink-0" tone={requestTone}>{requestStatusLabel(request)}</StatusPill>
                            </div>
                            <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-slate-500">
                              <span className="min-w-0 flex-1 truncate">{requestTitle(request)}</span>
                              <span className="shrink-0">{request.lines.length} позиций</span>
                            </div>
                          </>
                        )}
                      </button>
                    )
                  })}
                </motion.div>
              </div>
            </motion.div>
          </motion.aside>
          ) : null}
        </AnimatePresence>

        <motion.section
          layout
          transition={requestPaneTransition}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          <motion.div
            ref={isRequestsMode ? requestWorkspaceHeaderRef : undefined}
            layout
            transition={requestPaneTransition}
            className="shrink-0 border-b border-slate-200 bg-white p-4"
          >
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

            {isRequestOverview ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="relative h-9 min-w-[230px] flex-1 max-w-[340px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    value={overviewQuery}
                    onChange={(event) => setOverviewQuery(event.target.value)}
                    className={cn(overviewFilterControl, 'w-full pl-9')}
                    placeholder="Поиск по названию"
                  />
                </label>

                <label className="relative h-9 w-[150px]">
                  <select
                    value={overviewStatusFilter}
                    onChange={(event) => setOverviewStatusFilter(event.target.value as RequestStatus | typeof allOverviewFilter)}
                    className={cn(overviewFilterControl, 'w-full appearance-none pr-8')}
                  >
                    <option value={allOverviewFilter}>Все статусы</option>
                    {overviewStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status === 'sent' ? 'Ожидает' : requestStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                </label>

                <label className="relative h-9 w-[150px]">
                  <select
                    value={overviewRoomFilter}
                    onChange={(event) => setOverviewRoomFilter(event.target.value)}
                    className={cn(overviewFilterControl, 'w-full appearance-none pr-8')}
                  >
                    <option value={allOverviewFilter}>Все кабинеты</option>
                    {overviewRoomOptions.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.number} {room.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                </label>

                <div ref={overviewDateMenuRef} className="relative h-9 w-[168px]">
                  <button
                    type="button"
                    onClick={() => setOverviewDateMenuOpen((current) => !current)}
                    className={cn(overviewFilterControl, 'flex w-full items-center gap-2 pr-8 text-left')}
                    aria-expanded={overviewDateMenuOpen}
                  >
                    <CalendarDays className="shrink-0 text-slate-500" size={15} />
                    <span className="min-w-0 flex-1 truncate">{overviewDateLabel(overviewDatePreset)}</span>
                  </button>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />

                  {overviewDateMenuOpen ? (
                    <div className="absolute left-0 top-10 z-30 w-[310px] rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-700 shadow-xl">
                      <div className="grid gap-1">
                        {[
                          ['all', 'Все даты'],
                          ['latest-week', 'За неделю'],
                          ['latest-month', 'За месяц'],
                          ['latest-year', 'За год'],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              setOverviewDatePreset(value as OverviewDatePreset)
                              setOverviewDateMenuOpen(false)
                            }}
                            className={cn(
                              'flex h-8 items-center rounded-md px-2 text-left transition hover:bg-slate-50',
                              overviewDatePreset === value && 'bg-emerald-50 text-emerald-800',
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="my-2 border-t border-slate-100" />

                      <div className="grid gap-2">
                        <div className="text-xs font-medium text-slate-500">Свой период</div>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="grid gap-1 text-[11px] text-slate-500">
                            c
                            <input
                              type="date"
                              value={overviewCustomStartValue}
                              onInput={(event) => {
                                setOverviewCustomStartDate(event.currentTarget.value)
                                setOverviewDatePreset('custom')
                              }}
                              onChange={(event) => {
                                setOverviewCustomStartDate(event.target.value)
                                setOverviewDatePreset('custom')
                              }}
                              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-700/10"
                            />
                          </label>
                          <label className="grid gap-1 text-[11px] text-slate-500">
                            по
                            <input
                              type="date"
                              value={overviewCustomEndValue}
                              onInput={(event) => {
                                setOverviewCustomEndDate(event.currentTarget.value)
                                setOverviewDatePreset('custom')
                              }}
                              onChange={(event) => {
                                setOverviewCustomEndDate(event.target.value)
                                setOverviewDatePreset('custom')
                              }}
                              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-700/10"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={resetOverviewFilters}
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-normal transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/15',
                    overviewFiltersActive
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950',
                  )}
                  title={overviewFiltersActive ? 'Сбросить фильтры' : 'Фильтры'}
                >
                  <ListFilter size={15} />
                  Фильтры
                </button>
              </div>
            ) : null}

            {!isRequestOverview ? (
              <div className="mt-4 grid items-start gap-3 min-[1500px]:grid-cols-[260px_minmax(0,1fr)]">
                <div className="app-soft-card grid grid-cols-2 content-start gap-2 rounded-md border p-2 min-[1500px]:grid-cols-1">
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
          </motion.div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <AnimatePresence initial={false}>
              {!isRequestOverview ? (
                <motion.div
                  key="request-detail"
                  initial={shouldReduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ ...requestContentTransition, delay: shouldReduceMotion ? 0 : 0.08 }}
                  className="absolute inset-0 flex min-h-0 flex-col"
                >
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
                  const isPartiallyIssued = requestLine?.status === 'partially-issued'
                  const isOutOfStockRequestLine = Boolean(requestLine && remaining > 0 && available <= 0)
                  const isLineInReplenishment = Boolean(
                    requestLine &&
                      (requestLine.status === 'not-enough' ||
                        requestLine.status === 'waiting-replenishment'),
                  )
                  const rowTone =
                    isOutOfStockRequestLine
                      ? 'bg-rose-100/80 hover:!bg-rose-100/90'
                      : issueDraft?.mode === 'full'
                      ? 'bg-emerald-50/80 hover:!bg-emerald-50'
                      : issueDraft?.mode === 'partial' && hasPartialQuantity
                        ? 'bg-amber-50/80 hover:!bg-amber-50'
                        : isIssued
                          ? 'bg-emerald-50/80 hover:!bg-emerald-50'
                          : isPartiallyIssued
                            ? 'bg-amber-50/80 hover:!bg-amber-50'
                            : requestLine
                              ? 'bg-white'
                              : active
                                ? 'bg-slate-100/55'
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
                          <StatusPill className="whitespace-nowrap !font-normal" tone={statusTone(requestLine?.status ?? stockStatus)}>
                            {requestLine ? requestLineStatusLabels[requestLine.status] : stockStatusLabels[stockStatus]}
                          </StatusPill>
                        </div>
                      </td>
                      <td className={cn(detailTableCell, '!px-1 whitespace-nowrap')} onClick={(event) => event.stopPropagation()}>
                        {requestLine && selectedRequest ? (
                          <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-1">
                            {isOutOfStockRequestLine ? (
                              <ToolIconButton
                                label={isLineInReplenishment ? 'В пополнении' : 'Нет на складе / В пополнение'}
                                icon={<PackageX size={13} strokeWidth={2.2} />}
                                tone={isLineInReplenishment ? 'info' : 'danger'}
                                className="!min-h-5 !px-1.5 py-0 text-[10px]"
                                onClick={isLineInReplenishment ? undefined : () => markLineOutOfStock(selectedRequest.id, requestLine.id)}
                              />
                            ) : (
                              <>
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
                                    label="Не хватает / В пополнение"
                                    icon={<PackageX size={13} strokeWidth={2.2} />}
                                    tone="danger"
                                    className="!min-h-5 !px-1.5 py-0 text-[10px]"
                                    onClick={() => markLineOutOfStock(selectedRequest.id, requestLine.id)}
                                  />
                                ) : null}
                              </>
                            )}
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
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.section>
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
