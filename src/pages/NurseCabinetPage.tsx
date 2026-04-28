import { Minus, Plus, Search, Send, Star, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageTransition } from '../components/PageTransition'
import { Button, EmptyState, Panel, SectionHeader, StatusPill, fieldStyles } from '../components/ui'
import { useDemo } from '../context'
import { getRoomByRole, requestStatusLabels, roleToRoomId, statusTone } from '../lib/demoLogic'
import { formatDateTime, formatNumber } from '../lib/format'
import type { CatalogItem, RequestCartLine } from '../types/demo'

const quickFilters = ['Часто используется', 'Избранное', 'Анестезия', 'Терапия', 'Расходники', 'Изоляция']
const frequentIds = new Set(['item-gloves-m', 'item-composite-a2', 'item-masks', 'item-saliva-ejectors'])
const favoriteIds = new Set(['item-gloves-m', 'item-composite-a2', 'item-articaine', 'item-cofferdam'])

function matchesQuery(item: CatalogItem, query: string) {
  const value = query.trim().toLowerCase()
  if (!value) return true

  return [item.shortName, item.fullName, item.category, ...item.searchSynonyms]
    .join(' ')
    .toLowerCase()
    .includes(value)
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

function RequestCart({
  cart,
  catalog,
  onUpdate,
  onRemove,
  onSubmit,
}: {
  cart: RequestCartLine[]
  catalog: CatalogItem[]
  onUpdate: (lineId: string, patch: Partial<RequestCartLine>) => void
  onRemove: (lineId: string) => void
  onSubmit: (comment: string) => void
}) {
  const [comment, setComment] = useState('')

  return (
    <Panel className="lg:sticky lg:top-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-slate-950">Заявка</div>
          <div className="text-sm text-slate-500">{cart.length} строк</div>
        </div>
        <StatusPill tone={cart.length ? 'success' : 'neutral'}>Корзина</StatusPill>
      </div>

      <div className="mt-4 grid gap-2">
        {cart.length ? (
          cart.map((line) => {
            const item = line.itemId ? catalog.find((candidate) => candidate.id === line.itemId) : undefined
            return (
              <div key={line.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-950">
                      {item?.shortName ?? line.manualName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item ? `${item.category}, ${item.unit}` : 'Ручная строка'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(line.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                    aria-label="Удалить строку"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-[96px,1fr] gap-2">
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(event) => onUpdate(line.id, { quantity: Number(event.target.value) })}
                    className={fieldStyles}
                  />
                  <input
                    value={line.comment ?? ''}
                    onChange={(event) => onUpdate(line.id, { comment: event.target.value })}
                    className={fieldStyles}
                    placeholder="Комментарий"
                  />
                </div>
              </div>
            )
          })
        ) : (
          <EmptyState>Добавьте позиции из справочника или ручную строку.</EmptyState>
        )}
      </div>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        className={`mt-3 min-h-20 resize-none ${fieldStyles}`}
        placeholder="Общий комментарий"
      />
      <Button className="mt-3 w-full" disabled={!cart.length} onClick={() => onSubmit(comment)}>
        <Send size={16} />
        Отправить заявку
      </Button>
    </Panel>
  )
}

export function NurseCabinetPage() {
  const {
    state: { role, rooms, catalog, requests, carts },
    addCatalogToCart,
    addManualLineToCart,
    updateCartLine,
    removeCartLine,
    submitRequest,
  } = useDemo()
  const room = getRoomByRole(rooms, role)
  const roomId = roleToRoomId(role)
  const cart = roomId ? carts[roomId] ?? [] : []
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Все')
  const [quickFilter, setQuickFilter] = useState('Часто используется')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [isManualOpen, setManualOpen] = useState(false)

  const categories = useMemo(
    () => ['Все', ...Array.from(new Set(catalog.filter((item) => item.active).map((item) => item.category)))],
    [catalog],
  )
  const visibleCatalog = useMemo(() => {
    return catalog
      .filter((item) => item.active)
      .filter((item) => matchesQuery(item, query))
      .filter((item) => category === 'Все' || item.category === category)
      .filter((item) => {
        if (quickFilter === 'Часто используется') return frequentIds.has(item.id)
        if (quickFilter === 'Избранное') return favoriteIds.has(item.id)
        if (['Анестезия', 'Терапия', 'Расходники', 'Изоляция'].includes(quickFilter)) {
          return item.category === quickFilter
        }
        return true
      })
  }, [catalog, category, query, quickFilter])
  const myRequests = requests.filter((request) => request.roomId === roomId)

  return (
    <PageTransition className="grid gap-3 xl:grid-cols-[minmax(0,1fr),360px]">
      <section className="grid gap-3">
        <Panel>
          <SectionHeader
            title={`Кабинет ${room?.number ?? ''}`}
            subtitle={`${room?.title ?? ''} · ${room?.type ?? ''} · демо-пользователь ${room?.nurseName ?? ''}`}
            action={<StatusPill tone="success">Автоматически привязан к кабинету</StatusPill>}
          />
        </Panel>

        <Panel>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),220px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={`${fieldStyles} pl-10`}
                placeholder="Поиск по названию: перчатки, композит, артикаин"
              />
            </label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className={fieldStyles}>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setQuickFilter(filter)}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  quickFilter === filter
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </Panel>

        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {visibleCatalog.map((item) => {
            const quantity = quantities[item.id] ?? 1
            return (
              <Panel key={item.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-950">{item.shortName}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-500">{item.fullName}</div>
                  </div>
                  {favoriteIds.has(item.id) ? <Star size={17} className="shrink-0 fill-amber-300 text-amber-500" /> : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusPill>{item.category}</StatusPill>
                  <StatusPill tone="info">{item.unit}</StatusPill>
                  {item.requiresApprovalForReplacement ? (
                    <StatusPill tone="warning">Нельзя заменять без подтверждения</StatusPill>
                  ) : null}
                </div>

                <div className="mt-3 text-sm text-slate-600">
                  <div>{item.packageLabel}</div>
                  {item.seniorComment ? <div className="mt-1 text-slate-500">{item.seniorComment}</div> : null}
                </div>

                <div className="mt-auto flex items-center gap-2 pt-4">
                  <div className="flex h-9 items-center rounded-md border border-slate-200 bg-white">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50"
                      onClick={() => setQuantities((current) => ({ ...current, [item.id]: Math.max(1, quantity - 1) }))}
                      aria-label="Уменьшить количество"
                    >
                      <Minus size={15} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Number(event.target.value) }))}
                      className="h-9 w-14 border-x border-slate-200 text-center text-sm outline-none"
                    />
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50"
                      onClick={() => setQuantities((current) => ({ ...current, [item.id]: quantity + 1 }))}
                      aria-label="Увеличить количество"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <Button className="flex-1" variant="secondary" onClick={() => addCatalogToCart(item.id, quantity)}>
                    Добавить
                  </Button>
                </div>
              </Panel>
            )
          })}
        </div>

        {!visibleCatalog.length ? <EmptyState>По этим фильтрам позиций нет.</EmptyState> : null}

        <Panel id="my-requests">
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
      </section>

      <aside className="grid content-start gap-3">
        <RequestCart
          cart={cart}
          catalog={catalog}
          onUpdate={updateCartLine}
          onRemove={removeCartLine}
          onSubmit={(comment) => submitRequest(comment)}
        />
        <Button variant="secondary" onClick={() => setManualOpen(true)}>
          Позиция не найдена
        </Button>
      </aside>

      {isManualOpen ? (
        <ManualItemModal
          onClose={() => setManualOpen(false)}
          onAdd={(name, quantity, comment) => addManualLineToCart(name, quantity, comment)}
        />
      ) : null}
    </PageTransition>
  )
}
