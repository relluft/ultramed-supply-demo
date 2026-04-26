import { Columns2, Info, Table2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDemo } from '../context'
import { getRowAmount, getRowAmountWithoutVat, getRowVatAmount, getRowVatRate } from '../data/mockData'
import { cn, formatMoney, formatNumber } from '../lib/format'
import type { EditableField, PurchaseRow, RowTone } from '../types/demo'
import { Button, StatusPill } from './ui'

type ViewMode = 'all' | 'child' | 'adult' | 'split'
type CellField =
  | 'index'
  | 'site'
  | 'sourceRequest'
  | 'normalizedName'
  | 'category'
  | 'article'
  | 'quantity'
  | 'unit'
  | 'supplier'
  | 'minOrder'
  | 'leadTime'
  | 'price'
  | 'netAmount'
  | 'vatRate'
  | 'vatAmount'
  | 'amount'

const tableColumns: Array<{ key: CellField; label: string; width: string }> = [
  { key: 'index', label: '№', width: 'w-[36px]' },
  { key: 'site', label: 'отд.', width: 'w-[48px]' },
  { key: 'sourceRequest', label: 'исходная заявка', width: 'w-[260px]' },
  { key: 'normalizedName', label: 'каталожное наименование', width: 'w-[352px]' },
  { key: 'category', label: 'категория', width: 'w-[116px]' },
  { key: 'article', label: 'артикул', width: 'w-[88px]' },
  { key: 'quantity', label: 'кол-во', width: 'w-[56px]' },
  { key: 'unit', label: 'ед.', width: 'w-[54px]' },
  { key: 'supplier', label: 'поставщик', width: 'w-[118px]' },
  { key: 'minOrder', label: 'мин. партия', width: 'w-[78px]' },
  { key: 'leadTime', label: 'срок', width: 'w-[68px]' },
  { key: 'price', label: 'цена с НДС', width: 'w-[82px]' },
  { key: 'netAmount', label: 'без НДС', width: 'w-[82px]' },
  { key: 'vatRate', label: 'НДС', width: 'w-[46px]' },
  { key: 'vatAmount', label: 'в т.ч. НДС', width: 'w-[82px]' },
  { key: 'amount', label: 'итог с НДС', width: 'w-[88px]' },
]

function baseCellClasses() {
  return 'border-neutral-200 bg-white text-neutral-850'
}

function riskCellForRow(row: PurchaseRow): CellField | null {
  if (row.price <= 0 || row.status === 'Нет цены') return 'price'
  if (row.status === 'Неясная единица') return 'unit'
  if (row.status === 'Неуверенное сопоставление' || row.status === 'Похожая позиция') {
    return 'normalizedName'
  }
  if (row.status === 'Медицинская проверка') return 'normalizedName'
  if (row.status === 'Нужно ручное подтверждение') return 'amount'

  return null
}

function riskClasses(tone: RowTone) {
  if (tone === 'danger') return 'border-rose-200 bg-rose-50 text-rose-950'
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-950'
  return baseCellClasses()
}

function cellClasses(row: PurchaseRow, field: CellField) {
  return riskCellForRow(row) === field ? riskClasses(row.tone) : baseCellClasses()
}

function fileNameForRow(row: PurchaseRow) {
  if (row.category === 'Ортопедия') return 'Ортопедические инструменты.xlsx'
  if (row.category === 'Эндодонтия' || row.category === 'Терапия') return 'Терапия расходники май.xlsx'
  if (row.category === 'Анестезия' || row.category === 'Иглы') return 'Хирургические материалы.docx'
  if (row.category === 'Стерилизация' || row.category === 'Дезсредства' || row.category === 'Отходы') {
    return 'Стерилизация и дезсредства.xlsx'
  }
  if (row.site === 'Детская') return 'Детская стоматология заявка.docx'

  return 'Терапия расходники май.xlsx'
}

function articleForRow(row: PurchaseRow) {
  const number = row.id.replace('row-', '').padStart(3, '0')
  const supplierPrefix: Record<string, string> = {
    'МедПоставка НН': 'MPN',
    ФармКомплект: 'FK',
    СтомСнаб: 'SS',
    ДенталМаркет: 'DM',
  }

  return `${supplierPrefix[row.supplier] ?? 'UMS'}-${number}-2026`
}

function minOrderForRow(row: PurchaseRow) {
  if (row.price <= 0) return 'уточнить'
  if (row.unit === 'шт.' || row.unit === 'пар') return '1 ' + row.unit
  if (row.unit === 'кор.') return '1 кор.'
  if (row.unit === 'уп.') return '1 уп.'
  if (row.unit === 'наб.') return '1 наб.'
  if (row.unit === 'фл.') return '1 фл.'

  return '1 ' + row.unit
}

function leadTimeForRow(row: PurchaseRow) {
  if (row.price <= 0) return 'уточнить'

  const supplierLeadTimes: Record<string, string> = {
    'МедПоставка НН': '1-2 дн.',
    ФармКомплект: '2-3 дн.',
    СтомСнаб: '3-5 дн.',
    ДенталМаркет: '2-4 дн.',
  }

  return supplierLeadTimes[row.supplier] ?? '3-5 дн.'
}

function siteShortLabel(site: string) {
  const normalizedSite = site.toLowerCase()

  if (normalizedSite.includes('дет')) return 'дет.'
  if (normalizedSite.includes('взрос')) return 'взр.'

  return site
}

function packageInfo(row: PurchaseRow) {
  const text = row.normalizedName.toLowerCase()

  if (text.includes('перчат')) return '1 упаковка = 100 шт.'
  if (text.includes('маск')) return '1 коробка = 50 шт.'
  if (text.includes('игла карпульная') || text.includes('эндодонтические')) return '1 упаковка = 100 шт.'
  if (text.includes('слюноотсос')) return '1 упаковка = 100 шт.'
  if (text.includes('микроапплик')) return '1 туба = 100 шт.'
  if (text.includes('аппликатор')) return '1 упаковка = 100 шт.'
  if (text.includes('клинья')) return '1 упаковка = 100 шт.'
  if (text.includes('стерилизации')) return '1 упаковка = 200 шт.'
  if (text.includes('гуттаперч')) return '1 упаковка = 120 шт.'
  if (text.includes('бумажные')) return '1 упаковка = 200 шт.'
  if (text.includes('анестетик')) return '1 упаковка = 50 карпул по 1,7 мл.'
  if (text.includes('платки для коффердама')) return '1 упаковка = 36 платков.'
  if (row.unit === 'кор.') return 'Количество предметов в коробке указано в каталожном наименовании.'
  if (row.unit === 'уп.') return 'Упаковка сверена с карточкой поставщика.'
  if (row.unit === 'наб.') return 'Состав набора требует сверки с карточкой поставщика.'

  return 'Единица не требует пересчета упаковки.'
}

function riskText(row: PurchaseRow, field: CellField) {
  if (riskCellForRow(row) !== field) return null

  if (row.tone === 'danger') return `${row.status}. ${row.systemComment}`
  if (row.tone === 'warning') return `${row.status}. ${row.systemComment}`

  return null
}

function hintLinesForCell(row: PurchaseRow, field: CellField, rowIndex: number) {
  const fileName = fileNameForRow(row)
  const article = articleForRow(row)
  const source = `Файл: ${fileName}`
  const original = `Исходная строка: ${row.sourceRequest}`
  const risk = riskText(row, field)

  const lines: Array<{ label: string; text: string }> = []

  if (field === 'index') {
    lines.push({ label: 'Значение', text: `Порядковый номер после сведения заявок: ${rowIndex + 1}` })
    lines.push({ label: 'Источник', text: source })
  }

  if (field === 'site') {
    lines.push({ label: 'Значение', text: 'Отделение определено по файлу и листу заявки.' })
    lines.push({ label: 'Источник', text: source })
  }

  if (field === 'sourceRequest') {
    lines.push({ label: 'Значение', text: 'Текст сохранен из заявки без нормализации.' })
    lines.push({ label: 'Источник', text: source })
  }

  if (field === 'normalizedName') {
    lines.push({ label: 'Значение', text: `Приведено к карточке поставщика ${row.supplier}.` })
    lines.push({ label: 'Артикул', text: article })
    lines.push({ label: 'Почему так', text: 'Совпали категория, размер, единица поставки и описание из заявки.' })
    lines.push({ label: 'Источник', text: original })
  }

  if (field === 'category') {
    lines.push({ label: 'Значение', text: 'Категория назначена по справочнику закупочных групп.' })
    lines.push({ label: 'Источник', text: source })
  }

  if (field === 'article') {
    lines.push({ label: 'Артикул', text: article })
    lines.push({ label: 'Зачем нужен', text: 'Артикул уйдет в итоговую заявку поставщику и снизит риск замены на похожую позицию.' })
  }

  if (field === 'quantity') {
    lines.push({ label: 'Значение', text: 'Количество взято из заявки и приведено к единице поставщика.' })
    lines.push({ label: 'Упаковка', text: packageInfo(row) })
  }

  if (field === 'unit') {
    lines.push({ label: 'Значение', text: `Единица поставки: ${row.unit}` })
    lines.push({ label: 'Упаковка', text: packageInfo(row) })
  }

  if (field === 'supplier') {
    lines.push({ label: 'Значение', text: 'Поставщик закреплен в справочнике закупок для этой позиции.' })
    lines.push({ label: 'Артикул', text: article })
  }

  if (field === 'minOrder') {
    lines.push({ label: 'Минимальная партия', text: `Поставщик отгружает позицию от ${minOrderForRow(row)}.` })
    lines.push({ label: 'Зачем нужно', text: 'Если заявка меньше минимальной партии или не кратна упаковке, система покажет это перед заказом.' })
  }

  if (field === 'leadTime') {
    lines.push({ label: 'Срок поставки', text: `Ориентировочный срок по поставщику: ${leadTimeForRow(row)}.` })
    lines.push({ label: 'Источник', text: `Условия поставки из карточки ${row.supplier}.` })
  }

  if (field === 'price') {
    lines.push({
      label: 'Цена',
      text:
        row.price > 0
          ? `Цена за единицу с НДС взята из прайса ${row.supplier}_май_2026.xlsx.`
          : `Цена не найдена в прайсе ${row.supplier}_май_2026.xlsx.`,
    })
    lines.push({ label: 'Артикул', text: article })
  }

  if (field === 'netAmount') {
    lines.push({
      label: 'Без НДС',
      text: `Расчетная стоимость без НДС: ${formatMoney(getRowAmountWithoutVat(row))}.`,
    })
  }

  if (field === 'vatRate') {
    lines.push({
      label: 'Ставка НДС',
      text:
        row.price > 0
          ? `Ставка ${formatNumber(getRowVatRate(row))}% взята из карточки поставщика или применена по закупочной группе.`
          : 'Ставка НДС появится после подтверждения цены поставщиком.',
    })
  }

  if (field === 'vatAmount') {
    lines.push({
      label: 'В том числе НДС',
      text: `НДС внутри суммы: ${formatMoney(getRowAmount(row))} x ${formatNumber(getRowVatRate(row))} / (${formatNumber(100 + getRowVatRate(row))}) = ${formatMoney(getRowVatAmount(row))}.`,
    })
  }

  if (field === 'amount') {
    lines.push({
      label: 'Итого к оплате',
      text: row.amountOverride
        ? 'Итоговая сумма с НДС задана вручную.'
        : `Итоговая сумма с НДС рассчитана автоматически: ${formatNumber(row.quantity)} x ${formatMoney(row.price)}.`,
    })
  }

  if (risk) {
    lines.push({ label: 'Риск', text: risk })
  }

  return lines
}

function TooltipPortal({
  row,
  field,
  rowIndex,
  rect,
}: {
  row: PurchaseRow
  field: CellField
  rowIndex: number
  rect: DOMRect
}) {
  const lines = hintLinesForCell(row, field, rowIndex)
  const tooltipWidth = 320
  const gap = 8
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const placeBelow = rect.top < 210
  const left = Math.min(Math.max(12, rect.right - tooltipWidth), viewportWidth - tooltipWidth - 12)
  const top = placeBelow ? rect.bottom + gap : Math.max(12, rect.top - 170)
  const adjustedTop = Math.min(top, viewportHeight - 180)

  return createPortal(
    <div
      className="pointer-events-none fixed z-[100] rounded-[14px] border border-neutral-200 bg-white p-3 text-left text-xs leading-5 text-neutral-700 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
      style={{ left, top: Math.max(12, adjustedTop), width: tooltipWidth }}
    >
      <div className="mb-2 font-semibold text-neutral-950">Источник значения</div>
      <div className="space-y-2">
        {lines.map((line) => (
          <div
            key={`${line.label}-${line.text}`}
            className={cn(
              line.label === 'Риск' &&
                'rounded-[10px] border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900',
            )}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
              {line.label}
            </div>
            <div className="mt-0.5">{line.text}</div>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  )
}

function HintButton({
  row,
  field,
  rowIndex,
}: {
  row: PurchaseRow
  field: CellField
  rowIndex: number
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)

  function show(target: HTMLElement) {
    setAnchor(target.getBoundingClientRect())
  }

  return (
    <span className="absolute bottom-1 right-1 z-20">
      <button
        type="button"
        onMouseEnter={(event) => show(event.currentTarget)}
        onMouseLeave={() => setAnchor(null)}
        onFocus={(event) => show(event.currentTarget)}
        onBlur={() => setAnchor(null)}
        onClick={(event) => {
          event.stopPropagation()
          setAnchor((current) => (current ? null : event.currentTarget.getBoundingClientRect()))
        }}
        className="flex h-3.5 w-3.5 items-center justify-center bg-transparent text-neutral-500 opacity-25 transition hover:opacity-75 focus:opacity-75 focus:outline-none"
        aria-label="Показать источник значения"
      >
        <Info size={9} strokeWidth={2} />
      </button>
      {anchor ? <TooltipPortal row={row} field={field} rowIndex={rowIndex} rect={anchor} /> : null}
    </span>
  )
}

function EditableCellContent({
  row,
  field,
  value,
  align = 'left',
}: {
  row: PurchaseRow
  field: EditableField
  value: string
  align?: 'left' | 'right' | 'center'
}) {
  const { updateRow } = useDemo()
  const [draftValue, setDraftValue] = useState(value)

  function commit() {
    updateRow(row.id, field, draftValue)
  }

  return (
    <div
      contentEditable
      suppressContentEditableWarning
      onInput={(event) => setDraftValue(event.currentTarget.textContent ?? '')}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          setDraftValue(value)
          event.currentTarget.textContent = value
          event.currentTarget.blur()
        }
      }}
      className={cn(
        'min-h-[24px] w-full rounded-sm outline-none focus:bg-neutral-950/[0.035]',
        align === 'left' ? 'whitespace-pre-wrap break-words' : 'whitespace-nowrap',
        align === 'right' && 'text-center tabular-nums',
        align === 'center' && 'text-center',
      )}
    >
      {value}
    </div>
  )
}

function DataCell({
  row,
  field,
  rowIndex,
  children,
  className,
}: {
  row: PurchaseRow
  field: CellField
  rowIndex: number
  children: ReactNode
  className?: string
}) {
  const isCatalogNameCell = field === 'normalizedName'
  const isNameCell = field === 'sourceRequest' || field === 'normalizedName'
  const isTightCell = field === 'index' || field === 'quantity' || field === 'unit' || field === 'vatRate'

  return (
    <td className={cn('relative border px-1.5 py-2 align-middle leading-5', className)}>
      <div
        className={cn(
          'flex min-w-0 items-center',
          isCatalogNameCell ? 'min-h-[58px]' : 'min-h-[34px]',
          isTightCell ? 'px-1 whitespace-nowrap' : 'pr-4 break-words',
          isNameCell ? 'justify-start text-left text-[13px] leading-6' : 'justify-center text-center',
        )}
      >
        {children}
      </div>
      <HintButton row={row} field={field} rowIndex={rowIndex} />
    </td>
  )
}

function ProcurementTable({
  rows,
  title,
  compact = false,
}: {
  rows: PurchaseRow[]
  title: string
  compact?: boolean
}) {
  const total = rows.reduce((sum, row) => sum + getRowAmount(row), 0)
  const totalWithoutVat = rows.reduce((sum, row) => sum + getRowAmountWithoutVat(row), 0)
  const totalVat = rows.reduce((sum, row) => sum + getRowVatAmount(row), 0)

  return (
    <div className="rounded-[24px] border border-neutral-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-neutral-950">{title}</div>
          <div className="mt-1 text-xs text-neutral-500">
            {rows.length} строк · {formatMoney(total)}
          </div>
        </div>
        <StatusPill tone="neutral">{compact ? 'Отдельная таблица' : 'Единый список'}</StatusPill>
      </div>

      <div className="overflow-x-auto">
        <table
          className={cn(
            'table-fixed border-collapse text-left text-[12px] text-neutral-800',
            compact ? 'min-w-[1620px]' : 'min-w-[1720px] w-full',
          )}
        >
          <colgroup>
            {tableColumns.map((column) => (
              <col key={column.key} className={column.width} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {tableColumns.map((column) => (
                <th
                  key={column.key}
                  className="sticky top-0 z-10 border border-neutral-200 bg-white px-1.5 py-2 text-center align-middle text-[10px] font-semibold uppercase tracking-[0.04em] text-neutral-950"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const amount = getRowAmount(row)
              const amountWithoutVat = getRowAmountWithoutVat(row)
              const vatRate = getRowVatRate(row)
              const vatAmount = getRowVatAmount(row)

              return (
                <tr key={row.id} className="align-top">
                  <DataCell row={row} field="index" rowIndex={rowIndex} className="border-neutral-200 bg-white font-semibold text-neutral-950">
                    {rowIndex + 1}
                  </DataCell>
                  <DataCell row={row} field="site" rowIndex={rowIndex} className={cellClasses(row, 'site')}>
                    {siteShortLabel(row.site)}
                  </DataCell>
                  <DataCell row={row} field="sourceRequest" rowIndex={rowIndex} className={cellClasses(row, 'sourceRequest')}>
                    {row.sourceRequest}
                  </DataCell>
                  <DataCell row={row} field="normalizedName" rowIndex={rowIndex} className={cellClasses(row, 'normalizedName')}>
                    <EditableCellContent row={row} field="normalizedName" value={row.normalizedName} />
                  </DataCell>
                  <DataCell row={row} field="category" rowIndex={rowIndex} className={cellClasses(row, 'category')}>
                    <EditableCellContent row={row} field="category" value={row.category} />
                  </DataCell>
                  <DataCell row={row} field="article" rowIndex={rowIndex} className="border-neutral-200 bg-white font-medium text-neutral-700">
                    {articleForRow(row)}
                  </DataCell>
                  <DataCell row={row} field="quantity" rowIndex={rowIndex} className={cellClasses(row, 'quantity')}>
                    <EditableCellContent row={row} field="quantity" value={String(row.quantity)} align="right" />
                  </DataCell>
                  <DataCell row={row} field="unit" rowIndex={rowIndex} className={cellClasses(row, 'unit')}>
                    <EditableCellContent row={row} field="unit" value={row.unit} align="center" />
                  </DataCell>
                  <DataCell row={row} field="supplier" rowIndex={rowIndex} className={cellClasses(row, 'supplier')}>
                    <EditableCellContent row={row} field="supplier" value={row.supplier} />
                  </DataCell>
                  <DataCell row={row} field="minOrder" rowIndex={rowIndex} className="border-neutral-200 bg-white text-neutral-700">
                    {minOrderForRow(row)}
                  </DataCell>
                  <DataCell row={row} field="leadTime" rowIndex={rowIndex} className="border-neutral-200 bg-white text-neutral-700">
                    {leadTimeForRow(row)}
                  </DataCell>
                  <DataCell row={row} field="price" rowIndex={rowIndex} className={cellClasses(row, 'price')}>
                    <EditableCellContent row={row} field="price" value={String(row.price)} align="right" />
                  </DataCell>
                  <DataCell row={row} field="netAmount" rowIndex={rowIndex} className="border-neutral-200 bg-white tabular-nums text-neutral-700">
                    {formatMoney(amountWithoutVat)}
                  </DataCell>
                  <DataCell row={row} field="vatRate" rowIndex={rowIndex} className="border-neutral-200 bg-white tabular-nums text-neutral-700">
                    <EditableCellContent row={row} field="vatRate" value={String(vatRate)} align="center" />
                  </DataCell>
                  <DataCell row={row} field="vatAmount" rowIndex={rowIndex} className="border-neutral-200 bg-white tabular-nums text-neutral-700">
                    {formatMoney(vatAmount)}
                  </DataCell>
                  <DataCell row={row} field="amount" rowIndex={rowIndex} className={cn(cellClasses(row, 'amount'), 'font-semibold text-neutral-950')}>
                    <EditableCellContent row={row} field="amount" value={String(Math.round(amount))} align="right" />
                  </DataCell>
                </tr>
              )
            })}
            <tr>
              <td
                colSpan={12}
                className="border border-neutral-200 bg-neutral-50 px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500"
              >
                Итого
              </td>
              <td className="border border-neutral-200 bg-neutral-50 px-3 py-3 text-right font-semibold tabular-nums text-neutral-950">
                {formatMoney(totalWithoutVat)}
              </td>
              <td className="border border-neutral-200 bg-neutral-50 px-3 py-3 text-center text-neutral-400">
                —
              </td>
              <td className="border border-neutral-200 bg-neutral-50 px-3 py-3 text-right font-semibold tabular-nums text-neutral-950">
                {formatMoney(totalVat)}
              </td>
              <td className="border border-neutral-200 bg-neutral-50 px-3 py-3 text-right font-semibold tabular-nums text-neutral-950">
                {formatMoney(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function PurchaseTable() {
  const {
    state: { rows },
  } = useDemo()
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const childRows = useMemo(() => rows.filter((row) => row.site.toLowerCase().includes('дет')), [rows])
  const adultRows = useMemo(() => rows.filter((row) => row.site.toLowerCase().includes('взрос')), [rows])
  const visibleRows =
    viewMode === 'child' ? childRows : viewMode === 'adult' ? adultRows : rows

  return (
    <div className="rounded-[28px] border border-neutral-200 bg-white p-3 shadow-sm md:p-4">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="display-section-title text-3xl text-neutral-950 md:text-[2.3rem]">
            Рабочая таблица закупки
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-neutral-500">
            Грязные заявки сведены к каталожным наименованиям поставщиков с источниками по каждой ячейке.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant={viewMode === 'all' ? 'primary' : 'secondary'} onClick={() => setViewMode('all')}>
            <Table2 size={16} />
            Все
          </Button>
          <Button variant={viewMode === 'child' ? 'primary' : 'secondary'} onClick={() => setViewMode('child')}>
            Детская
          </Button>
          <Button variant={viewMode === 'adult' ? 'primary' : 'secondary'} onClick={() => setViewMode('adult')}>
            Взрослая
          </Button>
          <Button variant={viewMode === 'split' ? 'primary' : 'secondary'} onClick={() => setViewMode('split')}>
            <Columns2 size={16} />
            Две таблицы
          </Button>
          <span className="hidden">
            Рабочая версия
          </span>
        </div>
      </div>

      {viewMode === 'split' ? (
        <div className="grid gap-4 2xl:grid-cols-2">
          <ProcurementTable rows={childRows} title="Детская" compact />
          <ProcurementTable rows={adultRows} title="Взрослая" compact />
        </div>
      ) : (
        <ProcurementTable
          rows={visibleRows}
          title={
            viewMode === 'child'
              ? 'Детская'
              : viewMode === 'adult'
                ? 'Взрослая'
                : 'Все отделения'
          }
        />
      )}
    </div>
  )
}
