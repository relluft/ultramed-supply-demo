import { CheckCircle2, ChevronDown, ChevronRight, History, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageTransition } from '../components/PageTransition'
import { Button, EmptyState, Panel, StatusPill } from '../components/ui'
import { useDemo } from '../context'
import { getStockQuantity, statusTone } from '../lib/demoLogic'
import { cn, formatDateTime, formatNumber } from '../lib/format'

const headerCell =
  'sticky top-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-1.5 py-1.5 text-center text-[10px] font-normal uppercase text-slate-500 last:border-r-0'
const tableCell = 'border-b border-r border-slate-100 px-1.5 py-1 align-middle text-[11px] leading-3 text-slate-700 last:border-r-0'
type ReceiptStatusFilter = 'waiting' | 'partial' | 'accepted'

function parseReceiptQuantity(value: string | undefined, max: number) {
  if (value === undefined) return max
  if (value === '') return 0

  return Math.max(0, Math.min(Math.round(Number(value) || 0), max))
}

export function ReceiptPage() {
  const {
    state: { orders, suppliers, catalog, stock, replenishment, requests },
    acceptReceipt,
    updateReceiptDocumentNumber,
    updateReceiptLineComment,
  } = useDemo()
  const [received, setReceived] = useState<Record<string, string>>({})
  const [pendingAccept, setPendingAccept] = useState<{ type: 'line' | 'order'; id: string } | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [orderFilter, setOrderFilter] = useState('all')
  const [requestFilter, setRequestFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ReceiptStatusFilter>('all')
  const [selectedReceiptHistoryKey, setSelectedReceiptHistoryKey] = useState<string | null>(null)
  const replenishmentById = useMemo(
    () => new Map(replenishment.map((line) => [line.id, line])),
    [replenishment],
  )
  const catalogById = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog])
  const supplierById = useMemo(() => new Map(suppliers.map((supplier) => [supplier.id, supplier])), [suppliers])
  const requestById = useMemo(() => new Map(requests.map((request) => [request.id, request])), [requests])

  const allReceiptRows = useMemo(
    () =>
      orders
        .filter((order) =>
          order.status === 'draft' ||
          order.status === 'ready-to-order' ||
          order.status === 'waiting-receipt' ||
          order.status === 'partial-receipt' ||
          order.status === 'receipt-accepted',
        )
        .flatMap((order) =>
          order.lines
            .map((line) => {
              const source = replenishmentById.get(line.replenishmentLineId)
              if (!source) return null

              const item = catalogById.get(line.itemId)
              const supplier = supplierById.get(order.supplierId)
              const request = source.requestId ? requestById.get(source.requestId) : undefined
              const alreadyReceived = line.receivedQuantity ?? 0
              const remaining = Math.max(line.quantity - alreadyReceived, 0)
              const draftInputValue = received[line.id] ?? String(remaining)
              const draftQuantity = parseReceiptQuantity(received[line.id], remaining)
              const currentStock = getStockQuantity(stock, line.itemId)
              const receiptStatus: ReceiptStatusFilter = remaining === 0 ? 'accepted' : alreadyReceived > 0 ? 'partial' : 'waiting'

              return {
                order,
                line,
                source,
                item,
                supplier,
                request,
                alreadyReceived,
                remaining,
                draftInputValue,
                draftQuantity,
                currentStock,
                newStock: currentStock + draftQuantity,
                shortage: Math.max(remaining - draftQuantity, 0),
                receiptStatus,
              }
            })
            .filter((row): row is NonNullable<typeof row> => Boolean(row)),
        )
        .sort((left, right) => {
          const statusOrder: Record<ReceiptStatusFilter, number> = { waiting: 0, partial: 1, accepted: 2 }
          const statusCompare = statusOrder[left.receiptStatus] - statusOrder[right.receiptStatus]
          if (statusCompare) return statusCompare

          const supplierCompare = (left.supplier?.name ?? '').localeCompare(right.supplier?.name ?? '', 'ru')
          return supplierCompare || left.order.id.localeCompare(right.order.id, 'ru')
        }),
    [catalogById, orders, received, replenishmentById, requestById, stock, supplierById],
  )
  const receiptRows = useMemo(
    () =>
      allReceiptRows.filter((row) => {
        if (supplierFilter !== 'all' && row.order.supplierId !== supplierFilter) return false
        if (orderFilter !== 'all' && row.order.id !== orderFilter) return false
        if (requestFilter !== 'all' && row.source.requestId !== requestFilter) return false
        if (statusFilter !== 'all' && row.receiptStatus !== statusFilter) return false

        return true
      }),
    [allReceiptRows, orderFilter, requestFilter, statusFilter, supplierFilter],
  )

  const orderCount = new Set(receiptRows.map((row) => row.order.id)).size
  const supplierCount = new Set(receiptRows.map((row) => row.order.supplierId)).size
  const totalQuantity = receiptRows.reduce((sum, row) => sum + row.line.quantity, 0)
  const receivedNowTotal = receiptRows.reduce((sum, row) => sum + row.draftQuantity, 0)
  const filterSuppliers = useMemo(
    () =>
      Array.from(new Map(allReceiptRows.map((row) => [row.order.supplierId, row.supplier?.name ?? 'Поставщик'])).entries())
        .sort((left, right) => left[1].localeCompare(right[1], 'ru')),
    [allReceiptRows],
  )
  const filterOrders = useMemo(
    () => Array.from(new Set(allReceiptRows.map((row) => row.order.id))).sort((left, right) => left.localeCompare(right, 'ru')),
    [allReceiptRows],
  )
  const filterRequests = useMemo(
    () =>
      Array.from(new Set(allReceiptRows.map((row) => row.source.requestId).filter((id): id is string => Boolean(id))))
        .sort((left, right) => left.localeCompare(right, 'ru')),
    [allReceiptRows],
  )
  const receiptGroups = useMemo(() => {
    const grouped = new Map<string, { order: (typeof orders)[number]; supplierName: string; rows: typeof receiptRows }>()

    receiptRows.forEach((row) => {
      const key = row.order.id
      const group = grouped.get(key) ?? {
        order: row.order,
        supplierName: row.supplier?.name ?? 'Поставщик',
        rows: [],
      }

      group.rows.push(row)
      grouped.set(key, group)
    })

    return Array.from(grouped.values())
  }, [orders, receiptRows])
  const receiptHistoryRows = useMemo(
    () =>
      allReceiptRows
        .filter((row) => row.alreadyReceived > 0)
        .sort((left, right) => {
          const leftTime = new Date(left.line.receivedAt ?? left.order.formedAt ?? left.order.createdAt).getTime()
          const rightTime = new Date(right.line.receivedAt ?? right.order.formedAt ?? right.order.createdAt).getTime()
          return rightTime - leftTime
        }),
    [allReceiptRows],
  )
  const receiptHistoryGroups = useMemo(() => {
    const grouped = new Map<
      string,
      {
        key: string
        requestId?: string
        orderIds: Set<string>
        supplierNames: Set<string>
        receivedAt: string
        rows: typeof receiptHistoryRows
      }
    >()

    receiptHistoryRows.forEach((row) => {
      const key = row.order.id
      const receivedAt = row.line.receivedAt ?? row.order.formedAt ?? row.order.createdAt
      const group = grouped.get(key) ?? {
        key,
        requestId: row.source.requestId,
        orderIds: new Set<string>(),
        supplierNames: new Set<string>(),
        receivedAt,
        rows: [],
      }

      group.orderIds.add(row.order.id)
      group.supplierNames.add(row.supplier?.name ?? 'Поставщик')
      if (new Date(receivedAt).getTime() > new Date(group.receivedAt).getTime()) {
        group.receivedAt = receivedAt
      }
      group.rows.push(row)
      grouped.set(key, group)
    })

    return Array.from(grouped.values()).sort(
      (left, right) => new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime(),
    )
  }, [receiptHistoryRows])
  const receiptHistoryTotal = receiptHistoryRows.reduce((sum, row) => sum + row.alreadyReceived, 0)
  const selectedReceiptHistory = selectedReceiptHistoryKey
    ? receiptHistoryGroups.find((group) => group.key === selectedReceiptHistoryKey)
    : undefined

  function updateReceived(lineId: string, value: string, max: number) {
    const digits = String(value).replace(/\D/g, '')

    setReceived((current) => ({
      ...current,
      [lineId]: digits === '' ? '' : String(Math.max(0, Math.min(Math.round(Number(digits) || 0), max))),
    }))
  }

  function handleAcceptLine(row: (typeof receiptRows)[number]) {
    if (row.draftQuantity <= 0 || row.remaining <= 0) return

    acceptReceipt(row.order.id, { [row.line.id]: row.draftQuantity })
    setStatusFilter('all')
    setPendingAccept(null)
    setReceived((current) => {
      const next = { ...current }
      delete next[row.line.id]
      return next
    })
  }

  function handleAcceptRows(rows: typeof receiptRows) {
    const byOrderId = new Map<string, Record<string, number>>()
    const total = rows.reduce((sum, row) => sum + (row.draftQuantity > 0 && row.remaining > 0 ? row.draftQuantity : 0), 0)
    if (total <= 0) return

    rows.forEach((row) => {
      if (row.draftQuantity <= 0 || row.remaining <= 0) return

      const orderLines = byOrderId.get(row.order.id) ?? {}
      orderLines[row.line.id] = row.draftQuantity
      byOrderId.set(row.order.id, orderLines)
    })

    byOrderId.forEach((lineQuantities, orderId) => acceptReceipt(orderId, lineQuantities))
    setStatusFilter('all')
    setPendingAccept(null)
    setReceived((current) => {
      const next = { ...current }
      rows.forEach((row) => delete next[row.line.id])
      return next
    })
  }

  return (
    <PageTransition className="flex h-full min-h-0 flex-col gap-4">
      <Panel>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-normal text-slate-950">Приход</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Единая складская таблица прихода по всем заказам поставщикам. Позиции можно принимать частично и независимо друг от друга.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant={historyOpen ? 'success' : 'secondary'} onClick={() => setHistoryOpen((current) => !current)}>
              <History size={16} />
              История приходов
            </Button>
            <Button variant="secondary" onClick={() => setFiltersOpen((current) => !current)}>
              <SlidersHorizontal size={16} />
              Фильтры
            </Button>
          </div>
        </div>
      </Panel>

      {historyOpen ? (
        <Panel className="shrink-0 overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
            <div>
              <div className="text-sm font-normal text-slate-950">История приходов по заказам</div>
              <div className="mt-0.5 text-xs text-slate-500">
                {receiptHistoryGroups.length} операций · {formatNumber(receiptHistoryTotal)} ед.
              </div>
            </div>
          </div>
          {receiptHistoryGroups.length ? (
            <>
              <div className="max-h-56 overflow-auto">
                <table className="w-full table-fixed border-separate border-spacing-0">
                  <colgroup>
                    <col className="w-[4%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[8%]" />
                    <col className="w-[9%]" />
                    <col className="w-[23%]" />
                    <col className="w-[20%]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={headerCell}></th>
                      <th className={headerCell}>Дата</th>
                      <th className={headerCell}>Заказ</th>
                      <th className={headerCell}>Заявка</th>
                      <th className={headerCell}>Поз.</th>
                      <th className={headerCell}>Кол-во</th>
                      <th className={headerCell}>Поставщик</th>
                      <th className={headerCell}>Накладная</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptHistoryGroups.map((group) => {
                      const quantity = group.rows.reduce((sum, row) => sum + row.alreadyReceived, 0)
                      const request = group.requestId ? requestById.get(group.requestId) : undefined
                      const order = group.rows[0]?.order
                      const expanded = selectedReceiptHistoryKey === group.key

                      return (
                        <tr
                          key={group.key}
                          className={cn('cursor-pointer bg-white transition hover:bg-slate-50', expanded && 'bg-emerald-50/70')}
                          onClick={() => setSelectedReceiptHistoryKey(expanded ? null : group.key)}
                        >
                          <td className={cn(tableCell, 'text-center text-slate-500')}>
                            {expanded ? <ChevronDown size={14} className="mx-auto" /> : <ChevronRight size={14} className="mx-auto" />}
                          </td>
                          <td className={tableCell}>{formatDateTime(group.receivedAt)}</td>
                          <td className={cn(tableCell, 'font-medium text-slate-950')}>{group.key}</td>
                          <td className={tableCell}>
                            <div className="font-medium text-slate-950">{group.requestId ?? '-'}</div>
                            {request?.title ? <div className="mt-0.5 truncate text-[10px] text-slate-500">{request.title.replace(/_/g, ' ')}</div> : null}
                          </td>
                          <td className={cn(tableCell, 'text-center text-slate-950')}>{formatNumber(group.rows.length)}</td>
                          <td className={cn(tableCell, 'text-center text-slate-950')}>{formatNumber(quantity)}</td>
                          <td className={tableCell}>{Array.from(group.supplierNames).join(', ')}</td>
                          <td className={tableCell}>{order?.receiptDocumentNumber || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {selectedReceiptHistory ? (
                <div className="border-t border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-normal text-slate-950">Приход по заказу {selectedReceiptHistory.key}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {formatDateTime(selectedReceiptHistory.receivedAt)} · {selectedReceiptHistory.rows.length} поз. · {formatNumber(selectedReceiptHistory.rows.reduce((sum, row) => sum + row.alreadyReceived, 0))} ед.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedReceiptHistoryKey(null)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50"
                    >
                      Закрыть
                    </button>
                  </div>
                  <div className="max-h-52 overflow-auto border-t border-slate-100">
                    <table className="w-full table-fixed border-separate border-spacing-0">
                      <colgroup>
                        <col className="w-[4%]" />
                        <col className="w-[32%]" />
                        <col className="w-[12%]" />
                        <col className="w-[9%]" />
                        <col className="w-[9%]" />
                        <col className="w-[14%]" />
                        <col className="w-[20%]" />
                      </colgroup>
                      <thead>
                        <tr>
                          <th className={headerCell}>№</th>
                          <th className={headerCell}>Позиция</th>
                          <th className={headerCell}>Поставщик</th>
                          <th className={headerCell}>Заказано</th>
                          <th className={headerCell}>Принято</th>
                          <th className={headerCell}>Упаковка</th>
                          <th className={headerCell}>Комментарий</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReceiptHistory.rows.map((row, index) => (
                          <tr key={row.line.id} className={index % 2 ? 'bg-white' : 'bg-slate-50/60'}>
                            <td className={cn(tableCell, 'text-center text-slate-500')}>{index + 1}</td>
                            <td className={tableCell}>
                              <div className="whitespace-normal break-words text-slate-950">{row.item?.fullName ?? 'Позиция'}</div>
                              <div className="mt-0.5 text-[10px] text-slate-500">{row.item?.category ?? ''}</div>
                            </td>
                            <td className={tableCell}>{row.supplier?.name ?? 'Поставщик'}</td>
                            <td className={cn(tableCell, 'text-center text-slate-950')}>{formatNumber(row.line.quantity)}</td>
                            <td className={cn(tableCell, 'text-center text-slate-950')}>{formatNumber(row.alreadyReceived)}</td>
                            <td className={tableCell}>{row.item?.packageLabel ?? '-'}</td>
                            <td className={tableCell}>{row.line.receiptComment || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="px-3 py-3 text-xs text-slate-500">Принятых приходов пока нет.</div>
          )}
        </Panel>
      ) : null}

      {allReceiptRows.length ? (
        <Panel className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0">
          <div className="grid gap-2 border-b border-slate-200 p-3 md:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Заказов</div>
              <div className="text-lg font-normal text-slate-950">{orderCount}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Поставщиков</div>
              <div className="text-lg font-normal text-slate-950">{supplierCount}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Позиций</div>
              <div className="text-lg font-normal text-slate-950">{receiptRows.length}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">К принятию сейчас</div>
              <div className="text-lg font-normal text-slate-950">{formatNumber(receivedNowTotal)}</div>
            </div>
          </div>
          {filtersOpen ? (
            <div className="app-section-band grid gap-2 border-b border-slate-200 px-3 py-2 md:grid-cols-5">
              <label className="grid gap-1 text-xs text-slate-500">
                Поставщик
                <select
                  value={supplierFilter}
                  onChange={(event) => setSupplierFilter(event.target.value)}
                  className="app-field h-8 rounded-md border px-2 text-xs text-slate-900 outline-none"
                >
                  <option value="all">Все</option>
                  {filterSuppliers.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-slate-500">
                Заказ
                <select
                  value={orderFilter}
                  onChange={(event) => setOrderFilter(event.target.value)}
                  className="app-field h-8 rounded-md border px-2 text-xs text-slate-900 outline-none"
                >
                  <option value="all">Все</option>
                  {filterOrders.map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-slate-500">
                Заявка
                <select
                  value={requestFilter}
                  onChange={(event) => setRequestFilter(event.target.value)}
                  className="app-field h-8 rounded-md border px-2 text-xs text-slate-900 outline-none"
                >
                  <option value="all">Все</option>
                  {filterRequests.map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-slate-500">
                Статус
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | ReceiptStatusFilter)}
                  className="app-field h-8 rounded-md border px-2 text-xs text-slate-900 outline-none"
                >
                  <option value="all">Все</option>
                  <option value="waiting">Ожидает прихода</option>
                  <option value="partial">Частично принято</option>
                  <option value="accepted">Принято</option>
                </select>
              </label>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  className="min-h-8 px-2 py-1 text-xs"
                  onClick={() => {
                    setSupplierFilter('all')
                    setOrderFilter('all')
                    setRequestFilter('all')
                    setStatusFilter('all')
                  }}
                >
                  Сбросить
                </Button>
              </div>
            </div>
          ) : null}

          <div className="overflow-y-auto overflow-x-hidden">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-[3%]" />
                <col className="w-[5%]" />
                <col className="w-[5%]" />
                <col className="w-[8%]" />
                <col className="w-[23%]" />
                <col className="w-[6%]" />
                <col className="w-[4%]" />
                <col className="w-[5%]" />
                <col className="w-[5%]" />
                <col className="w-[6%]" />
                <col className="w-[5%]" />
                <col className="w-[6%]" />
                <col className="w-[5%]" />
                <col className="w-[6%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className={headerCell}>№</th>
                  <th className={headerCell}>Заказ</th>
                  <th className={headerCell}>Заявка</th>
                  <th className={headerCell}>Поставщик</th>
                  <th className={headerCell}>Позиция</th>
                  <th className={headerCell}>Упак.</th>
                  <th className={headerCell}>Ед.</th>
                  <th className={headerCell}>Заказ.</th>
                  <th className={headerCell}>Прин.</th>
                  <th className={headerCell}>Пришло</th>
                  <th className={headerCell}>Расхожд.</th>
                  <th className={headerCell}>Остаток</th>
                  <th className={headerCell}>Статус</th>
                  <th className={headerCell}>Комм.</th>
                  <th className={headerCell}>Принять</th>
                </tr>
              </thead>
              <tbody>
                {receiptGroups.length ? receiptGroups.flatMap((group) => [
                  <tr key={`${group.order.id}-group`} className="bg-emerald-50/70">
                    <td className="border-b border-r border-emerald-100 px-2 py-2 text-xs text-emerald-950" colSpan={15}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{group.order.id}</span>
                          <span className="text-emerald-800">{group.supplierName}</span>
                          <span className="text-emerald-700">{group.rows.length} поз.</span>
                          <label className="ml-2 inline-flex items-center gap-1 text-emerald-800">
                            Накладная
                            <input
                              value={group.order.receiptDocumentNumber ?? ''}
                              onChange={(event) => updateReceiptDocumentNumber(group.order.id, event.target.value)}
                              className="h-7 w-32 rounded-md border border-emerald-200 bg-white px-2 text-xs text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                            />
                          </label>
                        </div>
                        {pendingAccept?.type === 'order' && pendingAccept.id === group.order.id ? (
                          <div className="inline-flex h-7 overflow-hidden rounded-md border border-emerald-300 bg-white text-xs shadow-sm">
                            <button
                              type="button"
                              onClick={() => handleAcceptRows(group.rows)}
                              className="px-2 text-emerald-800 transition hover:bg-emerald-50"
                            >
                              Подтвердить
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingAccept(null)}
                              className="border-l border-emerald-100 px-2 text-slate-500 transition hover:bg-slate-50"
                            >
                              Отмена
                            </button>
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            className="min-h-7 px-2 py-1 text-xs"
                            onClick={() => setPendingAccept({ type: 'order', id: group.order.id })}
                          >
                            Принять всё по заказу
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>,
                  ...group.rows.map((row) => {
                    const rowIndex = receiptRows.findIndex((item) => item.line.id === row.line.id) + 1

                    return (
                      <tr
                        key={row.line.id}
                        className={cn(
                          rowIndex % 2 ? 'bg-white' : 'bg-slate-50/35',
                          row.receiptStatus === 'accepted' && 'bg-emerald-50/80 hover:bg-emerald-100/70',
                          row.receiptStatus === 'partial' && 'bg-amber-50/80 hover:bg-amber-100/70',
                        )}
                      >
                        <td className={cn(tableCell, 'text-center font-medium text-slate-950')}>{rowIndex}</td>
                        <td className={cn(tableCell, 'font-medium text-slate-950')}>{row.order.id}</td>
                        <td className={tableCell}>{row.source.requestId ?? '-'}</td>
                        <td className={tableCell}>
                          <div className="break-words text-slate-950">{row.supplier?.name ?? 'Поставщик'}</div>
                        </td>
                        <td className={tableCell}>
                        <div className="whitespace-normal break-words text-slate-950">{row.item?.fullName ?? 'Позиция'}</div>
                        </td>
                        <td className={cn(tableCell, 'break-words')}>{row.item?.packageLabel ?? '-'}</td>
                        <td className={cn(tableCell, 'text-center')}>{row.item?.unit ?? '-'}</td>
                        <td className={cn(tableCell, 'text-center text-slate-950')}>{formatNumber(row.line.quantity)}</td>
                        <td className={cn(tableCell, 'text-center')}>{formatNumber(row.alreadyReceived)}</td>
                        <td className={tableCell}>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              min={0}
                              max={row.remaining}
                              value={row.draftInputValue}
                              onChange={(event) => updateReceived(row.line.id, event.target.value, row.remaining)}
                              disabled={row.remaining <= 0}
                              className="h-7 w-full rounded-md border border-slate-200 bg-white px-1 text-center text-xs text-slate-950 outline-none transition disabled:bg-slate-50 disabled:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                              aria-label="Количество прихода"
                            />
                          </div>
                        </td>
                        <td className={cn(tableCell, 'text-center')}>
                          <span className={row.shortage > 0 ? 'font-medium text-amber-700' : 'text-slate-500'}>
                            {formatNumber(row.shortage)}
                          </span>
                        </td>
                        <td className={cn(tableCell, 'text-center text-slate-950')}>{formatNumber(row.newStock)}</td>
                        <td className={tableCell}>
                        <StatusPill className="px-1.5 text-[10px]" tone={row.receiptStatus === 'accepted' ? 'success' : row.receiptStatus === 'partial' ? 'warning' : statusTone(row.order.status)}>
                            {row.receiptStatus === 'accepted'
                              ? 'Принято'
                              : row.receiptStatus === 'partial'
                                ? 'Частично принято'
                                : 'Ожидает прихода'}
                          </StatusPill>
                        </td>
                        <td className={tableCell}>
                          <input
                            value={row.line.receiptComment ?? ''}
                            onChange={(event) => updateReceiptLineComment(row.order.id, row.line.id, event.target.value)}
                            placeholder={row.shortage > 0 ? 'Причина' : 'Комментарий'}
                            className="h-7 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                          />
                        </td>
                        <td className={cn(tableCell, 'text-center')}>
                          {pendingAccept?.type === 'line' && pendingAccept.id === row.line.id ? (
                            <div className="mx-auto inline-flex h-7 overflow-hidden rounded-md border border-emerald-300 bg-white text-[10px] shadow-sm">
                              <button
                                type="button"
                                onClick={() => handleAcceptLine(row)}
                                className="px-1.5 text-emerald-800 transition hover:bg-emerald-50"
                              >
                                Да
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingAccept(null)}
                                className="border-l border-emerald-100 px-1.5 text-slate-500 transition hover:bg-slate-50"
                              >
                                Нет
                              </button>
                            </div>
                          ) : (
                            <Button
                              className="min-h-7 px-1.5 py-1 text-[11px]"
                              onClick={() => setPendingAccept({ type: 'line', id: row.line.id })}
                              disabled={row.draftQuantity <= 0 || row.remaining <= 0}
                            >
                              <CheckCircle2 size={13} />
                              Принять
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  }),
                ]) : (
                  <tr>
                    <td className={tableCell} colSpan={15}>
                      <EmptyState>По выбранным фильтрам строк прихода нет.</EmptyState>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="app-section-band grid shrink-0 gap-2 border-t border-slate-200 px-3 py-2 text-sm">
            <div className="flex flex-wrap gap-4">
              <span className="text-slate-500">Заказано: <span className="text-slate-950">{formatNumber(totalQuantity)}</span></span>
              <span className="text-slate-500">К принятию сейчас: <span className="text-slate-950">{formatNumber(receivedNowTotal)}</span></span>
            </div>
          </div>
        </Panel>
      ) : (
        <Panel>
          <EmptyState>
            Заказанных позиций пока нет. Сначала сформируйте заказ поставщикам на экране пополнения.
          </EmptyState>
        </Panel>
      )}
    </PageTransition>
  )
}
