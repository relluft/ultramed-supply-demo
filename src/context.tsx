import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { demoNeedText, demoRows } from './data/mockData'
import { parseNumericInput } from './lib/format'
import type { DemoState, EditableField, PurchaseRow, PurchaseStatus, StageId } from './types/demo'

const storageKey = 'ultramed-supply-demo-state-v5'

const initialState: DemoState = {
  started: false,
  demoLoaded: false,
  needText: '',
  rows: [],
  completedStages: [],
  generation: {
    documentId: null,
    status: 'idle',
    progress: 0,
  },
  recentCycles: [],
}

interface DemoContextValue {
  state: DemoState
  startCycle: () => void
  applyDemo: () => void
  updateNeedText: (value: string) => void
  updateRow: (rowId: string, field: EditableField, value: string) => void
  markStageComplete: (stageId: StageId) => void
  startDocumentGeneration: (documentId: string) => void
  setDocumentProgress: (progress: number) => void
  completeDocumentGeneration: () => void
  resetDemo: () => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

function cloneRows(rows: PurchaseRow[]) {
  return rows.map((row) => ({ ...row }))
}

function loadState() {
  if (typeof window === 'undefined') {
    return initialState
  }

  const stored = window.localStorage.getItem(storageKey)
  if (!stored) {
    return initialState
  }

  try {
    return { ...initialState, ...JSON.parse(stored) } as DemoState
  } catch {
    return initialState
  }
}

function appendCompleted(current: StageId[], stageId: StageId) {
  return current.includes(stageId) ? current : [...current, stageId]
}

function resolveTone(status: PurchaseStatus, price: number) {
  if (
    price <= 0 ||
    status === 'Нет цены' ||
    status === 'Нужно ручное подтверждение' ||
    status === 'Медицинская проверка'
  ) {
    return 'danger' as const
  }

  if (
    status === 'Неуверенное сопоставление' ||
    status === 'Неясная единица' ||
    status === 'Похожая позиция'
  ) {
    return 'warning' as const
  }

  return 'ready' as const
}

export function DemoProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<DemoState>(loadState)

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  }, [state])

  const startCycle = useCallback(() => {
    setState((current) => ({
      ...current,
      started: true,
      completedStages: appendCompleted(current.completedStages, 'workspace'),
      recentCycles: [
        {
          id: `cycle-${Date.now()}`,
          title: 'Стоматология и базовые расходники',
          subtitle: 'Черновик цикла закупки',
          createdAt: new Date().toISOString(),
        },
        ...current.recentCycles,
      ].slice(0, 5),
    }))
  }, [])

  const applyDemo = useCallback(() => {
    setState((current) => ({
      ...current,
      started: true,
      demoLoaded: true,
      needText: demoNeedText,
      rows: cloneRows(demoRows),
      generation: initialState.generation,
      completedStages: appendCompleted(current.completedStages, 'need'),
      recentCycles: [
        {
          id: `cycle-demo-${Date.now()}`,
          title: 'Стоматология и базовые расходники, май 2026',
          subtitle: '43 строки, 4 поставщика, есть позиции на проверку',
          createdAt: new Date().toISOString(),
        },
        ...current.recentCycles,
      ].slice(0, 5),
    }))
  }, [])

  const updateNeedText = useCallback((value: string) => {
    setState((current) => ({ ...current, needText: value }))
  }, [])

  const updateRow = useCallback((rowId: string, field: EditableField, value: string) => {
    setState((current) => ({
      ...current,
      rows: current.rows.map((row) => {
        if (row.id !== rowId) {
          return row
        }

        if (field === 'quantity' || field === 'price' || field === 'vatRate' || field === 'amount') {
          const parsed = parseNumericInput(value)
          if (parsed === null) {
            return row
          }

          if (field === 'amount') {
            return { ...row, amountOverride: parsed }
          }

          if (field === 'vatRate') {
            return { ...row, vatRate: parsed }
          }

          const nextRow = { ...row, [field]: parsed, amountOverride: undefined }
          return { ...nextRow, tone: resolveTone(nextRow.status, nextRow.price) }
        }

        if (field === 'status') {
          const nextRow = { ...row, status: value as PurchaseStatus }
          return { ...nextRow, tone: resolveTone(nextRow.status, nextRow.price) }
        }

        return { ...row, [field]: value }
      }),
    }))
  }, [])

  const markStageComplete = useCallback((stageId: StageId) => {
    setState((current) => ({
      ...current,
      completedStages: appendCompleted(current.completedStages, stageId),
    }))
  }, [])

  const startDocumentGeneration = useCallback((documentId: string) => {
    setState((current) => ({
      ...current,
      generation: {
        documentId,
        status: 'generating',
        progress: 0,
      },
    }))
  }, [])

  const setDocumentProgress = useCallback((progress: number) => {
    setState((current) => {
      if (current.generation.status !== 'generating') {
        return current
      }

      return {
        ...current,
        generation: {
          ...current.generation,
          progress: Math.max(0, Math.min(100, Math.round(progress))),
        },
      }
    })
  }, [])

  const completeDocumentGeneration = useCallback(() => {
    setState((current) => ({
      ...current,
      generation: {
        ...current.generation,
        status: 'ready',
        progress: 100,
      },
      completedStages: appendCompleted(current.completedStages, 'documents'),
    }))
  }, [])

  const resetDemo = useCallback(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(initialState))
    setState(initialState)
  }, [])

  const value = useMemo<DemoContextValue>(
    () => ({
      state,
      startCycle,
      applyDemo,
      updateNeedText,
      updateRow,
      markStageComplete,
      startDocumentGeneration,
      setDocumentProgress,
      completeDocumentGeneration,
      resetDemo,
    }),
    [
      state,
      startCycle,
      applyDemo,
      updateNeedText,
      updateRow,
      markStageComplete,
      startDocumentGeneration,
      setDocumentProgress,
      completeDocumentGeneration,
      resetDemo,
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
