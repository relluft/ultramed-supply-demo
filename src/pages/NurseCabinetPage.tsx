import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  ListFilter,
  Plus,
  Search,
  Star,
  Settings,
  Trash2,
  DoorOpen,
  X,
} from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ManualItemWorkspaceDialog,
  RequestPreviewWorkspaceDialog,
  RequestSubmitDoneWorkspaceDialog,
  RequestSubmitLoadingDialog,
} from '../components/NurseRequestDialogs'
import { PageTransition } from '../components/PageTransition'
import { EmptyState } from '../components/ui'
import {
  HorizontalScroller,
  IconButton,
  StatusBadge as StatusPill,
  Surface as Panel,
  TableFrame,
  TableViewport,
  WorkspaceButton as Button,
  WorkspaceDialog,
  WorkspacePortal,
  workspaceFieldClassName as fieldStyles,
  workspaceTableCell,
  workspaceTableHeaderCell,
} from '../components/workspace-v2'
import '../styles/nurse-cabinet-v2.css'
import { useDemo } from '../context'
import { getRoomByRole, requestLineStatusLabels, requestStatusLabels, roleToRoomId, statusTone } from '../lib/demoLogic'
import { cn, formatDateTime, formatNumber } from '../lib/format'
import type { CatalogItem, RequestCartLine, Room, SupplyRequest, SupplyRequestLine } from '../types/demo'

const orthodonticDemoRequestId = 'REQ-005'
const requestTableHeaderCell = workspaceTableHeaderCell
const requestTableCell = workspaceTableCell
const submitLoadingMs = 750
const requestCartMinimumWidth = 320
const requestCartDefaultWidth = 340
const requestCatalogMinimumWidth = 620
const requestCatalogResizeMinimumWidth = 320
const requestSeparatorWidth = 20
const requestStackThreshold =
  requestCatalogMinimumWidth + requestCartMinimumWidth + requestSeparatorWidth

type CSSVariables = CSSProperties & Record<`--${string}`, string>
function getRequestCartMaximumWidth(workspaceWidth: number) {
  return Math.max(
    requestCartMinimumWidth,
    workspaceWidth - requestCatalogResizeMinimumWidth - requestSeparatorWidth,
  )
}


function clampRequestCartWidth(width: number, workspaceWidth: number) {
  const maximumWidth = getRequestCartMaximumWidth(workspaceWidth)
  return Math.round(Math.min(Math.max(width, requestCartMinimumWidth), maximumWidth))
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

const clinicalCatalogDirections = new Set(['Ортодонтия', 'Ортопедия', 'Терапия', 'Хирургия'])

function catalogDirectionLabel(item: CatalogItem) {
  return clinicalCatalogDirections.has(item.category) ? item.category : 'Общее'
}

function getGroupDirectionLabel(items: CatalogItem[]) {
  const directions = Array.from(new Set(items.map(catalogDirectionLabel)))
  return directions.length === 1 ? directions[0] : 'Смешанное'
}

function getGroupUnitLabel(items: CatalogItem[]) {
  const units = Array.from(new Set(items.map((item) => item.unit)))
  return units.length === 1 ? units[0] : 'разн.'
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
    return { tone: 'info' as const, label: requestLineStatusLabels[line.status] }
  }

  if (missingQuantity <= 0) {
    return { tone: 'success' as const, label: 'Выдано' }
  }

  if (line.issuedQuantity > 0) {
    return { tone: 'warning' as const, label: 'Выдано частично' }
  }

  if (line.status === 'manual-line' || line.status === 'needs-clarification') {
    return { tone: 'danger' as const, label: requestLineStatusLabels[line.status] }
  }

  return { tone: 'danger' as const, label: 'Не выдано' }
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
              <div className="text-xs font-normal uppercase tracking-wide text-slate-400">Ответственная</div>
              <div className="mt-1 font-normal text-slate-950">Выбирается при создании заявки</div>
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
  room,
  responsibleNurse,
  onResponsibleNurseChange,
  onUpdate,
  onRemove,
  onSubmit,
  onDemo,
}: {
  cart: RequestCartLine[]
  catalog: CatalogItem[]
  room?: Room
  responsibleNurse: string
  onResponsibleNurseChange: (name: string) => void
  onUpdate: (lineId: string, patch: Partial<RequestCartLine>) => void
  onRemove: (lineId: string) => void
  onSubmit: (comment: string, responsibleNurse: string) => void
  onDemo: () => void
}) {
  const [comment, setComment] = useState('')
  const commentRef = useRef<HTMLTextAreaElement | null>(null)

  useLayoutEffect(() => {
    const textarea = commentRef.current
    if (!textarea) return

    textarea.style.height = '0px'
    const borderHeight = textarea.offsetHeight - textarea.clientHeight
    const contentHeight = textarea.scrollHeight + borderHeight
    const maximumHeight = 256
    textarea.style.height = `${Math.min(contentHeight, maximumHeight)}px`
    textarea.style.overflowY = contentHeight > maximumHeight ? 'auto' : 'hidden'
  }, [comment])

  return (
    <div className="nurse-cart">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white">
        <div className="min-w-0 px-3 py-2.5">
          <div className="text-base font-normal text-slate-950">Заявка</div>
          <div className="text-xs text-slate-500">Строк: {cart.length}</div>
        </div>
        <div className="mr-3 flex shrink-0 items-center gap-2">
          <Button variant="secondary" className="px-2 text-xs" onClick={onDemo}>
            Демо
          </Button>
        </div>
      </div>

      <TableViewport label="Состав заявки" className="nurse-cart-body">
        <table className="nurse-cart-table w-full table-fixed border-separate border-spacing-0">
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
                        className={cn(fieldStyles, 'w-full px-1.5 text-center text-xs')}
                        aria-label={`Количество: ${item ? catalogItemProfessionalName(item) : line.manualName}`}
                      />
                    </td>
                    <td className={cn(requestTableCell, '!px-1 text-center')}>
                      <IconButton
                        onClick={() => onRemove(line.id)}
                        variant="ghost"
                        className="text-slate-600 hover:text-rose-800"
                        aria-label="Удалить строку"
                      >
                        <Trash2 size={14} />
                      </IconButton>
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
      </TableViewport>

      <div className="grid gap-2.5 border-t border-slate-200 bg-slate-50/60 p-3">
        <div className="grid gap-1.5">
          <label htmlFor="responsible-nurse" className="w-fit text-sm font-medium text-slate-900">
            Ответственный
          </label>
          <select
            id="responsible-nurse"
            value={responsibleNurse}
            onChange={(event) => onResponsibleNurseChange(event.target.value)}
            className={cn(fieldStyles, 'border-slate-300 bg-white shadow-sm')}
            required
          >
            <option value="">Выбрать</option>
            {(room?.nurseNames ?? []).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="request-comment" className="w-fit text-sm font-medium text-slate-900">
            Комментарий
          </label>
          <textarea
            ref={commentRef}
            id="request-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={5}
            className={cn(fieldStyles, 'nurse-request-comment resize-none overflow-x-hidden border-slate-300 bg-white py-2.5 leading-5 shadow-sm')}
          />
        </div>
        <div className="grid gap-2">
          <Button
            className="px-2 text-xs"
            disabled={!cart.length || !responsibleNurse}
            onClick={() => onSubmit(comment, responsibleNurse)}
          >
            Сформировать
          </Button>
        </div>
      </div>
    </div>
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
  const [catalogUnit, setCatalogUnit] = useState('Все')
  const [catalogPositionType, setCatalogPositionType] = useState<'all' | 'grouped' | 'single'>('all')
  const [onlyRequestItems, setOnlyRequestItems] = useState(false)
  const [favoriteCatalogItemIds, setFavoriteCatalogItemIds] = useState<Set<string>>(() => new Set())
  const [onlyFavoriteItems, setOnlyFavoriteItems] = useState(false)
  const [isCatalogFiltersOpen, setCatalogFiltersOpen] = useState(false)
  const [isManualOpen, setManualOpen] = useState(false)
  const [manualInitialName, setManualInitialName] = useState('')
  const [isPreviewOpen, setPreviewOpen] = useState(false)
  const [previewComment, setPreviewComment] = useState('')
  const [responsibleNurse, setResponsibleNurse] = useState('')
  const [previewResponsibleNurse, setPreviewResponsibleNurse] = useState('')
  const [isSubmitLoading, setSubmitLoading] = useState(false)
  const [isSubmitDoneOpen, setSubmitDoneOpen] = useState(false)
  const [expandedGroupIds, setExpandedGroupIds] = useState<Record<string, boolean>>({})
  const [selectedHistoryRequestId, setSelectedHistoryRequestId] = useState<string | null>(null)
  const [cartPanelWidth, setCartPanelWidth] = useState(requestCartDefaultWidth)
  const [requestWorkspaceWidth, setRequestWorkspaceWidth] = useState(0)
  const requestWorkspaceRef = useRef<HTMLDivElement>(null)
  const cartResizeRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null)
  const isRequestWorkspace = location.hash === '#request'
  const isRequestStacked = requestWorkspaceWidth > 0 && requestWorkspaceWidth < requestStackThreshold

  useEffect(() => {
    if (!isSubmitLoading) return

    const timer = window.setTimeout(() => {
      submitRequest(previewResponsibleNurse, previewComment)
      navigate('/cabinet#request', { replace: true })
      setPreviewComment('')
      setResponsibleNurse('')
      setPreviewResponsibleNurse('')
      setPreviewOpen(false)
      setSubmitLoading(false)
      setSubmitDoneOpen(true)
    }, submitLoadingMs)

    return () => window.clearTimeout(timer)
  }, [isSubmitLoading, navigate, previewComment, previewResponsibleNurse, submitRequest])

  useLayoutEffect(() => {
    if (!isRequestWorkspace) return undefined

    const workspace = requestWorkspaceRef.current
    if (!workspace) return undefined

    const syncWidth = () => {
      const width = workspace.clientWidth
      setRequestWorkspaceWidth(width)
      setCartPanelWidth((current) => clampRequestCartWidth(current, width))
    }

    syncWidth()

    const observer = new ResizeObserver(syncWidth)
    observer.observe(workspace)

    return () => observer.disconnect()
  }, [isRequestWorkspace])

  useEffect(
    () => () => {
      document.body.style.userSelect = ''
    },
    [],
  )

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
  const catalogUnits = useMemo(
    () => ['Все', ...Array.from(new Set(activeCatalog.map((item) => item.unit))).sort((left, right) => left.localeCompare(right, 'ru'))],
    [activeCatalog],
  )
  const clinicalDirections = useMemo(
    () => categories.filter((item) => ['Ортодонтия', 'Ортопедия', 'Терапия', 'Хирургия'].includes(item)),
    [categories],
  )
  const materialTypes = useMemo(
    () => categories.filter((item) => item !== 'Все' && !clinicalDirections.includes(item)),
    [categories, clinicalDirections],
  )
  const cartItemIds = useMemo(
    () => new Set(cart.map((line) => line.itemId).filter((itemId): itemId is string => Boolean(itemId))),
    [cart],
  )
  const visibleCatalog = useMemo(() => {
    return activeCatalog
      .filter((item) => {
        const group = catalogGroupByItemId.get(item.id)
        return matchesQuery(item, query) || Boolean(group && matchesGroupQuery(group, query))
      })
      .filter((item) => category === 'Все' || item.category === category)
      .filter((item) => catalogUnit === 'Все' || item.unit === catalogUnit)
      .filter((item) => {
        const grouped = catalogGroupByItemId.has(item.id)
        if (catalogPositionType === 'grouped') return grouped
        if (catalogPositionType === 'single') return !grouped
        return true
      })
      .filter((item) => !onlyRequestItems || cartItemIds.has(item.id))
      .filter((item) => !onlyFavoriteItems || favoriteCatalogItemIds.has(item.id))
  }, [activeCatalog, cartItemIds, catalogPositionType, catalogUnit, category, favoriteCatalogItemIds, onlyFavoriteItems, onlyRequestItems, query])
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
  const activeCatalogFilterCount =
    Number(category !== 'Все') +
    Number(catalogUnit !== 'Все') +
    Number(catalogPositionType !== 'all') +
    Number(onlyRequestItems) +
    Number(onlyFavoriteItems)
  const cartLineByItem = useMemo(() => {
    const result = new Map<string, RequestCartLine>()
    cart.forEach((line) => {
      if (line.itemId) result.set(line.itemId, line)
    })
    return result
  }, [cart])
  const myRequests = requests.filter((request) => request.roomId === roomId)
  const latestRequest = [...myRequests].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )[0]
  const latestRequestIssue = latestRequest ? requestIssueSummary(latestRequest) : undefined
  const latestRequestStatus = latestRequest
    ? latestRequest.status === 'sent' ||
      latestRequest.status === 'in-review' ||
      latestRequest.status === 'issued' ||
      latestRequest.status === 'partially-issued'
      ? latestRequestIssue
      : { tone: statusTone(latestRequest.status), label: requestStatusLabels[latestRequest.status] }
    : undefined
  const latestRequestTitle = latestRequest
    ? latestRequest.title?.trim().replace(/_/g, ' ') || requestDisplayTitle(latestRequest, catalog, room)
    : undefined
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

  function openRequestPreview(comment: string, selectedResponsible: string) {
    if (!cart.length || !room?.nurseNames.includes(selectedResponsible)) return

    navigate('/cabinet#request', { replace: true })
    setSubmitDoneOpen(false)
    setPreviewComment(comment)
    setPreviewResponsibleNurse(selectedResponsible)
    setPreviewOpen(true)
  }

  function confirmRequestSubmit() {
    setPreviewOpen(false)
    setSubmitDoneOpen(false)
    setSubmitLoading(true)
  }

  function cancelRequestSubmit() {
    setSubmitLoading(false)
    setPreviewOpen(true)
  }

  function updateCatalogLineQuantity(line: RequestCartLine, quantity: number) {
    if (quantity < 1) {
      removeCartLine(line.id)
      return
    }

    updateCartLine(line.id, { quantity })
  }

  function updateCartPanelWidth(width: number) {
    const workspaceWidth = requestWorkspaceRef.current?.clientWidth ?? requestWorkspaceWidth
    setCartPanelWidth(clampRequestCartWidth(width, workspaceWidth))
  }

  function finishCartResize(pointerId: number) {
    if (cartResizeRef.current?.pointerId !== pointerId) return

    cartResizeRef.current = null
    document.body.style.userSelect = ''
  }

  function handleCartResizeStart(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    cartResizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: cartPanelWidth,
    }
    document.body.style.userSelect = 'none'
  }

  function handleCartResizeMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const resize = cartResizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) return

    updateCartPanelWidth(resize.startWidth + resize.startX - event.clientX)
  }

  function handleCartResizeKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const maximumWidth = getRequestCartMaximumWidth(requestWorkspaceWidth)
    const step = 32
    let nextWidth: number | null = null

    if (event.key === 'ArrowLeft') nextWidth = cartPanelWidth + step
    if (event.key === 'ArrowRight') nextWidth = cartPanelWidth - step
    if (event.key === 'Home') nextWidth = requestCartMinimumWidth
    if (event.key === 'End') nextWidth = maximumWidth

    if (nextWidth === null) return

    event.preventDefault()
    updateCartPanelWidth(nextWidth)
  }

  function toggleCatalogGroup(groupId: string) {
    setExpandedGroupIds((current) => ({ ...current, [groupId]: !current[groupId] }))
  }

  function toggleFavoriteCatalogItems(itemIds: string[]) {
    setFavoriteCatalogItemIds((current) => {
      const next = new Set(current)
      const removeItems = itemIds.every((itemId) => next.has(itemId))
      itemIds.forEach((itemId) => removeItems ? next.delete(itemId) : next.add(itemId))
      return next
    })
  }

  function toggleFavoriteCatalogItem(itemId: string) {
    toggleFavoriteCatalogItems([itemId])
  }


  function renderCatalogItemAction(item: CatalogItem) {
    const cartLine = cartLineByItem.get(item.id)

    if (cartLine) {
      return (
        <div className="nurse-catalog-stepper">
          <IconButton
            onClick={() => updateCatalogLineQuantity(cartLine, cartLine.quantity - 1)}
            className="rounded-none text-slate-700"
            aria-label="Уменьшить количество"
          >
            -
          </IconButton>
          <input
            type="number"
            min={1}
            value={cartLine.quantity}
            onChange={(event) => updateCatalogLineQuantity(cartLine, Number(event.target.value))}
            className={cn(fieldStyles, 'nurse-catalog-quantity')}
            aria-label="Количество в заявке"
          />
          <IconButton
            onClick={() => addCatalogToCart(item.id, 1)}
            className="rounded-none text-emerald-800"
            aria-label="Увеличить количество"
          >
            +
          </IconButton>
        </div>
      )
    }

    return (
      <Button
        variant="secondary"
        onClick={() => addCatalogToCart(item.id, 1)}
        className="shrink-0 px-2 text-xs"
      >
        <Plus size={13} />
        Добавить
      </Button>
    )
  }

  if (!location.hash) {
    return (
      <PageTransition respectReducedMotion className="nurse-page nurse-home flex min-h-full">
        <section className="nurse-home-card flex w-full flex-1 flex-col justify-center overflow-hidden border px-5 py-8 sm:px-9 sm:py-10 lg:px-14 lg:py-12">
          <div className="flex justify-center">
            <div className="nurse-home-kicker inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13px] font-medium">
              <DoorOpen size={15} className="nurse-home-accent shrink-0" />
              <span>{room?.title ?? 'Стоматологический кабинет'}</span>
            </div>
          </div>

          <div className="mt-5 text-center">
            <h1 className="nurse-home-title display-title text-[34px] sm:text-[40px] md:text-[44px]">
              Кабинет {room?.number ?? '—'}
            </h1>
            <p className="nurse-home-muted mx-auto mt-3 max-w-[520px] text-[15px] leading-6">
              Заявки, статусы и материалы кабинета — в одном месте
            </p>
          </div>

          <div className="mt-7 flex justify-center">
            <Link
              to="/cabinet#request"
              className="nurse-home-primary inline-flex min-h-[56px] w-full max-w-[420px] items-center justify-center gap-2.5 rounded-[9px] border px-5 text-center text-[18px] font-medium sm:text-[19px]"
            >
              <Plus size={19} strokeWidth={2} />
              Создать новую заявку
            </Link>
          </div>

          <div className="nurse-home-latest mx-auto mt-9 w-full max-w-[940px] border-y py-4" role="status">
            {latestRequest && latestRequestStatus ? (
              <div className="grid items-center gap-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                <span className="nurse-home-muted text-[11px] font-semibold uppercase tracking-[0.08em]">Последняя заявка</span>
                <div className="nurse-home-kicker min-w-0 truncate text-sm">
                  <span className="nurse-home-request-id font-semibold">{latestRequest.id}</span>
                  <span className="nurse-home-separator mx-1.5" aria-hidden="true">·</span>
                  <span>{formatDateTime(latestRequest.createdAt)}</span>
                  <span className="nurse-home-separator mx-1.5" aria-hidden="true">·</span>
                  <span>{latestRequest.createdBy}</span>
                  <span className="nurse-home-separator mx-1.5" aria-hidden="true">·</span>
                  <span>{latestRequest.lines.length} позиций</span>
                  {latestRequestTitle ? (
                    <>
                      <span className="nurse-home-separator mx-1.5" aria-hidden="true">·</span>
                      <span title={latestRequestTitle}>{latestRequestTitle}</span>
                    </>
                  ) : null}
                </div>
                <StatusPill tone={latestRequestStatus.tone} className="justify-self-start whitespace-nowrap sm:justify-self-end">
                  {latestRequestStatus.label}
                </StatusPill>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="nurse-home-muted text-[11px] font-semibold uppercase tracking-[0.08em]">Последняя заявка</span>
                <span className="nurse-home-muted text-sm">Заявок пока нет</span>
              </div>
            )}
          </div>

          <nav className="mx-auto mt-5 grid w-full max-w-[940px] gap-3 sm:grid-cols-3" aria-label="Быстрые действия">
            <Link to="/cabinet#my-requests" className="nurse-home-quick-link">
              <span className="nurse-home-quick-icon">
                <ClipboardList size={20} />
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-[15px] font-semibold leading-5">История</span>
                <span className="nurse-home-caption block text-xs font-medium leading-tight">Заявки и статусы</span>
              </span>
            </Link>
            <Link to="/cabinet/materials" className="nurse-home-quick-link">
              <span className="nurse-home-quick-icon">
                <BookOpen size={20} />
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-[15px] font-semibold leading-5">Материалы</span>
                <span className="nurse-home-caption block text-xs font-medium leading-tight">Каталог расходников</span>
              </span>
            </Link>
            <Link to="/cabinet/settings" className="nurse-home-quick-link">
              <span className="nurse-home-quick-icon">
                <Settings size={20} />
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-[15px] font-semibold leading-5">Настройки</span>
                <span className="nurse-home-caption block text-xs font-medium leading-tight">Параметры кабинета</span>
              </span>
            </Link>
          </nav>
        </section>
      </PageTransition>
    )
  }

  return (
    <PageTransition
      respectReducedMotion
      className={cn(
        'nurse-page h-full min-h-0',
        isRequestWorkspace ? 'nurse-request-page' : 'overflow-hidden',
      )}
    >
      <section className="h-full min-h-0">
        {isRequestWorkspace ? (
        <div
          ref={requestWorkspaceRef}
          className="nurse-request-workspace"
          data-stacked={isRequestStacked}
          style={{ '--request-cart-width': `${cartPanelWidth}px` } as CSSVariables}
        >
          <div className="nurse-catalog-pane">
            <div className="nurse-catalog-toolbar">
              <div className="nurse-catalog-toolbar-heading">
                <div className="min-w-0">
                  <div className="text-base font-semibold tracking-[-0.01em] text-slate-950">Каталог материалов</div>
                  <div className="mt-0.5 text-xs text-slate-500">Поиск и выбор позиций для заявки</div>
                </div>

              </div>

              <div className="nurse-catalog-controls">
                <label className="nurse-catalog-search">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className={`${fieldStyles} text-xs`}
                    placeholder="Поиск по названию"
                    aria-label="Поиск по каталогу материалов"
                  />
                </label>


                <div className="nurse-catalog-filter-wrap">
                  <Button
                    variant="secondary"
                    className={cn('nurse-catalog-filter-trigger', activeCatalogFilterCount > 0 && 'is-active')}
                    onClick={() => setCatalogFiltersOpen((open) => !open)}
                    aria-expanded={isCatalogFiltersOpen}
                    aria-haspopup="dialog"
                  >
                    <ListFilter size={14} />
                    Фильтры
                    {activeCatalogFilterCount > 0 ? <span className="nurse-catalog-filter-count">{activeCatalogFilterCount}</span> : null}
                    <ChevronDown size={14} className={cn('transition-transform', isCatalogFiltersOpen && 'rotate-180')} />
                  </Button>

                  {isCatalogFiltersOpen ? (
                    <div className="nurse-catalog-filter-panel" role="dialog" aria-label="Подробные фильтры каталога">
                      <div className="nurse-catalog-filter-panel-head">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">Фильтры каталога</div>
                          <div className="text-[11px] text-slate-500">Результаты обновляются сразу</div>
                        </div>
                        <button
                          type="button"
                          className="nurse-catalog-filter-reset"
                          onClick={() => {
                            setCategory('Все')
                            setCatalogUnit('Все')
                            setCatalogPositionType('all')
                            setOnlyRequestItems(false)
                            setOnlyFavoriteItems(false)
                          }}
                          disabled={activeCatalogFilterCount === 0}
                        >
                          Сбросить
                        </button>
                      </div>

                      <div className="nurse-catalog-filter-section">
                        <div className="nurse-catalog-filter-label">Направление</div>
                        <div className="nurse-catalog-filter-options">
                          <button type="button" className={cn('nurse-catalog-filter-chip', category === 'Все' && 'is-active')} aria-pressed={category === 'Все'} onClick={() => setCategory('Все')}>Все</button>
                          {clinicalDirections.map((item) => (
                            <button key={item} type="button" className={cn('nurse-catalog-filter-chip', category === item && 'is-active')} aria-pressed={category === item} onClick={() => setCategory(item)}>
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="nurse-catalog-filter-section">
                        <div className="nurse-catalog-filter-label">Тип материалов</div>
                        <div className="nurse-catalog-filter-options">
                          {materialTypes.map((item) => (
                            <button key={item} type="button" className={cn('nurse-catalog-filter-chip', category === item && 'is-active')} aria-pressed={category === item} onClick={() => setCategory(item)}>
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="nurse-catalog-filter-grid">
                        <div className="nurse-catalog-filter-section">
                          <div className="nurse-catalog-filter-label">Структура позиции</div>
                          <div className="nurse-catalog-filter-options">
                            {([
                              ['all', 'Любая'],
                              ['grouped', 'С вариантами'],
                              ['single', 'Одиночная'],
                            ] as const).map(([value, label]) => (
                              <button key={value} type="button" className={cn('nurse-catalog-filter-chip', catalogPositionType === value && 'is-active')} aria-pressed={catalogPositionType === value} onClick={() => setCatalogPositionType(value)}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="nurse-catalog-filter-section">
                          <div className="nurse-catalog-filter-label">Единица выдачи</div>
                          <div className="nurse-catalog-filter-options">
                            {catalogUnits.map((item) => (
                              <button key={item} type="button" className={cn('nurse-catalog-filter-chip', catalogUnit === item && 'is-active')} aria-pressed={catalogUnit === item} onClick={() => setCatalogUnit(item)}>
                                {item}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <label className="nurse-catalog-request-toggle">
                        <input type="checkbox" checked={onlyRequestItems} onChange={(event) => setOnlyRequestItems(event.target.checked)} />
                        <span>
                          <strong>Только позиции в заявке</strong>
                          <small>Показать уже выбранные материалы</small>
                        </span>
                      </label>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  className={cn('nurse-catalog-quick-filter', onlyFavoriteItems && 'is-active')}
                  aria-pressed={onlyFavoriteItems}
                  onClick={() => setOnlyFavoriteItems((active) => !active)}
                >
                  <Star size={17} fill={onlyFavoriteItems ? 'currentColor' : 'none'} />
                  Избранное
                  {favoriteCatalogItemIds.size > 0 ? <span className="nurse-catalog-favorite-count">{favoriteCatalogItemIds.size}</span> : null}
                </button>

                <button type="button" className="nurse-catalog-manual" onClick={() => openManualItem(query)}>
                  <Plus size={16} />
                  Позиция не найдена
                </button>
              </div>
            </div>
            <TableViewport label="Каталог материалов" className="nurse-catalog-scroll">
              <table className="nurse-catalog-table">
                <colgroup>
                  <col className="nurse-col-index" />
                  <col />
                  <col className="nurse-col-direction" />
                  <col className="nurse-col-category" />
                  <col className="nurse-col-unit" />
                  <col className="nurse-col-action" />
                </colgroup>
              <thead>
                <tr>
                  <th className={cn(requestTableHeaderCell, '!px-1 !text-center')}>№</th>
                  <th className={requestTableHeaderCell}>Наименование</th>
                  <th className={requestTableHeaderCell}>Направление</th>
                  <th className={requestTableHeaderCell}>Категория</th>
                  <th className={cn(requestTableHeaderCell, '!text-center')}>Ед.</th>
                  <th className={cn(requestTableHeaderCell, '!px-1 !text-center')}>Действие</th>
                </tr>
              </thead>
              <tbody>
                {catalogDisplayRows.map((row, index) => {
                    if (row.type === 'group') {
                      const expanded = Boolean(expandedGroupIds[row.group.id])
                      const selectedCount = row.items.filter((item) => cartLineByItem.has(item.id)).length
                      const favorite = row.items.every((item) => favoriteCatalogItemIds.has(item.id))

                      return (
                        <tr
                          key={row.group.id}
                          className="nurse-catalog-group-row cursor-pointer transition"
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
                          <td className={requestTableCell}>{getGroupDirectionLabel(row.items)}</td>
                          <td className={requestTableCell}>{getGroupCategoryLabel(row.items)}</td>
                          <td className={cn(requestTableCell, 'text-center')}>{getGroupUnitLabel(row.items)}</td>
                          <td className={cn(requestTableCell, '!px-1 text-center')}>
                            <div className="nurse-catalog-row-actions nurse-catalog-row-actions--favorite-only">

                              <button
                                type="button"
                                className={cn('nurse-catalog-favorite-toggle', favorite && 'is-active')}
                                aria-label={favorite ? `Убрать группу из избранного: ${row.group.title}` : `Добавить группу в избранное: ${row.group.title}`}
                                aria-pressed={favorite}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  toggleFavoriteCatalogItems(row.items.map((item) => item.id))
                                }}
                              >
                                <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
                              </button>
                            </div>
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

                            </div>
                          </div>
                        </td>
                        <td className={requestTableCell}>{catalogDirectionLabel(item)}</td>
                        <td className={requestTableCell}>{item.category}</td>
                        <td className={cn(requestTableCell, 'text-center')}>{item.unit}</td>
                        <td className={cn(requestTableCell, '!px-1 whitespace-nowrap text-center')}>
                          <div className="nurse-catalog-row-actions">
                            {renderCatalogItemAction(item)}
                            <button
                              type="button"
                              className={cn('nurse-catalog-favorite-toggle', favoriteCatalogItemIds.has(item.id) && 'is-active')}
                              aria-label={favoriteCatalogItemIds.has(item.id) ? `Убрать из избранного: ${catalogItemProfessionalName(item)}` : `Добавить в избранное: ${catalogItemProfessionalName(item)}`}
                              aria-pressed={favoriteCatalogItemIds.has(item.id)}
                              onClick={(event) => {
                                event.stopPropagation()
                                toggleFavoriteCatalogItem(item.id)
                              }}
                            >
                              <Star size={16} fill={favoriteCatalogItemIds.has(item.id) ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </TableViewport>

            {!catalogDisplayRows.length ? (
              <EmptyState className="m-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <span>По этим фильтрам позиций нет.</span>
                  {query.trim() ? (
                    <Button variant="secondary" className="shrink-0 px-2 text-xs" onClick={() => openManualItem(query)}>
                      <Plus size={14} />
                      Добавить как ручную
                    </Button>
                  ) : null}
                </div>
              </EmptyState>
            ) : null}
          </div>

          <button
            type="button"
            role="separator"
            aria-label="Изменить ширину заявки"
            aria-orientation="vertical"
            aria-valuemin={requestCartMinimumWidth}
            aria-valuemax={getRequestCartMaximumWidth(requestWorkspaceWidth)}
            aria-valuenow={cartPanelWidth}
            aria-valuetext={`Ширина корзины ${cartPanelWidth} пикселей`}
            tabIndex={0}
            title="Перетащите влево, чтобы увеличить заявку"
            onPointerDown={handleCartResizeStart}
            onPointerMove={handleCartResizeMove}
            onPointerUp={(event) => finishCartResize(event.pointerId)}
            onPointerCancel={(event) => finishCartResize(event.pointerId)}
            onLostPointerCapture={(event) => finishCartResize(event.pointerId)}
            onKeyDown={handleCartResizeKeyDown}
            className="nurse-request-resizer"
          >
            <span className="nurse-request-resizer-mark" aria-hidden="true" />
          </button>

          <aside
            className="nurse-cart-panel"
          >
            <RequestCart
              cart={cart}
              catalog={catalog}
              room={room}
              responsibleNurse={responsibleNurse}
              onResponsibleNurseChange={setResponsibleNurse}
              onUpdate={updateCartLine}
              onRemove={removeCartLine}
              onSubmit={openRequestPreview}
              onDemo={loadOrthodonticDemo}
            />
          </aside>
        </div>
        ) : null}

        {location.hash === '#my-requests' ? (
        <Panel id="my-requests" className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-0">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {selectedHistoryRequest ? (
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedHistoryRequestId(null)}
                    className="px-2 text-xs"
                  >
                    <ArrowLeft size={14} />
                    К списку
                  </Button>
                ) : null}
                <div className="text-lg font-normal text-slate-950">
                  {selectedHistoryRequest ? requestDisplayTitle(selectedHistoryRequest, catalog, room) : 'Мои заявки'}
                </div>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {selectedHistoryRequest
                  ? `${formatDateTime(selectedHistoryRequest.createdAt)} · Ответственная: ${selectedHistoryRequest.createdBy} · ${selectedHistoryRequest.lines.length} позиций`
                  : `История кабинета ${room?.number}`}
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-x-hidden overflow-y-auto p-3">
            {selectedHistoryRequest ? (
              <TableFrame>
                <TableViewport label="Состав выбранной заявки">
                <table className="w-full min-w-[980px] table-fixed border-separate border-spacing-0">
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
                        <tr
                          key={line.id}
                          className={cn('workspace-status-row', index % 2 ? 'bg-white' : 'bg-slate-50/35')}
                          data-tone={lineIssueStatus.tone}
                        >
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
                </TableViewport>
              </TableFrame>
            ) : (
              <TableFrame>
                <TableViewport label="История заявок кабинета">
                <table className="w-full min-w-[980px] table-fixed border-separate border-spacing-0">
                  <colgroup>
                    <col className="w-[27%]" />
                    <col className="w-[19%]" />
                    <col className="w-[13%]" />
                    <col className="w-[11%]" />
                    <col className="w-[13%]" />
                    <col className="w-[7%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={requestTableHeaderCell}>Название заявки</th>
                      <th className={requestTableHeaderCell}>Ответственная</th>
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
                          <td className={requestTableCell}>
                            <div className="truncate text-slate-950" title={request.createdBy}>{request.createdBy}</div>
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
                            <Button
                              variant="secondary"
                              onClick={(event) => {
                                event.stopPropagation()
                                setSelectedHistoryRequestId(request.id)
                              }}
                              className="px-2 text-xs"
                            >
                              Открыть
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!myRequests.length ? <EmptyState className="m-3">Заявок кабинета пока нет.</EmptyState> : null}
                </TableViewport>
              </TableFrame>
            )}
          </div>
        </Panel>
        ) : null}
      </section>
      {isManualOpen ? (
        <ManualItemWorkspaceDialog
          key={manualInitialName || 'empty-manual-item'}
          initialName={manualInitialName}
          onClose={() => setManualOpen(false)}
          onAdd={(name, quantity, comment) => addManualLineToCart(name, quantity, comment)}
        />
      ) : null}
      {isPreviewOpen ? (
        <RequestPreviewWorkspaceDialog
          cart={cart}
          catalog={catalog}
          room={room}
          responsibleName={previewResponsibleNurse}
          comment={previewComment}
          onClose={() => setPreviewOpen(false)}
          onConfirm={confirmRequestSubmit}
        />
      ) : null}
      {isSubmitLoading ? (
        <RequestSubmitLoadingDialog
          durationSeconds={submitLoadingMs / 1000}
          onClose={cancelRequestSubmit}
        />
      ) : null}
      {isSubmitDoneOpen ? (
        <RequestSubmitDoneWorkspaceDialog onClose={() => setSubmitDoneOpen(false)} />
      ) : null}
    </PageTransition>
  )
}
