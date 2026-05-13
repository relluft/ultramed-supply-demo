import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Home, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BrandedLoadingModal } from '../components/BrandedLoadingModal'
import { PageTransition } from '../components/PageTransition'
import { Button, EmptyState, Panel, SectionHeader, StatusPill, fieldStyles } from '../components/ui'
import { useDemo } from '../context'
import { getRoomByRole, requestLineStatusLabels, requestStatusLabels, roleToRoomId, statusTone } from '../lib/demoLogic'
import { cn, formatDateTime, formatNumber } from '../lib/format'
import type { CatalogItem, RequestCartLine, Room, SupplyRequest, SupplyRequestLine } from '../types/demo'

const orthodonticDemoRequestId = 'REQ-005'
const requestTableHeaderCell =
  'sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-3 py-2 text-left text-[11px] font-normal uppercase tracking-wide text-slate-500'
const requestTableCell = 'border-b border-slate-100 px-3 py-2 align-top text-[13px] leading-4 text-slate-700'
const submitLoadingMs = 1500

function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null

  return createPortal(children, document.body)
}

const catalogVariantGroups = [
  {
    id: 'gloves-nitrile',
    title: 'Перчатки смотровые нитриловые неопудренные нестерильные',
    note: 'размеры S / M / L',
    itemIds: ['item-gloves-s', 'item-gloves-m', 'item-gloves-l'],
  },
  {
    id: 'gloves-latex',
    title: 'Перчатки смотровые латексные неопудренные нестерильные',
    note: 'размеры S / M / L',
    itemIds: ['item-latex-gloves-s', 'item-latex-gloves-m', 'item-latex-gloves-l'],
  },
  {
    id: 'gloves-surgical',
    title: 'Перчатки хирургические латексные стерильные',
    note: 'размеры 6.5 / 7.0 / 7.5 / 8.0',
    itemIds: ['item-sterile-gloves-65', 'item-sterile-gloves-7', 'item-sterile-gloves-75', 'item-sterile-gloves-80'],
  },
  {
    id: 'procedure-masks',
    title: 'Маски медицинские процедурные трехслойные',
    note: 'класс защиты и тип крепления',
    itemIds: ['item-masks', 'item-masks-blue', 'item-masks-black'],
  },
  {
    id: 'respirators',
    title: 'Респираторы медицинские фильтрующие',
    note: 'класс защиты и клапан',
    itemIds: ['item-ffp2-respirators', 'item-ffp2-respirators-valve', 'item-ffp3-respirators'],
  },
  {
    id: 'saliva-ejectors',
    title: 'Слюноотсосы стоматологические',
    note: 'наконечник и жесткость каркаса',
    itemIds: ['item-saliva-ejectors', 'item-saliva-ejectors-blue', 'item-saliva-ejectors-transparent'],
  },
  {
    id: 'air-water-tips',
    title: 'Насадки одноразовые для пустера стоматологические',
    note: 'тип адаптера',
    itemIds: ['item-air-water-tips', 'item-air-water-tips-clear', 'item-air-water-tips-colored'],
  },
  {
    id: 'cotton-rolls',
    title: 'Валики ватные стоматологические',
    note: 'размеры 1 / 2 / 3',
    itemIds: ['item-cotton-rolls-size-1', 'item-cotton-rolls', 'item-cotton-rolls-size-3'],
  },
  {
    id: 'cartridge-needles',
    title: 'Иглы карпульные стоматологические',
    note: 'длина и диаметр',
    itemIds: ['item-needles-27g-long', 'item-needles-27g-short', 'item-needles-30g-long', 'item-needles-30g', 'item-needles-30g-extra-short'],
  },
  {
    id: 'cofferdam-sheets',
    title: 'Коффердам стоматологический в платках',
    note: 'толщина и материал',
    itemIds: ['item-cofferdam-thin-blue', 'item-cofferdam', 'item-cofferdam-heavy-green', 'item-cofferdam-nonlatex-medium'],
  },
  {
    id: 'sterilization-pouches',
    title: 'Пакеты самоклеящиеся для стерилизации инструментов',
    note: 'разные размеры пакетов',
    itemIds: ['item-sterilization-pouches-57', 'item-sterilization-pouches-75', 'item-sterilization-pouches', 'item-sterilization-pouches-135'],
  },
  {
    id: 'composites',
    title: 'Композиты стоматологические фотополимерные',
    note: 'консистенция, опаковость и оттенок',
    itemIds: ['item-composite-a2', 'item-composite-a3', 'item-composite-bulk-a2', 'item-composite-opaque-a2', 'item-flow-composite-a2', 'item-flow-composite-a3'],
  },
  {
    id: 'microbrushes',
    title: 'Микроаппликаторы стоматологические одноразовые',
    note: 'размер рабочей головки',
    itemIds: ['item-microbrushes', 'item-microbrushes-fine', 'item-microbrushes-superfine'],
  },
  {
    id: 'burs',
    title: 'Боры стоматологические',
    note: 'форма, материал и зернистость',
    itemIds: ['item-burs-diamond-round', 'item-burs-diamond-round-coarse', 'item-burs-diamond-flame', 'item-burs-diamond-cone-fine', 'item-carbide-burs'],
  },
  {
    id: 'prophy-pastes',
    title: 'Пасты профилактические полировочные стоматологические',
    note: 'абразивность и наличие фтора',
    itemIds: ['item-prophy-paste', 'item-prophy-paste-mint-medium', 'item-prophy-paste-berry-fine'],
  },
  {
    id: 'prophy-tools',
    title: 'Полировочные чашечки резиновые для профилактики',
    note: 'жесткость и рабочий рельеф',
    itemIds: ['item-prophy-cups', 'item-prophy-cups-hard', 'item-prophy-cups-ribbed'],
  },
  {
    id: 'prophy-brushes',
    title: 'Профилактические щетки стоматологические одноразовые',
    note: 'форма рабочей части',
    itemIds: ['item-brushes', 'item-prophy-brushes-pointed', 'item-prophy-brushes-flat'],
  },
  {
    id: 'polishing-discs',
    title: 'Диски финишно-полировочные Kerr OptiDisc для реставраций',
    note: 'диаметр, референс Kerr и абразивная ступень в мкм',
    itemIds: ['item-disc-4181', 'item-disc-coarse', 'item-disc-4191', 'item-disc-fine'],
  },
  {
    id: 'polishing-strips',
    title: 'Штрипсы полировочные абразивные межзубные',
    note: 'зернистость',
    itemIds: ['item-polishing-strips', 'item-polishing-strips-fine', 'item-polishing-strips-coarse'],
  },
  {
    id: 'sutures',
    title: 'Шовный материал хирургический стерильный',
    note: 'размеры 4-0 / 5-0 / 6-0',
    itemIds: ['item-suture-4-0', 'item-suture-5-0', 'item-suture-6-0'],
  },
  {
    id: 'scalpel-blades',
    title: 'Лезвия скальпеля стерильные одноразовые',
    note: 'номера лезвий',
    itemIds: ['item-scalpel-blades-11', 'item-scalpel-blades-12', 'item-scalpel-blades-15', 'item-scalpel-blades-15c'],
  },
  {
    id: 'sterile-gauze',
    title: 'Салфетки марлевые стерильные',
    note: 'размер салфетки',
    itemIds: ['item-sterile-gauze', 'item-sterile-gauze-75', 'item-sterile-gauze-10'],
  },
  {
    id: 'archwires',
    title: 'Дуги ортодонтические металлические',
    note: 'материал и размер',
    itemIds: ['item-niti-archwires', 'item-niti-archwires-016', 'item-thermal-niti-archwires', 'item-steel-archwires'],
  },
  {
    id: 'ortho-ligatures',
    title: 'Лигатуры эластические ортодонтические',
    note: 'эластичность и фрикционные свойства',
    itemIds: ['item-elastic-ligatures', 'item-elastic-ligatures-colored', 'item-elastic-ligatures-grey'],
  },
  {
    id: 'ortho-elastics',
    title: 'Эластики межчелюстные ортодонтические',
    note: 'сила тяги',
    itemIds: ['item-ortho-elastics-light', 'item-ortho-elastics', 'item-ortho-elastics-heavy'],
  },
  {
    id: 'elastic-chain',
    title: 'Эластическая цепочка ортодонтическая',
    note: 'закрытая, короткое и длинное звено',
    itemIds: ['item-elastic-chain', 'item-elastic-chain-short', 'item-elastic-chain-long'],
  },
  {
    id: 'retraction-cords',
    title: 'Ретракционная нить стоматологическая',
    note: 'размеры 00 / 0 / 1',
    itemIds: ['item-retraction-cord-00', 'item-retraction-cord-0', 'item-retraction-cord-1'],
  },
  {
    id: 'articulating-paper',
    title: 'Артикуляционная бумага стоматологическая',
    note: 'толщина и форма листа',
    itemIds: ['item-articulating-paper', 'item-articulating-paper-red', 'item-articulating-paper-horseshoe'],
  },
  {
    id: 'instrument-disinfectants',
    title: 'Концентраты для дезинфекции инструментов',
    note: 'объем и тип состава',
    itemIds: ['item-disinfectant-instruments', 'item-disinfectant-instruments-5l', 'item-disinfectant-instruments-enzymatic'],
  },
  {
    id: 'surface-disinfectants',
    title: 'Средства для дезинфекции поверхностей',
    note: 'объем флакона или канистры',
    itemIds: ['item-disinfectant-surfaces', 'item-disinfectant-surfaces-1l', 'item-disinfectant-surfaces-5l'],
  },
  {
    id: 'surface-wipes',
    title: 'Салфетки дезинфицирующие для поверхностей',
    note: 'банка, блок, спиртовые',
    itemIds: ['item-surface-wipes', 'item-surface-wipes-refill', 'item-surface-wipes-alcohol'],
  },
  {
    id: 'hand-antiseptics',
    title: 'Антисептик кожный спиртовой для обработки рук',
    note: '500 мл / 1 л / 5 л',
    itemIds: ['item-hand-antiseptic-500', 'item-hand-antiseptic', 'item-hand-antiseptic-5l'],
  },
  {
    id: 'bibs',
    title: 'Салфетки-нагрудники стоматологические одноразовые',
    note: 'слойность и влагозащита',
    itemIds: ['item-bibs', 'item-bibs-blue', 'item-bibs-green'],
  },
  {
    id: 'disposable-cups',
    title: 'Стаканчики одноразовые стоматологические',
    note: 'объем',
    itemIds: ['item-cups-disposable', 'item-cups-180-white', 'item-cups-200-blue'],
  },
  {
    id: 'barrier-film',
    title: 'Барьерная пленка для стоматологической установки',
    note: 'размер листа и перфорация',
    itemIds: ['item-barrier-film', 'item-barrier-film-clear', 'item-barrier-film-blue'],
  },
  {
    id: 'headrest-covers',
    title: 'Чехлы одноразовые на подголовник стоматологического кресла',
    note: 'размер чехла',
    itemIds: ['item-headrest-covers', 'item-headrest-covers-small', 'item-headrest-covers-large'],
  },
  {
    id: 'tray-covers',
    title: 'Покрытия одноразовые для стоматологического лотка',
    note: 'размер покрытия',
    itemIds: ['item-tray-covers', 'item-tray-covers-small', 'item-tray-covers-large'],
  },
]

const catalogGroupByItemId = new Map(catalogVariantGroups.flatMap((group) => group.itemIds.map((itemId) => [itemId, group] as const)))
const catalogGroupRank = new Map(catalogVariantGroups.map((group, index) => [group.id, index]))
const catalogCategoryRank = new Map(
  ['Расходники', 'Анестезия', 'Изоляция', 'Терапия', 'Хирургия', 'Гигиена', 'Дезинфекция', 'Ортопедия', 'Ортодонтия'].map(
    (category, index) => [category, index],
  ),
)
const frequentItemIdsByRoomId: Record<string, string[]> = {
  'room-101': ['item-gloves-m', 'item-masks', 'item-saliva-ejectors', 'item-cotton-rolls', 'item-cofferdam', 'item-composite-a2'],
  'room-102': ['item-sterile-gloves-7', 'item-masks', 'item-sterile-gauze', 'item-suture-4-0', 'item-scalpel-blades-15', 'item-chlorhexidine'],
  'room-105': ['item-gloves-m', 'item-masks', 'item-niti-archwires', 'item-elastic-ligatures', 'item-ortho-wax', 'item-ortho-elastics', 'item-elastic-chain'],
}

function catalogSortRank(item: CatalogItem) {
  const group = catalogGroupByItemId.get(item.id)
  return {
    category: catalogCategoryRank.get(item.category) ?? 999,
    group: group ? catalogGroupRank.get(group.id) ?? 999 : 999,
    name: item.shortName,
  }
}

function matchesQuery(item: CatalogItem, query: string) {
  const value = query.trim().toLowerCase()
  if (!value) return true

  return [item.shortName, item.fullName, item.category, ...item.searchSynonyms]
    .join(' ')
    .toLowerCase()
    .includes(value)
}

type CatalogVariantGroup = (typeof catalogVariantGroups)[number]
type CatalogDisplayRow =
  | { type: 'group'; group: CatalogVariantGroup; items: CatalogItem[]; totalVariants: number }
  | { type: 'item'; item: CatalogItem; nested?: boolean }

function matchesGroupQuery(group: CatalogVariantGroup, query: string) {
  const value = query.trim().toLowerCase()
  if (!value) return true

  return [group.title, group.note].join(' ').toLowerCase().includes(value)
}

function catalogItemProfessionalName(item: CatalogItem) {
  return item.fullName.trim() || item.shortName
}

function getGroupCategoryLabel(items: CatalogItem[]) {
  const categories = Array.from(new Set(items.map((item) => item.category)))
  return categories.length === 1 ? categories[0] : `${categories.length} раздела`
}

function requestIssueSummary(request: { status: string; lines: { quantity: number; issuedQuantity: number; status: string }[] }) {
  if (request.status === 'sent' || request.status === 'in-review') {
    return { tone: 'info' as const, label: 'Ожидает обработки' }
  }

  const pendingLines = request.lines.filter((line) => line.status !== 'rejected' && line.issuedQuantity < line.quantity)
  const partialLines = pendingLines.filter((line) => line.issuedQuantity > 0)
  const notIssuedLines = pendingLines.filter((line) => line.issuedQuantity <= 0)

  if (!pendingLines.length) {
    return { tone: 'success' as const, label: 'Выдано полностью' }
  }

  if (partialLines.length && notIssuedLines.length) {
    return { tone: 'warning' as const, label: `Частично: ${partialLines.length}, не выдано: ${notIssuedLines.length}` }
  }

  if (partialLines.length) {
    return { tone: 'warning' as const, label: `Выдано частично: ${partialLines.length}` }
  }

  return { tone: 'danger' as const, label: `Не выдано: ${notIssuedLines.length}` }
}

function requestDisplayTitle(request: SupplyRequest, catalog: CatalogItem[], room?: Room) {
  if (request.roomId === 'room-105') return 'Ортодонтия май расходники'

  const title = request.title?.trim().replace(/_/g, ' ')
  const looksLikeGeneratedItemList = Boolean(
    title &&
      ((title.includes(',') && /\+\s*\d+$/.test(title)) ||
        catalog.some((item) => title.includes(item.shortName) || title.includes(item.fullName))),
  )

  if (title && !looksLikeGeneratedItemList) return title

  const firstLabels = request.lines
    .slice(0, 3)
    .map((line) => {
      const item = line.itemId ? catalog.find((candidate) => candidate.id === line.itemId) : undefined
      return item ? catalogItemProfessionalName(item) : line.manualName
    })
    .filter(Boolean)

  const suffix = request.lines.length > firstLabels.length ? ` + ${request.lines.length - firstLabels.length}` : ''
  const base = firstLabels.length ? `${firstLabels.join(', ')}${suffix}` : 'заявка на материалы'
  return title && looksLikeGeneratedItemList ? 'Ортодонтия май расходники' : `${room?.title ?? 'Кабинет'}: ${base}`
}

function requestLineIssueStatus(line: SupplyRequestLine, isProcessed: boolean) {
  const missingQuantity = Math.max(line.quantity - line.issuedQuantity, 0)

  if (!isProcessed) {
    return { tone: 'info' as const, label: requestLineStatusLabels[line.status], rowClassName: '' }
  }

  if (missingQuantity <= 0) {
    return { tone: 'success' as const, label: 'Выдано', rowClassName: 'bg-emerald-50/70' }
  }

  if (line.issuedQuantity > 0) {
    return { tone: 'warning' as const, label: 'Выдано частично', rowClassName: 'bg-amber-50' }
  }

  if (line.status === 'manual-line' || line.status === 'needs-clarification') {
    return { tone: 'danger' as const, label: requestLineStatusLabels[line.status], rowClassName: 'bg-rose-50' }
  }

  return { tone: 'danger' as const, label: 'Не выдано', rowClassName: 'bg-rose-50' }
}

function ManualItemModal({
  initialName = '',
  onClose,
  onAdd,
}: {
  initialName?: string
  onClose: () => void
  onAdd: (name: string, quantity: number, comment: string) => void
}) {
  const [name, setName] = useState(initialName)
  const [quantity, setQuantity] = useState(2)
  const [comment, setComment] = useState('')

  return (
    <div className="app-modal-backdrop z-50 flex items-center justify-center px-4 backdrop-blur-sm">
      <div className="app-panel w-full max-w-lg rounded-lg border p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-normal text-slate-950">Позиция не найдена</div>
            <div className="mt-1 text-sm text-slate-500">Строка попадет в очередь разбора справочника.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
            aria-label="Закрыть"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="text-sm font-normal text-slate-700">
            Текст позиции
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={`mt-1 ${fieldStyles}`}
              placeholder="Насадка для нового наконечника"
            />
          </label>
          <label className="text-sm font-normal text-slate-700">
            Количество
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className={`mt-1 ${fieldStyles}`}
            />
          </label>
          <label className="text-sm font-normal text-slate-700">
            Комментарий
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className={`mt-1 min-h-20 resize-none ${fieldStyles}`}
              placeholder="не нашли в справочнике"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={() => {
              onAdd(name, quantity, comment)
              onClose()
            }}
            disabled={!name.trim()}
          >
            Добавить в заявку
          </Button>
        </div>
      </div>
    </div>
  )
}

function RequestPreviewModal({
  cart,
  catalog,
  room,
  comment,
  onClose,
  onConfirm,
}: {
  cart: RequestCartLine[]
  catalog: CatalogItem[]
  room?: Room
  comment: string
  onClose: () => void
  onConfirm: () => void
}) {
  const createdAt = formatDateTime(new Date().toISOString())
  const knownCount = cart.filter((line) => line.itemId).length
  const manualCount = cart.length - knownCount
  const totalQuantity = cart.reduce((sum, line) => sum + line.quantity, 0)

  return (
    <div className="app-modal-backdrop z-50 flex items-center justify-center px-4 py-6 backdrop-blur-sm">
      <div className="app-panel flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xl font-normal text-slate-950">Проверка заявки перед отправкой</div>
            <div className="mt-1 text-sm text-slate-500">Проверьте состав и подтвердите отправку старшей медсестре.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
            aria-label="Закрыть"
          >
            <X size={17} />
          </button>
        </div>

        <div className="min-h-0 overflow-auto px-5 py-4">
          <div className="app-soft-card grid gap-3 rounded-lg border p-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="text-xs font-normal uppercase tracking-wide text-slate-400">Кабинет</div>
              <div className="mt-1 font-normal text-slate-950">{room ? `${room.number} · ${room.title}` : 'Кабинет не выбран'}</div>
              <div className="mt-0.5 text-xs text-slate-500">{room?.type}</div>
            </div>
            <div>
              <div className="text-xs font-normal uppercase tracking-wide text-slate-400">Ответственный</div>
              <div className="mt-1 font-normal text-slate-950">{room?.nurseName ?? 'Не указан'}</div>
              <div className="mt-0.5 text-xs text-slate-500">Отправка старшей медсестре</div>
            </div>
            <div>
              <div className="text-xs font-normal uppercase tracking-wide text-slate-400">Состав</div>
              <div className="mt-1 font-normal text-slate-950">Строк: {cart.length}</div>
              <div className="mt-0.5 text-xs text-slate-500">Из справочника: {knownCount}, ручных: {manualCount}</div>
            </div>
            <div>
              <div className="text-xs font-normal uppercase tracking-wide text-slate-400">Дата формирования</div>
              <div className="mt-1 font-normal text-slate-950">{createdAt}</div>
              <div className="mt-0.5 text-xs text-slate-500">Всего единиц: {formatNumber(totalQuantity)}</div>
            </div>
          </div>

          {comment.trim() ? (
            <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <span className="font-normal">Комментарий: </span>
              {comment}
            </div>
          ) : null}

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-[5%]" />
                <col className="w-[38%]" />
                <col className="w-[17%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[22%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className={cn(requestTableHeaderCell, '!px-2 text-center')}>№</th>
                  <th className={requestTableHeaderCell}>Наименование</th>
                  <th className={requestTableHeaderCell}>Раздел</th>
                  <th className={cn(requestTableHeaderCell, 'text-center')}>Кол-во</th>
                  <th className={cn(requestTableHeaderCell, 'text-center')}>Ед.</th>
                  <th className={requestTableHeaderCell}>Упаковка</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((line, index) => {
                  const item = line.itemId ? catalog.find((candidate) => candidate.id === line.itemId) : undefined

                  return (
                    <tr key={line.id} className={index % 2 ? 'bg-white' : 'bg-slate-50/45'}>
                      <td className={cn(requestTableCell, 'text-center text-slate-500')}>{index + 1}</td>
                      <td className={requestTableCell}>
                        <div className="font-normal text-slate-950">{item ? catalogItemProfessionalName(item) : line.manualName}</div>
                        <div className="mt-0.5 text-[11px] leading-4 text-slate-500">
                          {item ? `${item.category}, ${item.unit}` : 'Ручная строка для разбора справочника'}
                        </div>
                      </td>
                      <td className={requestTableCell}>{item?.category ?? 'Ручная'}</td>
                      <td className={cn(requestTableCell, 'text-center font-normal text-slate-950')}>{formatNumber(line.quantity)}</td>
                      <td className={cn(requestTableCell, 'text-center')}>{item?.unit ?? 'шт'}</td>
                      <td className={requestTableCell}>{item?.packageLabel ?? 'Требует уточнения'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
          <Button onClick={onConfirm} disabled={!cart.length}>
            Подтвердить
          </Button>
        </div>
      </div>
    </div>
  )
}

function RequestSubmitDoneModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="app-modal-backdrop z-[60] flex items-center justify-center px-4 py-6 backdrop-blur-sm">
      <div className="app-panel flex w-full max-w-md flex-col items-center rounded-xl border px-7 py-7 text-center shadow-2xl">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 size={32} />
        </div>
        <div className="mt-4 text-2xl font-normal text-slate-950">Готово</div>
        <div className="mt-2 text-sm leading-6 text-slate-600">
          Заявка отправлена старшей медсестре.
        </div>
        <Button className="mt-6 w-full max-w-48" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </div>
  )
}

function RequestCart({
  cart,
  catalog,
  onUpdate,
  onRemove,
  onSubmit,
  onDemo,
}: {
  cart: RequestCartLine[]
  catalog: CatalogItem[]
  onUpdate: (lineId: string, patch: Partial<RequestCartLine>) => void
  onRemove: (lineId: string) => void
  onSubmit: (comment: string) => void
  onDemo: () => void
}) {
  const [comment, setComment] = useState('')

  return (
    <Panel className="flex h-full min-h-0 flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white">
        <div className="min-w-0 px-3 py-2.5">
          <div className="text-base font-normal text-slate-950">Заявка</div>
          <div className="text-xs text-slate-500">Строк: {cart.length}</div>
        </div>
        <div className="mr-3 flex shrink-0 items-center gap-2">
          <Button variant="secondary" className="min-h-8 px-2 py-1 text-xs" onClick={onDemo}>
            Демо
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <table className="w-full table-fixed border-separate border-spacing-0">
          <colgroup>
            <col className="w-[10%]" />
            <col className="w-[56%]" />
            <col className="w-[22%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr>
              <th className={cn(requestTableHeaderCell, '!px-1 text-center')}>№</th>
              <th className={requestTableHeaderCell}>Наименование</th>
              <th className={cn(requestTableHeaderCell, 'whitespace-nowrap text-center')}>К-во</th>
              <th className={cn(requestTableHeaderCell, '!px-1 text-center')}></th>
            </tr>
          </thead>
          <tbody>
            {cart.length ? (
              cart.map((line, index) => {
                const item = line.itemId ? catalog.find((candidate) => candidate.id === line.itemId) : undefined

                return (
                  <tr key={line.id} className={index % 2 ? 'bg-white' : 'bg-slate-50/35'}>
                    <td className={cn(requestTableCell, '!px-1 text-center text-slate-500')}>{index + 1}</td>
                    <td className={requestTableCell}>
                      <div className="min-w-0">
                        <div className="break-words font-normal text-slate-950" title={item ? catalogItemProfessionalName(item) : line.manualName}>
                          {item ? catalogItemProfessionalName(item) : line.manualName}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {item ? `${item.category}, ${item.unit}` : 'Ручная строка'}
                        </div>
                      </div>
                    </td>
                    <td className={cn(requestTableCell, '!px-1')}>
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(event) => onUpdate(line.id, { quantity: Number(event.target.value) })}
                        className="h-7 w-full rounded-md border border-slate-200 bg-white px-1.5 text-center text-xs text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                      />
                    </td>
                    <td className={cn(requestTableCell, '!px-1 text-center')}>
                      <button
                        type="button"
                        onClick={() => onRemove(line.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
                        aria-label="Удалить строку"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={4} className="whitespace-normal break-words px-4 py-10 text-center text-sm leading-5 text-slate-500">
                  Заявка пока пустая. Выберите позиции в каталоге слева.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 border-t border-slate-200 bg-white p-3">
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className={`min-h-16 resize-none ${fieldStyles}`}
          placeholder="Комментарий"
        />
        <div className="grid gap-2">
          <Button className="min-h-8 px-2 py-1 text-xs" disabled={!cart.length} onClick={() => onSubmit(comment)}>
            Сформировать
          </Button>
        </div>
      </div>
    </Panel>
  )
}

export function NurseCabinetPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    state: { role, rooms, catalog, requests, carts },
    addCatalogToCart,
    addManualLineToCart,
    updateCartLine,
    removeCartLine,
    submitRequest,
    loadRequestDraft,
  } = useDemo()
  const room = getRoomByRole(rooms, role)
  const roomId = roleToRoomId(role)
  const cart = roomId ? carts[roomId] ?? [] : []
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Все')
  const [isManualOpen, setManualOpen] = useState(false)
  const [manualInitialName, setManualInitialName] = useState('')
  const [isPreviewOpen, setPreviewOpen] = useState(false)
  const [previewComment, setPreviewComment] = useState('')
  const [isSubmitLoading, setSubmitLoading] = useState(false)
  const [isSubmitDoneOpen, setSubmitDoneOpen] = useState(false)
  const [expandedGroupIds, setExpandedGroupIds] = useState<Record<string, boolean>>({})
  const [selectedHistoryRequestId, setSelectedHistoryRequestId] = useState<string | null>(null)

  useEffect(() => {
    if (!isSubmitLoading) return

    const timer = window.setTimeout(() => {
      submitRequest(previewComment)
      navigate('/cabinet#request', { replace: true })
      setPreviewComment('')
      setSubmitLoading(false)
      setSubmitDoneOpen(true)
    }, submitLoadingMs)

    return () => window.clearTimeout(timer)
  }, [isSubmitLoading, navigate, previewComment, submitRequest])

  const categories = useMemo(
    () => [
      'Все',
      ...Array.from(new Set(catalog.filter((item) => item.active).map((item) => item.category))).sort(
        (left, right) => (catalogCategoryRank.get(left) ?? 999) - (catalogCategoryRank.get(right) ?? 999) || left.localeCompare(right, 'ru'),
      ),
    ],
    [catalog],
  )
  const activeCatalog = useMemo(
    () =>
      catalog
        .filter((item) => item.active)
        .sort((left, right) => {
          const leftRank = catalogSortRank(left)
          const rightRank = catalogSortRank(right)

          return (
            leftRank.category - rightRank.category ||
            leftRank.group - rightRank.group ||
            leftRank.name.localeCompare(rightRank.name, 'ru')
          )
        }),
    [catalog],
  )
  const visibleCatalog = useMemo(() => {
    return activeCatalog
      .filter((item) => {
        const group = catalogGroupByItemId.get(item.id)
        return matchesQuery(item, query) || Boolean(group && matchesGroupQuery(group, query))
      })
      .filter((item) => category === 'Все' || item.category === category)
  }, [activeCatalog, category, query])
  const catalogDisplayRows = useMemo<CatalogDisplayRow[]>(() => {
    const itemById = new Map(activeCatalog.map((item) => [item.id, item]))
    const visibleItemById = new Map(visibleCatalog.map((item) => [item.id, item]))
    const addedGroupIds = new Set<string>()
    const rows: CatalogDisplayRow[] = []

    visibleCatalog.forEach((item) => {
      const group = catalogGroupByItemId.get(item.id)

      if (!group) {
        rows.push({ type: 'item', item })
        return
      }

      if (addedGroupIds.has(group.id)) return

      const groupMatchesQuery = matchesGroupQuery(group, query)
      const groupItems = group.itemIds
        .map((itemId) => visibleItemById.get(itemId))
        .filter((candidate): candidate is CatalogItem => Boolean(candidate))
      const totalVariants = group.itemIds
        .map((itemId) => itemById.get(itemId))
        .filter((candidate): candidate is CatalogItem => Boolean(candidate))
        .filter((candidate) => category === 'Все' || candidate.category === category).length

      if (totalVariants < 2 || groupItems.length < 2) {
        groupItems.forEach((variant) => rows.push({ type: 'item', item: variant }))
        addedGroupIds.add(group.id)
        return
      }

      rows.push({ type: 'group', group, items: groupItems, totalVariants: groupMatchesQuery ? totalVariants : groupItems.length })

      if (expandedGroupIds[group.id]) {
        groupItems.forEach((variant) => rows.push({ type: 'item', item: variant, nested: true }))
      }

      addedGroupIds.add(group.id)
    })

    return rows
  }, [activeCatalog, category, expandedGroupIds, query, visibleCatalog])
  const cartLineByItem = useMemo(() => {
    const result = new Map<string, RequestCartLine>()
    cart.forEach((line) => {
      if (line.itemId) result.set(line.itemId, line)
    })
    return result
  }, [cart])
  const frequentItems = useMemo(() => {
    const frequentIds = roomId ? frequentItemIdsByRoomId[roomId] ?? [] : []
    return frequentIds
      .map((itemId) => activeCatalog.find((item) => item.id === itemId))
      .filter((item): item is CatalogItem => Boolean(item))
  }, [activeCatalog, roomId])
  const myRequests = requests.filter((request) => request.roomId === roomId)
  const selectedHistoryRequest = selectedHistoryRequestId
    ? myRequests.find((request) => request.id === selectedHistoryRequestId)
    : undefined

  function openManualItem(initialName = '') {
    setManualInitialName(initialName.trim())
    setManualOpen(true)
  }

  function loadOrthodonticDemo() {
    loadRequestDraft(orthodonticDemoRequestId)
    setQuery('')
    setCategory('Все')
  }

  function openRequestPreview(comment: string) {
    if (!cart.length) return

    navigate('/cabinet#request', { replace: true })
    setSubmitDoneOpen(false)
    setPreviewComment(comment)
    setPreviewOpen(true)
  }

  function confirmRequestSubmit() {
    setPreviewOpen(false)
    setSubmitDoneOpen(false)
    setSubmitLoading(true)
  }

  function updateCatalogLineQuantity(line: RequestCartLine, quantity: number) {
    if (quantity < 1) {
      removeCartLine(line.id)
      return
    }

    updateCartLine(line.id, { quantity })
  }

  function toggleCatalogGroup(groupId: string) {
    setExpandedGroupIds((current) => ({ ...current, [groupId]: !current[groupId] }))
  }

  function renderCatalogItemAction(item: CatalogItem) {
    const cartLine = cartLineByItem.get(item.id)

    if (cartLine) {
      return (
        <div className="inline-flex h-7 items-center overflow-hidden rounded-md border border-emerald-200 bg-white text-xs">
          <button
            type="button"
            onClick={() => updateCatalogLineQuantity(cartLine, cartLine.quantity - 1)}
            className="flex h-7 w-7 items-center justify-center text-slate-600 transition hover:bg-slate-50"
            aria-label="Уменьшить количество"
          >
            -
          </button>
          <input
            type="number"
            min={1}
            value={cartLine.quantity}
            onChange={(event) => updateCatalogLineQuantity(cartLine, Number(event.target.value))}
            className="h-7 w-10 border-x border-emerald-100 text-center text-xs font-normal text-slate-950 outline-none"
            aria-label="Количество в заявке"
          />
          <button
            type="button"
            onClick={() => addCatalogToCart(item.id, 1)}
            className="flex h-7 w-7 items-center justify-center text-emerald-800 transition hover:bg-emerald-50"
            aria-label="Увеличить количество"
          >
            +
          </button>
        </div>
      )
    }

    return (
      <button
        type="button"
        onClick={() => addCatalogToCart(item.id, 1)}
        className="inline-flex min-h-6 items-center justify-center gap-1 rounded-md border border-emerald-300 bg-white px-2 text-xs text-emerald-800 transition hover:bg-emerald-50"
      >
        <Plus size={13} />
        Добавить
      </button>
    )
  }

  const cabinetSubtitle = [room?.title, room?.type].filter(Boolean).join(' · ')

  if (!location.hash) {
    const dashboardItems = [
      {
        to: '/cabinet#request',
        title: 'Заявка',
        caption: 'Найти материалы и отправить новую заявку',
        meta: cart.length ? `${cart.length} строк в корзине` : 'Корзина пуста',
        icon: Home,
      },
      {
        to: '/cabinet#my-requests',
        title: 'История заявок',
        caption: 'Посмотреть отправленные заявки и статусы',
        meta: `${myRequests.length} заявок кабинета`,
        icon: ClipboardList,
      },
    ]

    return (
      <PageTransition className="grid gap-4">
        <Panel>
          <SectionHeader
            title={`Кабинет ${room?.number ?? ''}`}
            subtitle={cabinetSubtitle}
          />
        </Panel>

        <section className="app-panel grid min-h-[360px] content-start gap-3 rounded-lg border p-4">
          <div>
            <h2 className="text-xl font-normal text-slate-950">Выберите, с чего начать</h2>
            <p className="mt-1 text-sm text-slate-500">Главная кабинета</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboardItems.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="app-soft-card group min-h-[150px] rounded-lg border p-4 transition hover:border-emerald-200 hover:bg-emerald-50/60 hover:shadow-sm"
                >
                  <div className="app-soft-card flex h-10 w-10 items-center justify-center rounded-md border text-emerald-800 transition group-hover:border-emerald-200">
                    <Icon size={20} />
                  </div>
                  <div className="mt-4 text-lg font-normal text-slate-950">{item.title}</div>
                  <div className="mt-1 text-sm leading-5 text-slate-500">{item.caption}</div>
                  <div className="mt-4 text-xs font-normal uppercase tracking-wide text-slate-400">{item.meta}</div>
                </Link>
              )
            })}
          </div>
        </section>
      </PageTransition>
    )
  }

  return (
    <PageTransition className="h-full min-h-0 overflow-hidden">
      <section className="h-full min-h-0">
        {location.hash !== '#my-requests' ? (
          <>
        <div className="grid h-full min-h-0 gap-2 lg:ml-[194px] xl:grid-cols-[minmax(820px,1fr)_minmax(300px,360px)]">
          <div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="grid gap-2 border-b border-slate-200 bg-white p-2.5">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 shrink-0">
                  <div className="text-base font-normal text-slate-950">Каталог материалов</div>
                  <div className="text-xs text-slate-500">Найдено: {catalogDisplayRows.length}</div>
                </div>
                <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center">
                  <label className="relative w-full md:w-[420px] xl:w-[520px]">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className={`${fieldStyles} h-9 py-1.5 pl-8 text-xs`}
                      placeholder="Поиск: перчатки, композит, артикаин"
                    />
                  </label>
                  <Button variant="secondary" className="min-h-8 shrink-0 px-2 py-1 text-xs" onClick={() => openManualItem(query)}>
                    <Plus size={14} />
                    Позиция не найдена
                  </Button>
                </div>
              </div>
              {frequentItems.length ? (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
                  <span className="shrink-0 text-slate-400">Часто:</span>
                  {frequentItems.map((item) => {
                    const inCart = cartLineByItem.has(item.id)

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addCatalogToCart(item.id, 1)}
                        className={cn(
                          'shrink-0 rounded-md border px-2 py-1 transition',
                          inCart
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-[#b9decf] bg-white/64 text-[#587367] hover:border-emerald-200 hover:bg-white hover:text-emerald-900',
                        )}
                        title={catalogItemProfessionalName(item)}
                      >
                        {catalogItemProfessionalName(item)}
                      </button>
                    )
                  })}
                </div>
              ) : null}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {categories.map((item) => {
                  const active = category === item

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      className={cn(
                        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-normal transition',
                        active
                          ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                          : 'border-[#b9decf] bg-white/64 text-[#587367] hover:border-emerald-200 hover:bg-white hover:text-emerald-900',
                      )}
                    >
                      {item}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="h-full min-h-0 overflow-x-hidden overflow-y-auto">
              <table className="w-full table-fixed border-separate border-spacing-0">
                <colgroup>
                  <col className="w-[4%]" />
                  <col className="w-[60%]" />
                  <col className="w-[24%]" />
                  <col className="w-[12%]" />
                </colgroup>
              <thead>
                <tr>
                  <th className={cn(requestTableHeaderCell, '!px-1 !text-center')}>№</th>
                  <th className={requestTableHeaderCell}>Наименование</th>
                  <th className={requestTableHeaderCell}>Детали</th>
                  <th className={cn(requestTableHeaderCell, '!px-1 !text-center')}>Действие</th>
                </tr>
              </thead>
              <tbody>
                {catalogDisplayRows.map((row, index) => {
                    if (row.type === 'group') {
                      const expanded = Boolean(expandedGroupIds[row.group.id])
                      const selectedCount = row.items.filter((item) => cartLineByItem.has(item.id)).length

                      return (
                        <tr
                          key={row.group.id}
                          className="cursor-pointer border-b border-slate-100 bg-slate-50/45 transition hover:bg-slate-100/70"
                          onClick={() => toggleCatalogGroup(row.group.id)}
                        >
                          <td className={cn(requestTableCell, '!px-1 text-center text-xs text-slate-500')}>{index + 1}</td>
                          <td className={cn(requestTableCell, 'min-w-0')}>
                            <div className="flex min-w-0 items-start gap-2">
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm">
                                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </span>
                              <div className="min-w-0">
                                <div className="font-normal text-slate-950">{row.group.title}</div>
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                  {row.group.note} · {row.totalVariants} варианта
                                  {selectedCount ? ` · выбрано: ${selectedCount}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className={requestTableCell}>
                            <div className="text-slate-700">{getGroupCategoryLabel(row.items)}</div>
                            <div className="mt-0.5 text-[11px] leading-4 text-slate-500">{row.totalVariants} варианта для выбора</div>
                          </td>
                          <td className={cn(requestTableCell, '!px-1 text-center')}>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                toggleCatalogGroup(row.group.id)
                              }}
                              className="inline-flex min-h-6 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-normal text-slate-700 transition hover:bg-slate-50"
                            >
                              {expanded ? 'Свернуть' : 'Варианты'}
                            </button>
                          </td>
                        </tr>
                      )
                    }

                    const item = row.item
                    const cartLine = cartLineByItem.get(item.id)

                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          'transition hover:bg-slate-100/70',
                          row.nested && 'bg-white',
                          !row.nested && (cartLine ? 'bg-emerald-50/85' : index % 2 ? 'bg-white' : 'bg-slate-50/35'),
                          row.nested && cartLine && 'bg-emerald-50/80',
                        )}
                      >
                        <td className={cn(requestTableCell, '!px-1 text-center text-xs text-slate-500')}>{row.nested ? '' : index + 1}</td>
                        <td className={cn(requestTableCell, 'min-w-0')}>
                          <div className={cn('flex min-w-0 items-start gap-1.5', row.nested && 'pl-7')}>
                            <div className="min-w-0 flex-1">
                              <div className="whitespace-normal break-words font-normal text-slate-950" title={catalogItemProfessionalName(item)}>
                                {catalogItemProfessionalName(item)}
                              </div>
                              <div className="mt-0.5 text-[11px] leading-4 text-slate-500">{item.category} · ед.: {item.unit}</div>
                            </div>
                          </div>
                        </td>
                        <td className={requestTableCell}>{item.packageLabel}</td>
                        <td className={cn(requestTableCell, '!px-1 whitespace-nowrap text-center')}>{renderCatalogItemAction(item)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {!catalogDisplayRows.length ? (
              <EmptyState className="m-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <span>По этим фильтрам позиций нет.</span>
                  {query.trim() ? (
                    <Button variant="secondary" className="min-h-8 shrink-0 px-2 py-1 text-xs" onClick={() => openManualItem(query)}>
                      <Plus size={14} />
                      Добавить как ручную
                    </Button>
                  ) : null}
                </div>
              </EmptyState>
            ) : null}
          </div>

          <aside className="h-full min-h-0 min-w-0">
            <RequestCart
              cart={cart}
              catalog={catalog}
              onUpdate={updateCartLine}
              onRemove={removeCartLine}
              onSubmit={openRequestPreview}
              onDemo={loadOrthodonticDemo}
            />
          </aside>
        </div>
          </>
        ) : null}

        {location.hash === '#my-requests' ? (
        <Panel id="my-requests" className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-0">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {selectedHistoryRequest ? (
                  <button
                    type="button"
                    onClick={() => setSelectedHistoryRequestId(null)}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 transition hover:bg-slate-50"
                  >
                    <ArrowLeft size={14} />
                    К списку
                  </button>
                ) : null}
                <div className="text-lg font-normal text-slate-950">
                  {selectedHistoryRequest ? requestDisplayTitle(selectedHistoryRequest, catalog, room) : 'Мои заявки'}
                </div>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {selectedHistoryRequest
                  ? `${formatDateTime(selectedHistoryRequest.createdAt)} · ${selectedHistoryRequest.lines.length} позиций`
                  : `История кабинета ${room?.number}`}
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-auto p-3">
            {selectedHistoryRequest ? (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <table className="w-full table-fixed border-separate border-spacing-0">
                  <colgroup>
                    <col className="w-[4%]" />
                    <col className="w-[34%]" />
                    <col className="w-[12%]" />
                    <col className="w-[9%]" />
                    <col className="w-[9%]" />
                    <col className="w-[8%]" />
                    <col className="w-[10%]" />
                    <col className="w-[14%]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(requestTableHeaderCell, '!px-1 !text-center')}>№</th>
                      <th className={requestTableHeaderCell}>Наименование</th>
                      <th className={cn(requestTableHeaderCell, '!text-center')}>Раздел</th>
                      <th className={cn(requestTableHeaderCell, '!text-center')}>Запрошено</th>
                      <th className={cn(requestTableHeaderCell, '!text-center')}>Выдано</th>
                      <th className={cn(requestTableHeaderCell, '!text-center')}>Ед.</th>
                      <th className={requestTableHeaderCell}>Упаковка</th>
                      <th className={cn(requestTableHeaderCell, '!text-center')}>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedHistoryRequest.lines.map((line, index) => {
                      const item = line.itemId ? catalog.find((candidate) => candidate.id === line.itemId) : undefined
                      const isProcessed = selectedHistoryRequest.status !== 'sent' && selectedHistoryRequest.status !== 'in-review'
                      const lineIssueStatus = requestLineIssueStatus(line, isProcessed)

                      return (
                        <tr key={line.id} className={cn(index % 2 ? 'bg-white' : 'bg-slate-50/35', lineIssueStatus.rowClassName)}>
                          <td className={cn(requestTableCell, '!px-1 text-center text-slate-500')}>{index + 1}</td>
                          <td className={requestTableCell}>
                            <div className="whitespace-normal break-words font-normal text-slate-950" title={item?.fullName ?? line.manualName}>
                              {item?.fullName ?? line.manualName ?? 'Ручная строка для разбора справочника'}
                            </div>
                            {line.seniorComment ? <div className="mt-1 text-[11px] leading-4 text-amber-800">{line.seniorComment}</div> : null}
                          </td>
                          <td className={requestTableCell}>{item?.category ?? 'Ручная'}</td>
                          <td className={cn(requestTableCell, 'text-center text-slate-950')}>{formatNumber(line.quantity)}</td>
                          <td className={cn(requestTableCell, 'text-center text-slate-950')}>{formatNumber(line.issuedQuantity)}</td>
                          <td className={cn(requestTableCell, 'text-center')}>{item?.unit ?? 'шт.'}</td>
                          <td className={requestTableCell}>{item?.packageLabel ?? 'Требует уточнения'}</td>
                          <td className={requestTableCell}>
                            <div className="flex justify-center">
                              <StatusPill tone={lineIssueStatus.tone}>{lineIssueStatus.label}</StatusPill>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <table className="w-full table-fixed border-separate border-spacing-0">
                  <colgroup>
                    <col className="w-[38%]" />
                    <col className="w-[15%]" />
                    <col className="w-[14%]" />
                    <col className="w-[16%]" />
                    <col className="w-[9%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={requestTableHeaderCell}>Название заявки</th>
                      <th className={cn(requestTableHeaderCell, '!text-center')}>Дата</th>
                      <th className={cn(requestTableHeaderCell, '!text-center')}>Статус</th>
                      <th className={cn(requestTableHeaderCell, '!text-center')}>Выдача</th>
                      <th className={cn(requestTableHeaderCell, '!text-center')}>Позиций</th>
                      <th className={cn(requestTableHeaderCell, '!text-center')}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map((request, index) => {
                      const issueSummary = requestIssueSummary(request)

                      return (
                        <tr
                          key={request.id}
                          onClick={() => setSelectedHistoryRequestId(request.id)}
                          className={cn('cursor-pointer transition hover:bg-slate-100/70', index % 2 ? 'bg-white' : 'bg-slate-50/35')}
                        >
                          <td className={cn(requestTableCell, 'min-w-0')}>
                            <div className="truncate font-normal text-slate-950" title={requestDisplayTitle(request, catalog, room)}>
                              {requestDisplayTitle(request, catalog, room)}
                            </div>
                          </td>
                          <td className={cn(requestTableCell, 'text-center')}>{formatDateTime(request.createdAt)}</td>
                          <td className={requestTableCell}>
                            <div className="flex justify-center">
                              <StatusPill tone={statusTone(request.status)}>{requestStatusLabels[request.status]}</StatusPill>
                            </div>
                          </td>
                          <td className={requestTableCell}>
                            <div className="flex justify-center">
                              <StatusPill tone={issueSummary.tone}>{issueSummary.label}</StatusPill>
                            </div>
                          </td>
                          <td className={cn(requestTableCell, 'text-center text-slate-950')}>{request.lines.length}</td>
                          <td className={cn(requestTableCell, '!px-1 text-center')}>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                setSelectedHistoryRequestId(request.id)
                              }}
                              className="inline-flex min-h-6 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-normal text-slate-700 transition hover:bg-slate-50"
                            >
                              Открыть
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!myRequests.length ? <EmptyState className="m-3">Заявок кабинета пока нет.</EmptyState> : null}
              </div>
            )}
          </div>
        </Panel>
        ) : null}
      </section>
      {isManualOpen ? (
        <ModalPortal>
          <ManualItemModal
            key={manualInitialName || 'empty-manual-item'}
            initialName={manualInitialName}
            onClose={() => setManualOpen(false)}
            onAdd={(name, quantity, comment) => addManualLineToCart(name, quantity, comment)}
          />
        </ModalPortal>
      ) : null}
      {isPreviewOpen ? (
        <ModalPortal>
          <RequestPreviewModal
            cart={cart}
            catalog={catalog}
            room={room}
            comment={previewComment}
            onClose={() => setPreviewOpen(false)}
            onConfirm={confirmRequestSubmit}
          />
        </ModalPortal>
      ) : null}
      {isSubmitLoading ? (
        <ModalPortal>
          <BrandedLoadingModal title="Формируем заявку" durationSeconds={submitLoadingMs / 1000} />
        </ModalPortal>
      ) : null}
      {isSubmitDoneOpen ? (
        <ModalPortal>
          <RequestSubmitDoneModal onClose={() => setSubmitDoneOpen(false)} />
        </ModalPortal>
      ) : null}
    </PageTransition>
  )
}
