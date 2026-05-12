import { ArrowRight, Check, ChevronDown, ClipboardCheck, Download, FileSpreadsheet, Loader2, Mail, PackagePlus, Reply } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandedLoadingModal } from '../components/BrandedLoadingModal'
import { PageTransition } from '../components/PageTransition'
import { EmptyState, Panel, SectionHeader, StatusPill } from '../components/ui'
import { useDemo } from '../context'
import {
  clinicBackupSupplierId,
  clinicMainSupplierId,
  replenishmentSourceLabels,
} from '../lib/demoLogic'
import { cn, formatDateTime, formatMoney, formatNumber } from '../lib/format'

const headerCell =
  'sticky top-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-[11px] font-normal uppercase tracking-wide text-slate-500 last:border-r-0'
const tableCell = 'border-b border-r border-slate-100 px-2 py-1 align-middle text-[11px] leading-3 text-slate-700 last:border-r-0'
const supplierBadgeClass =
  'inline-flex shrink-0 items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-normal uppercase tracking-wide text-emerald-800'
const inquiryStepClass =
  'flex min-w-[160px] flex-1 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700'
const replenishmentSupplierIds = [clinicMainSupplierId, clinicBackupSupplierId]
const replenishmentDisplayLimit = 20
const vatRate = 0.2

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

function fallbackPriceWithVat(item?: { id: string; category: string; price?: number }) {
  if (!item) return 0
  if (item.price && item.price > 0) return item.price

  if (item.id.includes('primer')) return 2860
  if (item.id.includes('wax')) return 1240
  if (item.id.includes('archwires') || item.id.includes('niti')) return 3920
  if (item.id.includes('elastics') || item.id.includes('ligatures') || item.id.includes('chain')) return 980
  if (item.id.includes('hooks')) return 1760

  const categoryPrice: Record<string, number> = {
    Анестезия: 1680,
    Гигиена: 920,
    Дезинфекция: 1460,
    Изоляция: 1320,
    Ортодонтия: 2140,
    Ортопедия: 2480,
    Расходники: 760,
    Терапия: 1180,
    Хирургия: 1820,
  }

  return categoryPrice[item.category] ?? 990
}

export function ReplenishmentPage() {
  const navigate = useNavigate()
  const formingTimerRef = useRef<number | null>(null)
  const [isFormingOrder, setIsFormingOrder] = useState(false)
  const [orderReadyModalOpen, setOrderReadyModalOpen] = useState(false)
  const [downloadHintSupplierId, setDownloadHintSupplierId] = useState<string | null>(null)
  const [supplierAttentionByLineId, setSupplierAttentionByLineId] = useState<Record<string, boolean>>({})
  const [openSupplierLineId, setOpenSupplierLineId] = useState<string | null>(null)
  const [workflowStage, setWorkflowStage] = useState<'inquiry' | 'order'>('inquiry')
  const [selectedOperationKey, setSelectedOperationKey] = useState<string | null>('stock-deficit')
  const {
    state: { replenishment, catalog, suppliers, requests, activeRequestId },
    updateReplenishmentAvailability,
    prepareReplenishmentInquiry,
    selectReplenishmentSupplier,
    updateReplenishmentQuantity,
    toggleReplenishmentInOrder,
    formSupplierOrders,
  } = useDemo()
  const clinicMainSupplier = suppliers.find((supplier) => supplier.id === clinicMainSupplierId)
  const room105RequestIds = useMemo(
    () => new Set(requests.filter((request) => request.roomId === 'room-105').map((request) => request.id)),
    [requests],
  )
  const allActiveLines = useMemo(
    () =>
      replenishment
        .filter(
          (line) =>
            !line.closedAt &&
            (line.currentStock < line.minStock || line.source === 'not-enough' || line.source === 'manual'),
        )
        .sort((left, right) => {
          const leftNoStock = left.currentStock <= 0 ? 0 : 1
          const rightNoStock = right.currentStock <= 0 ? 0 : 1
          const leftRequest = left.requestId && room105RequestIds.has(left.requestId) ? 0 : 1
          const rightRequest = right.requestId && room105RequestIds.has(right.requestId) ? 0 : 1
          const leftActive = left.requestId === activeRequestId ? 0 : 1
          const rightActive = right.requestId === activeRequestId ? 0 : 1
          return (
            leftNoStock - rightNoStock ||
            leftRequest - rightRequest ||
            leftActive - rightActive ||
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
          )
        })
        .slice(0, replenishmentDisplayLimit),
    [activeRequestId, replenishment, room105RequestIds],
  )
  const replenishmentOperations = useMemo(() => {
    if (!allActiveLines.length) return []

    const outOfStockCount = allActiveLines.filter((line) => line.currentStock <= 0).length
    const belowMinimumCount = allActiveLines.length - outOfStockCount
    const createdAt = allActiveLines.reduce(
      (latest, line) => (new Date(line.createdAt).getTime() > new Date(latest).getTime() ? line.createdAt : latest),
      allActiveLines[0].createdAt,
    )

    return [
      {
        key: 'stock-deficit',
        title: 'Складской список пополнения',
        subtitle: `${outOfStockCount} отсутствует, ${belowMinimumCount} ниже минимума. Строки собраны по остаткам, без разделения на заявки кабинетов.`,
        sourceLabel: 'Контроль остатков',
        createdAt,
        lines: allActiveLines,
      },
    ]
  }, [allActiveLines])
  const selectedOperation = replenishmentOperations.find((operation) => operation.key === selectedOperationKey)
  const selectedOperationRequestId = selectedOperationKey?.startsWith('request:')
    ? selectedOperationKey.replace('request:', '')
    : undefined
  const activeLines = useMemo(
    () => {
      if (!selectedOperationKey) return []

      if (selectedOperationKey === 'stock-deficit') return allActiveLines

      if (selectedOperationRequestId) {
        return allActiveLines.filter((line) => line.requestId === selectedOperationRequestId)
      }

      return allActiveLines.filter((line) => (line.requestId ? `request:${line.requestId}` : 'manual') === selectedOperationKey)
    },
    [allActiveLines, selectedOperationKey, selectedOperationRequestId],
  )
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

  useEffect(() => {
    if (selectedOperationKey && !selectedOperation) {
      setSelectedOperationKey(null)
      setWorkflowStage('inquiry')
    }
  }, [selectedOperation, selectedOperationKey])

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
      formSupplierOrders(orderReadyLines.map((line) => line.id))
      setIsFormingOrder(false)
      setOrderReadyModalOpen(true)
    }, 2000)
  }

  function handleDownloadSupplierInquiryExcel(group: (typeof supplierInquiryGroups)[number]) {
    const rows = group.rows
      .map((row) => ({
        supplier: group.supplierName,
        email: group.supplierEmail ?? '',
        itemName: row.item.fullName,
        category: row.item.category,
        quantity: row.quantity,
        unit: row.item.unit,
        packageLabel: row.item.packageLabel,
        reason: replenishmentSourceLabels[row.line.source],
        currentStock: row.line.currentStock,
        minStock: row.line.minStock,
      }))
      .sort((left, right) => left.supplier.localeCompare(right.supplier, 'ru') || left.itemName.localeCompare(right.itemName, 'ru'))

    if (!rows.length) return

    const inquiryDate = new Intl.DateTimeFormat('ru-RU').format(new Date())
    const fileDate = new Date().toISOString().slice(0, 10)
    const htmlRows = rows
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.supplier)}</td>
            <td>${escapeHtml(row.email)}</td>
            <td>${escapeHtml(row.itemName)}</td>
            <td>${escapeHtml(row.category)}</td>
            <td>${escapeHtml(row.quantity)}</td>
            <td>${escapeHtml(row.unit)}</td>
            <td>${escapeHtml(row.packageLabel)}</td>
            <td>${escapeHtml(row.reason)}</td>
            <td>${escapeHtml(row.currentStock)}</td>
            <td>${escapeHtml(row.minStock)}</td>
            <td></td>
            <td></td>
          </tr>
        `,
      )
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
            th { background: #eff6ff; color: #1e3a8a; font-weight: 700; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px; vertical-align: top; }
          </style>
        </head>
        <body>
          <h1>Запрос наличия поставщику ${escapeHtml(group.supplierName)}</h1>
          <p class="meta">УльтраМед Снабжение · ${escapeHtml(inquiryDate)} · позиций: ${rows.length}</p>
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Поставщик</th>
                <th>Email</th>
                <th>Наименование</th>
                <th>Раздел</th>
                <th>Количество</th>
                <th>Ед.</th>
                <th>Упаковка</th>
                <th>Причина</th>
                <th>Остаток</th>
                <th>Мин.</th>
                <th>Есть в наличии</th>
                <th>Комментарий поставщика</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>
        </body>
      </html>
    `

    downloadExcelFile(`ultramed-availability-${group.supplierId}-${fileDate}.xls`, html)
    prepareReplenishmentInquiry(group.supplierId, group.rows.map((row) => row.line.id))
    setDownloadHintSupplierId(group.supplierId)
  }

  function handleDownloadOrderExcel() {
    if (!orderReadyLines.length) return

    const orderDate = new Intl.DateTimeFormat('ru-RU').format(new Date())
    const fileDate = new Date().toISOString().slice(0, 10)
    const rows = orderReadyLines
      .map((line, index) => {
        const item = catalog.find((candidate) => candidate.id === line.itemId)
        const quantity = line.recommendedQuantity > 0
          ? line.recommendedQuantity
          : Math.max(line.desiredStock - line.currentStock, line.minStock - line.currentStock, 1)
        const priceWithVat = fallbackPriceWithVat(item)

        return {
          index: index + 1,
          supplier: supplierName(line.selectedSupplierId),
          itemName: item?.fullName ?? 'Позиция',
          category: item?.category ?? '',
          quantity,
          unit: item?.unit ?? '',
          packageLabel: item?.packageLabel ?? '',
          reason: replenishmentSourceLabels[line.source],
          currentStock: line.currentStock,
          minStock: line.minStock,
          priceWithVat,
          vat: priceWithVat ? priceWithVat - priceWithVat / (1 + vatRate) : 0,
          totalWithVat: priceWithVat * quantity,
        }
      })
      .sort((left, right) => left.supplier.localeCompare(right.supplier, 'ru') || left.itemName.localeCompare(right.itemName, 'ru'))

    const htmlRows = rows
      .map(
        (row) => `
          <tr>
            <td>${row.index}</td>
            <td>${escapeHtml(row.supplier)}</td>
            <td>${escapeHtml(row.itemName)}</td>
            <td>${escapeHtml(row.category)}</td>
            <td>${escapeHtml(row.quantity)}</td>
            <td>${escapeHtml(row.unit)}</td>
            <td>${escapeHtml(row.packageLabel)}</td>
            <td>${escapeHtml(row.reason)}</td>
            <td>${escapeHtml(row.priceWithVat)}</td>
            <td>${escapeHtml(row.vat)}</td>
            <td>${escapeHtml(row.totalWithVat)}</td>
            <td>${escapeHtml(row.currentStock)}</td>
            <td>${escapeHtml(row.minStock)}</td>
          </tr>
        `,
      )
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
          <h1>Заказ поставщикам</h1>
          <p class="meta">УльтраМед Снабжение · ${escapeHtml(orderDate)} · позиций: ${rows.length}</p>
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Поставщик</th>
                <th>Наименование</th>
                <th>Раздел</th>
                <th>Количество</th>
                <th>Ед.</th>
                <th>Упаковка</th>
                <th>Причина</th>
                <th>Цена с НДС</th>
                <th>НДС за ед.</th>
                <th>Сумма с НДС</th>
                <th>Остаток</th>
                <th>Мин.</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>
        </body>
      </html>
    `

    downloadExcelFile(`ultramed-order-${fileDate}.xls`, html)
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
    <PageTransition className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
      <Panel>
        <SectionHeader
          title="Пополнение"
          subtitle={
            selectedOperation
              ? `${selectedOperation.sourceLabel}: ${selectedOperation.subtitle}`
              : 'Активных позиций ниже минимума или без остатка пока нет.'
          }
        />
        {selectedOperation ? (
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
        ) : null}
      </Panel>

      {!selectedOperation ? (
        <Panel className="overflow-hidden p-0">
          {replenishmentOperations.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className={headerCell}>Список</th>
                    <th className={headerCell}>Основание</th>
                    <th className={headerCell}>Позиций к пополнению</th>
                    <th className={headerCell}>Не проверено</th>
                    <th className={headerCell}>Готово к заказу</th>
                    <th className={headerCell}>Дата</th>
                    <th className={headerCell}>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {replenishmentOperations.map((operation, index) => {
                    const unchecked = operation.lines.filter((line) => line.availabilityStatus === 'not-checked').length
                    const ready = operation.lines.filter((line) =>
                      line.includedInOrder !== false &&
                      ['available', 'partially-available', 'alternative-selected', 'ready-to-order'].includes(line.availabilityStatus),
                    ).length
                    return (
                      <tr
                        key={operation.key}
                        className={cn('cursor-pointer transition hover:bg-slate-100/70', index % 2 ? 'bg-white' : 'bg-slate-50/35')}
                        onClick={() => setSelectedOperationKey(operation.key)}
                      >
                        <td className={tableCell}>
                          <div className="flex min-w-0 items-start gap-2">
                            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                              <PackagePlus size={17} />
                            </span>
                            <div className="min-w-0">
                              <div className="font-normal text-slate-950">{operation.title}</div>
                              <div className="mt-0.5 truncate text-xs text-slate-500">{operation.subtitle}</div>
                            </div>
                          </div>
                        </td>
                        <td className={tableCell}>{operation.sourceLabel}</td>
                        <td className={cn(tableCell, 'text-center text-slate-950')}>
                          {operation.lines.length}
                        </td>
                        <td className={cn(tableCell, 'text-center')}>{unchecked}</td>
                        <td className={cn(tableCell, 'text-center')}>{ready}</td>
                        <td className={tableCell}>{formatDateTime(operation.createdAt)}</td>
                        <td className={cn(tableCell, 'text-center')}>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setSelectedOperationKey(operation.key)
                            }}
                            className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-emerald-700 bg-emerald-700 px-3 text-sm text-white transition hover:bg-emerald-800"
                          >
                            Открыть
                            <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState className="m-3">Активных позиций для пополнения нет. Они появятся, когда остаток станет ниже минимума или позиция закончится на складе.</EmptyState>
          )}
        </Panel>
      ) : (
      <Panel className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden p-0">
        {tableLines.length ? (
          <div className="h-full overflow-auto">
            <table className="w-full min-w-[1580px] border-separate border-spacing-0">
              <colgroup>
                <col className="w-[3%]" />
                <col className="w-[24%]" />
                <col className="w-[4%]" />
                <col className="w-[4%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
                <col className="w-[7%]" />
                <col className="w-[8%]" />
                <col className="w-[16%]" />
                <col className="w-[7%]" />
                <col className="w-[5%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className={headerCell}>№</th>
                  <th className={headerCell}>Позиция</th>
                  <th className={headerCell}>Остаток</th>
                  <th className={headerCell}>Мин.</th>
                  <th className={headerCell}>Закупка</th>
                  <th className={headerCell}>Цена с НДС</th>
                  <th className={headerCell}>НДС за ед.</th>
                  <th className={headerCell}>Сумма с НДС</th>
                  <th className={headerCell}>Поставщик</th>
                  <th className={headerCell}>Наличие</th>
                  <th className={headerCell}>В заказ</th>
                </tr>
              </thead>
              <tbody>
                {tableLines.map((line, index) => {
                  const item = catalog.find((candidate) => candidate.id === line.itemId)
                  const allowedSuppliers = allowedSupplierIdsForItem(item)
                  const noStock = line.currentStock <= 0
                  const belowMinimum = line.currentStock < line.minStock
                  const minPurchaseQuantity = Math.max(line.minStock - line.currentStock, 0)
                  const selectedSupplierId =
                    !allowedSuppliers.includes(line.selectedSupplierId)
                      ? clinicMainSupplierId
                      : line.selectedSupplierId
                  const selectedMainSupplier = selectedSupplierId === clinicMainSupplierId
                  const purchaseQuantity = line.recommendedQuantity > 0
                    ? line.recommendedQuantity
                    : Math.max(line.desiredStock - line.currentStock, line.minStock - line.currentStock, 1)
                  const priceWithVat = fallbackPriceWithVat(item)
                  const vatPerUnit = priceWithVat ? priceWithVat - priceWithVat / (1 + vatRate) : 0
                  const totalWithVat = priceWithVat * purchaseQuantity

                  return (
                    <tr
                      key={line.id}
                      className={cn(
                        'transition hover:bg-slate-100/70',
                        noStock && 'bg-rose-50/90 hover:bg-rose-100/70',
                        !noStock && belowMinimum && 'bg-amber-50/80 hover:bg-amber-100/70',
                        !noStock && !belowMinimum && (index % 2 ? 'bg-white' : 'bg-slate-50/35'),
                      )}
                    >
                      <td className={cn(tableCell, 'text-center text-xs text-slate-500')}>{index + 1}</td>
                      <td className={tableCell}>
                        <div className="whitespace-normal break-words text-slate-950">{item?.fullName ?? 'Позиция'}</div>
                        <div className="mt-0.5 text-[10px] leading-3 text-slate-500">
                          {item?.category}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1 text-[10px] leading-3">
                          {noStock ? <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-800">нет на складе</span> : null}
                          {belowMinimum && !noStock ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">ниже минимума</span> : null}
                        </div>
                      </td>
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
                      <td className={cn(tableCell, 'whitespace-nowrap text-right')}>{priceWithVat ? formatMoney(priceWithVat) : '-'}</td>
                      <td className={cn(tableCell, 'whitespace-nowrap text-right')}>{vatPerUnit ? formatMoney(vatPerUnit) : '-'}</td>
                      <td className={cn(tableCell, 'whitespace-nowrap text-right text-slate-950')}>{totalWithVat ? formatMoney(totalWithVat) : '-'}</td>
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
              : 'Активных строк пополнения нет. Они появятся по складскому дефициту или отсутствию товара.'}
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
              {supplierInquiryGroups.length ? (
                supplierInquiryGroups.map((group) => {
                  const active = downloadHintSupplierId === group.supplierId
                  const mainSupplier = group.supplierId === clinicMainSupplierId
                  const hasMultipleSuppliers = supplierInquiryGroups.length > 1

                  return (
                    <button
                      key={group.supplierId}
                      type="button"
                      onClick={() => handleDownloadSupplierInquiryExcel(group)}
                      className={cn(
                        'group inline-flex min-h-11 max-w-full items-center gap-2 rounded-md border border-sky-600 bg-[linear-gradient(135deg,#0284c7_0%,#0ea5e9_48%,#38bdf8_100%)] px-4 text-sm font-normal text-white shadow-[0_12px_28px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(14,165,233,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700/25',
                        active
                          ? 'ring-2 ring-emerald-400/45'
                          : '',
                      )}
                      title={`Скачать Excel-файл запроса наличия для ${group.supplierName}`}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded bg-white/18">
                        <FileSpreadsheet size={17} />
                      </span>
                      <span className="grid min-w-0 text-left leading-tight">
                        <span className="truncate">
                          {hasMultipleSuppliers ? `Скачать Excel: ${group.supplierName}` : 'Скачать Excel наличия'}
                        </span>
                        <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-sky-50">
                          {!hasMultipleSuppliers ? <span className="truncate">{group.supplierName}</span> : null}
                          {mainSupplier ? <span className="rounded bg-white/18 px-1.5 py-0.5 text-[9px] uppercase tracking-wide">основной</span> : null}
                          <span>{group.rows.length} позиций</span>
                          {active ? <span>запрос подготовлен</span> : null}
                        </span>
                      </span>
                      <Download size={16} className="shrink-0" />
                    </button>
                  )
                })
              ) : (
                <span className="text-xs text-slate-400">нет строк для выгрузки</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>В пополнении: <span className="text-slate-950">{activeLines.length}</span></span>
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadOrderExcel}
                disabled={!readyCount}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-emerald-600 bg-[linear-gradient(135deg,#059669_0%,#10b981_48%,#34d399_100%)] px-4 text-sm font-normal text-white shadow-[0_12px_28px_rgba(5,150,105,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(5,150,105,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/25 disabled:pointer-events-none disabled:opacity-60"
                title={readyCount ? 'Скачать Excel-файл заказа по подтвержденным строкам' : 'Сначала отметьте наличие по ответу поставщика'}
              >
                <span className="flex size-7 items-center justify-center rounded bg-white/18">
                  <FileSpreadsheet size={17} />
                </span>
                <span className="grid text-left leading-tight">
                  <span>Скачать Excel заказа</span>
                  <span className="text-[11px] text-emerald-50">{readyCount} позиций</span>
                </span>
                <Download size={16} />
              </button>
              <button
                type="button"
                onClick={handleFormOrders}
                disabled={isFormingOrder || !readyCount}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/20 disabled:pointer-events-none disabled:opacity-70"
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
        </div>
        )}
      </Panel>
      )}

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
        <BrandedLoadingModal title="Формируем заказ поставщикам" />
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
