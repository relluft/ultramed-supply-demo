import {
  Activity,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Search,
  ShieldAlert,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageTransition } from '../components/PageTransition'
import { useDemo } from '../context'
import { requestStatusLabels } from '../lib/demoLogic'
import type { RequestStatus, Room } from '../types/demo'
import '../styles/rooms-page.css'

const openStatuses = new Set<RequestStatus>([
  'sent',
  'in-review',
  'partially-issued',
  'waiting-replenishment',
  'out-of-stock',
  'needs-clarification',
])

const attentionStatuses = new Set<RequestStatus>([
  'partially-issued',
  'waiting-replenishment',
  'out-of-stock',
  'needs-clarification',
])

function formatDate(value?: string) {
  if (!value) return 'Заявок пока нет'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function pluralize(count: number, one: string, few: string, many: string) {
  const value = Math.abs(count) % 100
  const remainder = value % 10
  if (value > 10 && value < 20) return many
  if (remainder > 1 && remainder < 5) return few
  if (remainder === 1) return one
  return many
}

function responsibleFor(room: Room) {
  return room.responsibleName ?? room.nurseNames[0] ?? 'Не назначен'
}

export function RoomsPage() {
  const {
    state: { role, rooms, requests },
    assignRoomResponsible,
  } = useDemo()
  const [query, setQuery] = useState('')
  const canAssign = role === 'senior-nurse'

  const roomRows = useMemo(
    () =>
      rooms.map((room) => {
        const roomRequests = requests
          .filter((request) => request.roomId === room.id)
          .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
        const openRequests = roomRequests.filter((request) => openStatuses.has(request.status))
        const attentionRequests = roomRequests.filter((request) => attentionStatuses.has(request.status))
        const latestRequest = roomRequests[0]

        return {
          room,
          latestRequest,
          openCount: openRequests.length,
          attentionCount: attentionRequests.length,
          requestedLines: roomRequests.reduce((total, request) => total + request.lines.length, 0),
        }
      }),
    [requests, rooms],
  )

  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')
  const visibleRows = roomRows.filter(({ room }) =>
    !normalizedQuery ||
    [room.number, room.title, room.type, responsibleFor(room)]
      .some((value) => value.toLocaleLowerCase('ru-RU').includes(normalizedQuery)),
  )
  const assignedCount = rooms.filter((room) => Boolean(room.responsibleName ?? room.nurseNames[0])).length
  const attentionRooms = roomRows.filter((row) => row.attentionCount > 0).length
  const openRequestsTotal = roomRows.reduce((total, row) => total + row.openCount, 0)

  return (
    <PageTransition className="rooms-page">
      <div className="rooms-page__container">
        <header className="rooms-page__header">
          <div>
            <p className="rooms-page__eyebrow">Справка</p>
            <h1>Кабинеты</h1>
            <p>
              Ответственные, текущая нагрузка и ситуации, требующие контроля.
              {canAssign ? ' Назначения доступны Главной медсестре.' : ''}
            </p>
          </div>
          <label className="rooms-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Поиск кабинета</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Номер, профиль или сотрудник"
            />
          </label>
        </header>

        <section className="rooms-stats" aria-label="Статистика кабинетов">
          <article><Building2 /><span><strong>{rooms.length}</strong>кабинетов</span></article>
          <article><UserRoundCheck /><span><strong>{assignedCount}</strong>с ответственным</span></article>
          <article><ClipboardList /><span><strong>{openRequestsTotal}</strong>открытых заявок</span></article>
          <article data-tone={attentionRooms ? 'warning' : 'success'}>
            {attentionRooms ? <ShieldAlert /> : <CheckCircle2 />}
            <span><strong>{attentionRooms}</strong>{pluralize(attentionRooms, 'требует внимания', 'требуют внимания', 'требуют внимания')}</span>
          </article>
        </section>

        <section className="rooms-panel" aria-label="Список кабинетов">
          <div className="rooms-panel__heading">
            <div>
              <h2>Ситуация по кабинетам</h2>
              <p>Показано {visibleRows.length} из {rooms.length}</p>
            </div>
            <span className="rooms-live"><Activity size={15} />Актуальные данные</span>
          </div>

          <div className="rooms-table-wrap">
            <table className="rooms-table">
              <thead>
                <tr>
                  <th>Кабинет</th>
                  <th>Ответственный</th>
                  <th>Команда</th>
                  <th>Контроль</th>
                  <th>Последняя активность</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(({ room, latestRequest, openCount, attentionCount, requestedLines }) => {
                  const tone = attentionCount ? 'warning' : openCount ? 'info' : 'success'
                  return (
                    <tr key={room.id}>
                      <td>
                        <div className="rooms-cabinet">
                          <span className="rooms-cabinet__number">{room.number}</span>
                          <span><strong>{room.title}</strong><small>{room.type}</small></span>
                        </div>
                      </td>
                      <td>
                        {canAssign ? (
                          <label className="rooms-responsible">
                            <span className="sr-only">Ответственный по кабинету {room.number}</span>
                            <select
                              value={responsibleFor(room)}
                              onChange={(event) => assignRoomResponsible(room.id, event.target.value)}
                            >
                              {room.nurseNames.map((name) => <option key={name}>{name}</option>)}
                            </select>
                          </label>
                        ) : (
                          <div className="rooms-person"><UserRoundCheck size={17} /><span>{responsibleFor(room)}</span></div>
                        )}
                      </td>
                      <td>
                        <div className="rooms-team"><UsersRound size={17} /><strong>{room.nurseNames.length}</strong><span>сотрудника</span></div>
                      </td>
                      <td>
                        <div className="rooms-control">
                          <span className="rooms-status" data-tone={tone}>
                            {attentionCount ? `${attentionCount} ${pluralize(attentionCount, 'требует', 'требуют', 'требуют')} внимания` : openCount ? `${openCount} в работе` : 'Всё в порядке'}
                          </span>
                          <small>{requestedLines} {pluralize(requestedLines, 'позиция', 'позиции', 'позиций')} в истории</small>
                        </div>
                      </td>
                      <td>
                        <div className="rooms-activity">
                          <span><Clock3 size={15} />{formatDate(latestRequest?.createdAt)}</span>
                          <small>{latestRequest ? `${latestRequest.id} · ${requestStatusLabels[latestRequest.status]}` : 'Нет активности'}</small>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!visibleRows.length ? (
            <div className="rooms-empty"><Search size={24} /><strong>Кабинеты не найдены</strong><span>Попробуйте изменить запрос.</span></div>
          ) : null}
        </section>
      </div>
    </PageTransition>
  )
}
