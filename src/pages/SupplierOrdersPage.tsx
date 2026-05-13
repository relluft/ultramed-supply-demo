import { ChevronDown, ChevronRight, Download, FileSpreadsheet, Truck } from 'lucide-react'
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

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function downloadExcelFile(fileName: string, html: string) {
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

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

  function handleDownloadOrderExcel(order: SupplierOrder) {
    const supplier = supplierName(order.supplierId)
    const total = orderTotals.get(order.id) ?? 0
    const vat = vatAmount(total)
    const htmlRows = order.lines
      .map((line, index) => {
        const item = catalogById.get(line.itemId)
        const price = line.price ?? item?.price ?? 0
        const lineTotal = price * line.quantity
        const lineVat = vatAmount(lineTotal)

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item?.fullName ?? 'Позиция')}</td>
            <td>${escapeHtml(item?.category ?? '-')}</td>
            <td>${escapeHtml(item?.packageLabel ?? '-')}</td>
            <td>${escapeHtml(item?.unit ?? '-')}</td>
            <td>${escapeHtml(line.quantity)}</td>
            <td>${escapeHtml(price || '')}</td>
            <td>${escapeHtml(lineTotal || '')}</td>
            <td>${escapeHtml(lineVat || '')}</td>
            <td>${escapeHtml(lineStatusLabel(line.status))}</td>
          </tr>
        `
      })
      .join('')

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; }
            h1 { font-size: 20px; margin: 0 0 6px; }
            .meta { margin: 0 0 16px; color: #475569; font-size: 12px; }
            table { border-collapse: collapse; width: 100%; }
            th { background: #ecfdf5; color: #064e3b; font-weight: 700; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px; vertical-align: top; }
          </style>
        </head>
        <body>
          <h1>Заказ ${escapeHtml(order.id)}</h1>
          <p class="meta">
            Поставщик: ${escapeHtml(supplier)} · Дата: ${escapeHtml(formatDateTime(order.createdAt))} ·
            Позиций: ${order.lines.length} · Итого с НДС: ${escapeHtml(total ? formatMoney(total) : '-')} · НДС: ${escapeHtml(vat ? formatMoney(vat) : '-')}
          </p>
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Позиция</th>
                <th>Категория</th>
                <th>Упаковка</th>
                <th>Ед.</th>
                <th>Кол-во</th>
                <th>Цена с НДС</th>
                <th>Сумма с НДС</th>
                <th>НДС</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>
        </body>
      </html>
    `

    downloadExcelFile(`ultramed-${order.id.toLowerCase()}-${new Date(order.createdAt).toISOString().slice(0, 10)}.xls`, html)
  }

  return (
    <PageTransition className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
      <Panel>
        <SectionHeader
          title="Заказы поставщикам"
          subtitle="Реестр сформированных заказов."
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
          <table className="w-full min-w-[1180px] border-separate border-spacing-0">
            <colgroup>
              <col className="w-[4%]" />
              <col className="w-[10%]" />
              <col className="w-[11%]" />
              <col className="w-[20%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[6%]" />
            </colgroup>
            <thead>
              <tr>
                <th className={headerCell}></th>
                <th className={headerCell}>Заказ</th>
                <th className={headerCell}>Дата</th>
                <th className={headerCell}>Поставщик</th>
                <th className={headerCell}>Поз.</th>
                <th className={headerCell}>Кол-во</th>
                <th className={headerCell}>Сумма без НДС</th>
                <th className={headerCell}>НДС 20%</th>
                <th className={headerCell}>Сумма с НДС</th>
                <th className={headerCell}>Excel</th>
              </tr>
            </thead>
            <tbody>
              {orderedHistory.length
                ? orderedHistory.map((order, index) => {
                    const total = orderTotals.get(order.id) ?? 0
                    const vat = vatAmount(total)
                    const totalWithoutVat = total - vat
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
                          <td className={cn(tableCell, 'font-medium text-slate-950')}>
                            <div>{order.id}</div>
                            <div className="mt-1 grid gap-0.5 text-[10px] font-normal leading-3 text-slate-500">
                              <span>без НДС: <span className="text-slate-950">{totalWithoutVat ? formatMoney(totalWithoutVat) : '-'}</span></span>
                              <span>НДС: <span className="text-slate-950">{vat ? formatMoney(vat) : '-'}</span></span>
                              <span>с НДС: <span className="text-slate-950">{total ? formatMoney(total) : '-'}</span></span>
                            </div>
                          </td>
                          <td className={tableCell}>{formatDateTime(order.createdAt)}</td>
                          <td className={tableCell}>{supplierName(order.supplierId)}</td>
                          <td className={cn(tableCell, 'text-center')}>{order.lines.length}</td>
                          <td className={cn(tableCell, 'text-center')}>{formatNumber(orderQuantity(order))}</td>
                          <td className={cn(tableCell, 'whitespace-nowrap text-slate-950')}>{totalWithoutVat ? formatMoney(totalWithoutVat) : '-'}</td>
                          <td className={cn(tableCell, 'whitespace-nowrap')}>{vat ? formatMoney(vat) : '-'}</td>
                          <td className={cn(tableCell, 'text-slate-950')}>{total ? formatMoney(total) : '-'}</td>
                          <td className={cn(tableCell, 'text-center')}>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleDownloadOrderExcel(order)
                              }}
                              className="group inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-white/82 px-2.5 text-xs font-normal text-emerald-800 shadow-sm transition hover:border-emerald-300 hover:bg-white hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20"
                              title={`Выгрузить ${order.id} в Excel`}
                            >
                              <span className="inline-flex size-5 items-center justify-center rounded bg-emerald-600 text-white transition group-hover:bg-emerald-700">
                                <FileSpreadsheet size={13} />
                              </span>
                              Excel
                              <Download size={13} />
                            </button>
                          </td>
                        </tr>
                        {expanded ? (
                          <tr key={`${order.id}-details`} className="bg-white">
                            <td colSpan={9} className="border-b border-slate-200 bg-white p-0">
                              <div className="app-section-band border-l-4 border-emerald-200 px-3 py-3">
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
                      {Array.from({ length: 9 }).map((__, cellIndex) => (
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
