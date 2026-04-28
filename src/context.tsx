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
import { getRecommendedQuantity, isReadyForOrder, roleToRoomId } from './lib/demoLogic'
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
  SupplyRequest,
} from './types/demo'

const storageKey = 'ultramed-supply-demo-state-v12'

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

function createInitialState(role: DemoRole = 'nurse-101', demoStarted = false): DemoState {
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
    },
    activeRequestId: 'REQ-001',
  }
}

function loadState() {
  if (typeof window === 'undefined') {
    return createInitialState()
  }

  const stored = window.localStorage.getItem(storageKey)
  if (!stored) {
    return createInitialState()
  }

  try {
    return { ...createInitialState(), ...JSON.parse(stored) } as DemoState
  } catch {
    return createInitialState()
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
  const recommendedQuantity = getRecommendedQuantity(item, stock.quantity)
  const existing = state.replenishment.find((line) => line.itemId === itemId && !line.closedAt)

  if (existing) {
    existing.currentStock = stock.quantity
    existing.minStock = item.minStock
    existing.desiredStock = item.desiredStock
    existing.recommendedQuantity = recommendedQuantity
    existing.source = source === 'not-enough' ? 'not-enough' : existing.source
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
    selectedSupplierId: item.primarySupplierId,
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
  selectReplenishmentSupplier: (lineId: string, supplierId: string) => void
  updateReplenishmentComment: (lineId: string, comment: string) => void
  toggleReplenishmentInOrder: (lineId: string, included: boolean) => void
  formSupplierOrders: () => string[]
  markOrderAsOrdered: (orderId: string) => void
  acceptReceipt: (orderId: string, receivedByLineId: Record<string, number>) => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

export function DemoProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<DemoState>(loadState)

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  }, [state])

  const startDemo = useCallback((role: DemoRole = 'nurse-101') => {
    setState(createInitialState(role, true))
  }, [])

  const resetDemo = useCallback(() => {
    const nextState = createInitialState('nurse-101', false)
    window.localStorage.setItem(storageKey, JSON.stringify(nextState))
    setState(nextState)
  }, [])

  const setRole = useCallback((role: DemoRole) => {
    setState((current) => ({ ...current, role, uiMessage: undefined }))
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

  const selectReplenishmentSupplier = useCallback((lineId: string, supplierId: string) => {
    setState((current) => {
      const next = clone(current)
      const line = next.replenishment.find((item) => item.id === lineId)
      if (!line) return current

      const item = getItem(next, line.itemId)
      const allowed = item ? [item.primarySupplierId, ...item.alternativeSupplierIds] : []
      if (!allowed.includes(supplierId)) return current

      line.selectedSupplierId = supplierId
      line.availabilityStatus = supplierId === item?.primarySupplierId ? 'available' : 'alternative-selected'
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
      const existingReplenishmentLineIds = new Set(
        next.orders.flatMap((order) => order.lines.map((line) => line.replenishmentLineId)),
      )
      const readyLines = next.replenishment.filter(
        (line) =>
          !line.closedAt &&
          line.includedInOrder !== false &&
          line.recommendedQuantity > 0 &&
          isReadyForOrder(line.availabilityStatus) &&
          !existingReplenishmentLineIds.has(line.id),
      )

      if (!readyLines.length) {
        next.uiMessage = 'Нет подтвержденных строк для заказа'
        return next
      }

      readyLines.forEach((line) => {
        line.availabilityStatus = 'ready-to-order'
        const item = getItem(next, line.itemId)
        let order = next.orders.find(
          (candidate) =>
            candidate.supplierId === line.selectedSupplierId &&
            (candidate.status === 'draft' || candidate.status === 'ready-to-order'),
        )

        if (!order) {
          order = {
            id: nextNumber('ORD', [...next.orders.map((item) => item.id), ...createdOrderIds]),
            supplierId: line.selectedSupplierId,
            createdAt: now(),
            status: 'draft',
            lines: [],
          }
          createdOrderIds.push(order.id)
          next.orders.unshift(order)
        }

        order.lines.push({
          id: `${order.id}-L${order.lines.length + 1}`,
          itemId: line.itemId,
          replenishmentLineId: line.id,
          quantity: line.recommendedQuantity,
          price: item?.price,
          status: 'ready-to-order',
          comment: line.comment,
        })
      })

      addJournal(next, {
        actorRole: 'senior-nurse',
        type: 'order-created',
        title: 'Заказ сформирован',
        description: `Сформированы группы заказов по поставщикам: ${readyLines.length} строк.`,
      })
      next.uiMessage = 'Заказ сформирован по подтвержденным строкам'
      return next
    })

    return createdOrderIds
  }, [])

  const markOrderAsOrdered = useCallback((orderId: string) => {
    setState((current) => {
      const next = clone(current)
      const order = next.orders.find((item) => item.id === orderId)
      if (!order) return current

      order.status = 'waiting-receipt'
      order.lines.forEach((line) => {
        line.status = 'waiting-receipt'
        const replenishment = next.replenishment.find((item) => item.id === line.replenishmentLineId)
        if (replenishment) replenishment.availabilityStatus = 'waiting-receipt'
      })

      const supplier = next.suppliers.find((item) => item.id === order.supplierId)
      addJournal(next, {
        actorRole: 'senior-nurse',
        type: 'order-marked',
        title: 'Заказ отмечен как заказанный',
        description: `${order.id} у поставщика ${supplier?.name ?? 'поставщик'} ожидает прихода.`,
      })
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
          replenishment.recommendedQuantity = getRecommendedQuantity(item, stock.quantity)
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
      selectReplenishmentSupplier,
      updateReplenishmentComment,
      toggleReplenishmentInOrder,
      formSupplierOrders,
      markOrderAsOrdered,
      acceptReceipt,
    }),
    [
      state,
      startDemo,
      resetDemo,
      setRole,
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
      selectReplenishmentSupplier,
      updateReplenishmentComment,
      toggleReplenishmentInOrder,
      formSupplierOrders,
      markOrderAsOrdered,
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
