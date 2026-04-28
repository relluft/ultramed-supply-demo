import { PackagePlus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageTransition } from '../components/PageTransition'
import { Button, EmptyState, Panel, SectionHeader, StatusPill, tableCell, tableHeaderCell } from '../components/ui'
import { useDemo } from '../context'
import { getStockQuantity, getStockStatus, stockStatusLabels, statusTone } from '../lib/demoLogic'
import { formatDateTime, formatNumber } from '../lib/format'
import type { CatalogItem } from '../types/demo'

export function StockPage() {
  const {
    state: { catalog, stock, suppliers, replenishment, journal },
    addItemToReplenishment,
  } = useDemo()
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const activeCatalog = catalog.filter((item) => item.active)
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
          title="Склад"
          subtitle="Остатки рядом с минимумами, желательным уровнем и поставщиками. Позиция на минимуме подсвечивается как зона внимания."
        />
      </Panel>

      <Panel className="overflow-hidden p-0">
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
              {activeCatalog.map((item) => {
                const stockRecord = stock.find((candidate) => candidate.itemId === item.id)
                const status = getStockStatus(item, stock, replenishment)
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
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
                        {formatNumber(stockRecord?.quantity ?? 0)}
                      </span>
                    </td>
                    <td className={tableCell}>{item.minStock}</td>
                    <td className={tableCell}>{item.desiredStock}</td>
                    <td className={tableCell}>{item.unit}</td>
                    <td className={tableCell}>{supplierName(item.primarySupplierId)}</td>
                    <td className={tableCell}>{item.alternativeSupplierIds.map(supplierName).join(', ') || '—'}</td>
                    <td className={tableCell}>
                      <StatusPill tone={statusTone(status)}>{stockStatusLabels[status]}</StatusPill>
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
