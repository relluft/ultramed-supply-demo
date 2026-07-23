import { ClipboardList } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { EmptyState, Panel, SectionHeader, StatusPill } from '../components/ui'
import { StatusBadge, Surface } from '../components/workspace-v2'
import { useDemo } from '../context'
import { roleLabels, roleToRoomId } from '../lib/demoLogic'
import { cn, formatDateTime } from '../lib/format'

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

export function JournalPage({ uiMode = 'legacy' }: { uiMode?: 'legacy' | 'workspace-v2' }) {
  const {
    state: { journal, catalog, rooms, role },
  } = useDemo()
  const isWorkspaceV2 = uiMode === 'workspace-v2'
  const PanelView = isWorkspaceV2 ? Surface : Panel
  const StatusView = isWorkspaceV2 ? StatusBadge : StatusPill
  const roomId = isWorkspaceV2 ? roleToRoomId(role) : undefined
  const room = roomId ? rooms.find((candidate) => candidate.id === roomId) : undefined
  const isNurseJournal = isWorkspaceV2 && Boolean(roomId)
  const visibleEvents = isNurseJournal
    ? journal
        .filter((event) => event.roomId === roomId)
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
    : journal
  const subtitle = isNurseJournal
    ? `История действий и изменений, относящихся к кабинету ${room?.number ?? ''}.`
    : 'События демо-контура: заявки, выдача, пополнение, поставщики, заказы и приход.'

  return (
    <PageTransition
      respectReducedMotion={isWorkspaceV2}
      className={isWorkspaceV2 ? 'nurse-page grid gap-4' : 'grid gap-4'}
    >
      <PanelView className={isWorkspaceV2 ? 'p-[var(--ui-panel-padding)]' : undefined}>
        <SectionHeader title={isNurseJournal ? `Журнал кабинета ${room?.number ?? ''}` : 'Журнал'} subtitle={subtitle} />
      </PanelView>

      <PanelView className={isWorkspaceV2 ? 'p-[var(--ui-panel-padding)]' : undefined}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold text-slate-950">События</div>
          <StatusView tone="info">{visibleEvents.length}</StatusView>
        </div>

        <div className="mt-4 grid gap-2">
          {visibleEvents.length ? (
            visibleEvents.map((event) => {
              const item = event.itemId ? catalog.find((candidate) => candidate.id === event.itemId) : undefined
              const room = event.roomId ? rooms.find((candidate) => candidate.id === event.roomId) : undefined
              return (
                <div
                  key={event.id}
                  className={cn(
                    'grid gap-3 rounded-md border p-3 md:grid-cols-[180px,minmax(0,1fr),180px]',
                    isWorkspaceV2
                      ? 'workspace-surface p-[var(--ui-panel-padding)]'
                      : 'app-soft-card',
                  )}
                  data-surface={isWorkspaceV2 ? 'raised' : undefined}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        'flex shrink-0 items-center justify-center rounded-md text-emerald-700',
                        isWorkspaceV2 ? 'workspace-surface h-10 w-10' : 'app-soft-card h-8 w-8',
                      )}
                      data-surface={isWorkspaceV2 ? 'panel' : undefined}
                    >
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
                      <StatusView>{eventLabels[event.type]}</StatusView>
                      {item ? <StatusView tone="info">{item.shortName}</StatusView> : null}
                      {room ? <StatusView tone="neutral">Кабинет {room.number}</StatusView> : null}
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
            <EmptyState>
              {isNurseJournal
                ? 'Действия этого кабинета появятся здесь после работы в системе.'
                : 'События появятся после действий в демо.'}
            </EmptyState>
          )}
        </div>
      </PanelView>
    </PageTransition>
  )
}
