import { AlertTriangle, BarChart3, Boxes, Download, Gauge, PackageCheck, ReceiptText, Truck, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
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

const analyticsMotionCss = `
  @keyframes analytics-rise-in {
    from {
      opacity: 0;
      transform: translateY(14px);
      filter: saturate(0.94);
    }
    to {
      opacity: 1;
      transform: translateY(0);
      filter: saturate(1);
    }
  }

  @keyframes analytics-row-in {
    from {
      opacity: 0;
      transform: translateY(7px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .analytics-enter {
    animation: analytics-rise-in 620ms cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: var(--analytics-delay, 0ms);
  }

  .analytics-row-enter {
    animation: analytics-row-in 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: var(--analytics-delay, 0ms);
  }

  .analytics-hover-card,
  .analytics-hover-row {
    transition:
      transform 180ms ease,
      border-color 180ms ease,
      background-color 180ms ease,
      box-shadow 180ms ease;
  }

  .analytics-hover-card:hover {
    transform: translateY(-2px);
    border-color: #c9ddd6 !important;
    box-shadow: 0 14px 34px rgba(23, 32, 51, 0.08) !important;
  }

  .analytics-hover-row:hover {
    transform: translateY(-1px);
    box-shadow: inset 0 0 0 1px rgba(23, 107, 87, 0.08);
  }

  .analytics-hover-row:hover .analytics-bar-fill {
    filter: saturate(1.16);
  }

  @media (prefers-reduced-motion: reduce) {
    .analytics-enter,
    .analytics-row-enter {
      animation: none;
    }

    .analytics-hover-card,
    .analytics-hover-row,
    .analytics-bar-fill {
      transition: none;
    }
  }
`

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

function useAnimatedNumber(target: number, duration = 900, delay = 80) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let frame = 0
    let startedAt = 0
    const timeout = window.setTimeout(() => {
      const tick = (time: number) => {
        if (!startedAt) startedAt = time
        const progress = Math.min((time - startedAt) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)

        setValue(target * eased)
        if (progress < 1) frame = window.requestAnimationFrame(tick)
      }

      frame = window.requestAnimationFrame(tick)
    }, delay)

    return () => {
      window.clearTimeout(timeout)
      window.cancelAnimationFrame(frame)
    }
  }, [delay, duration, target])

  return value
}

function parseAnimatedValue(value: string | number) {
  if (typeof value === 'number') return { target: value, prefix: '', suffix: '', decimals: 0 }

  const match = value.match(/^([\d\s.,]+)(.*)$/)
  if (!match) return null

  const numeric = Number(match[1].replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(numeric)) return null

  const decimals = match[1].includes(',') || match[1].includes('.') ? 1 : 0
  return { target: numeric, prefix: '', suffix: match[2], decimals }
}

function AnimatedValue({
  value,
  className,
  duration = 900,
  delay = 80,
}: {
  value: string | number
  className?: string
  duration?: number
  delay?: number
}) {
  const parsed = parseAnimatedValue(value)
  const animated = useAnimatedNumber(parsed?.target ?? 0, duration, delay)

  if (!parsed) return <span className={className}>{value}</span>

  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: parsed.decimals,
    maximumFractionDigits: parsed.decimals,
  }).format(animated)

  return <span className={className}>{`${parsed.prefix}${formatted}${parsed.suffix}`}</span>
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
  delay = 0,
}: {
  icon: ReactNode
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <Panel
      className={cn('analytics-enter analytics-hover-card overflow-hidden border-[#dfe6e3] bg-white p-0', className)}
      style={{ '--analytics-delay': `${delay}ms` } as CSSProperties}
    >
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[#e4ebe8] px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#e8f3ef] text-[#176b57]">
            {icon}
          </div>
          <div className="truncate text-[15px] font-medium text-[#172033]">{title}</div>
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
  featured = false,
}: {
  icon: ReactNode
  label: string
  value: string | number
  caption?: string
  accent?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
  featured?: boolean
}) {
  const colors = {
    neutral: 'bg-[#edf2f0] text-[#425466]',
    success: 'bg-[#e8f3ef] text-[#176b57]',
    warning: 'bg-[#fff7e6] text-[#a66200]',
    danger: 'bg-[#fff1f0] text-[#b42318]',
    info: 'bg-[#edf7fb] text-[#256f9c]',
  }[accent]

  return (
    <div
      className={cn(
        'analytics-hover-card grid min-h-[118px] grid-rows-[auto_1fr] rounded-lg border border-[#dfe6e3] bg-white p-4',
        featured && 'min-h-[154px] border-[#c9ddd6] bg-[#f5faf8] p-5 sm:col-span-2 xl:col-span-2',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="truncate text-[11px] font-medium uppercase tracking-wide text-[#66746f]">{label}</div>
        <div className={cn('grid size-8 shrink-0 place-items-center rounded-md', featured && 'size-9', colors)}>{icon}</div>
      </div>
      <div className="mt-3 flex min-h-0 flex-col justify-end">
        <AnimatedValue
          value={value}
          className={cn('truncate font-medium leading-none text-[#172033] tabular-nums', featured ? 'text-5xl' : 'text-[26px]')}
          duration={featured ? 1100 : 900}
          delay={featured ? 120 : 180}
        />
        {caption ? <div className={cn('mt-2 truncate text-xs text-[#6b7773]', featured && 'text-sm')}>{caption}</div> : null}
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
    neutral: 'text-[#172033]',
    success: 'text-[#176b57]',
    warning: 'text-[#a66200]',
    danger: 'text-[#b42318]',
    info: 'text-[#256f9c]',
  }[accent]

  return (
    <div className="rounded-md px-3 py-2">
      <div className="truncate text-[11px] font-medium uppercase tracking-wide text-[#66746f]">{label}</div>
      <AnimatedValue value={value} className={cn('mt-1 block truncate text-[21px] font-medium leading-none tabular-nums', colors)} duration={820} delay={220} />
    </div>
  )
}

function MiniBar({ value, max, className }: { value: number; max: number; className: string }) {
  const [filled, setFilled] = useState(false)

  useEffect(() => {
    setFilled(false)
    const frame = window.requestAnimationFrame(() => setFilled(true))

    return () => window.cancelAnimationFrame(frame)
  }, [max, value])

  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#edf2f0]">
      <div className={cn('analytics-bar-fill h-full rounded-full transition-[width,filter] duration-1000 ease-out', className)} style={{ width: filled ? barWidth(value, max) : '0%' }} />
    </div>
  )
}

function StackedSegment({ width, className, delay = 220 }: { width: number; className: string; delay?: number }) {
  const animatedWidth = useAnimatedNumber(width, 900, delay)

  return <div className={className} style={{ width: `${animatedWidth}%` }} />
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
  const animatedShare = useAnimatedNumber(share, 900, 260)
  const color = {
    emerald: '#176b57',
    amber: '#b76e00',
    rose: '#b42318',
    sky: '#256f9c',
  }[tone]

  return (
    <div className="flex items-center gap-3 rounded-md bg-transparent p-2.5">
      <div
        className="grid size-14 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(${color} ${animatedShare * 3.6}deg, #e3ebe8 0deg)` }}
      >
        <div className="grid size-10 place-items-center rounded-full bg-white text-xs font-medium text-[#172033] tabular-nums">{Math.round(animatedShare)}%</div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-[#172033]">{label}</div>
        <div className="mt-0.5 text-xs text-[#6b7773]">{formatNumber(value)} из {formatNumber(total)}</div>
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
    { label: 'Заявки', value: requests.length, secondary: `${metrics.requestLines.length} строк`, tone: 'bg-[#256f9c]' },
    { label: 'Пополнение', value: metrics.activeReplenishment.length, secondary: `${metrics.deficitUnits} ед.`, tone: 'bg-[#b76e00]' },
    { label: 'Заказы', value: orders.length, secondary: money(metrics.orderedTotal), tone: 'bg-[#176b57]' },
    { label: 'Ожидание прихода', value: metrics.waitingReceiptOrders.length, secondary: money(metrics.waitingReceiptTotal), tone: 'bg-[#4f6f9f]' },
    { label: 'Приход принят', value: metrics.acceptedOrders.length, secondary: `${metrics.orderLines.length} строк`, tone: 'bg-[#2f7d73]' },
  ]
  const maxProcessValue = Math.max(...processRows.map((row) => row.value), 1)
  const bottleneck = [...processRows].sort((left, right) => right.value - left.value)[0]

  const financialRows = [
    { label: 'Стоимость склада', value: money(metrics.stockValue), share: 100, tone: 'bg-[#66746f]' },
    { label: 'Заказано поставщикам', value: money(metrics.orderedTotal), share: percent(metrics.orderedTotal, Math.max(metrics.stockValue, metrics.orderedTotal, 1)), tone: 'bg-[#176b57]' },
    { label: 'Сумма в ожидании прихода', value: money(metrics.waitingReceiptTotal), share: percent(metrics.waitingReceiptTotal, Math.max(metrics.orderedTotal, 1)), tone: 'bg-[#4f6f9f]' },
    { label: 'Дефицит к минимуму', value: money(metrics.deficitValue), share: percent(metrics.deficitValue, Math.max(metrics.stockValue, 1)), tone: 'bg-[#b42318]' },
    { label: 'Добор до желаемого уровня', value: money(metrics.desiredShortageValue), share: percent(metrics.desiredShortageValue, Math.max(metrics.stockValue + metrics.desiredShortageValue, 1)), tone: 'bg-[#b76e00]' },
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
      <style>{analyticsMotionCss}</style>
      <div className="grid gap-5 pb-5">
        <Panel className="analytics-enter analytics-hover-card overflow-hidden border-[#dfe6e3] bg-white p-0" style={{ '--analytics-delay': '0ms' } as CSSProperties}>
          <div className="flex min-h-16 flex-col gap-3 border-b border-[#e4ebe8] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[22px] font-medium leading-tight text-[#172033]">Аналитика склада клиники</h1>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-[#66746f]">Финансы · поставщики · процесс · складская политика</div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <StatusPill tone={metrics.stockHealth >= 85 ? 'success' : metrics.stockHealth >= 70 ? 'warning' : 'danger'}>
                Индекс склада {metrics.stockHealth}%
              </StatusPill>
              <Button variant="secondary" className="min-h-8 border-[#d1ddd8] px-2.5 py-1.5 text-xs text-[#172033]" onClick={handleExportReport}>
                <Download size={15} />
                Экспорт отчета
              </Button>
            </div>
          </div>
          <div className="grid gap-3 bg-[#f6f8f7] p-4 sm:grid-cols-2 xl:grid-cols-6">
            <ExecutiveMetric
              icon={<Gauge size={17} />}
              label="Индекс склада"
              value={`${metrics.stockHealth}%`}
              caption={`${formatNumber(metrics.activeCatalog.length - metrics.belowMinimumItems.length)} из ${formatNumber(metrics.activeCatalog.length)} позиций в норме`}
              accent={metrics.stockHealth >= 85 ? 'success' : metrics.stockHealth >= 70 ? 'warning' : 'danger'}
              featured
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

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
          <Section icon={<WalletCards size={18} />} title="Финансовая оценка запасов" delay={120}>
          <div className="grid gap-1 border-b border-[#e4ebe8] bg-[#f6f8f7] p-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Стоимость склада" value={money(metrics.stockValue)} />
            <Metric label="Заказано поставщикам" value={money(metrics.orderedTotal)} />
            <Metric label="Сумма в ожидании" value={money(metrics.waitingReceiptTotal)} />
            <Metric label="Дефицит к минимуму" value={money(metrics.deficitValue)} accent={metrics.deficitValue ? 'danger' : 'success'} />
            <Metric label="Добор до желаемого" value={money(metrics.desiredShortageValue)} accent={metrics.desiredShortageValue ? 'warning' : 'success'} />
          </div>
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="grid gap-4">
              {financialRows.map((row, index) => (
                <div
                  key={row.label}
                  className="analytics-row-enter analytics-hover-row rounded-md px-2 py-1.5"
                  style={{ '--analytics-delay': `${220 + index * 45}ms` } as CSSProperties}
                >
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-[#425466]">{row.label}</span>
                    <AnimatedValue value={row.value} className="shrink-0 font-medium text-[#172033] tabular-nums" duration={880} delay={240} />
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#edf2f0]">
                    <div className={cn('h-full rounded-full', row.tone)} style={{ width: `${Math.max(3, row.share)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid content-start gap-1 rounded-lg bg-[#f6f8f7] p-2">
              <Metric label="Доля дефицита от склада" value={`${percent(metrics.deficitValue, Math.max(metrics.stockValue, 1))}%`} accent={metrics.deficitValue ? 'warning' : 'success'} />
              <Metric label="Ед. к минимуму" value={formatNumber(metrics.deficitUnits)} />
              <Metric label="Ед. до желаемого" value={formatNumber(metrics.desiredShortageUnits)} />
            </div>
          </div>
          </Section>

          <Section
            icon={<PackageCheck size={18} />}
            title="Дефицитные позиции"
            delay={180}
            action={
              <StatusPill tone={problemItems.length ? 'danger' : 'success'}>
                <AnimatedValue value={problemItems.length} duration={650} delay={160} />
              </StatusPill>
            }
          >
            <div className="grid gap-3 p-4">
              {problemItems.length ? (
                problemItems.map((row, index) => (
                  <div
                    key={row.item.id}
                    className="analytics-row-enter analytics-hover-row rounded-md border-l-2 border-[#b42318]/50 bg-white px-3 py-2.5"
                    style={{ '--analytics-delay': `${260 + index * 38}ms` } as CSSProperties}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-[#172033]">{readable(row.item.shortName || row.item.fullName)}</div>
                        <div className="text-xs text-[#6b7773]">{readable(row.supplier?.name) || '-'}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <AnimatedValue value={formatNumber(row.deficit)} className="block font-medium text-[#b42318]" duration={760} delay={260} />
                        <AnimatedValue value={money(row.deficitValue)} className="block text-xs text-[#6b7773]" duration={820} delay={280} />
                      </div>
                    </div>
                    <MiniBar value={row.deficitValue || row.deficit} max={Math.max(...problemItems.map((item) => item.deficitValue || item.deficit), 1)} className="bg-[#b42318]" />
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-[#dfe6e3] bg-white px-3 py-4 text-sm text-[#6b7773]">Критичных позиций нет</div>
              )}
            </div>
          </Section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Section icon={<Gauge size={18} />} title="Качество складской политики" delay={260}>
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
              <RingMetric label="С запасом" value={metrics.enoughItems.length} total={metrics.activeCatalog.length} tone="emerald" />
              <RingMetric label="Близко к минимуму" value={metrics.nearMinimumItems.length} total={metrics.activeCatalog.length} tone="amber" />
              <RingMetric label="Ниже минимума" value={metrics.belowMinimumItems.length} total={metrics.activeCatalog.length} tone="rose" />
              <RingMetric label="Нет остатка" value={metrics.outOfStockItems.length} total={metrics.activeCatalog.length} tone="sky" />
            </div>
            <div className="border-t border-[#e4ebe8] px-5 py-4">
              <div className="flex h-3 overflow-hidden rounded-full bg-[#edf2f0]">
                <StackedSegment className="bg-[#176b57]" width={percent(metrics.enoughItems.length, metrics.activeCatalog.length)} delay={260} />
                <StackedSegment className="bg-[#b76e00]" width={percent(metrics.nearMinimumItems.length, metrics.activeCatalog.length)} delay={320} />
                <StackedSegment className="bg-[#b42318]" width={percent(Math.max(metrics.belowMinimumItems.length - metrics.outOfStockItems.length, 0), metrics.activeCatalog.length)} delay={380} />
                <StackedSegment className="bg-[#172033]" width={percent(metrics.outOfStockItems.length, metrics.activeCatalog.length)} delay={440} />
              </div>
            </div>
            <div className="overflow-x-auto border-t border-[#e4ebe8]">
              <table className="w-full min-w-[760px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    {['Категория', 'Позиций', 'Ниже мин.', 'Нет остатка', 'Оценка дефицита', 'Риск'].map((heading) => (
                      <th key={heading} className="border-b border-[#e4ebe8] bg-white px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-[#66746f]">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categoryStats.map((item, index) => (
                    <tr
                      key={item.category}
                      className={cn(
                        'analytics-row-enter analytics-hover-row bg-white transition hover:bg-[#f6f8f7]',
                      )}
                      style={{ '--analytics-delay': `${300 + index * 34}ms` } as CSSProperties}
                    >
                      <td className={cn('border-b border-[#edf2f0] px-4 py-3 text-sm font-medium text-[#172033]', item.out ? 'border-l-[#b42318]' : item.below ? 'border-l-[#b76e00]' : 'border-l-[#176b57]')}>{item.category}</td>
                      <td className="border-b border-[#edf2f0] px-4 py-3 text-right text-sm text-[#425466] tabular-nums">
                        <AnimatedValue value={formatNumber(item.total)} duration={680} delay={300} />
                      </td>
                      <td className="border-b border-[#edf2f0] px-4 py-3 text-right text-sm text-[#425466] tabular-nums">
                        <AnimatedValue value={formatNumber(item.below)} duration={680} delay={320} />
                      </td>
                      <td className="border-b border-[#edf2f0] px-4 py-3 text-right text-sm text-[#425466] tabular-nums">
                        <AnimatedValue value={formatNumber(item.out)} duration={680} delay={340} />
                      </td>
                      <td className="border-b border-[#edf2f0] px-4 py-3 text-right text-sm font-medium text-[#172033] tabular-nums">
                        <AnimatedValue value={money(item.deficitValue)} duration={780} delay={360} />
                      </td>
                      <td className="border-b border-[#edf2f0] px-4 py-3">
                        <MiniBar value={item.below} max={maxCategoryBelow} className={item.below ? 'bg-[#b76e00]' : 'bg-[#176b57]'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section icon={<ReceiptText size={18} />} title="Статусы процесса" delay={320}>
            <div className="grid gap-3 p-4">
              {[
                { title: 'Заявки', rows: requestStatusStats },
                { title: 'Заказы', rows: orderStatusStats },
                { title: 'Пополнение', rows: replenishmentStatusStats },
              ].map((group, index) => (
                <div key={group.title} className={cn(index > 0 && 'border-t border-[#e4ebe8] pt-3')}>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[#66746f]">{group.title}</div>
                  <div className="grid gap-2">
                    {group.rows.length ? (
                      group.rows.map((item, rowIndex) => (
                        <div
                          key={`${group.title}-${item.status}`}
                          className="analytics-row-enter analytics-hover-row flex items-center justify-between gap-3 rounded-md border border-[#dfe6e3] bg-white px-3 py-2.5"
                          style={{ '--analytics-delay': `${340 + index * 80 + rowIndex * 34}ms` } as CSSProperties}
                        >
                          <StatusPill tone={statusTone(item.status)}>{item.label}</StatusPill>
                          <AnimatedValue value={formatNumber(item.count)} className="text-base font-medium text-[#172033] tabular-nums" duration={700} delay={260} />
                        </div>
                      ))
                    ) : (
                      <div className="rounded-md border border-[#dfe6e3] bg-white px-3 py-3 text-sm text-[#6b7773]">Нет данных</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="grid gap-5">
          <Section icon={<BarChart3 size={18} />} title="Контроль процесса" delay={400}>
            <div className="grid gap-4 p-5">
              {processRows.map((row, index) => (
                <div
                  key={row.label}
                  className="analytics-row-enter analytics-hover-row grid grid-cols-[150px_minmax(0,1fr)_88px] items-center gap-4 rounded-md px-2 py-1.5"
                  style={{ '--analytics-delay': `${420 + index * 42}ms` } as CSSProperties}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[#172033]">{row.label}</div>
                    <div className="mt-0.5 text-xs text-[#6b7773]">{row.secondary}</div>
                  </div>
                  <MiniBar value={row.value} max={maxProcessValue} className={row.tone} />
                  <AnimatedValue value={formatNumber(row.value)} className="text-right text-lg font-medium text-[#172033] tabular-nums" duration={760} delay={260} />
                </div>
              ))}
            </div>
            <div className="grid gap-1 border-t border-[#e4ebe8] bg-[#f6f8f7] p-3 sm:grid-cols-3">
              <Metric label="Максимальный участок" value={bottleneck.label} />
              <Metric label="Открыто пополнение" value={formatNumber(metrics.activeReplenishment.length)} accent={metrics.activeReplenishment.length ? 'warning' : 'success'} />
              <Metric label="Заказов в ожидании" value={formatNumber(metrics.waitingReceiptOrders.length)} accent={metrics.waitingReceiptOrders.length ? 'info' : 'success'} />
            </div>
          </Section>
        </div>

        <Section
          icon={<Truck size={18} />}
          title="Зависимость от поставщиков"
          delay={480}
          action={<StatusPill tone={supplierConcentration >= 70 ? 'warning' : 'neutral'}>Топ-1: {supplierConcentration}% заказов</StatusPill>}
        >
          <div className="grid gap-1 border-b border-[#e4ebe8] bg-[#f6f8f7] p-3 sm:grid-cols-2 lg:grid-cols-4">
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
                    <th key={heading} className="border-b border-[#e4ebe8] bg-white px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-[#66746f]">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {supplierStats.map((item, index) => (
                  <tr
                    key={item.supplier.id}
                    className={cn(
                      'analytics-row-enter analytics-hover-row bg-white transition hover:bg-[#f6f8f7]',
                    )}
                    style={{ '--analytics-delay': `${520 + index * 32}ms` } as CSSProperties}
                  >
                    <td className={cn('border-b border-[#edf2f0] px-4 py-3', item.noAlternatives ? 'border-l-[#b76e00]' : item.waiting ? 'border-l-[#256f9c]' : 'border-l-[#176b57]')}>
                      <div className="text-sm font-medium text-[#172033]">{readable(item.supplier.name)}</div>
                      <div className="text-xs text-[#6b7773]">{readable(item.supplier.role)}</div>
                    </td>
                    <td className="border-b border-[#edf2f0] px-4 py-3 text-right text-sm font-medium text-[#172033] tabular-nums">
                      <AnimatedValue value={money(item.total)} duration={820} delay={300} />
                    </td>
                    <td className="border-b border-[#edf2f0] px-4 py-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_42px] items-center gap-2">
                        <MiniBar value={item.total} max={maxSupplierTotal} className="bg-[#176b57]" />
                        <AnimatedValue value={`${percent(item.total, Math.max(metrics.orderedTotal, 1))}%`} className="text-right text-xs text-[#6b7773] tabular-nums" duration={700} delay={340} />
                      </div>
                    </td>
                    <td className="border-b border-[#edf2f0] px-4 py-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_42px] items-center gap-2">
                        <MiniBar value={item.primaryCatalog} max={maxSupplierCatalog} className="bg-[#256f9c]" />
                        <AnimatedValue value={formatNumber(item.primaryCatalog)} className="text-right text-xs text-[#6b7773] tabular-nums" duration={700} delay={360} />
                      </div>
                    </td>
                    <td className="border-b border-[#edf2f0] px-4 py-3 text-right text-sm text-[#425466] tabular-nums">
                      <AnimatedValue value={formatNumber(item.noAlternatives)} duration={680} delay={380} />
                    </td>
                    <td className="border-b border-[#edf2f0] px-4 py-3 text-right text-sm text-[#425466] tabular-nums">
                      <AnimatedValue value={formatNumber(item.waiting)} duration={680} delay={400} />
                    </td>
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
