import { AlertTriangle, Check, CircleHelp, PackagePlus, SearchCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PageTransition } from '../components/PageTransition'
import { Button, EmptyState, Panel, SectionHeader, StatusPill, fieldStyles, tableCell, tableHeaderCell } from '../components/ui'
import { useDemo } from '../context'
import {
  getRecommendedQuantity,
  getStockQuantity,
  requestLineStatusLabels,
  requestStatusLabels,
  statusTone,
} from '../lib/demoLogic'
import { formatDateTime, formatNumber } from '../lib/format'

export function SeniorWorkspacePage() {
  const {
    state: { rooms, catalog, stock, requests, replenishment, orders, activeRequestId },
    setActiveRequest,
    issueFullLine,
    issuePartialLine,
    markLineOutOfStock,
    markLineNeedsClarification,
    reviewManualLine,
    addItemToReplenishment,
  } = useDemo()
  const sortedRequests = useMemo(
    () => [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [requests],
  )
  const selectedRequest = sortedRequests.find((request) => request.id === activeRequestId) ?? sortedRequests[0]
  const [partialQuantities, setPartialQuantities] = useState<Record<string, number>>({})
  const belowMinimumCount = catalog.filter((item) => getStockQuantity(stock, item.id) < item.minStock).length
  const waitingReceiptCount = orders.filter((order) => order.status === 'waiting-receipt').length
  const canIssueCount = selectedRequest?.lines.filter((line) => {
    if (!line.itemId) return false
    return getStockQuantity(stock, line.itemId) >= line.quantity - line.issuedQuantity
  }).length ?? 0
  const deficitCount = selectedRequest?.lines.filter((line) => {
    if (!line.itemId) return false
    const remaining = line.quantity - line.issuedQuantity
    const available = getStockQuantity(stock, line.itemId)
    return available > 0 && available < remaining
  }).length ?? 0

  useEffect(() => {
    if (!activeRequestId && sortedRequests[0]) {
      setActiveRequest(sortedRequests[0].id)
    }
  }, [activeRequestId, setActiveRequest, sortedRequests])

  return (
    <PageTransition className="grid gap-3">
      <Panel>
        <SectionHeader
          title="Рабочий стол старшей медсестры"
          subtitle="Входящие заявки, остатки, выдача, дефицит и последствия для пополнения в одном рабочем контуре."
        />
      </Panel>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          ['Новые заявки', requests.filter((request) => request.status === 'sent').length, 'info'],
          ['Можно выдать полностью', canIssueCount, 'success'],
          ['Есть частичный дефицит', deficitCount, 'warning'],
          ['Ниже минимума', belowMinimumCount, 'danger'],
          ['В пополнении', replenishment.filter((line) => !line.closedAt).length, 'warning'],
        ].map(([label, value, tone]) => (
          <Panel key={label} className="p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
            {label === 'В пополнении' ? <div className="mt-1 text-xs text-slate-500">Ожидают прихода: {waitingReceiptCount}</div> : null}
          </Panel>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[360px,minmax(0,1fr)]">
        <Panel className="content-start">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-950">Заявки</div>
              <div className="text-sm text-slate-500">{requests.length} в demo-state</div>
            </div>
            <StatusPill tone="info">Входящие</StatusPill>
          </div>

          <div className="mt-4 grid gap-2">
            {sortedRequests.map((request) => {
              const room = rooms.find((item) => item.id === request.roomId)
              const warning = request.lines.some((line) => line.status === 'manual-line')
                ? 'Есть ручная строка'
                : request.lines.some((line) => line.itemId && getStockQuantity(stock, line.itemId) < line.quantity - line.issuedQuantity)
                  ? 'Проверить остатки'
                  : 'Можно обработать'

              return (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => setActiveRequest(request.id)}
                  className={`rounded-md border p-3 text-left transition ${
                    selectedRequest?.id === request.id
                      ? 'border-emerald-700 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-slate-950">{request.id}</div>
                    <StatusPill tone={statusTone(request.status)}>{requestStatusLabels[request.status]}</StatusPill>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Кабинет {room?.number} · {request.createdBy}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{formatDateTime(request.createdAt)}</div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                    <span>{request.lines.length} строк</span>
                    <span className="text-slate-500">{warning}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </Panel>

        <Panel className="min-w-0">
          {selectedRequest ? (
            <>
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xl font-semibold text-slate-950">{selectedRequest.id}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Кабинет {rooms.find((room) => room.id === selectedRequest.roomId)?.number} · {formatDateTime(selectedRequest.createdAt)}
                  </div>
                </div>
                <StatusPill tone={statusTone(selectedRequest.status)}>{requestStatusLabels[selectedRequest.status]}</StatusPill>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[1040px] border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className={tableHeaderCell}>Позиция</th>
                      <th className={tableHeaderCell}>Запрошено</th>
                      <th className={tableHeaderCell}>Склад</th>
                      <th className={tableHeaderCell}>После выдачи</th>
                      <th className={tableHeaderCell}>Мин.</th>
                      <th className={tableHeaderCell}>Желат.</th>
                      <th className={tableHeaderCell}>Статус</th>
                      <th className={tableHeaderCell}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRequest.lines.map((line) => {
                      const item = line.itemId ? catalog.find((candidate) => candidate.id === line.itemId) : undefined
                      const available = line.itemId ? getStockQuantity(stock, line.itemId) : 0
                      const remaining = line.quantity - line.issuedQuantity
                      const afterIssue = item ? available - remaining : 0
                      const partialQuantity = partialQuantities[line.id] ?? Math.min(available, remaining)
                      const willNeedReplenishment = item ? afterIssue < item.minStock : false

                      return (
                        <tr key={line.id}>
                          <td className={tableCell}>
                            <div className="font-semibold text-slate-950">{item?.shortName ?? line.manualName}</div>
                            <div className="mt-1 text-xs text-slate-500">{line.comment}</div>
                            {line.seniorComment ? <div className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-900">{line.seniorComment}</div> : null}
                          </td>
                          <td className={tableCell}>
                            {formatNumber(line.quantity)} {item?.unit ?? ''}
                            {line.issuedQuantity > 0 ? <div className="text-xs text-slate-500">выдано {formatNumber(line.issuedQuantity)}</div> : null}
                          </td>
                          <td className={tableCell}>
                            {item ? (
                              <span className={available < remaining ? 'font-semibold text-rose-700' : 'text-slate-700'}>
                                {formatNumber(available)} {item.unit}
                              </span>
                            ) : (
                              <StatusPill tone="warning">Не в справочнике</StatusPill>
                            )}
                          </td>
                          <td className={tableCell}>
                            {item ? (
                              <>
                                <span className={willNeedReplenishment ? 'font-semibold text-amber-700' : ''}>
                                  {formatNumber(afterIssue)} {item.unit}
                                </span>
                                {willNeedReplenishment ? (
                                  <div className="text-xs text-amber-700">Нужно докупить {formatNumber(getRecommendedQuantity(item, Math.max(0, afterIssue)))}</div>
                                ) : null}
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className={tableCell}>{item?.minStock ?? '—'}</td>
                          <td className={tableCell}>{item?.desiredStock ?? '—'}</td>
                          <td className={tableCell}>
                            <StatusPill tone={statusTone(line.status)}>{requestLineStatusLabels[line.status]}</StatusPill>
                          </td>
                          <td className={tableCell}>
                            {item ? (
                              <div className="flex min-w-[280px] flex-wrap gap-2">
                                <Button
                                  variant="success"
                                  disabled={remaining <= 0 || available < remaining}
                                  onClick={() => issueFullLine(selectedRequest.id, line.id)}
                                >
                                  <Check size={15} />
                                  Выдать полностью
                                </Button>
                                <div className="flex gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    max={Math.min(available, remaining)}
                                    value={partialQuantity}
                                    onChange={(event) =>
                                      setPartialQuantities((current) => ({
                                        ...current,
                                        [line.id]: Number(event.target.value),
                                      }))
                                    }
                                    className="h-9 w-20 rounded-md border border-slate-200 px-2 text-sm outline-none"
                                  />
                                  <Button
                                    variant="secondary"
                                    disabled={remaining <= 0 || available <= 0}
                                    onClick={() => issuePartialLine(selectedRequest.id, line.id, partialQuantity)}
                                  >
                                    Выдать частично
                                  </Button>
                                </div>
                                <Button variant="secondary" onClick={() => markLineOutOfStock(selectedRequest.id, line.id)}>
                                  <AlertTriangle size={15} />
                                  Нет на складе
                                </Button>
                                <Button variant="ghost" onClick={() => addItemToReplenishment(item.id)}>
                                  <PackagePlus size={15} />
                                  Пополнить
                                </Button>
                                <Button variant="ghost" onClick={() => markLineNeedsClarification(selectedRequest.id, line.id)}>
                                  <CircleHelp size={15} />
                                  Уточнить
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" onClick={() => reviewManualLine(selectedRequest.id, line.id, 'return')}>
                                  <SearchCheck size={15} />
                                  Разобрать ручную строку
                                </Button>
                                <Button variant="ghost" onClick={() => reviewManualLine(selectedRequest.id, line.id, 'reject')}>
                                  Отклонить
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {selectedRequest.lines.map((line) => {
                  const item = line.itemId ? catalog.find((candidate) => candidate.id === line.itemId) : undefined
                  if (!item) {
                    return (
                      <div key={line.id} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        {line.manualName}: очередь разбора справочника.
                      </div>
                    )
                  }

                  const available = getStockQuantity(stock, item.id)
                  const remaining = line.quantity - line.issuedQuantity
                  const afterIssue = available - remaining
                  return (
                    <div key={line.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                      <div className="font-semibold text-slate-950">{item.shortName}</div>
                      <div className="mt-2 text-slate-600">Спишется: {Math.max(0, Math.min(available, remaining))} {item.unit}</div>
                      <div className="text-slate-600">Остаток после выдачи: {formatNumber(afterIssue)} {item.unit}</div>
                      <div className={afterIssue < item.minStock ? 'mt-1 font-semibold text-amber-800' : 'mt-1 text-slate-500'}>
                        {afterIssue < item.minStock
                          ? `Попадет в пополнение: ${getRecommendedQuantity(item, Math.max(0, afterIssue))} ${item.unit}`
                          : 'Пополнение не требуется'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <EmptyState>Заявок пока нет.</EmptyState>
          )}
        </Panel>
      </div>
    </PageTransition>
  )
}
