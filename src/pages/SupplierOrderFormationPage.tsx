import { ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, ShoppingCart } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { Button, EmptyState, Panel, SectionHeader, StatusPill } from '../components/ui'
import { useDemo } from '../context'
import { cn, formatMoney, formatNumber } from '../lib/format'

const headerCell =
  'sticky top-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-1.5 py-1.5 text-center text-[10px] font-normal uppercase text-slate-500 last:border-r-0'
const tableCell = 'border-b border-r border-slate-100 px-1.5 py-1 align-middle text-[11px] leading-3 text-slate-700 last:border-r-0'
const vatRate = 0.2

type FormationStatus = 'idle' | 'loading' | 'done'

function getNavigationOrderIds(state: unknown) {
  if (!state || typeof state !== 'object' || !('orderIds' in state)) return []

  const orderIds = (state as { orderIds?: unknown }).orderIds
  return Array.isArray(orderIds) ? orderIds.filter((id): id is string => typeof id === 'string') : []
}

export function SupplierOrderFormationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const finishTimerRef = useRef<number | null>(null)
  const [formationStatus, setFormationStatus] = useState<FormationStatus>('idle')
  const [downloadHintOrderId, setDownloadHintOrderId] = useState<string | null>(null)
  const {
    state: { orders, suppliers, catalog, replenishment, requests, rooms },
    markOrderAsOrdered,
  } = useDemo()

  const navigationOrderIds = useMemo(() => getNavigationOrderIds(location.state), [location.state])
  const visibleOrders = useMemo(() => {
    const sorted = [...orders].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

    if (navigationOrderIds.length) {
      const navigationSet = new Set(navigationOrderIds)
      const scoped = sorted.filter((order) => navigationSet.has(order.id))
      const packageIds = new Set(scoped.map((order) => order.purchasePackageId).filter((id): id is string => Boolean(id)))
      if (packageIds.size) {
        return sorted.filter((order) => order.purchasePackageId && packageIds.has(order.purchasePackageId))
      }
      if (scoped.length) return scoped
    }

    const draftOrders = sorted.filter((order) => order.status === 'draft' || order.status === 'ready-to-order')
    return draftOrders.length ? draftOrders : sorted.slice(0, 3)
  }, [navigationOrderIds, orders])

  const supplierById = useMemo(() => new Map(suppliers.map((supplier) => [supplier.id, supplier])), [suppliers])
  const catalogById = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog])
  const replenishmentById = useMemo(() => new Map(replenishment.map((line) => [line.id, line])), [replenishment])
  const requestById = useMemo(() => new Map(requests.map((request) => [request.id, request])), [requests])
  const roomById = useMemo(() => new Map(rooms.map((room) => [room.id, room])), [rooms])

  const rows = useMemo(
    () =>
      visibleOrders.flatMap((order) =>
        order.lines.map((line) => {
          const item = catalogById.get(line.itemId)
          const source = replenishmentById.get(line.replenishmentLineId)
          const request = source?.requestId ? requestById.get(source.requestId) : undefined
          const room = request ? roomById.get(request.roomId) : undefined
          const supplier = supplierById.get(order.supplierId)
          const priceWithVat = line.price ?? item?.price ?? 0
          const priceWithoutVat = priceWithVat ? priceWithVat / (1 + vatRate) : 0
          const totalWithVat = priceWithVat * line.quantity
          const totalWithoutVat = priceWithoutVat * line.quantity
          const vatTotal = totalWithVat - totalWithoutVat

          return {
            order,
            line,
            item,
            source,
            request,
            room,
            supplier,
            priceWithVat,
            priceWithoutVat,
            totalWithVat,
            totalWithoutVat,
            vatTotal,
          }
        }),
      ),
    [catalogById, replenishmentById, requestById, roomById, supplierById, visibleOrders],
  )

  const orderCount = visibleOrders.length
  const supplierCount = new Set(visibleOrders.map((order) => order.supplierId)).size
  const purchasePackageId =
    visibleOrders.find((order) => order.purchasePackageId)?.purchasePackageId ??
    (visibleOrders.length ? `PACK-${visibleOrders.map((order) => order.id.replace(/\D/g, '') || order.id).join('-')}` : 'PACK')
  const quantityTotal = rows.reduce((sum, row) => sum + row.line.quantity, 0)
  const totalWithVat = rows.reduce((sum, row) => sum + row.totalWithVat, 0)
  const totalWithoutVat = rows.reduce((sum, row) => sum + row.totalWithoutVat, 0)
  const vatTotal = totalWithVat - totalWithoutVat
  const orderFiles = useMemo(
    () =>
      visibleOrders.map((order) => {
        const orderRows = rows.filter((row) => row.order.id === order.id)
        const orderTotal = orderRows.reduce((sum, row) => sum + row.totalWithVat, 0)
        const orderVat = orderRows.reduce((sum, row) => sum + row.vatTotal, 0)

        return {
          order,
          rows: orderRows,
          supplier: supplierById.get(order.supplierId),
          total: orderTotal,
          vat: orderVat,
        }
      }),
    [rows, supplierById, visibleOrders],
  )
  const canFinalize = rows.length > 0 && visibleOrders.some((order) => order.status === 'draft' || order.status === 'ready-to-order')
  const isFinalized =
    formationStatus === 'done' ||
    (rows.length > 0 && visibleOrders.every((order) => order.status !== 'draft' && order.status !== 'ready-to-order'))

  useEffect(() => {
    return () => {
      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current)
      }
    }
  }, [])

  function handleFinalizeOrder() {
    if (!canFinalize || formationStatus === 'loading') return

    setFormationStatus('loading')
    finishTimerRef.current = window.setTimeout(() => {
      visibleOrders
        .filter((order) => order.status === 'draft' || order.status === 'ready-to-order')
        .forEach((order) => markOrderAsOrdered(order.id))
      setFormationStatus('done')
    }, 950)
  }

  return (
    <PageTransition className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <Panel>
        <SectionHeader
          title="Формирование пакета закупки"
          subtitle="Один пакет закупки разделяется на отдельные заказы по поставщикам. Ниже показаны все заказы этого пакета."
          action={
            <>
              <Button variant="secondary" onClick={() => navigate('/replenishment')}>
                <ArrowLeft size={16} />
                Пополнение
              </Button>
              <Button variant="secondary" onClick={() => navigate('/orders')}>
                <ShoppingCart size={16} />
                Реестр заказов
              </Button>
              {isFinalized ? (
                <StatusPill tone="success" className="min-h-9 px-3">
                  <CheckCircle2 size={15} />
                  Пакет сформирован
                </StatusPill>
              ) : (
                <Button onClick={handleFinalizeOrder} disabled={!canFinalize || formationStatus === 'loading'}>
                  {formationStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                  Сформировать пакет
                </Button>
              )}
            </>
          }
        />
      </Panel>

      {rows.length ? (
        <Panel className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0">
          <div className="grid gap-2 border-b border-slate-200 p-3 md:grid-cols-5">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Пакет закупки</div>
              <div className="text-lg font-normal text-slate-950">{purchasePackageId}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Заказов поставщикам</div>
              <div className="text-lg font-normal text-slate-950">{orderCount}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Поставщиков</div>
              <div className="text-lg font-normal text-slate-950">{supplierCount}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Позиций</div>
              <div className="text-lg font-normal text-slate-950">{rows.length}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Итого с НДС</div>
              <div className="text-lg font-normal text-slate-950">{totalWithVat ? formatMoney(totalWithVat) : '-'}</div>
            </div>
          </div>

          <div className="grid gap-2 border-b border-slate-200 bg-slate-50/60 p-3 md:grid-cols-2">
            {orderFiles.map((file) => (
              <div key={file.order.id} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-normal text-slate-950">
                      {file.order.id} · {file.supplier?.name ?? 'Поставщик'}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      отдельный заказ поставщику внутри пакета {purchasePackageId}
                    </div>
                  </div>
                  <StatusPill tone="info">{file.rows.length} поз.</StatusPill>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>НДС: <span className="text-slate-950">{file.vat ? formatMoney(file.vat) : '-'}</span></span>
                  <span>Итого: <span className="text-slate-950">{file.total ? formatMoney(file.total) : '-'}</span></span>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-y-auto overflow-x-hidden">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-[3%]" />
                <col className="w-[28%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[4%]" />
                <col className="w-[5%]" />
                <col className="w-[7%]" />
                <col className="w-[6%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[5%]" />
                <col className="w-[6%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className={headerCell}>№</th>
                  <th className={headerCell}>Позиция</th>
                  <th className={headerCell}>Поставщик</th>
                  <th className={headerCell}>Упаковка</th>
                  <th className={headerCell}>Ед.</th>
                  <th className={headerCell}>Кол-во</th>
                  <th className={headerCell}>Цена без НДС</th>
                  <th className={headerCell}>НДС за ед.</th>
                  <th className={headerCell}>Цена с НДС</th>
                  <th className={headerCell}>Сумма без НДС</th>
                  <th className={headerCell}>НДС итого</th>
                  <th className={headerCell}>Сумма с НДС</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.line.id} className={index % 2 ? 'bg-white' : 'bg-slate-50/35'}>
                    <td className={cn(tableCell, 'text-center font-medium text-slate-950')}>{index + 1}</td>
                    <td className={tableCell}>
                      <div className="whitespace-normal break-words text-slate-950">{row.item?.fullName ?? 'Позиция'}</div>
                    </td>
                    <td className={tableCell}>
                      <div className="break-words text-slate-950">{row.supplier?.name ?? 'Поставщик'}</div>
                    </td>
                    <td className={cn(tableCell, 'break-words')}>{row.item?.packageLabel ?? '-'}</td>
                    <td className={cn(tableCell, 'text-center')}>{row.item?.unit ?? '-'}</td>
                    <td className={cn(tableCell, 'text-center text-slate-950')}>{formatNumber(row.line.quantity)}</td>
                    <td className={cn(tableCell, 'whitespace-nowrap')}>{row.priceWithoutVat ? formatMoney(row.priceWithoutVat) : '-'}</td>
                    <td className={cn(tableCell, 'whitespace-nowrap')}>{row.priceWithVat ? formatMoney(row.priceWithVat - row.priceWithoutVat) : '-'}</td>
                    <td className={cn(tableCell, 'whitespace-nowrap')}>{row.priceWithVat ? formatMoney(row.priceWithVat) : '-'}</td>
                    <td className={cn(tableCell, 'whitespace-nowrap text-slate-950')}>{row.totalWithoutVat ? formatMoney(row.totalWithoutVat) : '-'}</td>
                    <td className={cn(tableCell, 'whitespace-nowrap')}>{row.vatTotal ? formatMoney(row.vatTotal) : '-'}</td>
                    <td className={cn(tableCell, 'whitespace-nowrap font-medium text-slate-950')}>{row.totalWithVat ? formatMoney(row.totalWithVat) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="flex flex-wrap gap-4">
                <span className="text-slate-500">Количество: <span className="text-slate-950">{formatNumber(quantityTotal)}</span></span>
                <span className="text-slate-500">Без НДС: <span className="text-slate-950">{totalWithoutVat ? formatMoney(totalWithoutVat) : '-'}</span></span>
                <span className="text-slate-500">НДС 20%: <span className="text-slate-950">{vatTotal ? formatMoney(vatTotal) : '-'}</span></span>
                <span className="text-slate-500">Итого с НДС: <span className="text-slate-950">{totalWithVat ? formatMoney(totalWithVat) : '-'}</span></span>
              </div>
            </div>
            {isFinalized ? (
              <div className="border-t border-slate-100 px-3 py-2">
                <div className="mb-2 text-sm font-normal text-slate-950">Файлы поставщикам</div>
                <div className="grid gap-1.5">
                  {orderFiles.map((file) => {
                    const active = downloadHintOrderId === file.order.id

                    return (
                      <div
                        key={file.order.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm text-slate-950">
                            {file.supplier?.name ?? 'Поставщик'} · {file.order.id}
                          </div>
                          <div className="text-xs text-slate-500">
                            {file.rows.length} поз. · НДС {formatMoney(file.vat)} · Итого {formatMoney(file.total)} · ожидает прихода
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          className={cn(
                            'group min-h-9 gap-2 border-emerald-100 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800',
                            active && 'min-w-[252px] border-emerald-300 bg-emerald-50 text-emerald-900 shadow-[0_8px_18px_rgba(16,185,129,0.12)]',
                          )}
                          onClick={() => setDownloadHintOrderId(file.order.id)}
                        >
                          <span
                            className={cn(
                              'inline-flex size-6 items-center justify-center rounded bg-emerald-600 text-white transition',
                              active ? 'bg-emerald-700' : 'group-hover:bg-emerald-700',
                            )}
                          >
                            <FileSpreadsheet size={15} />
                          </span>
                          {active ? 'Здесь начнется скачивание' : 'Скачать Excel'}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </Panel>
      ) : (
        <Panel>
          <EmptyState>Нет сформированных строк заказа. Проверьте количество, поставщика и статус наличия в пополнении.</EmptyState>
        </Panel>
      )}

      {formationStatus === 'loading' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-lg border border-slate-200 bg-white p-5 text-center shadow-2xl">
            <Loader2 className="mx-auto animate-spin text-emerald-700" size={32} />
            <div className="mt-3 text-lg font-normal text-slate-950">Формирование пакета</div>
          </div>
        </div>
      ) : null}

      {formationStatus === 'done' ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-900 shadow-2xl">
          Пакет закупки сформирован
        </div>
      ) : null}
    </PageTransition>
  )
}
