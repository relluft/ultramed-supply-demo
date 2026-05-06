import { ArrowRight, Check, ChevronDown, ClipboardCheck, FileSpreadsheet, Loader2, Mail, Reply } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { EmptyState, Panel, SectionHeader, StatusPill } from '../components/ui'
import { useDemo } from '../context'
import {
  clinicBackupSupplierId,
  clinicMainSupplierId,
  replenishmentSourceLabels,
} from '../lib/demoLogic'
import { cn, formatNumber } from '../lib/format'

const headerCell =
  'sticky top-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-[11px] font-normal uppercase tracking-wide text-slate-500 last:border-r-0'
const tableCell = 'border-b border-r border-slate-100 px-2 py-1 align-middle text-[11px] leading-3 text-slate-700 last:border-r-0'
const supplierBadgeClass =
  'inline-flex shrink-0 items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-normal uppercase tracking-wide text-emerald-800'
const inquiryStepClass =
  'flex min-w-[160px] flex-1 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700'
const replenishmentSupplierIds = [clinicMainSupplierId, clinicBackupSupplierId]

export function ReplenishmentPage() {
  const navigate = useNavigate()
  const formingTimerRef = useRef<number | null>(null)
  const [isFormingOrder, setIsFormingOrder] = useState(false)
  const [orderReadyModalOpen, setOrderReadyModalOpen] = useState(false)
  const [downloadHintSupplierId, setDownloadHintSupplierId] = useState<string | null>(null)
  const [supplierAttentionByLineId, setSupplierAttentionByLineId] = useState<Record<string, boolean>>({})
  const [openSupplierLineId, setOpenSupplierLineId] = useState<string | null>(null)
  const [workflowStage, setWorkflowStage] = useState<'inquiry' | 'order'>('inquiry')
  const {
    state: { replenishment, catalog, suppliers, requests, activeRequestId },
    updateReplenishmentAvailability,
    prepareReplenishmentInquiry,
    selectReplenishmentSupplier,
    updateReplenishmentQuantity,
    toggleReplenishmentInOrder,
    formSupplierOrders,
  } = useDemo()
  const activeRequest = requests.find((request) => request.id === activeRequestId)
  const clinicMainSupplier = suppliers.find((supplier) => supplier.id === clinicMainSupplierId)
  const activeLines = useMemo(
    () =>
      replenishment
        .filter((line) => !line.closedAt)
        .sort((left, right) => {
          const leftActive = left.requestId === activeRequestId ? 0 : 1
          const rightActive = right.requestId === activeRequestId ? 0 : 1
          return leftActive - rightActive || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        }),
    [activeRequestId, replenishment],
  )
  const activeRequestLines = activeLines.filter((line) => line.requestId === activeRequestId)
  const orderReadyLines = activeLines.filter((line) => line.includedInOrder !== false && ['available', 'partially-available', 'alternative-selected', 'ready-to-order'].includes(line.availabilityStatus))
  const readyCount = orderReadyLines.length
  const problemLines = activeLines.filter((line) => line.availabilityStatus === 'not-available-from-approved-suppliers')
  const tableLines = workflowStage === 'order' ? orderReadyLines : activeLines
  const inquiryNeededCount = activeLines.filter(
    (line) =>
      line.includedInOrder !== false &&
      line.availabilityStatus === 'not-checked',
  ).length
  const waitingResponseCount = activeLines.filter(
    (line) =>
      line.includedInOrder !== false &&
      line.availabilityStatus === 'checking',
  ).length
  const bulkAvailableLines = activeLines.filter(
    (line) =>
      line.includedInOrder !== false &&
      line.availabilityStatus !== 'available' &&
      line.availabilityStatus !== 'alternative-selected' &&
      line.availabilityStatus !== 'ready-to-order',
  )
  const supplierInquiryGroups = useMemo(() => {
    const grouped = new Map<
      string,
      {
        supplierId: string
        supplierName: string
        supplierEmail?: string
        rows: Array<{
          line: (typeof activeLines)[number]
          item: (typeof catalog)[number]
          quantity: number
        }>
      }
    >()

    activeLines.forEach((line) => {
      if (line.includedInOrder === false) return
      if (line.availabilityStatus !== 'not-checked' && line.availabilityStatus !== 'checking') return

      const item = catalog.find((candidate) => candidate.id === line.itemId)
      if (!item) return

      const quantity = line.recommendedQuantity > 0
        ? line.recommendedQuantity
        : Math.max(line.desiredStock - line.currentStock, line.minStock - line.currentStock, 1)
      const effectiveSupplierId =
        !replenishmentSupplierIds.includes(line.selectedSupplierId)
          ? clinicMainSupplierId
          : line.selectedSupplierId
      const supplier = suppliers.find((candidate) => candidate.id === effectiveSupplierId)
      const group = grouped.get(effectiveSupplierId) ?? {
        supplierId: effectiveSupplierId,
        supplierName: supplier?.name ?? 'Поставщик',
        supplierEmail: supplier?.email,
        rows: [],
      }

      group.rows.push({ line, item, quantity })
      grouped.set(effectiveSupplierId, group)
    })

    return Array.from(grouped.values()).sort((left, right) => {
      const leftRank = left.supplierId === clinicMainSupplierId ? 0 : 1
      const rightRank = right.supplierId === clinicMainSupplierId ? 0 : 1
      return leftRank - rightRank || left.supplierName.localeCompare(right.supplierName, 'ru')
    })
  }, [activeLines, catalog, suppliers])

  useEffect(() => {
    return () => {
      if (formingTimerRef.current) {
        window.clearTimeout(formingTimerRef.current)
      }
    }
  }, [])

  function supplierName(id?: string) {
    return suppliers.find((supplier) => supplier.id === id)?.name ?? '—'
  }

  function allowedSupplierIdsForItem(item?: (typeof catalog)[number]) {
    if (!item) return []

    return replenishmentSupplierIds
  }

  function handleFormOrders() {
    if (!readyCount) return
    if (isFormingOrder) return

    setIsFormingOrder(true)
    formingTimerRef.current = window.setTimeout(() => {
      formSupplierOrders()
      setIsFormingOrder(false)
      setOrderReadyModalOpen(true)
    }, 1200)
  }

  function handlePrepareInquiry(supplierId: string, lineIds: string[]) {
    prepareReplenishmentInquiry(supplierId, lineIds)
    setDownloadHintSupplierId(supplierId)
  }

  function markAvailable(
    lineId: string,
    currentStatus: (typeof activeLines)[number]['availabilityStatus'],
    selectedSupplierId: string,
  ) {
    const alreadyMarked = currentStatus === 'available' || currentStatus === 'alternative-selected'
    const confirmedStatus = selectedSupplierId === clinicMainSupplierId ? 'available' : 'alternative-selected'
    updateReplenishmentAvailability(lineId, alreadyMarked ? 'not-checked' : confirmedStatus)
    setSupplierAttentionByLineId((current) => ({ ...current, [lineId]: false }))
  }

  function markUnavailable(lineId: string, currentStatus: (typeof activeLines)[number]['availabilityStatus']) {
    const alreadyMarked = currentStatus === 'not-available'
    updateReplenishmentAvailability(lineId, alreadyMarked ? 'not-checked' : 'not-available')
    setSupplierAttentionByLineId((current) => ({ ...current, [lineId]: !alreadyMarked }))
  }

  function markAllAvailable() {
    bulkAvailableLines.forEach((line) => {
      const supplierId = replenishmentSupplierIds.includes(line.selectedSupplierId)
        ? line.selectedSupplierId
        : clinicMainSupplierId
      updateReplenishmentAvailability(
        line.id,
        supplierId === clinicMainSupplierId ? 'available' : 'alternative-selected',
      )
    })
    setSupplierAttentionByLineId({})
  }

  function changeSupplier(lineId: string, supplierId: string) {
    selectReplenishmentSupplier(lineId, supplierId)
    setSupplierAttentionByLineId((current) => ({ ...current, [lineId]: false }))
    setOpenSupplierLineId(null)
  }

  return (
    <PageTransition className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <Panel>
        <SectionHeader
          title="Пополнение"
          subtitle={
            activeRequest
              ? `Дефицит и докупка после обработки заявки ${activeRequest.id}: ${activeRequest.title?.replace(/_/g, ' ')}.`
              : 'Дефицитные позиции, рекомендованное количество и проверка наличия у поставщиков.'
          }
        />
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setWorkflowStage('inquiry')}
            className={cn(
              'rounded-md border px-4 py-3 text-left transition',
              workflowStage === 'inquiry'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-normal uppercase tracking-wide">1. Проверка наличия</span>
              <StatusPill tone={waitingResponseCount ? 'warning' : inquiryNeededCount ? 'info' : 'success'}>
                {inquiryNeededCount ? `${inquiryNeededCount} не проверено` : waitingResponseCount ? `${waitingResponseCount} ждут` : 'готово'}
              </StatusPill>
            </div>
            <div className="mt-1 text-sm text-slate-500">Подготовить Excel-запрос, отправить поставщику вручную и внести ответ.</div>
          </button>
          <button
            type="button"
            onClick={() => setWorkflowStage('order')}
            className={cn(
              'rounded-md border px-4 py-3 text-left transition',
              workflowStage === 'order'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-normal uppercase tracking-wide">2. Формирование заказа</span>
              <StatusPill tone={readyCount ? 'success' : 'neutral'}>{readyCount ? `${readyCount} подтверждено` : 'нет строк'}</StatusPill>
            </div>
            <div className="mt-1 text-sm text-slate-500">В заказ попадают только позиции с подтвержденным наличием.</div>
          </button>
        </div>
      </Panel>

      <Panel className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden p-0">
        {tableLines.length ? (
          <div className="h-full overflow-auto">
            <table className="w-full min-w-[1320px] border-separate border-spacing-0">
              <colgroup>
                <col className="w-[29%]" />
                <col className="w-[12%]" />
                <col className="w-[5%]" />
                <col className="w-[5%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[7%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className={headerCell}>Позиция</th>
                  <th className={headerCell}>Причина</th>
                  <th className={headerCell}>Остаток</th>
                  <th className={headerCell}>Мин.</th>
                  <th className={headerCell}>Закупка</th>
                  <th className={headerCell}>Поставщик</th>
                  <th className={headerCell}>Наличие</th>
                  <th className={headerCell}>В заказ</th>
                </tr>
              </thead>
              <tbody>
                {tableLines.map((line, index) => {
                  const item = catalog.find((candidate) => candidate.id === line.itemId)
                  const allowedSuppliers = allowedSupplierIdsForItem(item)
                  const active = line.requestId === activeRequestId
                  const minPurchaseQuantity = Math.max(line.minStock - line.currentStock, 0)
                  const selectedSupplierId =
                    !allowedSuppliers.includes(line.selectedSupplierId)
                      ? clinicMainSupplierId
                      : line.selectedSupplierId
                  const selectedMainSupplier = selectedSupplierId === clinicMainSupplierId

                  return (
                    <tr
                      key={line.id}
                      className={cn(
                        'transition hover:bg-slate-100/70',
                        active ? 'bg-amber-50/80' : index % 2 ? 'bg-white' : 'bg-slate-50/35',
                      )}
                    >
                      <td className={tableCell}>
                        <div className="whitespace-normal break-words text-slate-950">{item?.fullName ?? 'Позиция'}</div>
                        <div className="mt-0.5 text-[10px] leading-3 text-slate-500">
                          {item?.category} · {item?.unit} · {item?.packageLabel}
                        </div>
                      </td>
                      <td className={tableCell}>{replenishmentSourceLabels[line.source]}</td>
                      <td className={cn(tableCell, 'text-center text-slate-950')}>{formatNumber(line.currentStock)}</td>
                      <td className={cn(tableCell, 'text-center')}>{formatNumber(line.minStock)}</td>
                      <td className={tableCell}>
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min={0}
                            value={line.recommendedQuantity > 0 ? line.recommendedQuantity : ''}
                            onChange={(event) =>
                              updateReplenishmentQuantity(
                                line.id,
                                event.target.value === '' ? 0 : Number(event.target.value),
                              )
                            }
                            className="h-6 w-12 rounded-md border border-slate-200 bg-white px-1 text-center text-[11px] text-slate-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                            aria-label="Количество к закупке"
                          />
                          <span className="min-w-4 text-[10px] text-slate-500">{item?.unit}</span>
                          <button
                            type="button"
                            onClick={() => updateReplenishmentQuantity(line.id, minPurchaseQuantity)}
                            className="h-6 whitespace-nowrap rounded-md border border-slate-200 bg-white px-1.5 text-[10px] text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                            title="Докупить до минимального остатка"
                          >
                            до мин.
                          </button>
                        </div>
                      </td>
                      <td
                        className={cn(
                          tableCell,
                          'relative',
                          (supplierAttentionByLineId[line.id] || line.availabilityStatus === 'not-available') &&
                            'bg-rose-50/80 ring-1 ring-inset ring-rose-200',
                        )}
                      >
                        <div className="grid gap-1">
                          <button
                            type="button"
                            onClick={() => setOpenSupplierLineId((current) => (current === line.id ? null : line.id))}
                            className="flex h-7 w-full min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-left text-xs text-slate-900 outline-none transition hover:border-slate-300 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                            title={supplierName(selectedSupplierId)}
                          >
                            <span className="min-w-0 flex-1 truncate">{supplierName(selectedSupplierId)}</span>
                            {selectedMainSupplier ? <span className={supplierBadgeClass}>основной</span> : null}
                            <ChevronDown size={13} className="shrink-0 text-slate-400" />
                          </button>
                          {line.availabilityStatus === 'not-available' ? (
                            <span className="text-[10px] leading-3 text-rose-700">
                              нет у {supplierName(selectedSupplierId)}
                            </span>
                          ) : null}
                        </div>
                        {openSupplierLineId === line.id ? (
                          <div className="absolute left-2 right-2 top-8 z-30 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                            {allowedSuppliers.map((supplierId) => {
                              const selected = supplierId === selectedSupplierId
                              const mainSupplier = supplierId === clinicMainSupplierId

                              return (
                                <button
                                  key={supplierId}
                                  type="button"
                                  onClick={() => changeSupplier(line.id, supplierId)}
                                  className={cn(
                                    'flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs transition',
                                    selected ? 'bg-slate-100 text-slate-950' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
                                  )}
                                  title={supplierName(supplierId)}
                                >
                                  <span className="min-w-0 flex-1 truncate">{supplierName(supplierId)}</span>
                                  {mainSupplier ? <span className={supplierBadgeClass}>основной</span> : null}
                                </button>
                              )
                            })}
                          </div>
                        ) : null}
                      </td>
                      <td className={tableCell}>
                        <div className="grid justify-items-center gap-1">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => markAvailable(line.id, line.availabilityStatus, selectedSupplierId)}
                              className={cn(
                                'inline-flex h-6 shrink-0 items-center rounded-md border px-2 text-[10px] transition',
                                line.availabilityStatus === 'available' || line.availabilityStatus === 'alternative-selected'
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                                  : 'border-emerald-200 bg-white text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50',
                              )}
                              title="Отметить наличие по ответу поставщика"
                            >
                              В наличии
                            </button>
                            <button
                              type="button"
                              onClick={() => markUnavailable(line.id, line.availabilityStatus)}
                              className={cn(
                                'inline-flex h-6 shrink-0 items-center rounded-md border px-2 text-[10px] transition',
                                line.availabilityStatus === 'not-available'
                                  ? 'border-rose-500 bg-rose-50 text-rose-900'
                                  : 'border-rose-200 bg-white text-rose-800 hover:border-rose-300 hover:bg-rose-50',
                              )}
                              title="Отметить отсутствие по ответу поставщика"
                            >
                              Отсутствует
                            </button>
                          </div>
                          <span
                            className={cn(
                              'text-[10px] leading-3',
                              line.availabilityStatus === 'checking' && 'text-amber-700',
                              line.availabilityStatus === 'not-checked' && 'text-slate-400',
                              (line.availabilityStatus === 'available' || line.availabilityStatus === 'alternative-selected') &&
                                'text-emerald-700',
                              line.availabilityStatus === 'not-available' && 'text-rose-700',
                            )}
                          >
                            {line.availabilityStatus === 'checking'
                              ? 'ожидаем ответ'
                              : line.availabilityStatus === 'not-checked'
                                ? 'не проверено'
                                : line.availabilityStatus === 'not-available'
                                  ? 'нет у поставщика'
                                  : line.availabilityStatus === 'available' || line.availabilityStatus === 'alternative-selected'
                                    ? 'подтверждено'
                                    : 'готово'}
                          </span>
                        </div>
                      </td>
                      <td className={cn(tableCell, 'text-center')}>
                        <button
                          type="button"
                          onClick={() => toggleReplenishmentInOrder(line.id, line.includedInOrder === false)}
                          className={cn(
                            'inline-flex h-6 min-w-[78px] items-center justify-center gap-1 whitespace-nowrap rounded-md border px-2 text-[10px] transition',
                            line.includedInOrder === false
                              ? 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
                          )}
                        >
                          {line.includedInOrder === false ? (
                            'Исключено'
                          ) : (
                            <>
                              <Check size={12} strokeWidth={2.2} />
                              В заказе
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState className="m-3">
            {workflowStage === 'order'
              ? 'Подтвержденных позиций для заказа пока нет. Сначала проверьте наличие и отметьте строки как доступные.'
              : 'Активных строк пополнения нет. Они появятся после частичной выдачи или отметки дефицита в заявке.'}
          </EmptyState>
        )}
        {workflowStage === 'inquiry' ? (
        <div className="shrink-0 border-t border-slate-200 bg-white">
          <div className="grid gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2 xl:grid-cols-[240px_minmax(0,1fr)]">
            <div className="min-w-0">
              <div className="text-xs font-normal uppercase tracking-wide text-slate-500">Контур запроса наличия</div>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-slate-600">
                <span>Основной поставщик:</span>
                <span className="truncate text-slate-950">{clinicMainSupplier?.name ?? supplierName(clinicMainSupplierId)}</span>
                <span className={supplierBadgeClass}>основной</span>
              </div>
            </div>
            <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-4">
              <div className={inquiryStepClass}>
                <FileSpreadsheet size={15} className="shrink-0 text-emerald-700" />
                <span className="min-w-0">1. Excel-запрос по поставщикам</span>
              </div>
              <div className={inquiryStepClass}>
                <Mail size={15} className="shrink-0 text-sky-700" />
                <span className="min-w-0">2. Ручная отправка менеджеру</span>
              </div>
              <div className={inquiryStepClass}>
                <Reply size={15} className="shrink-0 text-amber-700" />
                <span className="min-w-0">3. Ответ: есть / нет</span>
              </div>
              <div className={inquiryStepClass}>
                <ClipboardCheck size={15} className="shrink-0 text-emerald-700" />
                <span className="min-w-0">4. Заказ только подтвержденного</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Excel-запросы:</span>
              {supplierInquiryGroups.length ? (
                supplierInquiryGroups.map((group) => {
                  const active = downloadHintSupplierId === group.supplierId
                  const mainSupplier = group.supplierId === clinicMainSupplierId

                  return (
                    <button
                      key={group.supplierId}
                      type="button"
                      onClick={() => handlePrepareInquiry(group.supplierId, group.rows.map((row) => row.line.id))}
                      className={cn(
                        'group inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-normal shadow-sm transition-all',
                        active
                          ? 'min-w-[252px] justify-center border-emerald-300 bg-emerald-50 text-emerald-900 shadow-[0_8px_18px_rgba(16,185,129,0.12)]'
                          : 'border-emerald-100 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800',
                      )}
                      title={`Скачать таблицу для письма поставщику ${group.supplierName}`}
                    >
                      <span
                        className={cn(
                          'inline-flex size-6 items-center justify-center rounded bg-emerald-600 text-white transition',
                          active ? 'bg-emerald-700' : 'group-hover:bg-emerald-700',
                        )}
                      >
                        <FileSpreadsheet size={15} />
                      </span>
                      {active ? (
                        'Запрос подготовлен, ожидаем ответ'
                      ) : (
                        <span className="min-w-0 text-left">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate">{group.supplierName}</span>
                            {mainSupplier ? <span className={supplierBadgeClass}>основной</span> : null}
                          </span>
                          <span className="block text-[10px] leading-3 text-slate-500">
                            {group.rows.length} поз. в Excel-запрос{group.supplierEmail ? ` · ${group.supplierEmail}` : ''}
                          </span>
                        </span>
                      )}
                    </button>
                  )
                })
              ) : (
                <span className="text-xs text-slate-400">нет строк для выгрузки</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>Из активной заявки: <span className="text-slate-950">{activeRequestLines.length}</span></span>
              <span>Не проверено: <span className="text-slate-950">{inquiryNeededCount}</span></span>
              <span>Ждем ответ: <span className="text-slate-950">{waitingResponseCount}</span></span>
              <span>Готово к заказу: <span className="text-slate-950">{readyCount}</span></span>
            </div>
            <button
              type="button"
              onClick={markAllAvailable}
              disabled={!bulkAvailableLines.length}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-2.5 text-xs font-normal text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:pointer-events-none disabled:opacity-50"
              title="Отметить все непроверенные строки как подтвержденные"
            >
              <Check size={13} />
              Все в наличии
            </button>
            <button
              type="button"
              onClick={() => setWorkflowStage('order')}
              disabled={!readyCount}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-700 bg-emerald-700 px-3 text-sm font-normal text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20 disabled:pointer-events-none disabled:opacity-70"
              title={readyCount ? 'Перейти к финальной проверке заказа' : 'Сначала отметьте наличие по ответу поставщика'}
            >
              Перейти к заказу
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
        ) : (
        <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-normal uppercase tracking-wide text-slate-500">Формирование заказа</div>
              <div className="mt-1 text-sm text-slate-600">
                В заказ попадут только подтвержденные строки. Непроверенные и ожидающие ответа остаются на этапе проверки наличия.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>Подтверждено: <span className="text-slate-950">{readyCount}</span></span>
              <span>Не проверено: <span className="text-slate-950">{inquiryNeededCount}</span></span>
              <span>Ждем ответ: <span className="text-slate-950">{waitingResponseCount}</span></span>
            </div>
            <button
              type="button"
              onClick={handleFormOrders}
              disabled={isFormingOrder || !readyCount}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-700 bg-emerald-700 px-3 text-sm font-normal text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20 disabled:pointer-events-none disabled:opacity-70"
              title={readyCount ? 'Сформировать заказ по подтвержденным строкам' : 'Сначала отметьте наличие по ответу поставщика'}
            >
              {isFormingOrder ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Формирование
                </>
              ) : (
                <>
                  Сформировать заказ
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
        )}
      </Panel>

      {problemLines.length ? (
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-normal text-slate-950">Проблемные позиции</div>
              <div className="text-sm text-slate-500">Не войдут в заказ без ручного решения.</div>
            </div>
            <StatusPill tone="danger">{problemLines.length}</StatusPill>
          </div>
        </Panel>
      ) : null}

      {isFormingOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 text-center shadow-2xl">
            <Loader2 className="mx-auto animate-spin text-emerald-700" size={34} />
            <div className="mt-3 text-xl font-normal text-slate-950">Формирование заказа</div>
            <div className="mt-2 text-sm leading-5 text-slate-500">
              Группируем позиции по поставщикам, подтягиваем количества и цены.
            </div>
          </div>
        </div>
      ) : null}

      {orderReadyModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 text-center shadow-2xl">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Check size={22} strokeWidth={2.4} />
            </div>
            <div className="mt-3 text-xl font-normal text-slate-950">Готово, заказ сформирован</div>
            <div className="mt-2 text-sm leading-5 text-slate-500">
              Заказы по поставщикам добавлены в общий список.
            </div>
            <button
              type="button"
              onClick={() => {
                setOrderReadyModalOpen(false)
                navigate('/orders')
              }}
              className="mt-5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-emerald-700 bg-emerald-700 px-3 text-sm font-normal text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20"
            >
              Перейти к заказам
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      ) : null}
    </PageTransition>
  )
}
