import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  ListFilter,
  PackageCheck,
  PackageX,
  Search,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BrandedLoadingModal } from '../components/BrandedLoadingModal'
import { PageTransition } from '../components/PageTransition'
import { RoleHomeDashboard } from '../components/RoleHomeDashboard'
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
import { cn, formatDate, formatDateTime, formatNumber } from '../lib/format'
import type { CatalogItem, RequestStatus, SupplyRequestLine } from '../types/demo'

const allCategory = 'Все разделы'
const manualCategory = 'Ручные позиции'
const compactHeaderCell =
  'sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-normal uppercase tracking-wide text-slate-500'
const compactTableCell = 'border-b border-slate-100 px-3 py-1 align-middle text-sm leading-5 text-slate-700'
const overviewHeaderCell = cn(
  compactHeaderCell,
  '!border-b !border-b-slate-300 !border-r !border-r-slate-200 !bg-white !px-1.5 !py-2 !text-[12px] !font-normal !leading-none !tracking-normal !text-slate-950 shadow-none last:!border-r-0',
)
const overviewHeaderLabel = 'flex min-h-[22px] items-center justify-center text-center'
const overviewTableCell = cn(compactTableCell, '!px-1.5 !text-[13px] border-r border-slate-100 last:border-r-0')
const detailHeaderCell = cn(
  compactHeaderCell,
  '!h-[45px] !border-b !border-b-slate-300 !border-r !border-r-slate-200 !bg-white !px-0.5 !py-2 !text-center !text-[12px] !font-normal !leading-[14px] !tracking-normal !text-slate-950 shadow-none whitespace-normal last:!border-r-0',
)
const detailTableCell = cn(
  compactTableCell,
  '!h-[43px] !py-0.5 !leading-[18px] border-r border-slate-100 last:border-r-0',
)
const requestTableVisibleRowCount = 12
const requestTableColumnCount = 8
const overviewFilterControl =
  'h-12 rounded-lg border border-[#a9c9be] bg-white px-4 text-sm font-normal text-slate-700 outline-none transition hover:border-[#7eac9d] hover:bg-[#fbfefd] focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10'
const allOverviewFilter = 'all'
type OverviewDatePreset = 'all' | 'latest-week' | 'latest-month' | 'latest-year' | 'custom'

type IssueDraft =
  | { mode: 'full' }
  | { mode: 'partial'; quantity: string }
type IssueConfirmationStatus = 'idle' | 'loading' | 'done'
const requestPaneEase = [0.22, 1, 0.36, 1] as const
const compactRequestPaneWidth = 180
const requestMorphDurationMs = 360

function overviewRequestStatusRank(status: RequestStatus) {
  if (status === 'partially-issued') return 0
  if (status === 'sent') return 1
  if (status === 'issued') return 3
  return 2
}

function matchesCatalogQuery(item: CatalogItem, query: string) {
  const value = query.trim().toLowerCase()
  if (!value) return true

  return [item.shortName, item.fullName, item.category, item.unit, item.packageLabel, ...item.searchSynonyms]
    .join(' ')
    .toLowerCase()
    .includes(value)
}

function formatPositionCount(count: number) {
  const lastTwoDigits = count % 100
  const lastDigit = count % 10
  const label =
    lastTwoDigits >= 11 && lastTwoDigits <= 14
      ? 'позиций'
      : lastDigit === 1
        ? 'позиция'
        : lastDigit >= 2 && lastDigit <= 4
          ? 'позиции'
          : 'позиций'

  return `${count} ${label}`
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
  const overviewFiltersMenuRef = useRef<HTMLDivElement | null>(null)
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
  const [issueConfirmationOpen, setIssueConfirmationOpen] = useState(false)
  const [issueConfirmationStatus, setIssueConfirmationStatus] = useState<IssueConfirmationStatus>('idle')
  const [openedRequestId, setOpenedRequestId] = useState<string | null>(null)
  const [overviewQuery, setOverviewQuery] = useState('')
  const [overviewStatusFilter, setOverviewStatusFilter] = useState<RequestStatus | typeof allOverviewFilter>(allOverviewFilter)
  const [overviewRoomFilter, setOverviewRoomFilter] = useState(allOverviewFilter)
  const [overviewDatePreset, setOverviewDatePreset] = useState<OverviewDatePreset>('all')
  const [overviewFiltersMenuOpen, setOverviewFiltersMenuOpen] = useState(false)
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
  const validIssueDraftByLineId = new Map(validIssueDrafts)
  const pendingRequestLines = selectedRequest?.lines.filter(
    (line) => line.quantity - line.issuedQuantity > 0,
  ) ?? []
  const pendingKnownLines = pendingRequestLines.filter((line) => line.itemId)
  const pendingManualLines = pendingRequestLines.filter((line) => !line.itemId)
  const unselectedLineCount = pendingRequestLines.filter(
    (line) => !validIssueDraftByLineId.has(line.id),
  ).length
  const partialIssueLineCount = validIssueDrafts.filter(([lineId, draft]) => {
    const line = selectedRequest?.lines.find((item) => item.id === lineId)
    if (!line) return false

    const remaining = line.quantity - line.issuedQuantity
    const issueQuantity = draft.mode === 'full' ? remaining : Math.round(Number(draft.quantity) || 0)
    return issueQuantity < remaining
  }).length
  const deficitLineCount = pendingKnownLines.filter((line) => {
    if (!line.itemId) return false
    return getStockQuantity(stock, line.itemId) < line.quantity - line.issuedQuantity
  }).length
  const belowMinimumLineCount = validIssueDrafts.filter(([lineId, draft]) => {
    const line = selectedRequest?.lines.find((item) => item.id === lineId)
    if (!line?.itemId) return false

    const item = catalog.find((catalogItem) => catalogItem.id === line.itemId)
    if (!item) return false

    const remaining = line.quantity - line.issuedQuantity
    const issueQuantity = draft.mode === 'full' ? remaining : Math.round(Number(draft.quantity) || 0)
    return getStockQuantity(stock, line.itemId) - issueQuantity < item.minStock
  }).length
  const issueCriticalMoments: Array<{ tone: 'warning' | 'danger'; text: string }> = []

  if (unselectedLineCount > 0) {
    issueCriticalMoments.push({
      tone: 'warning',
      text: `Без выдачи останется: ${formatPositionCount(unselectedLineCount)}.`,
    })
  }
  if (partialIssueLineCount > 0) {
    issueCriticalMoments.push({
      tone: 'warning',
      text: `Частичная выдача: ${formatPositionCount(partialIssueLineCount)}.`,
    })
  }
  if (deficitLineCount > 0) {
    issueCriticalMoments.push({
      tone: 'danger',
      text: `Недостаточно остатка для полной выдачи: ${formatPositionCount(deficitLineCount)}.`,
    })
  }
  if (belowMinimumLineCount > 0) {
    issueCriticalMoments.push({
      tone: 'warning',
      text: `Ниже минимального остатка после выдачи: ${formatPositionCount(belowMinimumLineCount)}.`,
    })
  }
  if (pendingManualLines.length > 0) {
    issueCriticalMoments.push({
      tone: 'warning',
      text: `Ручные позиции для отдельной сверки: ${formatPositionCount(pendingManualLines.length)}.`,
    })
  }

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
    if (!overviewFiltersMenuOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (overviewFiltersMenuRef.current?.contains(event.target as Node)) return
      setOverviewFiltersMenuOpen(false)
      setOverviewDateMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [overviewFiltersMenuOpen])

  useEffect(() => {
    setIssueDrafts({})
    setIssueConfirmationOpen(false)
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

  function updateIssueQuantity(lineId: string, quantity: string, remaining: number, available: number) {
    setIssueDrafts((current) => {
      if (quantity === '') {
        const { [lineId]: _removed, ...rest } = current
        return rest
      }

      const numericQuantity = Math.round(Number(quantity) || 0)
      return {
        ...current,
        [lineId]:
          numericQuantity === remaining && available >= remaining
            ? { mode: 'full' }
            : { mode: 'partial', quantity },
      }
    })
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
    setOverviewFiltersMenuOpen(false)
    setOverviewDateMenuOpen(false)
    setOverviewCustomStartDate('')
    setOverviewCustomEndDate('')
  }

  function getRequestStats(request: typeof sortedRequests[number]) {
    const knownLines = request.lines.filter((line) => line.itemId)
    const manualCount = request.lines.length - knownLines.length
    const canIssue = knownLines.filter((line) => {
      if (!line.itemId) return false
      const remaining = line.quantity - line.issuedQuantity
      return remaining > 0 && getStockQuantity(stock, line.itemId) >= remaining
    }).length
    const deficit = knownLines.filter((line) => {
      if (!line.itemId) return false
      const remaining = line.quantity - line.issuedQuantity
      return remaining > 0 && getStockQuantity(stock, line.itemId) < remaining
    }).length
    const lowStock = knownLines.filter((line) => {
      if (!line.itemId) return false
      const remaining = line.quantity - line.issuedQuantity
      const available = getStockQuantity(stock, line.itemId)
      const item = catalog.find((catalogItem) => catalogItem.id === line.itemId)

      return remaining > 0 && available >= remaining && item !== undefined && available - remaining < item.minStock
    }).length

    return { canIssue, deficit, lowStock, manualCount }
  }

  function renderRequestContext() {
    if (!selectedRequest) return null

    const creatorName = selectedRequest.createdBy

    return (
      <div
        data-testid="request-context"
        className="grid w-full min-w-0 items-stretch border-t border-slate-200 pt-1.5 text-sm text-slate-950 md:grid-cols-[minmax(105px,0.9fr)_minmax(120px,1fr)_minmax(150px,1.2fr)_minmax(65px,0.55fr)_minmax(100px,0.8fr)_minmax(180px,1.35fr)]"
      >
        <div className="flex min-h-[66px] min-w-0 flex-col items-center justify-start px-2 py-1.5 text-center md:border-r md:border-slate-200">
          <div className="mb-1 flex h-[17px] items-start justify-center text-[12px] font-normal uppercase tracking-[0.04em] text-slate-500">Кабинет</div>
          <div className="text-[16px] font-normal leading-5 text-slate-950">{requestCabinetLabel(selectedRequest)}</div>
        </div>
        <div className="flex min-h-[66px] min-w-0 flex-col items-center justify-start border-t border-slate-200 px-2 py-1.5 text-center md:border-r md:border-t-0">
          <div className="mb-1 flex h-[17px] items-start justify-center text-[12px] font-normal uppercase tracking-[0.04em] text-slate-500">Подана</div>
          <div className="text-left text-[14px] font-normal leading-[18px] text-slate-950">
            <div><span className="text-slate-500">Дата:</span> {formatDate(selectedRequest.createdAt)}</div>
            <div><span className="text-slate-500">Время:</span> {formatRequestTimeLabel(selectedRequest.createdAt)}</div>
          </div>
        </div>
        <div className="flex min-h-[66px] min-w-0 flex-col items-center justify-start border-t border-slate-200 px-2 py-1.5 text-center md:border-r md:border-t-0">
          <div className="mb-0.5 flex h-[17px] items-start justify-center text-[12px] font-normal uppercase tracking-[0.04em] text-slate-500">Статус заявки</div>
          <StatusPill
            tone={statusTone(selectedRequest.status)}
            className="min-h-[40px] w-full !rounded !border !px-2 !py-1 !font-normal !text-slate-950 shadow-none"
          >
            <span className="text-[15px] font-normal leading-5">{requestStatusLabel(selectedRequest)}</span>
          </StatusPill>
        </div>
        <div className="flex min-h-[66px] min-w-0 flex-col items-center justify-start border-t border-slate-200 px-2 py-1.5 text-center md:border-r md:border-t-0">
          <div className="mb-1 flex h-[17px] items-start justify-center text-[12px] font-normal uppercase tracking-[0.04em] text-slate-500">Позиций</div>
          <div className="text-[16px] font-normal leading-5 text-slate-950">{selectedRequest.lines.length}</div>
        </div>
        <div className="flex min-h-[66px] min-w-0 flex-col items-center justify-start border-t border-slate-200 px-2 py-1.5 text-center md:border-r md:border-t-0">
          <div className="mb-1 flex h-[17px] items-start justify-center text-[12px] font-normal uppercase tracking-[0.04em] text-slate-500">В наличии</div>
          <div
            className={cn(
              'text-[16px] font-normal leading-5',
              (selectedRequestStats?.deficit ?? 0) > 0
                ? 'text-rose-700'
                : (selectedRequestStats?.lowStock ?? 0) > 0
                  ? 'text-amber-700'
                  : 'text-emerald-700',
            )}
          >
            {selectedRequestStats?.canIssue ?? 0}
          </div>
          {(selectedRequestStats?.deficit ?? 0) > 0 ? (
            <div className="text-[11px] font-normal leading-4 text-rose-700">
              не хватает: {selectedRequestStats?.deficit}
            </div>
          ) : (selectedRequestStats?.lowStock ?? 0) > 0 ? (
            <div className="text-[11px] font-normal leading-4 text-amber-700">
              малый остаток: {selectedRequestStats?.lowStock}
            </div>
          ) : null}
        </div>
        <div className="flex min-h-[66px] min-w-0 flex-col items-center justify-start border-t border-slate-200 px-2 py-1.5 text-center md:border-t-0">
          <div className="mb-1 flex h-[17px] items-start justify-center text-[12px] font-normal uppercase tracking-[0.04em] text-slate-500">Ответственный</div>
          <div className="break-words text-[15px] font-normal leading-[18px] text-slate-950">{creatorName}</div>
          <div className="text-[13px] font-normal leading-4 text-slate-500">медсестра</div>
        </div>
      </div>
    )
  }

  function renderRequestsOverview() {
    return (
      <div className="app-section-band flex min-h-0 flex-1 flex-col p-0">
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain border-b-0 border-l-0 border-r-0 border-t-0 bg-white">
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
    return <RoleHomeDashboard role="senior-nurse" />
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
                                'overview-request-rail relative min-h-[76px] px-2.5 py-2 pl-3 focus-visible:ring-slate-400/40',
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
                            <div className="mt-1.5 flex min-w-0 flex-wrap items-center justify-start gap-x-2 gap-y-0.5 text-xs text-slate-500">
                              <time className="shrink-0" dateTime={request.createdAt}>
                                {formatRequestDateLabel(request.createdAt)} · {formatRequestTimeLabel(request.createdAt)}
                              </time>
                              <span className="shrink-0 font-medium text-slate-600">
                                позиций {request.lines.length}
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
            className={cn(
              'shrink-0 border-b',
              isRequestOverview
                ? 'border-[#d5e4de] bg-[linear-gradient(105deg,#e8f7f1_0%,#f4faf7_48%,#ffffff_100%)] px-5 py-[18px]'
                : isRequestsMode
                  ? 'border-slate-200 bg-white px-4 py-3'
                  : 'border-slate-200 bg-white p-4',
            )}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className={cn(
                    'font-semibold text-slate-950',
                    isRequestOverview ? 'text-base leading-5' : isRequestsMode ? 'text-xl leading-6' : 'text-lg leading-none',
                  )}>
                    {isRequestOverview ? 'Заявки кабинетов' : isRequestsMode ? requestTitle(selectedRequest) : 'Материалы и выдача'}
                  </h1>
                  {!isRequestOverview && !isRequestsMode && selectedRequest ? (
                    <StatusPill tone={statusTone(selectedRequest.status)}>
                      {requestStatusLabel(selectedRequest)}
                    </StatusPill>
                  ) : null}
                </div>
                {isRequestOverview ? (
                  <div className="mt-0.5 text-xs leading-4 text-slate-500">
                    Поиск и фильтрация заявок кабинетов
                  </div>
                ) : null}
                {!isRequestOverview && !isRequestsMode ? (
                  <div className="mt-1 text-sm text-slate-500">
                    Таблица материалов, остатки и действия по активной заявке на одном рабочем экране.
                  </div>
                ) : null}
              </div>

            </div>

            {isRequestOverview ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="relative h-12 min-w-[260px] flex-1 max-w-[340px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    value={overviewQuery}
                    onChange={(event) => setOverviewQuery(event.target.value)}
                    className={cn(overviewFilterControl, 'w-full pl-9')}
                    placeholder="Поиск по названию"
                  />
                </label>

                <label className="relative h-12 w-[150px]">
                  <select
                    value={overviewStatusFilter}
                    onChange={(event) => setOverviewStatusFilter(event.target.value as RequestStatus | typeof allOverviewFilter)}
                    className={cn(overviewFilterControl, 'w-full appearance-none pr-8')}
                    aria-label="Статус заявки"
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

                <label className="relative h-12 w-[150px]">
                  <select
                    value={overviewRoomFilter}
                    onChange={(event) => setOverviewRoomFilter(event.target.value)}
                    className={cn(overviewFilterControl, 'w-full appearance-none pr-8')}
                    aria-label="Кабинет"
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

                <label className="relative h-12 w-[168px]">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-500" size={15} />
                  <select
                    value={overviewDatePreset}
                    onChange={(event) => {
                      setOverviewDatePreset(event.target.value as OverviewDatePreset)
                      setOverviewDateMenuOpen(false)
                    }}
                    className={cn(overviewFilterControl, 'w-full appearance-none pl-9 pr-8')}
                    aria-label="Период"
                  >
                    <option value="all">Все даты</option>
                    <option value="latest-week">За неделю</option>
                    <option value="latest-month">За месяц</option>
                    <option value="latest-year">За год</option>
                    <option value="custom">Свой период</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                </label>

                <div ref={overviewFiltersMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setOverviewFiltersMenuOpen((current) => !current)
                      setOverviewDateMenuOpen(false)
                    }}
                    className={cn(
                      'inline-flex h-12 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-normal transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/15',
                      overviewFiltersActive
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        : 'border-[#a9c9be] bg-white text-slate-700 hover:border-[#7eac9d] hover:bg-[#fbfefd] hover:text-slate-950',
                    )}
                    aria-expanded={overviewFiltersMenuOpen}
                    aria-haspopup="dialog"
                  >
                    <ListFilter size={15} />
                    Фильтры
                    <ChevronDown
                      className={cn('text-slate-500 transition-transform', overviewFiltersMenuOpen && 'rotate-180')}
                      size={15}
                    />
                  </button>

                  {overviewFiltersMenuOpen ? (
                    <div
                      className="absolute left-0 top-14 z-50 w-[340px] rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-xl"
                      role="dialog"
                      aria-label="Фильтры заявок"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="font-semibold text-slate-950">Фильтры</div>
                        {overviewFiltersActive ? (
                          <button
                            type="button"
                            onClick={resetOverviewFilters}
                            className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                          >
                            Сбросить
                          </button>
                        ) : null}
                      </div>

                      <div className="grid gap-3">
                        <label className="grid gap-1.5 text-xs font-medium text-slate-500">
                          Статус
                          <span className="relative">
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
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                          </span>
                        </label>

                        <label className="grid gap-1.5 text-xs font-medium text-slate-500">
                          Кабинет
                          <span className="relative">
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
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                          </span>
                        </label>

                        <div ref={overviewDateMenuRef} className="relative grid gap-1.5">
                          <div className="text-xs font-medium text-slate-500">Дата</div>
                          <button
                            type="button"
                            onClick={() => setOverviewDateMenuOpen((current) => !current)}
                            className={cn(overviewFilterControl, 'flex w-full items-center gap-2 pr-8 text-left')}
                            aria-expanded={overviewDateMenuOpen}
                          >
                            <CalendarDays className="shrink-0 text-slate-500" size={15} />
                            <span className="min-w-0 flex-1 truncate">{overviewDateLabel(overviewDatePreset)}</span>
                          </button>
                          <ChevronDown className="pointer-events-none absolute bottom-4 right-3 translate-y-1/2 text-slate-400" size={15} />

                          {overviewDateMenuOpen ? (
                            <div className="absolute left-0 top-[74px] z-50 w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-700 shadow-xl">
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
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {!isRequestOverview ? (
              isRequestsMode ? (
                <div className="mt-1.5">
                  {renderRequestContext()}
                </div>
              ) : (
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
                        placeholder="Поиск материала"
                      />
                    </label>
                  </div>

                  <div />
                </div>
              )
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div
                data-testid="request-lines-scroll"
                className={cn(
                  'min-h-0 flex-1 overflow-x-hidden',
                  isRequestsMode
                    ? 'overflow-y-scroll [scrollbar-gutter:stable]'
                    : 'overflow-y-auto',
                )}
              >
            <table className="w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-[3%]" />
                <col />
                <col className="w-[8%]" />
                <col className="w-[5%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[10%]" />
                <col className="w-[194px]" />
              </colgroup>
              <thead>
                <tr>
                  <th className={cn(detailHeaderCell, '!px-1')}>№</th>
                  <th className={detailHeaderCell}>Наименование</th>
                  <th className={detailHeaderCell}>Раздел</th>
                  <th className={detailHeaderCell}>Ед.</th>
                  <th className={detailHeaderCell}>В заявке</th>
                  <th className={detailHeaderCell}>Остаток</th>
                  <th className={detailHeaderCell}>Статус</th>
                  <th className={cn(detailHeaderCell, '!px-1')}>К выдаче</th>
                </tr>
              </thead>
              <tbody>
                {visibleCatalog.map((item, index) => {
                  const requestLine = requestLineByItem.get(item.id)
                  const available = getStockQuantity(stock, item.id)
                  const remaining = requestLine ? requestLine.quantity - requestLine.issuedQuantity : 0
                  const shortage = requestLine ? Math.max(remaining - available, 0) : 0
                  const stockStatus = getStockStatus(item, stock, replenishment)
                  const issueDraft = requestLine ? issueDrafts[requestLine.id] : undefined
                  const issueQuantityValue =
                    issueDraft?.mode === 'full'
                      ? String(remaining)
                      : issueDraft?.mode === 'partial'
                        ? issueDraft.quantity
                        : ''
                  const issueQuantity = Math.round(Number(issueQuantityValue) || 0)
                  const hasIssueQuantity = issueQuantity > 0
                  const maxIssueQuantity = Math.min(available, remaining)
                  const isIssueQuantityInvalid = issueQuantity < 0 || issueQuantity > maxIssueQuantity
                  const projectedAfterIssue = available - issueQuantity
                  const active = selectedItem?.id === item.id
                  const isIssued = requestLine?.status === 'issued'
                  const isPartiallyIssued = requestLine?.status === 'partially-issued'
                  const isOutOfStockRequestLine = Boolean(requestLine && remaining > 0 && available <= 0)
                  const isLineInReplenishment = Boolean(
                    requestLine &&
                      (requestLine.status === 'not-enough' ||
                        requestLine.status === 'waiting-replenishment'),
                  )
                  const canSendToReplenishment = isOutOfStockRequestLine || shortage > 0
                  const rowTone =
                    isOutOfStockRequestLine
                      ? 'bg-rose-100/80 hover:!bg-rose-100/90'
                      : issueDraft?.mode === 'full'
                      ? 'bg-emerald-50/80 hover:!bg-emerald-50'
                      : issueDraft?.mode === 'partial' && hasIssueQuantity
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
                      className={cn('h-[43px] cursor-pointer transition hover:bg-slate-100/70', rowTone)}
                    >
                      <td className={cn(detailTableCell, '!px-1 text-center text-xs text-slate-500')}>
                        {index + 1}
                      </td>
                      <td className={cn(detailTableCell, 'min-w-0')}>
                        <div className="line-clamp-2 whitespace-normal break-words leading-[18px] text-slate-950" title={item.fullName}>
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
                      <td className={detailTableCell}>
                        <div className="flex justify-center">
                          <StatusPill className="whitespace-nowrap !font-normal" tone={statusTone(requestLine?.status ?? stockStatus)}>
                            {requestLine ? requestLineStatusLabels[requestLine.status] : stockStatusLabels[stockStatus]}
                          </StatusPill>
                        </div>
                      </td>
                      <td className={cn(detailTableCell, '!px-1.5')} onClick={(event) => event.stopPropagation()}>
                        {requestLine && selectedRequest ? (
                          <div className="flex w-full min-w-0 items-stretch gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={maxIssueQuantity}
                              step={1}
                              value={issueQuantityValue}
                              placeholder={remaining <= 0 ? '—' : undefined}
                              disabled={remaining <= 0 || available <= 0}
                              onInput={(event) =>
                                updateIssueQuantity(requestLine.id, event.currentTarget.value, remaining, available)
                              }
                              onChange={(event) =>
                                updateIssueQuantity(requestLine.id, event.target.value, remaining, available)
                              }
                              className={cn(
                                'h-9 w-[84px] shrink-0 appearance-none rounded-md border bg-white px-2 text-center !text-base font-semibold text-slate-950 outline-none transition [appearance:textfield] focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                                isIssueQuantityInvalid
                                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
                                  : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-700/10',
                              )}
                              aria-label={`Количество к выдаче: ${item.fullName}`}
                            />
                            <div className="flex h-9 w-[92px] shrink-0 items-center justify-between gap-1 rounded-md border border-slate-200 bg-white/70 px-1.5">
                              <div className="grid min-w-0 grid-cols-[auto_1fr] items-center gap-x-1 text-[12px] leading-[15px]">
                                <span className="font-medium text-slate-600">После</span>
                                <span
                                  className={cn(
                                    'text-right text-[13px] font-semibold',
                                    projectedAfterIssue < 0
                                      ? 'text-rose-700'
                                      : projectedAfterIssue < item.minStock
                                        ? 'text-amber-700'
                                        : 'text-slate-700',
                                  )}
                                >
                                  {formatNumber(projectedAfterIssue)}
                                </span>
                                <span className="font-medium text-slate-600">Мин.</span>
                                <span className="text-right text-[13px] font-semibold text-slate-700">
                                  {formatNumber(item.minStock)}
                                </span>
                              </div>
                              {canSendToReplenishment ? (
                                <button
                                  type="button"
                                  className={cn(
                                    'flex size-6 shrink-0 items-center justify-center rounded border transition',
                                    isLineInReplenishment
                                      ? 'cursor-default border-sky-200 bg-sky-50 text-sky-700'
                                      : 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100',
                                  )}
                                  onClick={
                                    isLineInReplenishment
                                      ? undefined
                                      : () => markLineOutOfStock(selectedRequest.id, requestLine.id)
                                  }
                                  aria-label={isLineInReplenishment ? 'В пополнении' : 'Добавить в пополнение'}
                                  title={isLineInReplenishment ? 'В пополнении' : 'Добавить в пополнение'}
                                >
                                  <PackageX size={14} strokeWidth={2.2} />
                                </button>
                              ) : null}
                            </div>
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
                      'h-[43px] transition hover:bg-amber-50/70',
                      index % 2 ? 'bg-white' : 'bg-amber-50/35',
                    )}
                  >
                    <td className={cn(detailTableCell, '!px-1 text-center text-xs text-slate-500')}>
                      {visibleCatalog.length + index + 1}
                    </td>
                    <td className={cn(detailTableCell, 'min-w-0')}>
                      <div className="line-clamp-2 whitespace-normal break-words leading-[18px] text-slate-950" title={line.manualName}>
                        {line.manualName}
                      </div>
                      {line.seniorComment ? <div className="line-clamp-1 text-xs text-slate-500">{line.seniorComment}</div> : null}
                    </td>
                    <td className={detailTableCell}>{manualCategory}</td>
                    <td className={cn(detailTableCell, 'text-center')}>шт.</td>
                    <td className={cn(detailTableCell, 'text-center')}>
                      <div className="whitespace-nowrap text-slate-950">
                        {formatNumber(line.quantity)}
                      </div>
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
                      <span className="block text-center text-xs text-amber-700">сверить · нет в справочнике</span>
                    </td>
                  </tr>
                ))}
                {isRequestsMode
                  ? Array.from({
                      length: Math.max(
                        requestTableVisibleRowCount - visibleCatalog.length - visibleManualLines.length,
                        0,
                      ),
                    }).map((_, rowIndex) => (
                      <tr
                        key={`request-table-empty-row-${rowIndex}`}
                        className="h-[43px] bg-white"
                        aria-hidden="true"
                      >
                        {Array.from({ length: requestTableColumnCount }).map((__, columnIndex) => (
                          <td
                            key={columnIndex}
                            className={cn(detailTableCell, columnIndex === requestTableColumnCount - 1 && 'border-r-0')}
                          >
                            &nbsp;
                          </td>
                        ))}
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>

            {!visibleCatalog.length && !visibleManualLines.length ? (
              <EmptyState className="m-3">По текущему фильтру материалов нет.</EmptyState>
            ) : null}
              </div>
              {isRequestsMode && selectedRequest ? (
                <>
                  <section
                    data-testid="request-comment"
                    className="mt-2 min-h-[96px] shrink-0 border-t border-slate-200 bg-slate-50/65 px-5 py-4"
                    aria-labelledby="request-comment-title"
                  >
                    <div
                      id="request-comment-title"
                      className="text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Комментарий к заявке
                    </div>
                    <div className="mt-2 max-w-5xl whitespace-normal break-words text-sm leading-5 text-slate-700">
                      {selectedRequest.comment || 'Комментарий не указан'}
                    </div>
                  </section>
                  <div className="flex min-h-[58px] shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/80 px-3 py-2">
                    <Button
                      className="h-9 border-[#8db9ab] px-3 font-semibold text-emerald-800 hover:border-[#6aa28f] hover:bg-white"
                      variant="secondary"
                      onClick={prepareAvailableIssue}
                    >
                      Подготовить доступное
                    </Button>
                    <Button
                      variant="primary"
                      disabled={!validIssueDrafts.length || issueConfirmationStatus === 'loading'}
                      onClick={() => setIssueConfirmationOpen(true)}
                    >
                      <PackageCheck size={16} />
                      Подтвердить и выдать
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.section>
      </section>

      {issueConfirmationOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/5 px-4 py-6 [backdrop-filter:blur(0.5px)]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIssueConfirmationOpen(false)
          }}
        >
          <div
            className="app-panel w-full max-w-md rounded-xl border p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="issue-confirmation-title"
          >
            <div id="issue-confirmation-title" className="text-xl font-semibold text-slate-950">
              Подтвердить выдачу
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              После подтверждения материалы будут списаны со склада.
            </div>
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Заявка</div>
              <div className="mt-1 text-sm font-medium text-slate-950">{requestTitle(selectedRequest)}</div>
              <div className="mt-2 text-sm text-slate-700">
                К выдаче выбрано позиций:{' '}
                <span className="font-semibold text-slate-950">{validIssueDrafts.length}</span>
              </div>
            </div>
            {issueCriticalMoments.length ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/70 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Обратите внимание
                </div>
                <div className="mt-2 grid gap-2">
                  {issueCriticalMoments.map((moment) => (
                    <div
                      key={moment.text}
                      className={cn(
                        'flex items-start gap-2 text-sm leading-5',
                        moment.tone === 'danger' ? 'text-rose-800' : 'text-amber-900',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-[7px] size-1.5 shrink-0 rounded-full',
                          moment.tone === 'danger' ? 'bg-rose-600' : 'bg-amber-600',
                        )}
                      />
                      <span>{moment.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIssueConfirmationOpen(false)}>
                Отмена
              </Button>
              <Button
                onClick={() => {
                  setIssueConfirmationOpen(false)
                  confirmIssueDrafts()
                }}
              >
                Подтвердить
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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
