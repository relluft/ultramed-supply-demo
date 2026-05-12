import { AlertTriangle, BarChart3, Boxes, Download, Gauge, PackageCheck, ReceiptText, Truck, WalletCards } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { PageTransition } from '../components/PageTransition'
import { Button, Panel, StatusPill } from '../components/ui'
import { useDemo } from '../context'
import { availabilityLabels, getStockQuantity, orderStatusLabels, requestStatusLabels, statusTone } from '../lib/demoLogic'
import { cn, formatNumber } from '../lib/format'
import type { AvailabilityStatus, RequestStatus, SupplierOrderStatus } from '../types/demo'

const cp1251Chars =
  '\u0402\u0403\u201a\u0453\u201e\u2026\u2020\u2021\u20ac\u2030\u0409\u2039\u040a\u040c\u040b\u040f' +
  '\u0452\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u0000\u2122\u0459\u203a\u045a\u045c\u045b\u045f' +
  '\u00a0\u040e\u045e\u0408\u00a4\u0490\u00a6\u00a7\u0401\u00a9\u0404\u00ab\u00ac\u00ad\u00ae\u0407' +
  '\u00b0\u00b1\u0406\u0456\u0491\u00b5\u00b6\u00b7\u0451\u2116\u0454\u00bb\u0458\u0405\u0455\u0457' +
  'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя'

const cp1251Reverse = new Map<string, number>()
for (let index = 0; index < cp1251Chars.length; index += 1) {
  const char = cp1251Chars[index]
  if (char !== '\u0000') cp1251Reverse.set(char, index + 128)
}

function readable(value?: string | null) {
  if (!value) return ''

  const bytes = Array.from(value, (char) => {
    const code = char.charCodeAt(0)
    return code < 128 ? code : cp1251Reverse.get(char) ?? 63
  })
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes))

  return decoded.includes('�') ? value : decoded
}

function money(value: number) {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(value))} ₽`
}

function percent(value: number, total: number) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

function barWidth(value: number, max: number, min = 3) {
  if (!max) return '0%'
  return `${Math.max(min, Math.round((value / max) * 100))}%`
}

function moneyFromOrder(order: ReturnType<typeof useDemo>['state']['orders'][number]) {
  return order.lines.reduce((sum, line) => sum + (line.price ?? 0) * line.quantity, 0)
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function Section({
  icon,
  title,
  action,
  children,
  className,
}: {
  icon: ReactNode
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Panel className={cn('overflow-hidden p-0', className)}>
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
            {icon}
          </div>
          <div className="truncate text-base font-medium text-slate-950">{title}</div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </Panel>
  )
}

function ExecutiveMetric({
  icon,
  label,
  value,
  caption,
  accent = 'neutral',
}: {
  icon: ReactNode
  label: string
  value: string | number
  caption?: string
  accent?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const colors = {
    neutral: 'border-slate-200 bg-white text-slate-600',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    danger: 'border-rose-200 bg-rose-50 text-rose-700',
    info: 'border-sky-200 bg-sky-50 text-sky-700',
  }[accent]

  return (
    <div className="grid min-h-[112px] grid-rows-[auto_1fr] rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="truncate text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className={cn('grid size-8 shrink-0 place-items-center rounded-md border', colors)}>{icon}</div>
      </div>
      <div className="mt-3 flex min-h-0 flex-col justify-end">
        <div className="truncate text-2xl font-medium leading-none text-slate-950 tabular-nums">{value}</div>
        {caption ? <div className="mt-1 truncate text-xs text-slate-500">{caption}</div> : null}
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  accent = 'neutral',
}: {
  label: string
  value: string | number
  accent?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const colors = {
    neutral: 'text-slate-950',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-rose-700',
    info: 'text-sky-700',
  }[accent]

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="truncate text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cn('mt-1 truncate text-xl font-medium leading-none', colors)}>{value}</div>
    </div>
  )
}

function MiniBar({ value, max, className }: { value: number; max: number; className: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div className={cn('h-full rounded-full', className)} style={{ width: barWidth(value, max) }} />
    </div>
  )
}

function RingMetric({
  label,
  value,
  total,
  tone,
}: {
  label: string
  value: number
  total: number
  tone: 'emerald' | 'amber' | 'rose' | 'sky'
}) {
  const share = percent(value, total)
  const color = {
    emerald: '#059669',
    amber: '#d97706',
    rose: '#e11d48',
    sky: '#0284c7',
  }[tone]

  return (
    <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3">
      <div
        className="grid size-14 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(${color} ${share * 3.6}deg, #e2e8f0 0deg)` }}
      >
        <div className="grid size-10 place-items-center rounded-full bg-white text-xs font-medium text-slate-950">{share}%</div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-950">{label}</div>
        <div className="mt-0.5 text-xs text-slate-500">{formatNumber(value)} из {formatNumber(total)}</div>
      </div>
    </div>
  )
}

export function AnalyticsPage() {
  const {
    state: { catalog, stock, requests, replenishment, orders, suppliers },
  } = useDemo()

  const metrics = useMemo(() => {
    const activeCatalog = catalog.filter((item) => item.active)
    const belowMinimumItems = activeCatalog.filter((item) => getStockQuantity(stock, item.id) < item.minStock)
    const outOfStockItems = activeCatalog.filter((item) => getStockQuantity(stock, item.id) <= 0)
    const nearMinimumItems = activeCatalog.filter((item) => {
      const quantity = getStockQuantity(stock, item.id)
      return quantity >= item.minStock && quantity <= item.minStock + 1
    })
    const enoughItems = activeCatalog.filter((item) => {
      const quantity = getStockQuantity(stock, item.id)
      return quantity > item.minStock + 1
    })
    const activeReplenishment = replenishment.filter((line) => !line.closedAt)
    const waitingReceiptOrders = orders.filter((order) => order.status === 'waiting-receipt' || order.status === 'partial-receipt')
    const acceptedOrders = orders.filter((order) => order.status === 'receipt-accepted')
    const requestLines = requests.flatMap((request) => request.lines)
    const orderLines = orders.flatMap((order) => order.lines)
    const orderedTotal = orders.reduce((sum, order) => sum + moneyFromOrder(order), 0)
    const waitingReceiptTotal = waitingReceiptOrders.reduce((sum, order) => sum + moneyFromOrder(order), 0)
    const stockValue = activeCatalog.reduce((sum, item) => sum + getStockQuantity(stock, item.id) * (item.price ?? 0), 0)
    const stockUnits = activeCatalog.reduce((sum, item) => sum + getStockQuantity(stock, item.id), 0)
    const deficitUnits = belowMinimumItems.reduce((sum, item) => sum + Math.max(item.minStock - getStockQuantity(stock, item.id), 0), 0)
    const deficitValue = belowMinimumItems.reduce(
      (sum, item) => sum + Math.max(item.minStock - getStockQuantity(stock, item.id), 0) * (item.price ?? 0),
      0,
    )
    const desiredShortageUnits = activeCatalog.reduce((sum, item) => sum + Math.max(item.desiredStock - getStockQuantity(stock, item.id), 0), 0)
    const desiredShortageValue = activeCatalog.reduce(
      (sum, item) => sum + Math.max(item.desiredStock - getStockQuantity(stock, item.id), 0) * (item.price ?? 0),
      0,
    )
    const stockHealth = activeCatalog.length ? percent(activeCatalog.length - belowMinimumItems.length, activeCatalog.length) : 100

    return {
      activeCatalog,
      belowMinimumItems,
      outOfStockItems,
      nearMinimumItems,
      enoughItems,
      activeReplenishment,
      waitingReceiptOrders,
      acceptedOrders,
      requestLines,
      orderLines,
      orderedTotal,
      waitingReceiptTotal,
      stockValue,
      stockUnits,
      deficitUnits,
      deficitValue,
      desiredShortageUnits,
      desiredShortageValue,
      stockHealth,
    }
  }, [catalog, orders, replenishment, requests, stock])

  const problemItems = useMemo(
    () =>
      metrics.belowMinimumItems
        .map((item) => {
          const quantity = getStockQuantity(stock, item.id)
          const deficit = Math.max(item.minStock - quantity, 0)

          return {
            item,
            quantity,
            deficit,
            deficitValue: deficit * (item.price ?? 0),
            supplier: suppliers.find((supplier) => supplier.id === item.primarySupplierId),
          }
        })
        .sort((left, right) => right.deficitValue - left.deficitValue || right.deficit - left.deficit)
        .slice(0, 10),
    [metrics.belowMinimumItems, stock, suppliers],
  )

  const categoryStats = useMemo(() => {
    const byCategory = new Map<string, { category: string; total: number; below: number; out: number; deficitValue: number }>()

    metrics.activeCatalog.forEach((item) => {
      const category = readable(item.category)
      const current = byCategory.get(category) ?? { category, total: 0, below: 0, out: 0, deficitValue: 0 }
      const quantity = getStockQuantity(stock, item.id)
      const deficit = Math.max(item.minStock - quantity, 0)

      current.total += 1
      current.deficitValue += deficit * (item.price ?? 0)
      if (quantity < item.minStock) current.below += 1
      if (quantity <= 0) current.out += 1
      byCategory.set(category, current)
    })

    return Array.from(byCategory.values()).sort((left, right) => right.below - left.below || right.deficitValue - left.deficitValue)
  }, [metrics.activeCatalog, stock])
  const maxCategoryBelow = Math.max(...categoryStats.map((item) => item.below), 1)

  const supplierStats = useMemo(
    () =>
      suppliers
        .map((supplier) => {
          const supplierOrders = orders.filter((order) => order.supplierId === supplier.id)
          const total = supplierOrders.reduce((sum, order) => sum + moneyFromOrder(order), 0)
          const quantity = supplierOrders.reduce((sum, order) => sum + order.lines.reduce((lineSum, line) => lineSum + line.quantity, 0), 0)
          const waiting = supplierOrders.filter((order) => order.status === 'waiting-receipt' || order.status === 'partial-receipt').length
          const primaryCatalog = metrics.activeCatalog.filter((item) => item.primarySupplierId === supplier.id)
          const noAlternatives = primaryCatalog.filter((item) => item.alternativeSupplierIds.length === 0 || item.exclusiveSupplierId === supplier.id).length

          return {
            supplier,
            orders: supplierOrders.length,
            total,
            quantity,
            waiting,
            primaryCatalog: primaryCatalog.length,
            noAlternatives,
          }
        })
        .sort((left, right) => right.total - left.total || right.primaryCatalog - left.primaryCatalog),
    [metrics.activeCatalog, orders, suppliers],
  )
  const maxSupplierTotal = Math.max(...supplierStats.map((item) => item.total), 1)
  const maxSupplierCatalog = Math.max(...supplierStats.map((item) => item.primaryCatalog), 1)
  const topSupplier = supplierStats[0]

  const requestStatusStats = useMemo(() => {
    const statuses: RequestStatus[] = ['sent', 'issued', 'partially-issued', 'waiting-replenishment', 'needs-clarification', 'closed']
    return statuses
      .map((status) => ({
        status,
        label: readable(requestStatusLabels[status]),
        count: requests.filter((request) => request.status === status).length,
      }))
      .filter((item) => item.count > 0)
  }, [requests])

  const orderStatusStats = useMemo(() => {
    const statuses: SupplierOrderStatus[] = ['draft', 'availability-checking', 'ready-to-order', 'ordered', 'waiting-receipt', 'partial-receipt', 'receipt-accepted', 'closed']
    return statuses
      .map((status) => ({
        status,
        label: readable(orderStatusLabels[status]),
        count: orders.filter((order) => order.status === status).length,
      }))
      .filter((item) => item.count > 0)
  }, [orders])

  const replenishmentStatusStats = useMemo(() => {
    const statuses: AvailabilityStatus[] = [
      'not-checked',
      'checking',
      'available',
      'partially-available',
      'not-available',
      'alternative-selected',
      'ready-to-order',
      'waiting-receipt',
    ]

    return statuses
      .map((status) => ({
        status,
        label: readable(availabilityLabels[status]),
        count: metrics.activeReplenishment.filter((line) => line.availabilityStatus === status).length,
      }))
      .filter((item) => item.count > 0)
  }, [metrics.activeReplenishment])

  const processRows = [
    { label: 'Заявки', value: requests.length, secondary: `${metrics.requestLines.length} строк`, tone: 'bg-sky-500' },
    { label: 'Пополнение', value: metrics.activeReplenishment.length, secondary: `${metrics.deficitUnits} ед.`, tone: 'bg-amber-500' },
    { label: 'Заказы', value: orders.length, secondary: money(metrics.orderedTotal), tone: 'bg-emerald-600' },
    { label: 'Ожидание прихода', value: metrics.waitingReceiptOrders.length, secondary: money(metrics.waitingReceiptTotal), tone: 'bg-indigo-500' },
    { label: 'Приход принят', value: metrics.acceptedOrders.length, secondary: `${metrics.orderLines.length} строк`, tone: 'bg-teal-600' },
  ]
  const maxProcessValue = Math.max(...processRows.map((row) => row.value), 1)
  const bottleneck = [...processRows].sort((left, right) => right.value - left.value)[0]

  const financialRows = [
    { label: 'Стоимость склада', value: money(metrics.stockValue), share: 100, tone: 'bg-slate-500' },
    { label: 'Заказано поставщикам', value: money(metrics.orderedTotal), share: percent(metrics.orderedTotal, Math.max(metrics.stockValue, metrics.orderedTotal, 1)), tone: 'bg-emerald-600' },
    { label: 'Сумма в ожидании прихода', value: money(metrics.waitingReceiptTotal), share: percent(metrics.waitingReceiptTotal, Math.max(metrics.orderedTotal, 1)), tone: 'bg-indigo-500' },
    { label: 'Дефицит к минимуму', value: money(metrics.deficitValue), share: percent(metrics.deficitValue, Math.max(metrics.stockValue, 1)), tone: 'bg-rose-500' },
    { label: 'Добор до желаемого уровня', value: money(metrics.desiredShortageValue), share: percent(metrics.desiredShortageValue, Math.max(metrics.stockValue + metrics.desiredShortageValue, 1)), tone: 'bg-amber-500' },
  ]

  const supplierConcentration = percent(topSupplier?.total ?? 0, Math.max(metrics.orderedTotal, 1))
  const supplierSingleChannelItems = supplierStats.reduce((sum, item) => sum + item.noAlternatives, 0)
  const supplierAlternativeItems = metrics.activeCatalog.length - supplierSingleChannelItems

  function handleExportReport() {
    const generatedAt = new Date().toLocaleString('ru-RU')
    const summaryRows = [
      ['Индекс склада', `${metrics.stockHealth}%`],
      ['Стоимость склада', money(metrics.stockValue)],
      ['Заказано поставщикам', money(metrics.orderedTotal)],
      ['Сумма в ожидании прихода', money(metrics.waitingReceiptTotal)],
      ['Дефицит к минимуму', money(metrics.deficitValue)],
      ['Добор до желаемого уровня', money(metrics.desiredShortageValue)],
      ['Дефицитных позиций', formatNumber(problemItems.length)],
      ['Поставщиков в заказах', formatNumber(supplierStats.filter((item) => item.orders > 0).length)],
      ['Топ поставщик', readable(topSupplier?.supplier.name) || '-'],
      ['Доля топ-1 поставщика', `${supplierConcentration}%`],
    ]
    const categoryRows = categoryStats.map((item) => [
      item.category,
      formatNumber(item.total),
      formatNumber(item.below),
      formatNumber(item.out),
      money(item.deficitValue),
    ])
    const deficitRows = problemItems.map((row) => [
      readable(row.item.shortName || row.item.fullName),
      readable(row.supplier?.name) || '-',
      formatNumber(row.quantity),
      formatNumber(row.deficit),
      money(row.deficitValue),
    ])
    const supplierRows = supplierStats.map((item) => [
      readable(item.supplier.name),
      money(item.total),
      `${percent(item.total, Math.max(metrics.orderedTotal, 1))}%`,
      formatNumber(item.primaryCatalog),
      formatNumber(item.noAlternatives),
      formatNumber(item.waiting),
    ])

    const table = (title: string, headings: string[], rows: Array<Array<string | number>>) => `
      <section>
        <h2>${escapeHtml(title)}</h2>
        <table>
          <thead><tr>${headings.map((heading) => `<th>${escapeHtml(heading)}</th>`).join('')}</tr></thead>
          <tbody>${rows
            .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
            .join('')}</tbody>
        </table>
      </section>
    `

    const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>UltraMed Supply - аналитический отчет</title>
  <style>
    body { margin: 0; padding: 32px; color: #172033; background: #f4f7f8; font-family: Inter, Arial, sans-serif; }
    main { max-width: 1120px; margin: 0 auto; border: 1px solid #dce4ea; border-radius: 14px; background: #fff; overflow: hidden; }
    header { padding: 24px 28px; border-bottom: 1px solid #e2e8f0; }
    .brand { color: #0f766e; font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 8px 0 4px; font-size: 28px; line-height: 1.15; }
    .date { color: #64748b; font-size: 13px; }
    section { padding: 22px 28px; border-bottom: 1px solid #e2e8f0; }
    section:last-child { border-bottom: 0; }
    h2 { margin: 0 0 12px; font-size: 17px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f8fafc; color: #64748b; font-size: 11px; text-align: left; text-transform: uppercase; letter-spacing: .04em; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 9px 10px; vertical-align: top; }
    td { color: #263244; }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="brand">UltraMed Supply</div>
      <h1>Аналитический отчет по снабжению</h1>
      <div class="date">Сформировано: ${escapeHtml(generatedAt)}</div>
    </header>
    ${table('Ключевые показатели', ['Показатель', 'Значение'], summaryRows)}
    ${table('Категории склада', ['Категория', 'Позиций', 'Ниже мин.', 'Нет остатка', 'Оценка дефицита'], categoryRows)}
    ${table('Дефицитные позиции', ['Позиция', 'Поставщик', 'Остаток', 'Дефицит', 'Оценка'], deficitRows)}
    ${table('Поставщики', ['Поставщик', 'Сумма заказов', 'Доля', 'Позиций каталога', 'Без альтернатив', 'Ожидание прихода'], supplierRows)}
  </main>
</body>
</html>`
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `ultramed-supply-report-${new Date().toISOString().slice(0, 10)}.html`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <PageTransition className="min-h-full">
      <div className="grid gap-4 pb-4">
        <Panel className="overflow-hidden p-0">
          <div className="flex min-h-14 flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-medium text-slate-950">Аналитика склада клиники</h1>
              <div className="mt-0.5 text-xs uppercase tracking-wide text-slate-500">Финансы · поставщики · процесс · складская политика</div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <StatusPill tone={metrics.stockHealth >= 85 ? 'success' : metrics.stockHealth >= 70 ? 'warning' : 'danger'}>
                Индекс склада {metrics.stockHealth}%
              </StatusPill>
              <Button variant="secondary" className="min-h-8 px-2.5 py-1.5 text-xs" onClick={handleExportReport}>
                <Download size={15} />
                Экспорт отчета
              </Button>
            </div>
          </div>
          <div className="grid gap-2 bg-slate-50/75 p-3 sm:grid-cols-2 xl:grid-cols-5">
            <ExecutiveMetric
              icon={<Gauge size={17} />}
              label="Индекс склада"
              value={`${metrics.stockHealth}%`}
              caption={`${formatNumber(metrics.activeCatalog.length - metrics.belowMinimumItems.length)} из ${formatNumber(metrics.activeCatalog.length)} позиций в норме`}
              accent={metrics.stockHealth >= 85 ? 'success' : metrics.stockHealth >= 70 ? 'warning' : 'danger'}
            />
            <ExecutiveMetric
              icon={<WalletCards size={17} />}
              label="Стоимость склада"
              value={money(metrics.stockValue)}
              caption={`${formatNumber(metrics.stockUnits)} единиц на складе`}
            />
            <ExecutiveMetric
              icon={<AlertTriangle size={17} />}
              label="Дефицит к минимуму"
              value={money(metrics.deficitValue)}
              caption={`${formatNumber(metrics.deficitUnits)} ед. до минимума`}
              accent={metrics.deficitValue ? 'danger' : 'success'}
            />
            <ExecutiveMetric
              icon={<PackageCheck size={17} />}
              label="Ожидается приход"
              value={money(metrics.waitingReceiptTotal)}
              caption={`${formatNumber(metrics.waitingReceiptOrders.length)} заказов в ожидании`}
              accent={metrics.waitingReceiptTotal ? 'info' : 'success'}
            />
            <ExecutiveMetric
              icon={<Boxes size={17} />}
              label="Добор до желаемого"
              value={money(metrics.desiredShortageValue)}
              caption={`${formatNumber(metrics.desiredShortageUnits)} ед. до целевого уровня`}
              accent={metrics.desiredShortageValue ? 'warning' : 'success'}
            />
          </div>
        </Panel>

        <Section icon={<WalletCards size={18} />} title="Финансовая оценка запасов">
          <div className="grid gap-2 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Стоимость склада" value={money(metrics.stockValue)} />
            <Metric label="Заказано поставщикам" value={money(metrics.orderedTotal)} />
            <Metric label="Сумма в ожидании" value={money(metrics.waitingReceiptTotal)} />
            <Metric label="Дефицит к минимуму" value={money(metrics.deficitValue)} accent={metrics.deficitValue ? 'danger' : 'success'} />
            <Metric label="Добор до желаемого" value={money(metrics.desiredShortageValue)} accent={metrics.desiredShortageValue ? 'warning' : 'success'} />
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-3">
              {financialRows.map((row) => (
                <div key={row.label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-slate-700">{row.label}</span>
                    <span className="shrink-0 font-medium text-slate-950">{row.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full', row.tone)} style={{ width: `${Math.max(3, row.share)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-2">
              <Metric label="Доля дефицита от склада" value={`${percent(metrics.deficitValue, Math.max(metrics.stockValue, 1))}%`} accent={metrics.deficitValue ? 'warning' : 'success'} />
              <Metric label="Ед. к минимуму" value={formatNumber(metrics.deficitUnits)} />
              <Metric label="Ед. до желаемого" value={formatNumber(metrics.desiredShortageUnits)} />
            </div>
          </div>
        </Section>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Section icon={<Gauge size={18} />} title="Качество складской политики">
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
              <RingMetric label="С запасом" value={metrics.enoughItems.length} total={metrics.activeCatalog.length} tone="emerald" />
              <RingMetric label="Близко к минимуму" value={metrics.nearMinimumItems.length} total={metrics.activeCatalog.length} tone="amber" />
              <RingMetric label="Ниже минимума" value={metrics.belowMinimumItems.length} total={metrics.activeCatalog.length} tone="rose" />
              <RingMetric label="Нет остатка" value={metrics.outOfStockItems.length} total={metrics.activeCatalog.length} tone="sky" />
            </div>
            <div className="border-t border-slate-200 px-4 py-3">
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="bg-emerald-600" style={{ width: `${percent(metrics.enoughItems.length, metrics.activeCatalog.length)}%` }} />
                <div className="bg-amber-500" style={{ width: `${percent(metrics.nearMinimumItems.length, metrics.activeCatalog.length)}%` }} />
                <div className="bg-rose-500" style={{ width: `${percent(Math.max(metrics.belowMinimumItems.length - metrics.outOfStockItems.length, 0), metrics.activeCatalog.length)}%` }} />
                <div className="bg-slate-800" style={{ width: `${percent(metrics.outOfStockItems.length, metrics.activeCatalog.length)}%` }} />
              </div>
            </div>
            <div className="overflow-x-auto border-t border-slate-200">
              <table className="w-full min-w-[760px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    {['Категория', 'Позиций', 'Ниже мин.', 'Нет остатка', 'Оценка дефицита', 'Риск'].map((heading) => (
                      <th key={heading} className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categoryStats.map((item) => (
                    <tr
                      key={item.category}
                      className={cn(
                        'transition hover:bg-slate-100/70',
                        item.out ? 'bg-rose-50/70' : item.below ? 'bg-amber-50/60' : 'bg-white',
                      )}
                    >
                      <td className="border-b border-slate-100 px-3 py-2 text-sm font-medium text-slate-950">{item.category}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">{formatNumber(item.total)}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">{formatNumber(item.below)}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">{formatNumber(item.out)}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-sm font-medium text-slate-950">{money(item.deficitValue)}</td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <MiniBar value={item.below} max={maxCategoryBelow} className={item.below ? 'bg-amber-500' : 'bg-emerald-500'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section icon={<PackageCheck size={18} />} title="Дефицитные позиции" action={<StatusPill tone={problemItems.length ? 'danger' : 'success'}>{problemItems.length}</StatusPill>}>
            <div className="grid gap-3 p-4">
              {problemItems.length ? (
                problemItems.map((row) => (
                  <div key={row.item.id}>
                    <div className="mb-2 flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-950">{readable(row.item.shortName || row.item.fullName)}</div>
                        <div className="text-xs text-slate-500">{readable(row.supplier?.name) || '-'}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-medium text-rose-700">{formatNumber(row.deficit)}</div>
                        <div className="text-xs text-slate-500">{money(row.deficitValue)}</div>
                      </div>
                    </div>
                    <MiniBar value={row.deficitValue || row.deficit} max={Math.max(...problemItems.map((item) => item.deficitValue || item.deficit), 1)} className="bg-rose-500" />
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">Критичных позиций нет</div>
              )}
            </div>
          </Section>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Section icon={<BarChart3 size={18} />} title="Контроль процесса">
            <div className="grid gap-4 p-4">
              {processRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[132px_minmax(0,1fr)_88px] items-center gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800">{row.label}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{row.secondary}</div>
                  </div>
                  <MiniBar value={row.value} max={maxProcessValue} className={row.tone} />
                  <div className="text-right text-lg font-medium text-slate-950">{formatNumber(row.value)}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-2 border-t border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
              <Metric label="Максимальный участок" value={bottleneck.label} />
              <Metric label="Открыто пополнение" value={formatNumber(metrics.activeReplenishment.length)} accent={metrics.activeReplenishment.length ? 'warning' : 'success'} />
              <Metric label="Заказов в ожидании" value={formatNumber(metrics.waitingReceiptOrders.length)} accent={metrics.waitingReceiptOrders.length ? 'info' : 'success'} />
            </div>
          </Section>

          <Section icon={<ReceiptText size={18} />} title="Статусы процесса">
            <div className="grid gap-3 p-4">
              {[
                { title: 'Заявки', rows: requestStatusStats },
                { title: 'Заказы', rows: orderStatusStats },
                { title: 'Пополнение', rows: replenishmentStatusStats },
              ].map((group, index) => (
                <div key={group.title} className={cn(index > 0 && 'border-t border-slate-200 pt-3')}>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{group.title}</div>
                  <div className="grid gap-2">
                    {group.rows.length ? (
                      group.rows.map((item) => (
                        <div key={`${group.title}-${item.status}`} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                          <StatusPill tone={statusTone(item.status)}>{item.label}</StatusPill>
                          <span className="text-base font-medium text-slate-950">{formatNumber(item.count)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">Нет данных</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <Section
          icon={<Truck size={18} />}
          title="Зависимость от поставщиков"
          action={<StatusPill tone={supplierConcentration >= 70 ? 'warning' : 'neutral'}>Топ-1: {supplierConcentration}% заказов</StatusPill>}
        >
          <div className="grid gap-2 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Поставщиков в заказах" value={formatNumber(supplierStats.filter((item) => item.orders > 0).length)} />
            <Metric label="Топ поставщик" value={readable(topSupplier?.supplier.name) || '-'} />
            <Metric label="Без альтернатив" value={formatNumber(supplierSingleChannelItems)} accent={supplierSingleChannelItems ? 'warning' : 'success'} />
            <Metric label="С альтернативами" value={formatNumber(supplierAlternativeItems)} accent="success" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-separate border-spacing-0">
              <thead>
                <tr>
                  {['Поставщик', 'Сумма заказов', 'Доля заказов', 'Позиций каталога', 'Без альтернатив', 'Ожидание прихода'].map((heading) => (
                    <th key={heading} className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {supplierStats.map((item) => (
                  <tr
                    key={item.supplier.id}
                    className={cn(
                      'transition hover:bg-slate-100/70',
                      item.noAlternatives ? 'bg-amber-50/55' : item.waiting ? 'bg-sky-50/55' : 'bg-white',
                    )}
                  >
                    <td className="border-b border-slate-100 px-3 py-2">
                      <div className="text-sm font-medium text-slate-950">{readable(item.supplier.name)}</div>
                      <div className="text-xs text-slate-500">{readable(item.supplier.role)}</div>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 text-sm font-medium text-slate-950">{money(item.total)}</td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      <div className="grid grid-cols-[minmax(0,1fr)_42px] items-center gap-2">
                        <MiniBar value={item.total} max={maxSupplierTotal} className="bg-emerald-600" />
                        <span className="text-right text-xs text-slate-500">{percent(item.total, Math.max(metrics.orderedTotal, 1))}%</span>
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      <div className="grid grid-cols-[minmax(0,1fr)_42px] items-center gap-2">
                        <MiniBar value={item.primaryCatalog} max={maxSupplierCatalog} className="bg-sky-500" />
                        <span className="text-right text-xs text-slate-500">{formatNumber(item.primaryCatalog)}</span>
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">{formatNumber(item.noAlternatives)}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">{formatNumber(item.waiting)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </PageTransition>
  )
}
