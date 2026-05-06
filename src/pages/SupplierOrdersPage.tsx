import { ChevronDown, ChevronRight, Truck } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { Button, Panel, SectionHeader } from '../components/ui'
import { useDemo } from '../context'
import { availabilityLabels, orderStatusLabels } from '../lib/demoLogic'
import { cn, formatDateTime, formatMoney, formatNumber } from '../lib/format'
import type { SupplierOrder } from '../types/demo'

const headerCell =
  'sticky top-0 z-10 h-9 border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-center text-[11px] font-normal uppercase tracking-wide text-slate-500 last:border-r-0'
const tableCell = 'h-10 border-b border-r border-slate-100 px-2 py-2 align-middle text-xs leading-4 text-slate-700 last:border-r-0'
const emptyRows = Array.from({ length: 10 })

export function SupplierOrdersPage() {
  const navigate = useNavigate()
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const {
    state: { orders, suppliers, catalog },
  } = useDemo()

  const orderedHistory = useMemo(
    () => [...orders].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [orders],
  )
  const orderTotals = useMemo(() => {
    return new Map(
      orders.map((order) => [
        order.id,
        order.lines.reduce((sum, line) => sum + (line.price ?? 0) * line.quantity, 0),
      ]),
    )
  }, [orders])
  const catalogById = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog])

  function supplierName(id: string) {
    return suppliers.find((supplier) => supplier.id === id)?.name ?? '-'
  }

  function orderQuantity(order: SupplierOrder) {
    return order.lines.reduce((sum, line) => sum + line.quantity, 0)
  }

  function vatAmount(totalWithVat: number) {
    return totalWithVat ? totalWithVat - totalWithVat / 1.2 : 0
  }

  function lineStatusLabel(status: SupplierOrder['lines'][number]['status']) {
    return availabilityLabels[status as keyof typeof availabilityLabels] ?? orderStatusLabels[status as keyof typeof orderStatusLabels] ?? status
  }

  function toggleOrder(orderId: string) {
    setExpandedOrderId((current) => (current === orderId ? null : orderId))
  }

  return (
    <PageTransition className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <Panel>
        <SectionHeader
          title="Заказы поставщикам"
          subtitle="Реестр сформированных заказов. Суммы указаны с НДС 20%."
          action={
            <Button onClick={() => navigate('/replenishment')}>
              К пополнению
              <Truck size={16} />
            </Button>
          }
        />
      </Panel>

      <Panel className="min-h-0 overflow-hidden p-0">
        <div className="h-full overflow-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0">
            <colgroup>
              <col className="w-[4%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
              <col className="w-[24%]" />
              <col className="w-[9%]" />
              <col className="w-[11%]" />
              <col className="w-[16%]" />
              <col className="w-[11%]" />
            </colgroup>
            <thead>
              <tr>
                <th className={headerCell}></th>
                <th className={headerCell}>Заказ</th>
                <th className={headerCell}>Дата</th>
                <th className={headerCell}>Поставщик</th>
                <th className={headerCell}>Поз.</th>
                <th className={headerCell}>Кол-во</th>
                <th className={headerCell}>Сумма с НДС</th>
                <th className={headerCell}>НДС 20%</th>
              </tr>
            </thead>
            <tbody>
              {orderedHistory.length
                ? orderedHistory.map((order, index) => {
                    const total = orderTotals.get(order.id) ?? 0
                    const vat = vatAmount(total)
                    const expanded = expandedOrderId === order.id

                    return (
                      <Fragment key={order.id}>
                        <tr
                          onClick={() => toggleOrder(order.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              toggleOrder(order.id)
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-expanded={expanded}
                          className={cn(
                            'cursor-pointer transition hover:bg-emerald-50/70 focus-visible:bg-emerald-50 focus-visible:outline-none',
                            expanded ? 'bg-emerald-50/80' : index % 2 ? 'bg-white' : 'bg-slate-50/35',
                          )}
                        >
                          <td className={cn(tableCell, 'text-center text-slate-500')}>
                            {expanded ? <ChevronDown size={15} className="mx-auto" /> : <ChevronRight size={15} className="mx-auto" />}
                          </td>
                          <td className={cn(tableCell, 'font-medium text-slate-950')}>{order.id}</td>
                          <td className={tableCell}>{formatDateTime(order.createdAt)}</td>
                          <td className={tableCell}>{supplierName(order.supplierId)}</td>
                          <td className={cn(tableCell, 'text-center')}>{order.lines.length}</td>
                          <td className={cn(tableCell, 'text-center')}>{formatNumber(orderQuantity(order))}</td>
                          <td className={cn(tableCell, 'text-slate-950')}>{total ? formatMoney(total) : '-'}</td>
                          <td className={tableCell}>{vat ? formatMoney(vat) : '-'}</td>
                        </tr>
                        {expanded ? (
                          <tr key={`${order.id}-details`} className="bg-white">
                            <td colSpan={8} className="border-b border-slate-200 bg-white p-0">
                              <div className="border-l-4 border-emerald-200 bg-slate-50/60 px-3 py-3">
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <div className="text-sm font-normal text-slate-950">Детализация заказа {order.id}</div>
                                    <div className="text-xs text-slate-500">
                                      {supplierName(order.supplierId)} · {order.lines.length} поз. · итог {total ? formatMoney(total) : '-'}
                                    </div>
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    Статус: <span className="text-slate-950">{orderStatusLabels[order.status]}</span>
                                  </div>
                                </div>
                                <div className="overflow-auto rounded-md border border-slate-200 bg-white">
                                  <table className="w-full min-w-[1120px] border-separate border-spacing-0">
                                    <colgroup>
                                      <col className="w-[4%]" />
                                      <col className="w-[32%]" />
                                      <col className="w-[14%]" />
                                      <col className="w-[6%]" />
                                      <col className="w-[7%]" />
                                      <col className="w-[11%]" />
                                      <col className="w-[11%]" />
                                      <col className="w-[8%]" />
                                      <col className="w-[7%]" />
                                    </colgroup>
                                    <thead>
                                      <tr>
                                        <th className={headerCell}>№</th>
                                        <th className={headerCell}>Позиция</th>
                                        <th className={headerCell}>Упаковка</th>
                                        <th className={headerCell}>Ед.</th>
                                        <th className={headerCell}>Кол-во</th>
                                        <th className={headerCell}>Цена с НДС</th>
                                        <th className={headerCell}>Сумма с НДС</th>
                                        <th className={headerCell}>НДС</th>
                                        <th className={headerCell}>Статус</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {order.lines.map((line, lineIndex) => {
                                        const item = catalogById.get(line.itemId)
                                        const price = line.price ?? item?.price ?? 0
                                        const lineTotal = price * line.quantity
                                        const lineVat = vatAmount(lineTotal)

                                        return (
                                          <tr key={line.id} className={lineIndex % 2 ? 'bg-white' : 'bg-slate-50/40'}>
                                            <td className={cn(tableCell, 'text-center text-slate-950')}>{lineIndex + 1}</td>
                                            <td className={tableCell}>
                                              <div className="whitespace-normal break-words text-slate-950">{item?.fullName ?? 'Позиция'}</div>
                                              <div className="mt-0.5 text-[10px] leading-3 text-slate-500">{item?.category ?? '-'}</div>
                                            </td>
                                            <td className={cn(tableCell, 'break-words')}>{item?.packageLabel ?? '-'}</td>
                                            <td className={cn(tableCell, 'text-center')}>{item?.unit ?? '-'}</td>
                                            <td className={cn(tableCell, 'text-center text-slate-950')}>{formatNumber(line.quantity)}</td>
                                            <td className={cn(tableCell, 'whitespace-nowrap')}>{price ? formatMoney(price) : '-'}</td>
                                            <td className={cn(tableCell, 'whitespace-nowrap text-slate-950')}>{lineTotal ? formatMoney(lineTotal) : '-'}</td>
                                            <td className={cn(tableCell, 'whitespace-nowrap')}>{lineVat ? formatMoney(lineVat) : '-'}</td>
                                            <td className={tableCell}>{lineStatusLabel(line.status)}</td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })
                : emptyRows.map((_, index) => (
                    <tr key={index} className={index % 2 ? 'bg-white' : 'bg-slate-50/35'} aria-hidden="true">
                      {Array.from({ length: 8 }).map((__, cellIndex) => (
                        <td key={cellIndex} className={tableCell}>
                          &nbsp;
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </PageTransition>
  )
}
