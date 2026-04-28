export type DemoRole = 'nurse-101' | 'nurse-102' | 'senior-nurse' | 'manager'

export interface Room {
  id: string
  number: string
  title: string
  type: string
  nurseName: string
}

export interface Supplier {
  id: string
  name: string
  manager?: string
  phone: string
  email: string
  role: string
  terms?: string
  comment?: string
}

export interface CatalogItem {
  id: string
  fullName: string
  shortName: string
  category: string
  subcategory?: string
  unit: string
  packageLabel: string
  orderMultiple?: number
  minStock: number
  desiredStock: number
  primarySupplierId: string
  alternativeSupplierIds: string[]
  exclusiveSupplierId?: string
  price?: number
  searchSynonyms: string[]
  seniorComment?: string
  requiresApprovalForReplacement: boolean
  active: boolean
}

export interface StockItem {
  itemId: string
  quantity: number
  lastMovementAt?: string
}

export type RequestStatus =
  | 'draft'
  | 'sent'
  | 'in-review'
  | 'issued'
  | 'partially-issued'
  | 'waiting-replenishment'
  | 'out-of-stock'
  | 'needs-clarification'
  | 'closed'

export type RequestLineStatus =
  | 'requested'
  | 'can-issue'
  | 'issued'
  | 'partially-issued'
  | 'not-enough'
  | 'waiting-replenishment'
  | 'manual-line'
  | 'needs-clarification'
  | 'rejected'

export type StockStatus =
  | 'enough'
  | 'near-minimum'
  | 'below-minimum'
  | 'out-of-stock'
  | 'waiting-receipt'

export type AvailabilityStatus =
  | 'not-checked'
  | 'checking'
  | 'available'
  | 'partially-available'
  | 'not-available'
  | 'alternative-selected'
  | 'not-available-from-approved-suppliers'
  | 'ready-to-order'
  | 'waiting-receipt'

export type SupplierOrderStatus =
  | 'draft'
  | 'availability-checking'
  | 'ready-to-order'
  | 'ordered'
  | 'waiting-receipt'
  | 'partial-receipt'
  | 'receipt-accepted'
  | 'closed'

export interface SupplyRequest {
  id: string
  roomId: string
  createdBy: string
  createdAt: string
  status: RequestStatus
  lines: SupplyRequestLine[]
  title?: string
  comment?: string
}

export interface SupplyRequestLine {
  id: string
  itemId?: string
  manualName?: string
  quantity: number
  issuedQuantity: number
  status: RequestLineStatus
  comment?: string
  seniorComment?: string
}

export interface ReplenishmentLine {
  id: string
  itemId: string
  source: 'after-issue' | 'below-minimum' | 'manual' | 'not-enough'
  currentStock: number
  minStock: number
  desiredStock: number
  recommendedQuantity: number
  selectedSupplierId: string
  availabilityStatus: AvailabilityStatus
  comment?: string
  createdAt: string
  includedInOrder?: boolean
  closedAt?: string
  lastCheckedAt?: string
}

export interface SupplierOrder {
  id: string
  supplierId: string
  createdAt: string
  status: SupplierOrderStatus
  lines: SupplierOrderLine[]
  comment?: string
}

export interface SupplierOrderLine {
  id: string
  itemId: string
  replenishmentLineId: string
  quantity: number
  price?: number
  status: AvailabilityStatus | SupplierOrderStatus
  comment?: string
  receivedQuantity?: number
}

export type JournalEventType =
  | 'request-created'
  | 'request-sent'
  | 'item-issued'
  | 'item-partially-issued'
  | 'not-enough'
  | 'replenishment-added'
  | 'availability-updated'
  | 'alternative-selected'
  | 'order-created'
  | 'order-marked'
  | 'receipt-accepted'
  | 'manual-line-created'
  | 'manual-line-reviewed'
  | 'clarification-needed'

export interface JournalEvent {
  id: string
  createdAt: string
  actorRole: DemoRole
  roomId?: string
  itemId?: string
  requestId?: string
  type: JournalEventType
  title: string
  description: string
}

export interface RequestCartLine {
  id: string
  itemId?: string
  manualName?: string
  quantity: number
  comment?: string
}

export interface DemoState {
  demoStarted: boolean
  role: DemoRole
  rooms: Room[]
  suppliers: Supplier[]
  catalog: CatalogItem[]
  stock: StockItem[]
  requests: SupplyRequest[]
  replenishment: ReplenishmentLine[]
  orders: SupplierOrder[]
  journal: JournalEvent[]
  carts: Record<string, RequestCartLine[]>
  activeRequestId?: string
  uiMessage?: string
}
