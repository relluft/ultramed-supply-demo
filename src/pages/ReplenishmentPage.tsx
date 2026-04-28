import { ArrowRight, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { Button, EmptyState, Panel, SectionHeader, StatusPill, fieldStyles, tableCell, tableHeaderCell } from '../components/ui'
import { useDemo } from '../context'
import {
  availabilityLabels,
  replenishmentSourceLabels,
  statusTone,
} from '../lib/demoLogic'
import { formatDateTime, formatNumber } from '../lib/format'
import type { AvailabilityStatus } from '../types/demo'

const availabilityOptions: AvailabilityStatus[] = [
  'not-checked',
  'checking',
  'available',
  'partially-available',
  'not-available',
  'alternative-selected',
  'not-available-from-approved-suppliers',
  'ready-to-order',
]

export function ReplenishmentPage() {
  const navigate = useNavigate()
  const {
    state: { replenishment, catalog, suppliers },
    updateReplenishmentAvailability,
    selectReplenishmentSupplier,
    updateReplenishmentComment,
    toggleReplenishmentInOrder,
    formSupplierOrders,
  } = useDemo()
  const activeLines = replenishment.filter((line) => !line.closedAt)
  const problemLines = activeLines.filter((line) => line.availabilityStatus === 'not-available-from-approved-suppliers')

  function supplierName(id?: string) {
    return suppliers.find((supplier) => supplier.id === id)?.name ?? '—'
  }

  function handleFormOrders() {
    formSupplierOrders()
    navigate('/orders')
  }

  return (
    <PageTransition className="grid gap-3">
      <Panel>
        <SectionHeader
          title="Пополнение"
          subtitle="Причина попадания в пополнение, рекомендованное количество и ручная проверка наличия у разрешенных поставщиков."
          action={
            <Button onClick={handleFormOrders}>
              Сформировать заказ
              <ArrowRight size={16} />
            </Button>
          }
        />
      </Panel>

      <Panel className="overflow-hidden p-0">
        {activeLines.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1360px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className={tableHeaderCell}>Позиция</th>
                  <th className={tableHeaderCell}>Причина</th>
                  <th className={tableHeaderCell}>Остаток</th>
                  <th className={tableHeaderCell}>Мин.</th>
                  <th className={tableHeaderCell}>Желат.</th>
                  <th className={tableHeaderCell}>Нужно докупить</th>
                  <th className={tableHeaderCell}>Основной</th>
                  <th className={tableHeaderCell}>Альтернативы</th>
                  <th className={tableHeaderCell}>Выбранный</th>
                  <th className={tableHeaderCell}>Наличие</th>
                  <th className={tableHeaderCell}>Комментарий</th>
                  <th className={tableHeaderCell}>В заказ</th>
                </tr>
              </thead>
              <tbody>
                {activeLines.map((line) => {
                  const item = catalog.find((candidate) => candidate.id === line.itemId)
                  const allowedSuppliers = item ? [item.primarySupplierId, ...item.alternativeSupplierIds] : []

                  return (
                    <tr key={line.id}>
                      <td className={tableCell}>
                        <div className="font-semibold text-slate-950">{item?.shortName}</div>
                        <div className="mt-1 text-xs text-slate-500">{item?.fullName}</div>
                        {item?.exclusiveSupplierId ? <StatusPill className="mt-2" tone="warning">Эксклюзивный поставщик</StatusPill> : null}
                      </td>
                      <td className={tableCell}>{replenishmentSourceLabels[line.source]}</td>
                      <td className={tableCell}>{formatNumber(line.currentStock)}</td>
                      <td className={tableCell}>{line.minStock}</td>
                      <td className={tableCell}>{line.desiredStock}</td>
                      <td className={tableCell}>
                        <span className="font-semibold text-slate-950">{formatNumber(line.recommendedQuantity)} {item?.unit}</span>
                      </td>
                      <td className={tableCell}>{supplierName(item?.primarySupplierId)}</td>
                      <td className={tableCell}>{item?.alternativeSupplierIds.map(supplierName).join(', ') || '—'}</td>
                      <td className={tableCell}>
                        <select
                          value={line.selectedSupplierId}
                          onChange={(event) => selectReplenishmentSupplier(line.id, event.target.value)}
                          className={fieldStyles}
                        >
                          {allowedSuppliers.map((supplierId) => (
                            <option key={supplierId} value={supplierId}>
                              {supplierName(supplierId)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={tableCell}>
                        <select
                          value={line.availabilityStatus}
                          onChange={(event) => updateReplenishmentAvailability(line.id, event.target.value as AvailabilityStatus)}
                          className={fieldStyles}
                        >
                          {availabilityOptions.map((status) => (
                            <option key={status} value={status}>
                              {availabilityLabels[status]}
                            </option>
                          ))}
                        </select>
                        <StatusPill className="mt-2" tone={statusTone(line.availabilityStatus)}>
                          {availabilityLabels[line.availabilityStatus]}
                        </StatusPill>
                        {line.lastCheckedAt ? <div className="mt-1 text-xs text-slate-400">{formatDateTime(line.lastCheckedAt)}</div> : null}
                      </td>
                      <td className={tableCell}>
                        <textarea
                          value={line.comment ?? ''}
                          onChange={(event) => updateReplenishmentComment(line.id, event.target.value)}
                          className={`min-h-20 resize-none ${fieldStyles}`}
                        />
                      </td>
                      <td className={tableCell}>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={line.includedInOrder !== false}
                            onChange={(event) => toggleReplenishmentInOrder(line.id, event.target.checked)}
                          />
                          включить
                        </label>
                        <Button
                          className="mt-2"
                          variant="ghost"
                          onClick={() => window.alert(`${item?.shortName ?? 'Позиция'}: карточка показана в строке пополнения.`)}
                        >
                          <ExternalLink size={15} />
                          Карточка
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>Активных строк пополнения нет.</EmptyState>
        )}
      </Panel>

      <Panel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-950">Проблемные статусы</div>
            <div className="text-sm text-slate-500">Решение остается за человеком, замена не угадывается автоматически.</div>
          </div>
          <StatusPill tone={problemLines.length ? 'danger' : 'success'}>
            {problemLines.length ? 'Есть проблемы' : 'Нет проблем'}
          </StatusPill>
        </div>

        <div className="mt-3 grid gap-2">
          {problemLines.length ? (
            problemLines.map((line) => {
              const item = catalog.find((candidate) => candidate.id === line.itemId)
              return (
                <div key={line.id} className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                  {item?.shortName}: {availabilityLabels[line.availabilityStatus]}
                </div>
              )
            })
          ) : (
            <EmptyState>Статус `Нет у доступных поставщиков` можно поставить вручную в таблице.</EmptyState>
          )}
        </div>
      </Panel>
    </PageTransition>
  )
}
