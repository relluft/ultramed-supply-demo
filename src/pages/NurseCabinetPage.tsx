import { ChevronDown, ChevronRight, ClipboardList, Home, Plus, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { Button, EmptyState, Panel, SectionHeader, StatusPill, fieldStyles } from '../components/ui'
import { useDemo } from '../context'
import { getRoomByRole, requestStatusLabels, roleToRoomId, statusTone } from '../lib/demoLogic'
import { cn, formatDateTime, formatNumber } from '../lib/format'
import type { CatalogItem, RequestCartLine, Room } from '../types/demo'

const orthodonticDemoRequestId = 'REQ-005'
const requestTableHeaderCell =
  'sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500'
const requestTableCell = 'border-b border-slate-100 border-r border-slate-100 px-2 py-1 align-middle text-xs leading-4 text-slate-700 last:border-r-0'

const catalogVariantGroups = [
  {
    id: 'gloves-nitrile',
    title: 'Перчатки нитриловые неопудренные',
    note: 'размеры S / M / L',
    itemIds: ['item-gloves-s', 'item-gloves-m', 'item-gloves-l'],
  },
  {
    id: 'gloves-surgical',
    title: 'Перчатки хирургические стерильные',
    note: 'размеры 7.0 / 7.5',
    itemIds: ['item-sterile-gloves-7', 'item-sterile-gloves-75'],
  },
  {
    id: 'sterilization-pouches',
    title: 'Пакеты для стерилизации',
    note: 'разные размеры пакетов',
    itemIds: ['item-sterilization-pouches-57', 'item-sterilization-pouches', 'item-sterilization-pouches-135'],
  },
  {
    id: 'composites',
    title: 'Композиты стоматологические',
    note: 'оттенки и консистенции',
    itemIds: ['item-composite-a2', 'item-composite-a3', 'item-flow-composite-a2', 'item-flow-composite-a3'],
  },
  {
    id: 'burs',
    title: 'Боры стоматологические',
    note: 'форма и материал',
    itemIds: ['item-burs-diamond-round', 'item-burs-diamond-flame', 'item-carbide-burs'],
  },
  {
    id: 'archwires',
    title: 'Дуги ортодонтические',
    note: 'материал и размер',
    itemIds: ['item-niti-archwires', 'item-steel-archwires'],
  },
  {
    id: 'disinfection-products',
    title: 'Средства дезинфекции',
    note: 'инструменты, поверхности, руки',
    itemIds: ['item-disinfectant-instruments', 'item-disinfectant-surfaces', 'item-hand-antiseptic'],
  },
  {
    id: 'barrier-consumables',
    title: 'Одноразовые барьерные расходники',
    note: 'для пациента и установки',
    itemIds: ['item-bibs', 'item-cups-disposable', 'item-barrier-film', 'item-headrest-covers', 'item-tray-covers'],
  },
]

const catalogGroupByItemId = new Map(catalogVariantGroups.flatMap((group) => group.itemIds.map((itemId) => [itemId, group] as const)))

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

function getGroupCategoryLabel(items: CatalogItem[]) {
  const categories = Array.from(new Set(items.map((item) => item.category)))
  return categories.length === 1 ? categories[0] : `${categories.length} раздела`
}

function ManualItemModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (name: string, quantity: number, comment: string) => void
}) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState(2)
  const [comment, setComment] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-950">Позиция не найдена</div>
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
          <label className="text-sm font-semibold text-slate-700">
            Текст позиции
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={`mt-1 ${fieldStyles}`}
              placeholder="Насадка для нового наконечника"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Количество
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className={`mt-1 ${fieldStyles}`}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xl font-semibold text-slate-950">Проверка заявки перед отправкой</div>
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
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Кабинет</div>
              <div className="mt-1 font-semibold text-slate-950">{room ? `${room.number} · ${room.title}` : 'Кабинет не выбран'}</div>
              <div className="mt-0.5 text-xs text-slate-500">{room?.type}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ответственный</div>
              <div className="mt-1 font-semibold text-slate-950">{room?.nurseName ?? 'Не указан'}</div>
              <div className="mt-0.5 text-xs text-slate-500">Отправка старшей медсестре</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Состав</div>
              <div className="mt-1 font-semibold text-slate-950">Строк: {cart.length}</div>
              <div className="mt-0.5 text-xs text-slate-500">Из справочника: {knownCount}, ручных: {manualCount}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Дата формирования</div>
              <div className="mt-1 font-semibold text-slate-950">{createdAt}</div>
              <div className="mt-0.5 text-xs text-slate-500">Всего единиц: {formatNumber(totalQuantity)}</div>
            </div>
          </div>

          {comment.trim() ? (
            <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <span className="font-semibold">Комментарий: </span>
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
                        <div className="font-semibold text-slate-950">{item?.shortName ?? line.manualName}</div>
                        <div className="mt-0.5 text-[11px] leading-4 text-slate-500">{item?.fullName ?? 'Ручная строка для разбора справочника'}</div>
                      </td>
                      <td className={requestTableCell}>{item?.category ?? 'Ручная'}</td>
                      <td className={cn(requestTableCell, 'text-center font-semibold text-slate-950')}>{formatNumber(line.quantity)}</td>
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
    <Panel className="flex h-full min-h-0 flex-col p-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 px-3 py-2.5">
          <div className="text-base font-semibold text-slate-950">Заявка</div>
          <div className="text-xs text-slate-500">Строк: {cart.length}</div>
        </div>
        <div className="mr-3 flex shrink-0 items-center gap-2">
          <Button variant="secondary" className="min-h-8 px-2 py-1 text-xs" onClick={onDemo}>
            Демо
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto border-y border-slate-200">
        <table className="w-full table-fixed border-separate border-spacing-0">
          <colgroup>
            <col className="w-[9%]" />
            <col className="w-[53%]" />
            <col className="w-[24%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead>
            <tr>
              <th className={cn(requestTableHeaderCell, '!px-1 text-center')}>№</th>
              <th className={requestTableHeaderCell}>Наименование</th>
              <th className={cn(requestTableHeaderCell, 'text-center')}>Кол-во</th>
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
                        <div className="break-words font-medium text-slate-950" title={item?.fullName ?? line.manualName}>
                          {item?.shortName ?? line.manualName}
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
                <td colSpan={4} className="whitespace-normal break-words px-3 py-8 text-center text-sm text-slate-500">
                  Заявка пока пустая. Добавляйте позиции кнопками из спецификации слева.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 p-3">
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
  const [isPreviewOpen, setPreviewOpen] = useState(false)
  const [previewComment, setPreviewComment] = useState('')
  const [expandedGroupIds, setExpandedGroupIds] = useState<Record<string, boolean>>({})

  const categories = useMemo(
    () => ['Все', ...Array.from(new Set(catalog.filter((item) => item.active).map((item) => item.category)))],
    [catalog],
  )
  const activeCatalog = useMemo(() => catalog.filter((item) => item.active), [catalog])
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
  const myRequests = requests.filter((request) => request.roomId === roomId && request.id !== orthodonticDemoRequestId)

  function loadOrthodonticDemo() {
    loadRequestDraft(orthodonticDemoRequestId)
    setQuery('')
    setCategory('Все')
  }

  function openRequestPreview(comment: string) {
    setPreviewComment(comment)
    setPreviewOpen(true)
  }

  function confirmRequestSubmit() {
    submitRequest(previewComment)
    setPreviewOpen(false)
    setPreviewComment('')
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
            className="h-7 w-10 border-x border-emerald-100 text-center text-xs font-semibold text-slate-950 outline-none"
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
      <PageTransition className="grid gap-3">
        <Panel>
          <SectionHeader
            title={`Кабинет ${room?.number ?? ''}`}
            subtitle={cabinetSubtitle}
            action={<StatusPill tone="success">Автоматически привязан к кабинету</StatusPill>}
          />
        </Panel>

        <section className="grid min-h-[360px] content-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Выберите, с чего начать</h2>
            <p className="mt-1 text-sm text-slate-500">Главная кабинета</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboardItems.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group min-h-[150px] rounded-lg border border-slate-200 bg-slate-50/60 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/60 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-emerald-800 transition group-hover:border-emerald-200">
                    <Icon size={20} />
                  </div>
                  <div className="mt-4 text-lg font-semibold text-slate-950">{item.title}</div>
                  <div className="mt-1 text-sm leading-5 text-slate-500">{item.caption}</div>
                  <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{item.meta}</div>
                </Link>
              )
            })}
          </div>
        </section>
      </PageTransition>
    )
  }

  return (
    <PageTransition className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2 overflow-hidden">
      <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
        <Panel className="p-3 lg:ml-[194px]">
          <SectionHeader
            title={`Кабинет ${room?.number ?? ''}`}
            subtitle={cabinetSubtitle}
            action={<StatusPill tone="success">Автоматически привязан к кабинету</StatusPill>}
          />
        </Panel>

        {location.hash !== '#my-requests' ? (
          <>
        <div className="grid min-h-0 gap-2 lg:ml-[194px] xl:grid-cols-[minmax(860px,2.15fr)_minmax(330px,0.68fr)]">
          <div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-2 border-b border-slate-200 bg-white p-2">
              <label className="relative w-full max-w-[520px] sm:w-[460px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className={`${fieldStyles} h-9 py-1.5 pl-8 text-xs`}
                  placeholder="Поиск по названию: перчатки, композит, артикаин"
                />
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {categories.map((item) => {
                  const active = category === item

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      className={cn(
                        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                        active
                          ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900',
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
                  <col className="w-[51%]" />
                  <col className="w-[13%]" />
                  <col className="w-[7%]" />
                  <col className="w-[14%]" />
                  <col className="w-[11%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th className={cn(requestTableHeaderCell, '!px-1 text-center')}>№</th>
                    <th className={requestTableHeaderCell}>Наименование</th>
                    <th className={requestTableHeaderCell}>Раздел</th>
                    <th className={requestTableHeaderCell}>Ед.</th>
                    <th className={requestTableHeaderCell}>Упаковка</th>
                    <th className={cn(requestTableHeaderCell, 'text-center')}>Действия</th>
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
                          className="cursor-pointer border-b border-slate-100 bg-emerald-50/55 transition hover:bg-emerald-50"
                          onClick={() => toggleCatalogGroup(row.group.id)}
                        >
                          <td className={cn(requestTableCell, '!px-1 text-center text-xs text-slate-500')}>{index + 1}</td>
                          <td className={cn(requestTableCell, 'min-w-0')}>
                            <div className="flex min-w-0 items-start gap-2">
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-emerald-800 shadow-sm">
                                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-950">{row.group.title}</div>
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                  {row.group.note} · {row.totalVariants} варианта
                                  {selectedCount ? ` · выбрано: ${selectedCount}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className={requestTableCell}>{getGroupCategoryLabel(row.items)}</td>
                          <td className={cn(requestTableCell, 'text-center text-slate-500')}>-</td>
                          <td className={requestTableCell}>Раскройте, чтобы выбрать разновидность</td>
                          <td className={cn(requestTableCell, '!px-1 text-center')}>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                toggleCatalogGroup(row.group.id)
                              }}
                              className="inline-flex min-h-6 items-center justify-center rounded-md border border-emerald-200 bg-white px-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
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
                          !row.nested && (cartLine ? 'bg-sky-100/80' : index % 2 ? 'bg-white' : 'bg-slate-50/35'),
                          row.nested && cartLine && 'bg-sky-50/80',
                        )}
                      >
                        <td className={cn(requestTableCell, '!px-1 text-center text-xs text-slate-500')}>{row.nested ? '' : index + 1}</td>
                        <td className={cn(requestTableCell, 'min-w-0')}>
                          <div className={cn('flex min-w-0 items-start gap-1.5', row.nested && 'pl-7')}>
                            <div className="min-w-0 flex-1">
                              <div className="whitespace-normal break-words font-medium text-slate-950" title={item.fullName}>
                                {row.nested ? item.shortName : item.fullName}
                              </div>
                              {row.nested ? (
                                <div className="mt-0.5 text-[11px] leading-4 text-slate-500">{item.fullName}</div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className={requestTableCell}>{item.category}</td>
                        <td className={cn(requestTableCell, 'text-center')}>{item.unit}</td>
                        <td className={requestTableCell}>{item.packageLabel}</td>
                        <td className={cn(requestTableCell, '!px-1 whitespace-nowrap text-center')}>{renderCatalogItemAction(item)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {!catalogDisplayRows.length ? <EmptyState className="m-3">По этим фильтрам позиций нет.</EmptyState> : null}
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
        <Panel id="my-requests" className="min-h-0 overflow-auto">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-semibold text-slate-950">Мои заявки</div>
              <div className="text-sm text-slate-500">История кабинета {room?.number}</div>
            </div>
            <Button variant="secondary" onClick={() => setManualOpen(true)}>
              Позиция не найдена
            </Button>
          </div>

          <div className="mt-4 grid gap-2">
            {myRequests.map((request) => (
              <div key={request.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-slate-950">{request.id}</div>
                  <StatusPill tone={statusTone(request.status)}>{requestStatusLabels[request.status]}</StatusPill>
                </div>
                <div className="mt-1 text-sm text-slate-500">{formatDateTime(request.createdAt)}</div>
                <div className="mt-2 grid gap-1 text-sm text-slate-700">
                  {request.lines.map((line) => {
                    const item = line.itemId ? catalog.find((candidate) => candidate.id === line.itemId) : undefined
                    return (
                      <div key={line.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>{item?.shortName ?? line.manualName}</span>
                        <span className="text-slate-500">
                          {formatNumber(line.issuedQuantity)} / {formatNumber(line.quantity)} {item?.unit ?? ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {request.lines.some((line) => line.seniorComment) ? (
                  <div className="mt-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900">
                    {request.lines.find((line) => line.seniorComment)?.seniorComment}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>
        ) : null}
      </section>
      {isManualOpen ? (
        <ManualItemModal
          onClose={() => setManualOpen(false)}
          onAdd={(name, quantity, comment) => addManualLineToCart(name, quantity, comment)}
        />
      ) : null}
      {isPreviewOpen ? (
        <RequestPreviewModal
          cart={cart}
          catalog={catalog}
          room={room}
          comment={previewComment}
          onClose={() => setPreviewOpen(false)}
          onConfirm={confirmRequestSubmit}
        />
      ) : null}
    </PageTransition>
  )
}
