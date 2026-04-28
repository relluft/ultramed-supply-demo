import { ClipboardList } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { EmptyState, Panel, SectionHeader, StatusPill } from '../components/ui'
import { useDemo } from '../context'
import { roleLabels } from '../lib/demoLogic'
import { formatDateTime } from '../lib/format'

const eventLabels: Record<string, string> = {
  'request-created': 'Заявка создана',
  'request-sent': 'Заявка отправлена',
  'item-issued': 'Позиция выдана',
  'item-partially-issued': 'Позиция выдана частично',
  'not-enough': 'Не хватило на складе',
  'replenishment-added': 'Позиция добавлена в пополнение',
  'availability-updated': 'Наличие уточнено',
  'alternative-selected': 'Выбран альтернативный поставщик',
  'order-created': 'Заказ сформирован',
  'order-marked': 'Заказ отмечен',
  'receipt-accepted': 'Приход принят',
  'manual-line-created': 'Ручная строка создана',
  'manual-line-reviewed': 'Ручная строка разобрана',
  'clarification-needed': 'Нужно уточнение',
}

export function JournalPage() {
  const {
    state: { journal, catalog, rooms },
  } = useDemo()

  return (
    <PageTransition className="grid gap-3">
      <Panel>
        <SectionHeader title="Журнал" subtitle="События демо-контура: заявки, выдача, пополнение, поставщики, заказы и приход." />
      </Panel>

      <Panel>
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold text-slate-950">События</div>
          <StatusPill tone="info">{journal.length}</StatusPill>
        </div>

        <div className="mt-4 grid gap-2">
          {journal.length ? (
            journal.map((event) => {
              const item = event.itemId ? catalog.find((candidate) => candidate.id === event.itemId) : undefined
              const room = event.roomId ? rooms.find((candidate) => candidate.id === event.roomId) : undefined
              return (
                <div key={event.id} className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[180px,minmax(0,1fr),180px]">
                  <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-50 text-emerald-700">
                      <ClipboardList size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{formatDateTime(event.createdAt)}</div>
                      <div className="mt-1 text-xs text-slate-500">{event.id}</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-950">{event.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">{event.description}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusPill>{eventLabels[event.type]}</StatusPill>
                      {item ? <StatusPill tone="info">{item.shortName}</StatusPill> : null}
                      {room ? <StatusPill tone="neutral">Кабинет {room.number}</StatusPill> : null}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">
                    <div className="font-semibold text-slate-700">{roleLabels[event.actorRole]}</div>
                    {event.requestId ? <div className="mt-1">Заявка {event.requestId}</div> : null}
                  </div>
                </div>
              )
            })
          ) : (
            <EmptyState>События появятся после действий в демо.</EmptyState>
          )}
        </div>
      </Panel>
    </PageTransition>
  )
}
