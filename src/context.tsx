import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  mockCatalog,
  mockJournal,
  mockReplenishment,
  mockRequests,
  mockRooms,
  mockStock,
  mockSuppliers,
} from './data/mockData'
import { clinicBackupSupplierId, clinicMainSupplierId, getRecommendedQuantity, isReadyForOrder, roleToRoomId } from './lib/demoLogic'
import { clampNumber } from './lib/format'
import type {
  AvailabilityStatus,
  DemoRole,
  DemoState,
  JournalEvent,
  JournalEventType,
  ReplenishmentLine,
  RequestCartLine,
  RequestLineStatus,
  SupplierOrder,
  SupplyRequest,
} from './types/demo'

const storageKey = 'ultramed-supply-demo-state'
const legacyStorageKeys = [
  'ultramed-supply-demo-state-v29',
  'ultramed-supply-demo-state-v28',
  'ultramed-supply-demo-state-v27',
  'ultramed-supply-demo-state-v26',
  'ultramed-supply-demo-state-v25',
]
const orthodonticDemoRequestId = 'REQ-005'
const seniorRoutePaths = new Set([
  '/senior',
  '/stock',
  '/replenishment',
  '/orders',
  '/orders/forming',
  '/receipt',
  '/suppliers',
  '/catalog',
  '/journal',
])

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function now() {
  return new Date().toISOString()
}

function nextNumber(prefix: string, existingIds: string[]) {
  const max = existingIds.reduce((result, id) => {
    const match = id.match(new RegExp(`^${prefix}-(\\d+)$`))
    return match ? Math.max(result, Number(match[1])) : result
  }, 0)

  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

function createInitialState(role: DemoRole = 'nurse-105', demoStarted = false): DemoState {
  return {
    demoStarted,
    role,
    rooms: clone(mockRooms),
    suppliers: clone(mockSuppliers),
    catalog: clone(mockCatalog),
    stock: clone(mockStock),
    requests: clone(mockRequests),
    replenishment: clone(mockReplenishment),
    orders: [],
    journal: clone(mockJournal),
    carts: {
      'room-101': [],
      'room-102': [],
      'room-105': [],
    },
    activeRequestId: orthodonticDemoRequestId,
  }
}

function roleForCurrentRoute(fallback: DemoRole): DemoRole {
  if (typeof window === 'undefined') {
    return fallback
  }

  const { pathname } = window.location

  if (seniorRoutePaths.has(pathname)) return 'senior-nurse'
  if (pathname === '/analytics') return 'manager'
  if (pathname === '/cabinet') return 'nurse-105'

  return fallback
}

function mergeById<T extends { id: string }>(storedItems: T[] | undefined, mockItems: T[]) {
  const storedById = new Map((storedItems ?? []).map((item) => [item.id, item]))
  const mockIds = new Set(mockItems.map((item) => item.id))

  return [
    ...mockItems.map((mockItem) => ({ ...storedById.get(mockItem.id), ...mockItem })),
    ...(storedItems ?? []).filter((item) => !mockIds.has(item.id)),
  ]
}

const demoOutOfStockItemIds = new Set(['item-suture-4-0', 'item-ortho-primer'])
const demoBelowMinimumItemIds = new Set(['item-composite-a2', 'item-niti-archwires'])
const demoNearMinimumItemIds = new Set(['item-articaine', 'item-airflow-powder'])

function demoStockQuantityForItem(item: (typeof mockCatalog)[number]) {
  if (demoOutOfStockItemIds.has(item.id)) return 0
  if (demoBelowMinimumItemIds.has(item.id)) return Math.max(item.minStock - 1, 0)
  if (demoNearMinimumItemIds.has(item.id)) return item.minStock

  return Math.max(item.desiredStock, item.minStock + 4, 6)
}

function normalizeStockForCatalog(items: DemoState['stock']) {
  const byItemId = new Map(items.map((item) => [item.itemId, item]))
  mockCatalog
    .filter((item) => item.active)
    .forEach((item) => {
      const current = byItemId.get(item.id)
      const shouldNormalize =
        !current ||
        current.quantity <= 0 ||
        demoOutOfStockItemIds.has(item.id) ||
        demoBelowMinimumItemIds.has(item.id) ||
        demoNearMinimumItemIds.has(item.id)

      if (shouldNormalize) {
        byItemId.set(item.id, {
          itemId: item.id,
          quantity: demoStockQuantityForItem(item),
          lastMovementAt: current?.lastMovementAt ?? '2026-04-28T08:35:00+03:00',
        })
      }
    })

  return Array.from(byItemId.values())
}

function mergeStock(storedItems: DemoState['stock'] | undefined) {
  const storedByItemId = new Map((storedItems ?? []).map((item) => [item.itemId, item]))
  const mockItemIds = new Set(mockStock.map((item) => item.itemId))

  return normalizeStockForCatalog([
    ...mockStock.map((mockItem) => storedByItemId.get(mockItem.itemId) ?? mockItem),
    ...(storedItems ?? []).filter((item) => !mockItemIds.has(item.itemId)),
  ])
}

function mergeRequestLines(storedLines: SupplyRequest['lines'] | undefined, mockLines: SupplyRequest['lines']) {
  const storedById = new Map((storedLines ?? []).map((line) => [line.id, line]))
  const mockIds = new Set(mockLines.map((line) => line.id))

  return [
    ...mockLines.map((mockLine) => ({ ...mockLine, ...storedById.get(mockLine.id) })),
    ...(storedLines ?? []).filter((line) => !mockIds.has(line.id)),
  ]
}

function looksLikeGeneratedRequestTitle(title: string | undefined, catalog = mockCatalog) {
  const normalizedTitle = title?.trim().replace(/_/g, ' ')
  if (!normalizedTitle) return false

  return (
    (normalizedTitle.includes(',') && /\+\s*\d+$/.test(normalizedTitle)) ||
    catalog.some((item) => normalizedTitle.includes(item.shortName) || normalizedTitle.includes(item.fullName))
  )
}

function defaultRequestTitle(roomId?: string) {
  const room = mockRooms.find((item) => item.id === roomId)
  if (roomId === 'room-105') return 'Ортодонтия май расходники'
  return `${room?.title ?? 'Кабинет'}: материалы на прием`
}

function hydrateState(storedState: Partial<DemoState>) {
  const initialState = createInitialState()
  const nextState = { ...initialState, ...storedState } as DemoState
  nextState.role = roleForCurrentRoute(nextState.role)

  nextState.rooms = mergeById(nextState.rooms, mockRooms)
  nextState.suppliers = mergeById(nextState.suppliers, mockSuppliers)
  nextState.catalog = mergeById(nextState.catalog, mockCatalog)
  nextState.stock = mergeStock(nextState.stock)

  const storedRequests = nextState.requests ?? []
  const storedRequestById = new Map(storedRequests.map((request) => [request.id, request]))
  const mockRequestIds = new Set(mockRequests.map((request) => request.id))
  const normalizeRequest = (request: SupplyRequest) => {
    const mockRequest = mockRequests.find((item) => item.id === request.id)

    if (mockRequest) {
      return {
        ...request,
        title: mockRequest.title,
        comment: mockRequest.comment,
        createdBy: mockRequest.createdBy,
        lines: mergeRequestLines(request.lines, mockRequest.lines),
      }
    }

    const normalizedTitle = request.title?.replace(/_/g, ' ')
    return {
      ...request,
      title: looksLikeGeneratedRequestTitle(normalizedTitle, nextState.catalog)
        ? defaultRequestTitle(request.roomId)
        : normalizedTitle,
    }
  }

  nextState.requests = [
    ...mockRequests.map((mockRequest) => normalizeRequest(storedRequestById.get(mockRequest.id) ?? mockRequest)),
    ...storedRequests.filter((request) => !mockRequestIds.has(request.id)).map(normalizeRequest),
  ]

  if (!nextState.activeRequestId || !nextState.requests.some((request) => request.id === nextState.activeRequestId)) {
    nextState.activeRequestId = orthodonticDemoRequestId
  }

  normalizeReplenishmentSuppliers(nextState)

  return nextState
}

function loadState() {
  if (typeof window === 'undefined') {
    return createInitialState()
  }

  const stored =
    window.localStorage.getItem(storageKey) ??
    legacyStorageKeys.map((key) => window.localStorage.getItem(key)).find((value): value is string => Boolean(value))
  if (!stored) {
    return createInitialState(roleForCurrentRoute('nurse-105'))
  }

  try {
    return hydrateState(JSON.parse(stored) as Partial<DemoState>)
  } catch {
    return createInitialState(roleForCurrentRoute('nurse-105'))
  }
}

function addJournal(
  state: DemoState,
  event: Omit<JournalEvent, 'id' | 'createdAt'> & { createdAt?: string },
) {
  const id = nextNumber('EVT', state.journal.map((item) => item.id))
  state.journal.unshift({
    id,
    createdAt: event.createdAt ?? now(),
    ...event,
  })
}

function getItem(state: DemoState, itemId: string) {
  return state.catalog.find((item) => item.id === itemId)
}

function getStock(state: DemoState, itemId: string) {
  let stock = state.stock.find((item) => item.itemId === itemId)

  if (!stock) {
    stock = { itemId, quantity: 0 }
    state.stock.push(stock)
  }

  return stock
}

function isReplenishmentSupplierId(supplierId: string) {
  return supplierId === clinicMainSupplierId || supplierId === clinicBackupSupplierId
}

function preferredSupplierIdForItem(_item: { primarySupplierId: string; alternativeSupplierIds: string[] }) {
  return clinicMainSupplierId
}

function normalizeReplenishmentSuppliers(state: DemoState) {
  state.replenishment = (state.replenishment ?? []).map((line) => {
    const item = getItem(state, line.itemId)
    if (!item) return line

    const preferredSupplierId = preferredSupplierIdForItem(item)
    const shouldUseMainSupplier = !isReplenishmentSupplierId(line.selectedSupplierId)
    if (!shouldUseMainSupplier || line.selectedSupplierId === preferredSupplierId) return line

    return {
      ...line,
      selectedSupplierId: preferredSupplierId,
    }
  })
}

function getOrderQuantity(item: ReturnType<typeof getItem>, line: ReplenishmentLine) {
  if (line.recommendedQuantity > 0) return line.recommendedQuantity
  if (item) return Math.max(getRecommendedQuantity(item, line.currentStock), line.minStock - line.currentStock, 1)

  return Math.max(line.desiredStock - line.currentStock, line.minStock - line.currentStock, 1)
}

function buildRequestTitle(state: DemoState, cart: RequestCartLine[], roomTitle?: string) {
  const sourceRequest = state.requests.find(
    (request) =>
      request.title?.trim() &&
      request.lines.length === cart.length &&
      request.lines.every((line, index) => {
        const cartLine = cart[index]
        return (
          cartLine &&
          line.itemId === cartLine.itemId &&
          line.manualName === cartLine.manualName &&
          line.quantity === cartLine.quantity
        )
      }),
  )

  if (sourceRequest?.title) return sourceRequest.title

  return roomTitle === 'Ортодонтия' ? 'Ортодонтия май расходники' : `${roomTitle ?? 'Кабинет'}: материалы на прием`
}

function recalculateRequestStatus(request: SupplyRequest) {
  const statuses = request.lines.map((line) => line.status)

  if (statuses.every((status) => status === 'issued' || status === 'rejected')) {
    request.status = 'issued'
    return
  }

  if (statuses.some((status) => status === 'not-enough' || status === 'waiting-replenishment')) {
    request.status = statuses.some((status) => status === 'issued' || status === 'partially-issued')
      ? 'partially-issued'
      : 'waiting-replenishment'
    return
  }

  if (statuses.some((status) => status === 'partially-issued')) {
    request.status = 'partially-issued'
    return
  }

  if (statuses.some((status) => status === 'manual-line' || status === 'needs-clarification')) {
    request.status = statuses.some((status) => status === 'issued') ? 'partially-issued' : 'needs-clarification'
    return
  }

  if (statuses.some((status) => status === 'issued')) {
    request.status = 'partially-issued'
    return
  }

  request.status = 'sent'
}

function ensureReplenishment(
  state: DemoState,
  itemId: string,
  source: ReplenishmentLine['source'],
  actorRole: DemoRole,
  description: string,
  requestId?: string,
) {
  const item = getItem(state, itemId)
  if (!item) return

  const stock = getStock(state, itemId)
  const existing = state.replenishment.find((line) => line.itemId === itemId && !line.closedAt)

  if (existing) {
    existing.currentStock = stock.quantity
    existing.minStock = item.minStock
    existing.desiredStock = item.desiredStock
    existing.source = source === 'not-enough' ? 'not-enough' : existing.source
    existing.requestId = requestId ?? existing.requestId
    existing.includedInOrder = existing.includedInOrder ?? true
    return
  }

  state.replenishment.unshift({
    id: `REP-${itemId}-${Date.now()}`,
    itemId,
    requestId,
    source,
    currentStock: stock.quantity,
    minStock: item.minStock,
    desiredStock: item.desiredStock,
    recommendedQuantity: 0,
    selectedSupplierId: preferredSupplierIdForItem(item),
    availabilityStatus: 'not-checked',
    comment: description,
    createdAt: now(),
    includedInOrder: true,
  })

  addJournal(state, {
    actorRole,
    itemId,
    requestId,
    type: 'replenishment-added',
    title: 'Позиция добавлена в пополнение',
    description,
  })
}

interface DemoContextValue {
  state: DemoState
  startDemo: (role?: DemoRole) => void
  resetDemo: () => void
  setRole: (role: DemoRole) => void
  loadRequestDraft: (requestId: string) => void
  addCatalogToCart: (itemId: string, quantity: number) => void
  addManualLineToCart: (manualName: string, quantity: number, comment?: string) => void
  updateCartLine: (lineId: string, patch: Partial<RequestCartLine>) => void
  removeCartLine: (lineId: string) => void
  submitRequest: (comment?: string) => string | null
  setActiveRequest: (requestId: string) => void
  issueFullLine: (requestId: string, lineId: string) => void
  issuePartialLine: (requestId: string, lineId: string, quantity: number) => void
  markLineOutOfStock: (requestId: string, lineId: string) => void
  markLineNeedsClarification: (requestId: string, lineId: string) => void
  reviewManualLine: (requestId: string, lineId: string, action: string) => void
  addItemToReplenishment: (itemId: string) => void
  updateReplenishmentAvailability: (lineId: string, status: AvailabilityStatus) => void
  prepareReplenishmentInquiry: (supplierId: string, lineIds: string[]) => void
  selectReplenishmentSupplier: (lineId: string, supplierId: string) => void
  updateReplenishmentQuantity: (lineId: string, quantity: number) => void
  updateReplenishmentComment: (lineId: string, comment: string) => void
  toggleReplenishmentInOrder: (lineId: string, included: boolean) => void
  formSupplierOrders: () => string[]
  markOrderAsOrdered: (orderId: string) => void
  updateReceiptDocumentNumber: (orderId: string, documentNumber: string) => void
  updateReceiptLineComment: (orderId: string, lineId: string, comment: string) => void
  acceptReceipt: (orderId: string, receivedByLineId: Record<string, number>) => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

export function DemoProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<DemoState>(loadState)

  useEffect(() => {
    setState((current) => {
      const hydrated = hydrateState(current)
      return JSON.stringify(hydrated) === JSON.stringify(current) ? current : hydrated
    })
  }, [])

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  }, [state])

  const startDemo = useCallback((role: DemoRole = 'nurse-105') => {
    setState((current) => ({
      ...current,
      demoStarted: true,
      role,
      uiMessage: undefined,
    }))
  }, [])

  const resetDemo = useCallback(() => {
    setState((current) => {
      const nextState = createInitialState(current.role, true)

      if (current.activeRequestId && nextState.requests.some((request) => request.id === current.activeRequestId)) {
        nextState.activeRequestId = current.activeRequestId
      }

      return nextState
    })
  }, [])

  const setRole = useCallback((role: DemoRole) => {
    setState((current) => ({ ...current, role, uiMessage: undefined }))
  }, [])

  const loadRequestDraft = useCallback((requestId: string) => {
    setState((current) => {
      const source = current.requests.find((request) => request.id === requestId)
      if (!source) return current

      const next = clone(current)
      const roleByRoomId: Record<string, DemoRole> = {
        'room-101': 'nurse-101',
        'room-102': 'nurse-102',
        'room-105': 'nurse-105',
      }

      next.role = roleByRoomId[source.roomId] ?? current.role
      next.carts[source.roomId] = source.lines.map((line, index) => ({
        id: `CART-DEMO-${requestId}-${index + 1}`,
        itemId: line.itemId,
        manualName: line.manualName,
        quantity: line.quantity,
        comment: line.comment,
      }))
      next.uiMessage = `Демо-заявка ${requestId} загружена в кабинет`
      return next
    })
  }, [])

  const addCatalogToCart = useCallback((itemId: string, quantity: number) => {
    setState((current) => {
      const roomId = roleToRoomId(current.role)
      if (!roomId) return current

      const next = clone(current)
      const cart = next.carts[roomId] ?? []
      const existing = cart.find((line) => line.itemId === itemId)
      const safeQuantity = Math.max(1, Math.round(quantity || 1))

      if (existing) {
        existing.quantity += safeQuantity
      } else {
        cart.push({
          id: `CART-${Date.now()}-${itemId}`,
          itemId,
          quantity: safeQuantity,
        })
      }

      next.carts[roomId] = cart
      next.uiMessage = 'Позиция добавлена в заявку'
      return next
    })
  }, [])

  const addManualLineToCart = useCallback((manualName: string, quantity: number, comment?: string) => {
    setState((current) => {
      const roomId = roleToRoomId(current.role)
      if (!roomId || !manualName.trim()) return current

      const next = clone(current)
      next.carts[roomId] = [
        ...(next.carts[roomId] ?? []),
        {
          id: `CART-${Date.now()}-manual`,
          manualName: manualName.trim(),
          quantity: Math.max(1, Math.round(quantity || 1)),
          comment: comment?.trim(),
        },
      ]
      next.uiMessage = 'Ручная строка добавлена в заявку'
      return next
    })
  }, [])

  const updateCartLine = useCallback((lineId: string, patch: Partial<RequestCartLine>) => {
    setState((current) => {
      const roomId = roleToRoomId(current.role)
      if (!roomId) return current

      const next = clone(current)
      next.carts[roomId] = (next.carts[roomId] ?? []).map((line) =>
        line.id === lineId
          ? {
              ...line,
              ...patch,
              quantity:
                typeof patch.quantity === 'number'
                  ? Math.max(1, Math.round(patch.quantity || 1))
                  : line.quantity,
            }
          : line,
      )
      return next
    })
  }, [])

  const removeCartLine = useCallback((lineId: string) => {
    setState((current) => {
      const roomId = roleToRoomId(current.role)
      if (!roomId) return current

      const next = clone(current)
      next.carts[roomId] = (next.carts[roomId] ?? []).filter((line) => line.id !== lineId)
      return next
    })
  }, [])

  const submitRequest = useCallback((comment?: string) => {
    let createdId: string | null = null

    setState((current) => {
      const roomId = roleToRoomId(current.role)
      if (!roomId) return current

      const cart = current.carts[roomId] ?? []
      if (!cart.length) return current

      const next = clone(current)
      const room = next.rooms.find((item) => item.id === roomId)
      const requestId = nextNumber('REQ', next.requests.map((item) => item.id))
      const createdAt = now()

      const request: SupplyRequest = {
        id: requestId,
        roomId,
        createdBy: room?.nurseName ?? 'Медсестра',
        createdAt,
        status: 'sent',
        title: buildRequestTitle(next, cart, room?.title),
        comment: comment?.trim(),
        lines: cart.map((line, index) => ({
          id: `${requestId}-L${index + 1}`,
          itemId: line.itemId,
          manualName: line.manualName,
          quantity: line.quantity,
          issuedQuantity: 0,
          status: line.manualName ? 'manual-line' : 'requested',
          comment: line.comment,
        })),
      }

      next.requests.unshift(request)
      next.carts[roomId] = []
      next.activeRequestId = requestId
      next.uiMessage = `Заявка ${requestId} отправлена`
      createdId = requestId

      addJournal(next, {
        actorRole: next.role,
        roomId,
        requestId,
        type: 'request-created',
        title: 'Заявка создана',
        description: `Кабинет ${room?.number ?? ''} создал заявку ${requestId}.`,
        createdAt,
      })
      addJournal(next, {
        actorRole: next.role,
        roomId,
        requestId,
        type: 'request-sent',
        title: 'Заявка отправлена',
        description: `Заявка ${requestId} отправлена старшей медсестре.`,
        createdAt,
      })

      request.lines
        .filter((line) => line.manualName)
        .forEach((line) =>
          addJournal(next, {
            actorRole: next.role,
            roomId,
            requestId,
            type: 'manual-line-created',
            title: 'Ручная строка создана',
            description: `${line.manualName} добавлена в очередь разбора справочника.`,
            createdAt,
          }),
        )

      return next
    })

    return createdId
  }, [])

  const setActiveRequest = useCallback((requestId: string) => {
    setState((current) => ({ ...current, activeRequestId: requestId }))
  }, [])

  const issueFullLine = useCallback((requestId: string, lineId: string) => {
    setState((current) => {
      const next = clone(current)
      const request = next.requests.find((item) => item.id === requestId)
      const line = request?.lines.find((item) => item.id === lineId)
      if (!request || !line?.itemId) return current

      const remaining = line.quantity - line.issuedQuantity
      const stock = getStock(next, line.itemId)
      if (remaining <= 0 || stock.quantity < remaining) return current

      stock.quantity -= remaining
      stock.lastMovementAt = now()
      line.issuedQuantity = line.quantity
      line.status = 'issued'
      recalculateRequestStatus(request)
      next.activeRequestId = requestId

      const item = getItem(next, line.itemId)
      addJournal(next, {
        actorRole: 'senior-nurse',
        roomId: request.roomId,
        itemId: line.itemId,
        requestId,
        type: 'item-issued',
        title: 'Позиция выдана',
        description: `${item?.shortName ?? 'Позиция'} выдана полностью: ${remaining} ${item?.unit ?? ''}.`,
      })

      if (item && stock.quantity < item.minStock) {
        ensureReplenishment(
          next,
          line.itemId,
          'after-issue',
          'senior-nurse',
          `${item.shortName}: после выдачи осталось ${stock.quantity}, минимум ${item.minStock}. Нужно докупить ${getRecommendedQuantity(item, stock.quantity)} ${item.unit}.`,
          requestId,
        )
      }

      return next
    })
  }, [])

  const issuePartialLine = useCallback((requestId: string, lineId: string, quantity: number) => {
    setState((current) => {
      const next = clone(current)
      const request = next.requests.find((item) => item.id === requestId)
      const line = request?.lines.find((item) => item.id === lineId)
      if (!request || !line?.itemId) return current

      const item = getItem(next, line.itemId)
      const stock = getStock(next, line.itemId)
      const remaining = line.quantity - line.issuedQuantity
      const issueQuantity = clampNumber(Math.round(quantity || 0), 0, Math.min(stock.quantity, remaining))
      if (issueQuantity <= 0) return current

      stock.quantity -= issueQuantity
      stock.lastMovementAt = now()
      line.issuedQuantity += issueQuantity
      line.status = line.issuedQuantity >= line.quantity ? 'issued' : 'partially-issued'
      recalculateRequestStatus(request)
      next.activeRequestId = requestId

      addJournal(next, {
        actorRole: 'senior-nurse',
        roomId: request.roomId,
        itemId: line.itemId,
        requestId,
        type: line.status === 'issued' ? 'item-issued' : 'item-partially-issued',
        title: line.status === 'issued' ? 'Позиция выдана' : 'Позиция выдана частично',
        description: `${item?.shortName ?? 'Позиция'}: выдано ${issueQuantity} из ${remaining} ${item?.unit ?? ''}.`,
      })

      if (line.issuedQuantity < line.quantity) {
        ensureReplenishment(
          next,
          line.itemId,
          'not-enough',
          'senior-nurse',
          `${item?.shortName ?? 'Позиция'}: не хватило ${line.quantity - line.issuedQuantity} ${item?.unit ?? ''} для заявки ${requestId}.`,
          requestId,
        )
      } else if (item && stock.quantity < item.minStock) {
        ensureReplenishment(
          next,
          line.itemId,
          'after-issue',
          'senior-nurse',
          `${item.shortName}: после выдачи осталось ${stock.quantity}, минимум ${item.minStock}.`,
          requestId,
        )
      }

      return next
    })
  }, [])

  const markLineOutOfStock = useCallback((requestId: string, lineId: string) => {
    setState((current) => {
      const next = clone(current)
      const request = next.requests.find((item) => item.id === requestId)
      const line = request?.lines.find((item) => item.id === lineId)
      if (!request || !line?.itemId) return current

      const item = getItem(next, line.itemId)
      line.status = 'not-enough'
      recalculateRequestStatus(request)
      next.activeRequestId = requestId

      ensureReplenishment(
        next,
        line.itemId,
        'not-enough',
        'senior-nurse',
        `${item?.shortName ?? 'Позиция'}: на складе не хватает для заявки ${requestId}.`,
        requestId,
      )
      addJournal(next, {
        actorRole: 'senior-nurse',
        roomId: request.roomId,
        itemId: line.itemId,
        requestId,
        type: 'not-enough',
        title: 'Не хватило на складе',
        description: `${item?.shortName ?? 'Позиция'} отмечена как дефицит по заявке ${requestId}.`,
      })

      return next
    })
  }, [])

  const markLineNeedsClarification = useCallback((requestId: string, lineId: string) => {
    setState((current) => {
      const next = clone(current)
      const request = next.requests.find((item) => item.id === requestId)
      const line = request?.lines.find((item) => item.id === lineId)
      if (!request || !line) return current

      line.status = 'needs-clarification'
      line.seniorComment = 'Нужно уточнить позицию или замену перед выдачей.'
      recalculateRequestStatus(request)
      addJournal(next, {
        actorRole: 'senior-nurse',
        roomId: request.roomId,
        itemId: line.itemId,
        requestId,
        type: 'clarification-needed',
        title: 'Нужно уточнение',
        description: `По строке заявки ${requestId} запрошено уточнение.`,
      })

      return next
    })
  }, [])

  const reviewManualLine = useCallback((requestId: string, lineId: string, action: string) => {
    setState((current) => {
      const next = clone(current)
      const request = next.requests.find((item) => item.id === requestId)
      const line = request?.lines.find((item) => item.id === lineId)
      if (!request || !line?.manualName) return current

      const commentByAction: Record<string, { status: RequestLineStatus; comment: string }> = {
        link: { status: 'needs-clarification', comment: 'Демо: строка отмечена для привязки к существующей позиции.' },
        create: { status: 'needs-clarification', comment: 'Демо: новая карточка будет создана после проверки справочника.' },
        return: { status: 'needs-clarification', comment: 'Вернуть в кабинет на уточнение.' },
        reject: { status: 'rejected', comment: 'Отклонено как неготовая к выдаче ручная строка.' },
      }
      const result = commentByAction[action] ?? commentByAction.return

      line.status = result.status
      line.seniorComment = result.comment
      recalculateRequestStatus(request)
      addJournal(next, {
        actorRole: 'senior-nurse',
        roomId: request.roomId,
        requestId,
        type: 'manual-line-reviewed',
        title: 'Ручная строка разобрана',
        description: `${line.manualName}: ${result.comment}`,
      })

      return next
    })
  }, [])

  const addItemToReplenishment = useCallback((itemId: string) => {
    setState((current) => {
      const next = clone(current)
      const item = getItem(next, itemId)
      if (!item) return current

      ensureReplenishment(
        next,
        itemId,
        'manual',
        'senior-nurse',
        `${item.shortName} добавлена в пополнение вручную старшей медсестрой.`,
      )
      next.uiMessage = `${item.shortName} добавлена в пополнение`
      return next
    })
  }, [])

  const updateReplenishmentAvailability = useCallback((lineId: string, status: AvailabilityStatus) => {
    setState((current) => {
      const next = clone(current)
      const line = next.replenishment.find((item) => item.id === lineId)
      if (!line) return current

      line.availabilityStatus = status
      line.lastCheckedAt = now()
      const item = getItem(next, line.itemId)
      addJournal(next, {
        actorRole: 'senior-nurse',
        itemId: line.itemId,
        type: 'availability-updated',
        title: 'Наличие у поставщика уточнено',
        description: `${item?.shortName ?? 'Позиция'}: статус наличия обновлен.`,
      })
      return next
    })
  }, [])

  const prepareReplenishmentInquiry = useCallback((supplierId: string, lineIds: string[]) => {
    setState((current) => {
      if (!isReplenishmentSupplierId(supplierId) || !lineIds.length) return current

      const next = clone(current)
      const lineIdSet = new Set(lineIds)
      const inquiryLines = next.replenishment.filter(
        (line) =>
          lineIdSet.has(line.id) &&
          !line.closedAt &&
          line.includedInOrder !== false &&
          (line.availabilityStatus === 'not-checked' || line.availabilityStatus === 'checking'),
      )
      if (!inquiryLines.length) return current

      inquiryLines.forEach((line) => {
        line.selectedSupplierId = supplierId
        line.availabilityStatus = 'checking'
        line.lastCheckedAt = now()
      })

      const supplier = next.suppliers.find((item) => item.id === supplierId)
      addJournal(next, {
        actorRole: 'senior-nurse',
        type: 'availability-updated',
        title: 'Подготовлен запрос наличия',
        description: `${supplier?.name ?? 'Поставщик'}: подготовлен Excel-запрос на ${inquiryLines.length} позиций.`,
      })
      next.uiMessage = `Запрос наличия подготовлен: ${supplier?.name ?? 'поставщик'}, ${inquiryLines.length} поз.`
      return next
    })
  }, [])

  const selectReplenishmentSupplier = useCallback((lineId: string, supplierId: string) => {
    setState((current) => {
      const next = clone(current)
      const line = next.replenishment.find((item) => item.id === lineId)
      if (!line) return current

      const item = getItem(next, line.itemId)
      const allowed = [clinicMainSupplierId, clinicBackupSupplierId]
      if (!allowed.includes(supplierId)) return current

      line.selectedSupplierId = supplierId
      line.availabilityStatus = 'not-checked'
      line.lastCheckedAt = now()
      const supplier = next.suppliers.find((item) => item.id === supplierId)
      addJournal(next, {
        actorRole: 'senior-nurse',
        itemId: line.itemId,
        type: 'alternative-selected',
        title: 'Выбран альтернативный поставщик',
        description: `${item?.shortName ?? 'Позиция'} перенесена к поставщику ${supplier?.name ?? 'поставщик'}.`,
      })
      return next
    })
  }, [])

  const updateReplenishmentComment = useCallback((lineId: string, comment: string) => {
    setState((current) => {
      const next = clone(current)
      const line = next.replenishment.find((item) => item.id === lineId)
      if (!line) return current

      line.comment = comment
      return next
    })
  }, [])

  const updateReplenishmentQuantity = useCallback((lineId: string, quantity: number) => {
    setState((current) => {
      const next = clone(current)
      const line = next.replenishment.find((item) => item.id === lineId)
      if (!line) return current

      line.recommendedQuantity = clampNumber(Math.round(quantity || 0), 0, 999)
      return next
    })
  }, [])

  const toggleReplenishmentInOrder = useCallback((lineId: string, included: boolean) => {
    setState((current) => {
      const next = clone(current)
      const line = next.replenishment.find((item) => item.id === lineId)
      if (!line) return current

      line.includedInOrder = included
      return next
    })
  }, [])

  const formSupplierOrders = useCallback(() => {
    let createdOrderIds: string[] = []

    setState((current) => {
      const next = clone(current)
      const packageId = nextNumber(
        'PACK',
        next.orders.map((order) => order.purchasePackageId).filter((id): id is string => Boolean(id)),
      )
      const existingReplenishmentLineIds = new Set(
        next.orders.flatMap((order) => order.lines.map((line) => line.replenishmentLineId)),
      )
      const readyLines = next.replenishment.filter(
        (line) =>
          !line.closedAt &&
          line.includedInOrder !== false &&
          isReadyForOrder(line.availabilityStatus) &&
          !existingReplenishmentLineIds.has(line.id),
      )

      if (!readyLines.length) {
        next.uiMessage = 'Нет подтвержденных строк для заказа'
        return next
      }

      const packageOrdersBySupplierId = new Map<string, SupplierOrder>()

      readyLines.forEach((line) => {
        line.availabilityStatus = 'ready-to-order'
        const item = getItem(next, line.itemId)
        if (item && !isReplenishmentSupplierId(line.selectedSupplierId)) {
          line.selectedSupplierId = preferredSupplierIdForItem(item)
        }
        const quantity = getOrderQuantity(item, line)
        line.recommendedQuantity = quantity
        let order = packageOrdersBySupplierId.get(line.selectedSupplierId)

        if (!order) {
          order = {
            id: nextNumber('ORD', [...next.orders.map((item) => item.id), ...createdOrderIds]),
            purchasePackageId: packageId,
            supplierId: line.selectedSupplierId,
            createdAt: now(),
            status: 'draft',
            lines: [],
          }
          createdOrderIds.push(order.id)
          next.orders.unshift(order)
          packageOrdersBySupplierId.set(line.selectedSupplierId, order)
        }

        order.purchasePackageId = packageId

        order.lines.push({
          id: `${order.id}-L${order.lines.length + 1}`,
          itemId: line.itemId,
          replenishmentLineId: line.id,
          quantity,
          price: item?.price,
          status: 'ready-to-order',
          comment: line.comment,
        })
      })

      addJournal(next, {
        actorRole: 'senior-nurse',
        type: 'order-created',
        title: 'Заказ сформирован',
        description: `Сформирован пакет закупки ${packageId}: ${createdOrderIds.length} заказ(а) поставщикам, ${readyLines.length} строк.`,
      })
      next.uiMessage = `Пакет закупки ${packageId} сформирован`
      return next
    })

    return createdOrderIds
  }, [])

  const markOrderAsOrdered = useCallback((orderId: string) => {
    setState((current) => {
      const next = clone(current)
      const order = next.orders.find((item) => item.id === orderId)
      if (!order) return current

      const supplier = next.suppliers.find((item) => item.id === order.supplierId)
      order.status = 'waiting-receipt'
      order.formedAt = order.formedAt ?? now()
      order.documentName = order.documentName ?? `${order.id}-${supplier?.name ?? 'supplier'}.xls`
      order.lines.forEach((line) => {
        line.status = 'waiting-receipt'
        const replenishment = next.replenishment.find((item) => item.id === line.replenishmentLineId)
        if (replenishment) replenishment.availabilityStatus = 'waiting-receipt'
      })

      addJournal(next, {
        actorRole: 'senior-nurse',
        type: 'order-marked',
        title: 'Заказ отмечен как заказанный',
        description: `${order.id} у поставщика ${supplier?.name ?? 'поставщик'} ожидает прихода.`,
      })
      return next
    })
  }, [])

  const updateReceiptDocumentNumber = useCallback((orderId: string, documentNumber: string) => {
    setState((current) => {
      const next = clone(current)
      const order = next.orders.find((item) => item.id === orderId)
      if (!order) return current

      order.receiptDocumentNumber = documentNumber.trim()
      return next
    })
  }, [])

  const updateReceiptLineComment = useCallback((orderId: string, lineId: string, comment: string) => {
    setState((current) => {
      const next = clone(current)
      const order = next.orders.find((item) => item.id === orderId)
      const line = order?.lines.find((item) => item.id === lineId)
      if (!line) return current

      line.receiptComment = comment
      return next
    })
  }, [])

  const acceptReceipt = useCallback((orderId: string, receivedByLineId: Record<string, number>) => {
    setState((current) => {
      const next = clone(current)
      const order = next.orders.find((item) => item.id === orderId)
      if (!order) return current

      let receivedTotal = 0
      order.lines.forEach((line) => {
        const received = clampNumber(Math.round(receivedByLineId[line.id] ?? 0), 0, line.quantity)
        if (received <= 0) return

        const stock = getStock(next, line.itemId)
        stock.quantity += received
        stock.lastMovementAt = now()
        line.receivedQuantity = (line.receivedQuantity ?? 0) + received
        receivedTotal += received

        const item = getItem(next, line.itemId)
        const replenishment = next.replenishment.find((item) => item.id === line.replenishmentLineId)
        if (replenishment && item) {
          replenishment.currentStock = stock.quantity
          replenishment.recommendedQuantity = 0
          if ((line.receivedQuantity ?? 0) >= line.quantity) {
            replenishment.closedAt = now()
          }
        }
      })

      if (receivedTotal <= 0) return current

      const isFull = order.lines.every((line) => (line.receivedQuantity ?? 0) >= line.quantity)
      order.status = isFull ? 'receipt-accepted' : 'partial-receipt'
      order.lines.forEach((line) => {
        if ((line.receivedQuantity ?? 0) >= line.quantity) {
          line.status = 'receipt-accepted'
        } else if ((line.receivedQuantity ?? 0) > 0) {
          line.status = 'partial-receipt'
        }
      })

      addJournal(next, {
        actorRole: 'senior-nurse',
        type: 'receipt-accepted',
        title: 'Приход принят',
        description: `${order.id}: принято на склад ${receivedTotal} единиц по строкам заказа.`,
      })
      next.uiMessage = 'Приход принят на склад'
      return next
    })
  }, [])

  const value = useMemo<DemoContextValue>(
    () => ({
      state,
      startDemo,
      resetDemo,
      setRole,
      loadRequestDraft,
      addCatalogToCart,
      addManualLineToCart,
      updateCartLine,
      removeCartLine,
      submitRequest,
      setActiveRequest,
      issueFullLine,
      issuePartialLine,
      markLineOutOfStock,
      markLineNeedsClarification,
      reviewManualLine,
      addItemToReplenishment,
      updateReplenishmentAvailability,
      prepareReplenishmentInquiry,
      selectReplenishmentSupplier,
      updateReplenishmentQuantity,
      updateReplenishmentComment,
      toggleReplenishmentInOrder,
      formSupplierOrders,
      markOrderAsOrdered,
      updateReceiptDocumentNumber,
      updateReceiptLineComment,
      acceptReceipt,
    }),
    [
      state,
      startDemo,
      resetDemo,
      setRole,
      loadRequestDraft,
      addCatalogToCart,
      addManualLineToCart,
      updateCartLine,
      removeCartLine,
      submitRequest,
      setActiveRequest,
      issueFullLine,
      issuePartialLine,
      markLineOutOfStock,
      markLineNeedsClarification,
      reviewManualLine,
      addItemToReplenishment,
      updateReplenishmentAvailability,
      prepareReplenishmentInquiry,
      selectReplenishmentSupplier,
      updateReplenishmentQuantity,
      updateReplenishmentComment,
      toggleReplenishmentInOrder,
      formSupplierOrders,
      markOrderAsOrdered,
      updateReceiptDocumentNumber,
      updateReceiptLineComment,
      acceptReceipt,
    ],
  )

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo() {
  const context = useContext(DemoContext)

  if (!context) {
    throw new Error('useDemo must be used inside DemoProvider')
  }

  return context
}
