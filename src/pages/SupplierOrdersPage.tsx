import { ArrowRight, Clipboard, FileSpreadsheet, Mail, PackageX, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { Button, EmptyState, Panel, SectionHeader, StatusPill, tableCell, tableHeaderCell } from '../components/ui'
import { useDemo } from '../context'
import {
  availabilityLabels,
  isReadyForOrder,
  orderStatusLabels,
  statusTone,
} from '../lib/demoLogic'
import { formatMoney, formatNumber } from '../lib/format'

export function SupplierOrdersPage() {
  const navigate = useNavigate()
  const {
    state: { orders, suppliers, catalog, replenishment, requests },
    formSupplierOrders,
    markOrderAsOrdered,
    selectReplenishmentSupplier,
    updateReplenishmentAvailability,
  } = useDemo()
  const [emailOrderId, setEmailOrderId] = useState<string | null>(null)
  const [excelOrderId, setExcelOrderId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const manualLines = requests.flatMap((request) =>
    request.lines
      .filter((line) => line.manualName && line.status !== 'rejected')
      .map((line) => ({ request, line })),
  )
  const problemReplenishment = replenishment.filter(
    (line) => !line.closedAt && !isReadyForOrder(line.availabilityStatus),
  )

  const problemCount = problemReplenishment.length + manualLines.length
  const orderTotals = useMemo(() => {
    return new Map(
      orders.map((order) => [
        order.id,
        order.lines.reduce((sum, line) => sum + (line.price ?? 0) * line.quantity, 0),
      ]),
    )
  }, [orders])

  function supplierName(id: string) {
    return suppliers.find((supplier) => supplier.id === id)?.name ?? '—'
  }

  function itemName(id: string) {
    return catalog.find((item) => item.id === id)?.shortName ?? 'Позиция'
  }

  function supplierEmail(id: string) {
    return suppliers.find((supplier) => supplier.id === id)?.email ?? ''
  }

  function buildEmailText(orderId: string) {
    const order = orders.find((item) => item.id === orderId)
    if (!order) return ''

    const lines = order.lines
      .map((line, index) => {
        const item = catalog.find((candidate) => candidate.id === line.itemId)
        return `${index + 1}. ${item?.shortName ?? line.itemId} - ${line.quantity} ${item?.unit ?? ''}`
      })
      .join('\n')

    return `Добрый день.\n\nПросим подтвердить наличие и счет по заказу ${order.id}:\n${lines}\n\nОтправка письма в демо не выполняется.`
  }

  async function copyEmail(orderId: string) {
    const text = buildEmailText(orderId)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setEmailOrderId(orderId)
    }
  }

  function handleCreateOrders() {
    formSupplierOrders()
  }

  return (
    <PageTransition className="grid gap-3">
      <Panel>
        <SectionHeader
          title="Заказы поставщикам"
          subtitle="Строки пополнения группируются по выбранным поставщикам. Email и Excel показаны как честные demo-заглушки."
          action={
            <Button onClick={handleCreateOrders}>
              Сформировать заказ
              <Truck size={16} />
            </Button>
          }
        />
      </Panel>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),360px]">
        <section className="grid gap-3">
          {orders.length ? (
            orders.map((order) => {
              const supplier = suppliers.find((item) => item.id === order.supplierId)
              const total = orderTotals.get(order.id) ?? 0
              return (
                <Panel key={order.id} className="overflow-hidden p-0">
                  <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xl font-semibold text-slate-950">{order.id}</div>
                        <StatusPill tone={statusTone(order.status)}>{orderStatusLabels[order.status]}</StatusPill>
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {supplier?.name} · {supplier?.phone} · {supplier?.email}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusPill>{order.lines.length} позиций</StatusPill>
                        <StatusPill tone={total ? 'success' : 'warning'}>{total ? formatMoney(total) : 'Есть строки без цены'}</StatusPill>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => setExcelOrderId(excelOrderId === order.id ? null : order.id)}>
                        <FileSpreadsheet size={16} />
                        Показать Excel
                      </Button>
                      <Button variant="secondary" onClick={() => setEmailOrderId(emailOrderId === order.id ? null : order.id)}>
                        <Mail size={16} />
                        Показать черновик
                      </Button>
                      <Button variant="secondary" onClick={() => copyEmail(order.id)}>
                        <Clipboard size={16} />
                        {copied ? 'Скопировано' : 'Скопировать текст email'}
                      </Button>
                      <Button onClick={() => markOrderAsOrdered(order.id)} disabled={order.status === 'waiting-receipt' || order.status === 'receipt-accepted'}>
                        Отметить как заказано
                      </Button>
                      <Button variant="ghost" onClick={() => navigate('/receipt')}>
                        Перейти к приходу
                        <ArrowRight size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] border-separate border-spacing-0">
                      <thead>
                        <tr>
                          <th className={tableHeaderCell}>Позиция</th>
                          <th className={tableHeaderCell}>Количество</th>
                          <th className={tableHeaderCell}>Цена</th>
                          <th className={tableHeaderCell}>Сумма</th>
                          <th className={tableHeaderCell}>Статус</th>
                          <th className={tableHeaderCell}>Комментарий</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.lines.map((line) => {
                          const item = catalog.find((candidate) => candidate.id === line.itemId)
                          return (
                            <tr key={line.id}>
                              <td className={tableCell}>
                                <div className="font-semibold text-slate-950">{item?.shortName}</div>
                                <div className="text-xs text-slate-500">{item?.fullName}</div>
                              </td>
                              <td className={tableCell}>{formatNumber(line.quantity)} {item?.unit}</td>
                              <td className={tableCell}>{line.price ? formatMoney(line.price) : '—'}</td>
                              <td className={tableCell}>{line.price ? formatMoney(line.price * line.quantity) : '—'}</td>
                              <td className={tableCell}>
                                <StatusPill tone={statusTone(line.status)}>{availabilityLabels[line.status as keyof typeof availabilityLabels] ?? orderStatusLabels[line.status as keyof typeof orderStatusLabels]}</StatusPill>
                              </td>
                              <td className={tableCell}>{line.comment || '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {excelOrderId === order.id ? (
                    <div className="border-t border-slate-200 bg-slate-50 p-4 text-sm">
                      <div className="font-semibold text-slate-950">Demo-Excel: {order.id}.xlsx</div>
                      <div className="mt-2 grid gap-1 text-slate-600">
                        {order.lines.map((line) => (
                          <div key={line.id} className="grid grid-cols-[minmax(0,1fr),80px,100px] gap-2 rounded bg-white px-3 py-2">
                            <span>{itemName(line.itemId)}</span>
                            <span>{line.quantity}</span>
                            <span>{line.price ? formatMoney(line.price) : 'без цены'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {emailOrderId === order.id ? (
                    <div className="border-t border-slate-200 bg-slate-50 p-4">
                      <div className="mb-2 text-sm font-semibold text-slate-950">
                        Черновик для {supplierEmail(order.supplierId)}. Отправка в демо не выполняется.
                      </div>
                      <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
                        {buildEmailText(order.id)}
                      </pre>
                    </div>
                  ) : null}
                </Panel>
              )
            })
          ) : (
            <Panel>
              <EmptyState>Заказы еще не сформированы. Сначала отметьте наличие в пополнении и нажмите `Сформировать заказ`.</EmptyState>
            </Panel>
          )}
        </section>

        <Panel className="content-start">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-lg font-semibold text-slate-950">Проблемные позиции</div>
              <div className="text-sm text-slate-500">Не входят в обычный заказ без ручного решения.</div>
            </div>
            <StatusPill tone={problemCount ? 'danger' : 'success'}>{problemCount}</StatusPill>
          </div>

          <div className="mt-4 grid gap-2">
            {problemReplenishment.map((line) => {
              const item = catalog.find((candidate) => candidate.id === line.itemId)
              const firstAlternative = item?.alternativeSupplierIds[0]
              return (
                <div key={line.id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <div className="font-semibold text-slate-950">{item?.shortName}</div>
                  <div className="mt-1 text-slate-500">{availabilityLabels[line.availabilityStatus]}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {firstAlternative ? (
                      <Button variant="secondary" onClick={() => selectReplenishmentSupplier(line.id, firstAlternative)}>
                        Перенести к альтернативному поставщику
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      onClick={() => updateReplenishmentAvailability(line.id, 'not-available-from-approved-suppliers')}
                    >
                      <PackageX size={15} />
                      Нет у доступных поставщиков
                    </Button>
                  </div>
                </div>
              )
            })}

            {manualLines.map(({ request, line }) => (
              <div key={line.id} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="font-semibold">{line.manualName}</div>
                <div className="mt-1">Ручная строка еще не разобрана · {request.id}</div>
              </div>
            ))}

            {!problemCount ? <EmptyState>Проблемных позиций сейчас нет.</EmptyState> : null}
          </div>
        </Panel>
      </div>
    </PageTransition>
  )
}
