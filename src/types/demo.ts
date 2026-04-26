export type StageId = 'workspace' | 'need' | 'table' | 'documents'
export type RowTone = 'ready' | 'warning' | 'danger'
export type PurchaseStatus =
  | 'Готово'
  | 'Неуверенное сопоставление'
  | 'Неясная единица'
  | 'Похожая позиция'
  | 'Нет цены'
  | 'Нужно ручное подтверждение'
  | 'Медицинская проверка'

export interface PurchaseRow {
  id: string
  site: string
  sourceRequest: string
  normalizedName: string
  category: string
  quantity: number
  unit: string
  supplier: string
  price: number
  vatRate?: number
  amountOverride?: number
  status: PurchaseStatus
  systemComment: string
  humanComment: string
  tone: RowTone
}

export interface GeneratedDocument {
  id: string
  title: string
  subtitle: string
  supplier?: string
  rowCount: number
  total: number
}

export interface DemoState {
  started: boolean
  demoLoaded: boolean
  needText: string
  rows: PurchaseRow[]
  completedStages: StageId[]
  generation: {
    documentId: string | null
    status: 'idle' | 'generating' | 'ready'
    progress: number
  }
  recentCycles: Array<{
    id: string
    title: string
    subtitle: string
    createdAt: string
  }>
}

export type EditableField =
  | 'site'
  | 'normalizedName'
  | 'category'
  | 'quantity'
  | 'unit'
  | 'supplier'
  | 'price'
  | 'vatRate'
  | 'amount'
  | 'status'
  | 'humanComment'
