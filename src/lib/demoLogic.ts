import type {
  AvailabilityStatus,
  CatalogItem,
  DemoRole,
  ReplenishmentLine,
  RequestLineStatus,
  RequestStatus,
  Room,
  StockItem,
  StockStatus,
  SupplierOrderStatus,
} from '../types/demo'

export const roleLabels: Record<DemoRole, string> = {
  'nurse-101': 'Кабинет 101',
  'nurse-102': 'Кабинет 102',
  'senior-nurse': 'Старшая медсестра',
  manager: 'Руководитель',
}

export const requestStatusLabels: Record<RequestStatus, string> = {
  draft: 'Черновик',
  sent: 'Отправлена',
  'in-review': 'В обработке',
  issued: 'Выдана',
  'partially-issued': 'Выдана частично',
  'waiting-replenishment': 'Ожидает пополнения',
  'out-of-stock': 'Нет на складе',
  'needs-clarification': 'Нужно уточнение',
  closed: 'Закрыта',
}

export const requestLineStatusLabels: Record<RequestLineStatus, string> = {
  requested: 'Запрошено',
  'can-issue': 'Можно выдать',
  issued: 'Выдано',
  'partially-issued': 'Выдано частично',
  'not-enough': 'Не хватает',
  'waiting-replenishment': 'Ожидает пополнения',
  'manual-line': 'Ручная строка',
  'needs-clarification': 'Нужно уточнение',
  rejected: 'Отклонено',
}

export const stockStatusLabels: Record<StockStatus, string> = {
  enough: 'Достаточно',
  'near-minimum': 'Близко к минимуму',
  'below-minimum': 'Ниже минимума',
  'out-of-stock': 'Нет на складе',
  'waiting-receipt': 'Ожидается приход',
}

export const availabilityLabels: Record<AvailabilityStatus, string> = {
  'not-checked': 'Не проверено',
  checking: 'Уточняется',
  available: 'Есть у поставщика',
  'partially-available': 'Есть частично',
  'not-available': 'Нет у основного',
  'alternative-selected': 'Выбрана альтернатива',
  'not-available-from-approved-suppliers': 'Нет у доступных поставщиков',
  'ready-to-order': 'Готово к заказу',
  'waiting-receipt': 'Ожидает прихода',
}

export const orderStatusLabels: Record<SupplierOrderStatus, string> = {
  draft: 'Черновик',
  'availability-checking': 'Проверка наличия',
  'ready-to-order': 'Готов к заказу',
  ordered: 'Заказан',
  'waiting-receipt': 'Ожидает прихода',
  'partial-receipt': 'Частичный приход',
  'receipt-accepted': 'Приход принят',
  closed: 'Закрыт',
}

export const replenishmentSourceLabels: Record<ReplenishmentLine['source'], string> = {
  'after-issue': 'После выдачи ниже минимума',
  'below-minimum': 'Ниже минимума',
  manual: 'Добавлено вручную',
  'not-enough': 'Не хватило для заявки',
}

export function roleToRoomId(role: DemoRole) {
  if (role === 'nurse-101') return 'room-101'
  if (role === 'nurse-102') return 'room-102'
  return undefined
}

export function getRoomByRole(rooms: Room[], role: DemoRole) {
  const roomId = roleToRoomId(role)
  return rooms.find((room) => room.id === roomId)
}

export function getStockQuantity(stock: StockItem[], itemId: string) {
  return stock.find((item) => item.itemId === itemId)?.quantity ?? 0
}

export function getStockRecord(stock: StockItem[], itemId: string) {
  return stock.find((item) => item.itemId === itemId)
}

export function getRecommendedQuantity(item: CatalogItem, currentStock: number) {
  return Math.max(0, item.desiredStock - currentStock)
}

export function getStockStatus(
  item: CatalogItem,
  stock: StockItem[],
  replenishment: ReplenishmentLine[] = [],
): StockStatus {
  const quantity = getStockQuantity(stock, item.id)
  const hasWaitingReceipt = replenishment.some(
    (line) => line.itemId === item.id && !line.closedAt && line.availabilityStatus === 'waiting-receipt',
  )

  if (hasWaitingReceipt) return 'waiting-receipt'
  if (quantity <= 0) return 'out-of-stock'
  if (quantity < item.minStock) return 'below-minimum'
  if (quantity === item.minStock || quantity <= item.minStock + 1) return 'near-minimum'
  return 'enough'
}

export function statusTone(
  status:
    | RequestStatus
    | RequestLineStatus
    | AvailabilityStatus
    | SupplierOrderStatus
    | StockStatus,
): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (
    status === 'issued' ||
    status === 'closed' ||
    status === 'available' ||
    status === 'ready-to-order' ||
    status === 'receipt-accepted' ||
    status === 'enough'
  ) {
    return 'success'
  }

  if (
    status === 'sent' ||
    status === 'in-review' ||
    status === 'checking' ||
    status === 'waiting-receipt' ||
    status === 'ordered' ||
    status === 'draft'
  ) {
    return 'info'
  }

  if (
    status === 'partially-issued' ||
    status === 'waiting-replenishment' ||
    status === 'near-minimum' ||
    status === 'not-checked' ||
    status === 'partially-available' ||
    status === 'alternative-selected' ||
    status === 'partial-receipt'
  ) {
    return 'warning'
  }

  if (
    status === 'out-of-stock' ||
    status === 'not-enough' ||
    status === 'below-minimum' ||
    status === 'not-available' ||
    status === 'not-available-from-approved-suppliers' ||
    status === 'needs-clarification' ||
    status === 'rejected'
  ) {
    return 'danger'
  }

  return 'neutral'
}

export function isReadyForOrder(status: AvailabilityStatus) {
  return (
    status === 'available' ||
    status === 'partially-available' ||
    status === 'alternative-selected' ||
    status === 'ready-to-order'
  )
}
