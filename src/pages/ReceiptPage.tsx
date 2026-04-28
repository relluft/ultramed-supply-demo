import { CheckCircle2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageTransition } from '../components/PageTransition'
import { Button, EmptyState, Panel, SectionHeader, StatusPill, fieldStyles, tableCell, tableHeaderCell } from '../components/ui'
import { useDemo } from '../context'
import { getStockQuantity, orderStatusLabels, statusTone } from '../lib/demoLogic'
import { formatNumber } from '../lib/format'

export function ReceiptPage() {
  const {
    state: { orders, suppliers, catalog, stock },
    acceptReceipt,
    markOrderAsOrdered,
  } = useDemo()
  const receiptOrders = orders.filter((order) => order.status !== 'closed')
  const [selectedOrderId, setSelectedOrderId] = useState(receiptOrders[0]?.id ?? '')
  const selectedOrder = receiptOrders.find((order) => order.id === selectedOrderId) ?? receiptOrders[0]
  const [received, setReceived] = useState<Record<string, number>>({})

  const draftReceived = useMemo(() => {
    const next: Record<string, number> = {}
    selectedOrder?.lines.forEach((line) => {
      next[line.id] = received[line.id] ?? line.quantity - (line.receivedQuantity ?? 0)
    })
    return next
  }, [received, selectedOrder])

  function supplierName(id: string) {
    return suppliers.find((supplier) => supplier.id === id)?.name ?? '—'
  }

  return (
    <PageTransition className="grid gap-3">
      <Panel>
        <SectionHeader
          title="Приход"
          subtitle="Выберите заказ, укажите пришедшее количество и примите позиции на склад."
        />
      </Panel>

      {selectedOrder ? (
        <div className="grid gap-3 xl:grid-cols-[320px,minmax(0,1fr)]">
          <Panel className="content-start">
            <div className="text-lg font-semibold text-slate-950">Заказы</div>
            <div className="mt-3 grid gap-2">
              {receiptOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`rounded-md border p-3 text-left transition ${
                    selectedOrder.id === order.id ? 'border-emerald-700 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-slate-950">{order.id}</div>
                    <StatusPill tone={statusTone(order.status)}>{orderStatusLabels[order.status]}</StatusPill>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{supplierName(order.supplierId)}</div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xl font-semibold text-slate-950">{selectedOrder.id}</div>
                <div className="mt-1 text-sm text-slate-500">{supplierName(selectedOrder.supplierId)}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedOrder.status === 'draft' || selectedOrder.status === 'ready-to-order' ? (
                  <Button variant="secondary" onClick={() => markOrderAsOrdered(selectedOrder.id)}>
                    Отметить как заказано
                  </Button>
                ) : null}
                <Button onClick={() => acceptReceipt(selectedOrder.id, draftReceived)}>
                  <CheckCircle2 size={16} />
                  Принять на склад
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className={tableHeaderCell}>Позиция</th>
                    <th className={tableHeaderCell}>Заказано</th>
                    <th className={tableHeaderCell}>Пришло</th>
                    <th className={tableHeaderCell}>Расхождение</th>
                    <th className={tableHeaderCell}>Новый остаток</th>
                    <th className={tableHeaderCell}>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.lines.map((line) => {
                    const item = catalog.find((candidate) => candidate.id === line.itemId)
                    const alreadyReceived = line.receivedQuantity ?? 0
                    const currentInput = draftReceived[line.id] ?? 0
                    const newStock = getStockQuantity(stock, line.itemId) + currentInput
                    const difference = line.quantity - alreadyReceived - currentInput

                    return (
                      <tr key={line.id}>
                        <td className={tableCell}>
                          <div className="font-semibold text-slate-950">{item?.shortName}</div>
                          <div className="text-xs text-slate-500">{item?.fullName}</div>
                        </td>
                        <td className={tableCell}>
                          {formatNumber(line.quantity)} {item?.unit}
                          {alreadyReceived ? <div className="text-xs text-slate-500">ранее принято {alreadyReceived}</div> : null}
                        </td>
                        <td className={tableCell}>
                          <input
                            type="number"
                            min={0}
                            max={line.quantity - alreadyReceived}
                            value={currentInput}
                            onChange={(event) =>
                              setReceived((current) => ({ ...current, [line.id]: Number(event.target.value) }))
                            }
                            className={fieldStyles}
                          />
                        </td>
                        <td className={tableCell}>
                          <span className={difference > 0 ? 'font-semibold text-amber-700' : 'text-slate-700'}>
                            {formatNumber(Math.max(0, difference))} {item?.unit}
                          </span>
                        </td>
                        <td className={tableCell}>{formatNumber(newStock)} {item?.unit}</td>
                        <td className={tableCell}>
                          <StatusPill tone={difference > 0 ? 'warning' : 'success'}>
                            {difference > 0 ? 'Частичный приход' : 'Можно принять'}
                          </StatusPill>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : (
        <Panel>
          <EmptyState>Заказов для прихода пока нет. Сформируйте заказ в разделе `Заказы`.</EmptyState>
        </Panel>
      )}
    </PageTransition>
  )
}
