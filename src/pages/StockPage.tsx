import { PackagePlus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageTransition } from '../components/PageTransition'
import { Button, EmptyState, Panel, SectionHeader, StatusPill, tableCell, tableHeaderCell } from '../components/ui'
import { useDemo } from '../context'
import { getStockQuantity, getStockStatus, stockStatusLabels, statusTone } from '../lib/demoLogic'
import { cn, formatDateTime, formatNumber } from '../lib/format'
import type { CatalogItem, StockStatus } from '../types/demo'

export function StockPage() {
  const {
    state: { catalog, stock, suppliers, replenishment, journal },
    addItemToReplenishment,
  } = useDemo()
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | StockStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const stockByItemId = useMemo(() => new Map(stock.map((item) => [item.itemId, item])), [stock])
  const categories = useMemo(
    () => Array.from(new Set(catalog.filter((item) => item.active).map((item) => item.category))).sort((left, right) => left.localeCompare(right, 'ru')),
    [catalog],
  )
  const warehouseRows = useMemo(() => {
    const statusRank: Record<StockStatus, number> = {
      'out-of-stock': 0,
      'below-minimum': 1,
      'near-minimum': 2,
      'waiting-receipt': 3,
      enough: 4,
    }

    const normalizedSearch = searchQuery.trim().toLowerCase()

    return catalog
      .filter((item) => item.active)
      .map((item) => {
        const stockRecord = stockByItemId.get(item.id)
        const status = getStockStatus(item, stock, replenishment)

        return {
          item,
          stockRecord,
          quantity: stockRecord?.quantity ?? 0,
          status,
          shortageToMin: Math.max(item.minStock - (stockRecord?.quantity ?? 0), 0),
          shortageToDesired: Math.max(item.desiredStock - (stockRecord?.quantity ?? 0), 0),
        }
      })
      .filter((row) => categoryFilter === 'all' || row.item.category === categoryFilter)
      .filter((row) => statusFilter === 'all' || row.status === statusFilter)
      .filter((row) => {
        if (!normalizedSearch) return true

        const primarySupplier = supplierName(row.item.primarySupplierId)
        const alternativeSuppliers = row.item.alternativeSupplierIds.map(supplierName).join(' ')
        return [
          row.item.shortName,
          row.item.fullName,
          row.item.category,
          row.item.packageLabel,
          primarySupplier,
          alternativeSuppliers,
          ...row.item.searchSynonyms,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      })
      .sort(
        (left, right) =>
          statusRank[left.status] - statusRank[right.status] ||
          left.item.category.localeCompare(right.item.category, 'ru') ||
          left.item.shortName.localeCompare(right.item.shortName, 'ru'),
      )
  }, [catalog, categoryFilter, replenishment, searchQuery, statusFilter, stock, stockByItemId, suppliers])
  const allWarehouseRows = useMemo(
    () =>
      catalog
        .filter((item) => item.active)
        .map((item) => ({
          item,
          status: getStockStatus(item, stock, replenishment),
          quantity: stockByItemId.get(item.id)?.quantity ?? 0,
        })),
    [catalog, replenishment, stock, stockByItemId],
  )
  const stockMetrics = useMemo(
    () => ({
      total: allWarehouseRows.length,
      enough: allWarehouseRows.filter((row) => row.status === 'enough').length,
      attention: allWarehouseRows.filter((row) => row.status === 'near-minimum' || row.status === 'below-minimum').length,
      out: allWarehouseRows.filter((row) => row.status === 'out-of-stock').length,
      quantity: allWarehouseRows.reduce((sum, row) => sum + row.quantity, 0),
    }),
    [allWarehouseRows],
  )
  const selectedItem = selectedItemId ? catalog.find((item) => item.id === selectedItemId) : null
  const movementEvents = useMemo(() => {
    if (!selectedItem) return []
    return journal.filter((event) => event.itemId === selectedItem.id).slice(0, 6)
  }, [journal, selectedItem])

  function supplierName(id?: string) {
    return suppliers.find((supplier) => supplier.id === id)?.name ?? '—'
  }

  return (
    <PageTransition className="grid gap-3">
      <Panel>
        <SectionHeader
          title="Остатки"
          subtitle="Полная складская ведомость по всем активным позициям справочника материалов: остаток, минимум, желательный уровень и поставщики."
          action={
            <>
              <StatusPill tone="neutral">{stockMetrics.total} позиций</StatusPill>
              <StatusPill tone="success">{stockMetrics.enough} в норме</StatusPill>
              <StatusPill tone="warning">{stockMetrics.attention} требуют внимания</StatusPill>
              {stockMetrics.out ? <StatusPill tone="danger">{stockMetrics.out} нет на складе</StatusPill> : null}
            </>
          }
        />
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="grid gap-2 border-b border-slate-200 bg-slate-50/70 px-3 py-2 md:grid-cols-[1fr_1fr_1.2fr_1fr_1fr_auto]">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Всего позиций</div>
            <div className="text-lg font-normal text-slate-950">{formatNumber(stockMetrics.total)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Единиц на складе</div>
            <div className="text-lg font-normal text-slate-950">{formatNumber(stockMetrics.quantity)}</div>
          </div>
          <label className="grid gap-1 text-xs text-slate-500">
            Категория
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
            >
              <option value="all">Все категории</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-slate-500">
            Поиск
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Название, упаковка, поставщик"
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
            />
          </label>
          <label className="grid gap-1 text-xs text-slate-500">
            Состояние
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | StockStatus)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
            >
              <option value="all">Все состояния</option>
              <option value="enough">Достаточно</option>
              <option value="near-minimum">Близко к минимуму</option>
              <option value="below-minimum">Ниже минимума</option>
              <option value="out-of-stock">Нет на складе</option>
              <option value="waiting-receipt">Ожидается приход</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button
              variant="ghost"
              className="min-h-8 px-2 py-1 text-xs"
              onClick={() => {
                setCategoryFilter('all')
                setStatusFilter('all')
                setSearchQuery('')
              }}
            >
              Сбросить
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={tableHeaderCell}>Позиция</th>
                <th className={tableHeaderCell}>Категория</th>
                <th className={tableHeaderCell}>Остаток</th>
                <th className={tableHeaderCell}>Мин.</th>
                <th className={tableHeaderCell}>Желат.</th>
                <th className={tableHeaderCell}>Ед.</th>
                <th className={tableHeaderCell}>Основной</th>
                <th className={tableHeaderCell}>Альтернатива</th>
                <th className={tableHeaderCell}>Состояние</th>
                <th className={tableHeaderCell}>Движение</th>
                <th className={tableHeaderCell}>Действие</th>
              </tr>
            </thead>
            <tbody>
              {warehouseRows.map((row, index) => {
                const { item, stockRecord, status } = row
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      'transition hover:bg-slate-100/70',
                      status === 'out-of-stock' && 'bg-rose-50/90 hover:bg-rose-100/70',
                      status === 'below-minimum' && 'bg-red-50/80 hover:bg-red-100/70',
                      status === 'near-minimum' && 'bg-amber-50/80 hover:bg-amber-100/70',
                      status === 'waiting-receipt' && 'bg-sky-50/80 hover:bg-sky-100/70',
                      status === 'enough' && (index % 2 ? 'bg-white' : 'bg-slate-50/35'),
                    )}
                  >
                    <td className={tableCell}>
                      <button
                        type="button"
                        onClick={() => setSelectedItemId(item.id)}
                        className="text-left font-semibold text-slate-950 hover:text-emerald-700"
                      >
                        {item.shortName}
                      </button>
                      <div className="mt-1 text-xs text-slate-500">{item.fullName}</div>
                    </td>
                    <td className={tableCell}>{item.category}</td>
                    <td className={tableCell}>
                      <span className={status === 'below-minimum' || status === 'out-of-stock' ? 'font-semibold text-rose-700' : 'font-semibold text-slate-950'}>
                        {formatNumber(row.quantity)}
                      </span>
                    </td>
                    <td className={tableCell}>{formatNumber(item.minStock)}</td>
                    <td className={tableCell}>{formatNumber(item.desiredStock)}</td>
                    <td className={tableCell}>{item.unit}</td>
                    <td className={tableCell}>{supplierName(item.primarySupplierId)}</td>
                    <td className={tableCell}>{item.alternativeSupplierIds.map(supplierName).join(', ') || '—'}</td>
                    <td className={tableCell}>
                      <StatusPill tone={statusTone(status)}>{stockStatusLabels[status]}</StatusPill>
                      {row.shortageToMin ? (
                        <div className="mt-1 text-[10px] leading-3 text-rose-600">
                          до мин.: {formatNumber(row.shortageToMin)}
                        </div>
                      ) : row.shortageToDesired ? (
                        <div className="mt-1 text-[10px] leading-3 text-slate-400">
                          до жел.: {formatNumber(row.shortageToDesired)}
                        </div>
                      ) : null}
                    </td>
                    <td className={tableCell}>{stockRecord?.lastMovementAt ? formatDateTime(stockRecord.lastMovementAt) : '—'}</td>
                    <td className={tableCell}>
                      <Button variant="secondary" onClick={() => addItemToReplenishment(item.id)}>
                        <PackagePlus size={15} />
                        Пополнить
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {selectedItem ? (
        <StockItemDrawer
          item={selectedItem}
          currentStock={getStockQuantity(stock, selectedItem.id)}
          primarySupplier={supplierName(selectedItem.primarySupplierId)}
          alternativeSuppliers={selectedItem.alternativeSupplierIds.map(supplierName)}
          movementEvents={movementEvents}
          onClose={() => setSelectedItemId(null)}
        />
      ) : null}
    </PageTransition>
  )
}

function StockItemDrawer({
  item,
  currentStock,
  primarySupplier,
  alternativeSuppliers,
  movementEvents,
  onClose,
}: {
  item: CatalogItem
  currentStock: number
  primarySupplier: string
  alternativeSuppliers: string[]
  movementEvents: Array<{ id: string; title: string; description: string; createdAt: string }>
  onClose: () => void
}) {
  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xl border-l border-slate-200 bg-white p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-semibold text-slate-950">{item.shortName}</div>
          <div className="mt-1 text-sm leading-6 text-slate-500">{item.fullName}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          aria-label="Закрыть карточку"
        >
          <X size={17} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {[
          ['Категория', item.category],
          ['Единица учета', item.unit],
          ['Упаковка', item.packageLabel],
          ['Текущий остаток', formatNumber(currentStock)],
          ['Минимум', String(item.minStock)],
          ['Желательный остаток', String(item.desiredStock)],
          ['Основной поставщик', primarySupplier],
          ['Альтернативы', alternativeSuppliers.join(', ') || '—'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
            <div className="mt-1 font-semibold text-slate-950">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-md border border-slate-200 p-3 text-sm text-slate-600">
        <div className="font-semibold text-slate-950">Комментарий старшей медсестры</div>
        <div className="mt-1">{item.seniorComment ?? 'Комментарий не задан.'}</div>
        {item.requiresApprovalForReplacement ? (
          <StatusPill className="mt-3" tone="warning">Нельзя заменять без подтверждения</StatusPill>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="font-semibold text-slate-950">История движения</div>
        <div className="mt-2 grid gap-2">
          {movementEvents.length ? (
            movementEvents.map((event) => (
              <div key={event.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <div className="font-semibold text-slate-950">{event.title}</div>
                <div className="mt-1 text-slate-500">{event.description}</div>
                <div className="mt-2 text-xs text-slate-400">{formatDateTime(event.createdAt)}</div>
              </div>
            ))
          ) : (
            <EmptyState>Движения по позиции появятся после выдачи или прихода.</EmptyState>
          )}
        </div>
      </div>
    </div>
  )
}
