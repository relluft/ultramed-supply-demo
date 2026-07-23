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
const mockDataRevision = 'journal-cabinet-v2'
const legacyStorageKeys = [
  'ultramed-supply-demo-state-v29',
  'ultramed-supply-demo-state-v28',
  'ultramed-supply-demo-state-v27',
  'ultramed-supply-demo-state-v26',
  'ultramed-supply-demo-state-v25',
]
const orthodonticDemoRequestId = 'REQ-005'
const initialMockRequests = mockRequests.filter((request) => request.id !== orthodonticDemoRequestId)
const refreshedIssuedMockRequestIds = new Set([
  'REQ-006',
  'REQ-009',
  'REQ-010',
  'REQ-012',
  'REQ-013',
  'REQ-014',
  'REQ-015',
])
const orthodonticDemoQuantityByItemId = new Map(
  (mockRequests.find((request) => request.id === orthodonticDemoRequestId)?.lines ?? [])
    .filter((line) => line.itemId)
    .map((line) => [line.itemId as string, line.quantity]),
)
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
const demoReplenishmentLineLimit = 20

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
    requests: clone(initialMockRequests),
    replenishment: clone(mockReplenishment),
    orders: [],
    journal: clone(mockJournal),
    carts: {
      'room-101': [],
      'room-102': [],
      'room-105': [],
    },
    removedCabinetMaterialBatchIds: {
      'room-101': [],
      'room-102': [],
      'room-105': [],
    },
    activeRequestId: initialMockRequests[0]?.id,
  }
}

function roleForCurrentRoute(fallback: DemoRole): DemoRole {
  if (typeof window === 'undefined') {
    return fallback
  }

  const { pathname } = window.location

  if (seniorRoutePaths.has(pathname)) return 'senior-nurse'
  if (pathname === '/analytics') return 'manager'
  if (pathname === '/cabinet' || pathname.startsWith('/cabinet/')) {
    return fallback.startsWith('nurse-') ? fallback : 'nurse-105'
  }

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

const demoOutOfStockItemIds = new Set(['item-suture-4-0', 'item-ortho-primer', 'item-tray-adhesive'])
const demoBelowMinimumItemIds = new Set([
  'item-articaine',
  'item-composite-a2',
  'item-niti-archwires',
  'item-airflow-powder',
  'item-ortho-wax',
  'item-sterilization-indicators',
  'item-autoclave-tape',
  'item-cofferdam',
  'item-adhesive',
  'item-fluoride-varnish',
  'item-polishing-strips',
  'item-air-water-tips',
  'item-barrier-film',
  'item-microbrushes',
  'item-sterile-gauze',
  'item-steel-archwires',
  'item-elastic-ligatures',
])
const demoNearMinimumItemIds = new Set([
  'item-separators',
])

function demoStockQuantityForItem(item: (typeof mockCatalog)[number]) {
  if (demoOutOfStockItemIds.has(item.id)) return 0
  if (demoBelowMinimumItemIds.has(item.id)) return Math.max(item.minStock - 1, 1)
  if (demoNearMinimumItemIds.has(item.id)) return item.minStock + 1

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
        current.quantity < item.minStock ||
        demoOutOfStockItemIds.has(item.id) ||
        demoBelowMinimumItemIds.has(item.id) ||
        demoNearMinimumItemIds.has(item.id)

      if (shouldNormalize) {
        byItemId.set(item.id, {
          itemId: item.id,
          quantity: demoStockQuantityForItem(item),
          lastMovementAt: '2026-04-28T08:35:00+03:00',
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
  return `${room?.title ?? 'Кабинет'}: складской запас`
}

function isLegacyOrthodonticDemoRequest(request: SupplyRequest) {
  const demoRequest = mockRequests.find((item) => item.id === orthodonticDemoRequestId)

  return (
    Boolean(demoRequest) &&
    request.id === orthodonticDemoRequestId &&
    request.roomId === demoRequest?.roomId &&
    request.createdAt === demoRequest?.createdAt
  )
}

function normalizeRoom105RequestQuantities(request: SupplyRequest) {
  if (request.roomId !== 'room-105') return request

  return {
    ...request,
    lines: request.lines.map((line) => {
      const templateQuantity = line.itemId ? orthodonticDemoQuantityByItemId.get(line.itemId) : undefined
      if (!templateQuantity) return line

      return {
        ...line,
        quantity: templateQuantity,
        issuedQuantity: Math.min(line.issuedQuantity, templateQuantity),
      }
    }),
  }
}

function removeLegacyOrthodonticSupplierOrders(orders: SupplierOrder[] = []) {
  const orthodonticItemIds = new Set(orthodonticDemoQuantityByItemId.keys())
  const linesByPackageId = new Map<string, SupplierOrder['lines']>()

  orders.forEach((order) => {
    if (!order.purchasePackageId) return
    linesByPackageId.set(order.purchasePackageId, [
      ...(linesByPackageId.get(order.purchasePackageId) ?? []),
      ...order.lines,
    ])
  })

  const legacyPackageIds = new Set(
    Array.from(linesByPackageId.entries())
      .filter(([, lines]) => lines.length >= 20 && lines.every((line) => orthodonticItemIds.has(line.itemId)))
      .map(([packageId]) => packageId),
  )

  return orders.filter((order) => {
    if (order.purchasePackageId && legacyPackageIds.has(order.purchasePackageId)) return false

    const isLegacyOrthodonticOrder =
      order.lines.length >= 20 &&
      order.lines.every((line) => orthodonticItemIds.has(line.itemId))

    return !isLegacyOrthodonticOrder
  })
}

function removeOutdatedCurrentReplenishmentOrders(state: DemoState) {
  const activeReplenishmentLineIds = new Set(
    state.replenishment
      .filter(
        (line) =>
          !line.closedAt &&
          line.includedInOrder !== false &&
          (line.currentStock < line.minStock || line.source === 'not-enough' || line.source === 'manual'),
      )
      .map((line) => line.id),
  )
  if (!activeReplenishmentLineIds.size) return

  const ordersByPackageId = new Map<string, SupplierOrder[]>()
  state.orders.forEach((order) => {
    const key = order.purchasePackageId ?? order.id
    ordersByPackageId.set(key, [...(ordersByPackageId.get(key) ?? []), order])
  })

  const outdatedPackageIds = new Set<string>()
  ordersByPackageId.forEach((packageOrders, packageId) => {
    const packageLines = packageOrders.flatMap((order) => order.lines)
    const packageReplenishmentLineIds = new Set(packageLines.map((line) => line.replenishmentLineId))
    const touchesCurrentReplenishment = packageLines.some((line) => activeReplenishmentLineIds.has(line.replenishmentLineId))
    if (!touchesCurrentReplenishment) return

    const coversCurrentReplenishment =
      packageOrders.length === 1 &&
      packageReplenishmentLineIds.size === activeReplenishmentLineIds.size &&
      Array.from(activeReplenishmentLineIds).every((lineId) => packageReplenishmentLineIds.has(lineId))

    if (!coversCurrentReplenishment) {
      outdatedPackageIds.add(packageId)
    }
  })

  if (!outdatedPackageIds.size) return

  state.orders = state.orders.filter((order) => !outdatedPackageIds.has(order.purchasePackageId ?? order.id))
}

function hydrateState(storedState: Partial<DemoState>) {
  const initialState = createInitialState()
  const nextState = { ...initialState, ...storedState } as DemoState
  nextState.role = roleForCurrentRoute(nextState.role)

  nextState.rooms = mergeById(nextState.rooms, mockRooms)
  nextState.suppliers = mergeById(nextState.suppliers, mockSuppliers)
  nextState.catalog = mergeById(nextState.catalog, mockCatalog)
  nextState.stock = mergeStock(nextState.stock)
  nextState.orders = removeLegacyOrthodonticSupplierOrders(nextState.orders)
  nextState.journal = mergeById(nextState.journal, mockJournal)

  const storedRequests = (nextState.requests ?? []).filter((request) => !isLegacyOrthodonticDemoRequest(request))
  const storedRequestById = new Map(storedRequests.map((request) => [request.id, request]))
  const mockRequestIds = new Set(initialMockRequests.map((request) => request.id))
  const normalizeRequest = (request: SupplyRequest) => {
    const mockRequest = initialMockRequests.find((item) => item.id === request.id)

    if (mockRequest) {
      const shouldRefreshIssuedMock = refreshedIssuedMockRequestIds.has(mockRequest.id)

      return {
        ...request,
        status: shouldRefreshIssuedMock ? mockRequest.status : request.status,
        title: mockRequest.title,
        comment: mockRequest.comment,
        createdBy: mockRequest.createdBy,
        lines: shouldRefreshIssuedMock ? mockRequest.lines : mergeRequestLines(request.lines, mockRequest.lines),
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
    ...initialMockRequests.map((mockRequest) => normalizeRequest(storedRequestById.get(mockRequest.id) ?? mockRequest)),
    ...storedRequests.filter((request) => !mockRequestIds.has(request.id)).map(normalizeRequest),
  ].map(normalizeRoom105RequestQuantities)

  if (!nextState.activeRequestId || !nextState.requests.some((request) => request.id === nextState.activeRequestId)) {
    nextState.activeRequestId = nextState.requests[0]?.id
  }

  nextState.requests
    .filter((request) => request.roomId === 'room-105' && request.status !== 'closed')
    .forEach((request) => ensureRoomRequestReplenishment(nextState, request, 'nurse-105'))

  normalizeReplenishmentSuppliers(nextState)
  syncActiveReplenishmentWithStock(nextState)
  ensureIssuedRequestReplenishment(nextState)
  ensureBelowMinimumReplenishment(nextState)
  syncActiveReplenishmentWithStock(nextState)
  limitActiveReplenishment(nextState)
  removeOutdatedCurrentReplenishmentOrders(nextState)

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
    const inventoryLine = { ...line, requestId: undefined }
    if (!shouldUseMainSupplier || line.selectedSupplierId === preferredSupplierId) return inventoryLine

    return {
      ...inventoryLine,
      selectedSupplierId: preferredSupplierId,
    }
  })
}

function syncActiveReplenishmentWithStock(state: DemoState) {
  state.replenishment = (state.replenishment ?? []).map((line) => {
    if (line.closedAt) return line

    const item = getItem(state, line.itemId)
    if (!item) {
      return {
        ...line,
        closedAt: now(),
        includedInOrder: false,
      }
    }

    const stock = getStock(state, line.itemId)
    const nextLine = {
      ...line,
      currentStock: stock.quantity,
      minStock: item.minStock,
      desiredStock: item.desiredStock,
    }
    const shouldStayActive =
      stock.quantity < item.minStock ||
      line.source === 'manual'

    return shouldStayActive
      ? nextLine
      : {
          ...nextLine,
          closedAt: now(),
          includedInOrder: false,
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

  return roomTitle === 'Ортодонтия' ? 'Ортодонтия май расходники' : `${roomTitle ?? 'Кабинет'}: складской запас`
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
  recommendedQuantity = 0,
) {
  const item = getItem(state, itemId)
  if (!item) return

  const stock = getStock(state, itemId)
  const existing = state.replenishment.find(
    (line) =>
      line.itemId === itemId &&
      !line.closedAt,
  )

  if (existing) {
    existing.currentStock = stock.quantity
    existing.minStock = item.minStock
    existing.desiredStock = item.desiredStock
    existing.source = source === 'not-enough' || source === 'manual' ? source : existing.source
    if (recommendedQuantity > 0) {
      existing.recommendedQuantity = recommendedQuantity
    }
    existing.includedInOrder = existing.includedInOrder ?? true
    return
  }

  state.replenishment.unshift({
    id: `REP-${itemId}-${Date.now()}`,
    itemId,
    source,
    currentStock: stock.quantity,
    minStock: item.minStock,
    desiredStock: item.desiredStock,
    recommendedQuantity,
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

function ensureRoomRequestReplenishment(state: DemoState, request: SupplyRequest, actorRole: DemoRole) {
  if (request.roomId !== 'room-105') return

  request.lines.forEach((line) => {
    if (!line.itemId) return

    const item = getItem(state, line.itemId)
    if (!item) return
    const stock = getStock(state, line.itemId)
    if (stock.quantity > 0) return

    ensureReplenishment(
      state,
      line.itemId,
      'not-enough',
      actorRole,
      `${item.shortName}: отсутствует на складе, нужна для заявки ${request.id} и попадает в общий список пополнения.`,
      request.id,
    )
  })
}

function latestRequestIdForItemBelowMinimum(state: DemoState, itemId: string) {
  return [...state.requests]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .find((request) =>
      request.lines.some(
        (line) =>
          line.itemId === itemId &&
          (line.issuedQuantity > 0 ||
            line.status === 'issued' ||
            line.status === 'partially-issued' ||
            line.status === 'not-enough' ||
            line.status === 'waiting-replenishment'),
      ),
    )?.id
}

function ensureBelowMinimumReplenishment(state: DemoState) {
  state.catalog
    .filter((item) => item.active)
    .forEach((item) => {
      const stock = getStock(state, item.id)
      if (stock.quantity >= item.minStock) return

      const requestId = latestRequestIdForItemBelowMinimum(state, item.id)
      ensureReplenishment(
        state,
        item.id,
        requestId ? 'after-issue' : 'below-minimum',
        'senior-nurse',
        `${item.shortName}: остаток ${stock.quantity}, минимум ${item.minStock}. Нужно пополнить склад.`,
        requestId,
      )
    })
}

function limitActiveReplenishment(state: DemoState) {
  const activeLines = state.replenishment
    .filter((line) => !line.closedAt)
    .sort((left, right) => {
      const leftCritical = left.source === 'not-enough' || left.currentStock <= 0 ? 0 : 1
      const rightCritical = right.source === 'not-enough' || right.currentStock <= 0 ? 0 : 1
      return leftCritical - rightCritical || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    })

  const allowedIds = new Set(activeLines.slice(0, demoReplenishmentLineLimit).map((line) => line.id))
  if (activeLines.length <= allowedIds.size) return

  state.replenishment = state.replenishment.map((line) =>
    line.closedAt || allowedIds.has(line.id)
      ? line
      : {
          ...line,
          closedAt: now(),
          includedInOrder: false,
        },
  )
}

function ensureIssuedRequestReplenishment(state: DemoState, requestId?: string) {
  state.requests
    .filter((request) => !requestId || request.id === requestId)
    .forEach((request) => {
      const requestHasIssueActivity = request.lines.some(
        (line) =>
          line.issuedQuantity > 0 ||
          line.status === 'issued' ||
          line.status === 'partially-issued' ||
          line.status === 'not-enough' ||
          line.status === 'waiting-replenishment',
      )
      if (!requestHasIssueActivity) return

      request.lines.forEach((line) => {
        if (!line.itemId) return

        const item = getItem(state, line.itemId)
        if (!item) return
        const stock = getStock(state, line.itemId)
        if (stock.quantity >= item.minStock && line.status !== 'not-enough' && line.status !== 'waiting-replenishment') return

        ensureReplenishment(
          state,
          line.itemId,
          line.status === 'not-enough' || line.status === 'waiting-replenishment' ? 'not-enough' : 'after-issue',
          'senior-nurse',
          `${item.shortName}: позиция выдана по заявке ${request.id}, текущий остаток ${stock.quantity}, минимум ${item.minStock}.`,
          request.id,
        )
        const replenishmentLine = state.replenishment.find((item) => item.itemId === line.itemId && !item.closedAt)
        if (replenishmentLine) {
          replenishmentLine.currentStock = stock.quantity
          replenishmentLine.includedInOrder = true
        }
      })
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
  removeCabinetMaterialBatch: (batchId: string) => void
  submitRequest: (createdBy: string, comment?: string) => string | null
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
  updateReplenishmentQuantities: (quantitiesByLineId: Record<string, number>) => void
  updateReplenishmentComment: (lineId: string, comment: string) => void
  toggleReplenishmentInOrder: (lineId: string, included: boolean) => void
  formSupplierOrders: (lineIds?: string[]) => string[]
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
  }, [mockDataRevision])

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
      const nextState = hydrateState(createInitialState(current.role, true))

      if (current.activeRequestId && nextState.requests.some((request) => request.id === current.activeRequestId)) {
        nextState.activeRequestId = current.activeRequestId
      }

      return nextState
    })
  }, [])

  const setRole = useCallback((role: DemoRole) => {
    setState((current) => ({ ...current, role, uiMessage: undefined }))
  }, [])

  const removeCabinetMaterialBatch = useCallback((batchId: string) => {
    setState((current) => {
      const roomId = roleToRoomId(current.role)
      if (!roomId) return current

      const removedForRoom = current.removedCabinetMaterialBatchIds?.[roomId] ?? []
      if (removedForRoom.includes(batchId)) return current

      return {
        ...current,
        removedCabinetMaterialBatchIds: {
          ...current.removedCabinetMaterialBatchIds,
          [roomId]: [...removedForRoom, batchId],
        },
        uiMessage: 'Материал удалён из кабинета',
      }
    })
  }, [])

  const loadRequestDraft = useCallback((requestId: string) => {
    setState((current) => {
      const source = current.requests.find((request) => request.id === requestId) ?? mockRequests.find((request) => request.id === requestId)
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

  const submitRequest = useCallback((createdBy: string, comment?: string) => {
    let createdId: string | null = null

    setState((current) => {
      const roomId = roleToRoomId(current.role)
      if (!roomId) return current

      const cart = current.carts[roomId] ?? []
      if (!cart.length) return current

      const room = current.rooms.find((item) => item.id === roomId)
      const responsible = createdBy.trim()
      if (!responsible || !room?.nurseNames.includes(responsible)) return current

      const next = clone(current)
      const requestId = nextNumber('REQ', next.requests.map((item) => item.id))
      const createdAt = now()

      const request: SupplyRequest = {
        id: requestId,
        roomId,
        createdBy: responsible,
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
      const normalizedRequest = normalizeRoom105RequestQuantities(request)

      next.requests.unshift(normalizedRequest)
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
        description: `${responsible} создала заявку ${requestId} для кабинета ${room?.number ?? ''}.`,
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

      normalizedRequest.lines
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

      ensureRoomRequestReplenishment(next, normalizedRequest, next.role)
      limitActiveReplenishment(next)

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
      ensureIssuedRequestReplenishment(next, requestId)
      ensureBelowMinimumReplenishment(next)
      limitActiveReplenishment(next)

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
      ensureIssuedRequestReplenishment(next, requestId)
      ensureBelowMinimumReplenishment(next)
      limitActiveReplenishment(next)

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
      ensureBelowMinimumReplenishment(next)
      limitActiveReplenishment(next)

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
      limitActiveReplenishment(next)
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

  const updateReplenishmentQuantities = useCallback((quantitiesByLineId: Record<string, number>) => {
    setState((current) => {
      const next = clone(current)
      let changed = false

      next.replenishment.forEach((line) => {
        if (!(line.id in quantitiesByLineId)) return

        const quantity = clampNumber(Math.round(quantitiesByLineId[line.id] || 0), 0, 999)
        if (line.recommendedQuantity === quantity) return

        line.recommendedQuantity = quantity
        changed = true
      })

      return changed ? next : current
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

  const formSupplierOrders = useCallback((lineIds?: string[]) => {
    let createdOrderIds: string[] = []
    const allowedLineIds = lineIds?.length ? new Set(lineIds) : null

    setState((current) => {
      const next = clone(current)
      if (allowedLineIds) {
        next.orders = next.orders
          .map((order) => ({
            ...order,
            lines: order.lines.filter((line) => !allowedLineIds.has(line.replenishmentLineId)),
          }))
          .filter((order) => order.lines.length > 0)
      }

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
          (!allowedLineIds || allowedLineIds.has(line.id)) &&
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
        if (item) {
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
        const remaining = Math.max(line.quantity - (line.receivedQuantity ?? 0), 0)
        const received = clampNumber(Math.round(receivedByLineId[line.id] ?? 0), 0, remaining)
        if (received <= 0) return

        const stock = getStock(next, line.itemId)
        stock.quantity += received
        stock.lastMovementAt = now()
        line.receivedQuantity = (line.receivedQuantity ?? 0) + received
        line.receivedAt = now()
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
      removeCabinetMaterialBatch,
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
      updateReplenishmentQuantities,
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
      removeCabinetMaterialBatch,
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
      updateReplenishmentQuantities,
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
