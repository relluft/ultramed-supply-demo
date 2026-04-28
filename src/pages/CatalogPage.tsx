import { CheckCircle2, Link2, Plus, RotateCcw, XCircle } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { Button, EmptyState, Panel, SectionHeader, StatusPill, tableCell, tableHeaderCell } from '../components/ui'
import { useDemo } from '../context'
import { requestLineStatusLabels, statusTone } from '../lib/demoLogic'
import { formatDateTime } from '../lib/format'

export function CatalogPage() {
  const {
    state: { catalog, suppliers, requests, rooms },
    reviewManualLine,
  } = useDemo()
  const manualLines = requests.flatMap((request) =>
    request.lines
      .filter((line) => line.manualName)
      .map((line) => ({ request, line, room: rooms.find((room) => room.id === request.roomId) })),
  )
  const disabledCount = catalog.filter((item) => !item.active).length
  const missingFieldCount = catalog.filter((item) => !item.price || !item.packageLabel).length
  const similarCount = catalog.filter((item) => item.shortName.includes('4181') || item.shortName.includes('4191')).length

  function supplierName(id?: string) {
    return suppliers.find((supplier) => supplier.id === id)?.name ?? '—'
  }

  return (
    <PageTransition className="grid gap-3">
      <Panel>
        <SectionHeader title="Справочник" subtitle="Демонстрационный раздел старшей медсестры: карточки, контроль и очередь `Позиция не найдена`." />
      </Panel>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ['Есть ручные строки на разбор', manualLines.length, manualLines.length ? 'warning' : 'success'],
          ['Есть незаполненные поля', missingFieldCount, missingFieldCount ? 'warning' : 'success'],
          ['Есть похожие позиции', similarCount, 'warning'],
          ['Есть отключенные позиции', disabledCount, disabledCount ? 'info' : 'success'],
        ].map(([label, value, tone]) => (
          <Panel key={label} className="p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
            <StatusPill className="mt-2" tone={tone as 'success' | 'warning' | 'info'}>Контроль</StatusPill>
          </Panel>
        ))}
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={tableHeaderCell}>Полное название</th>
                <th className={tableHeaderCell}>Короткое</th>
                <th className={tableHeaderCell}>Категория</th>
                <th className={tableHeaderCell}>Ед.</th>
                <th className={tableHeaderCell}>Упаковка</th>
                <th className={tableHeaderCell}>Кратность</th>
                <th className={tableHeaderCell}>Мин.</th>
                <th className={tableHeaderCell}>Желат.</th>
                <th className={tableHeaderCell}>Основной</th>
                <th className={tableHeaderCell}>Альтернативы</th>
                <th className={tableHeaderCell}>Активность</th>
                <th className={tableHeaderCell}>Замена</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((item) => (
                <tr key={item.id} className={item.active ? '' : 'bg-slate-50 text-slate-400'}>
                  <td className={tableCell}>{item.fullName}</td>
                  <td className={tableCell}>
                    <div className="font-semibold text-slate-950">{item.shortName}</div>
                    {item.shortName.includes('4181') || item.shortName.includes('4191') ? (
                      <div className="mt-1 text-xs font-semibold text-amber-700">Похожий код: проверять 4181/4191</div>
                    ) : null}
                  </td>
                  <td className={tableCell}>{item.category}</td>
                  <td className={tableCell}>{item.unit}</td>
                  <td className={tableCell}>{item.packageLabel}</td>
                  <td className={tableCell}>{item.orderMultiple ?? 1}</td>
                  <td className={tableCell}>{item.minStock}</td>
                  <td className={tableCell}>{item.desiredStock}</td>
                  <td className={tableCell}>{supplierName(item.primarySupplierId)}</td>
                  <td className={tableCell}>{item.alternativeSupplierIds.map(supplierName).join(', ') || '—'}</td>
                  <td className={tableCell}>
                    <StatusPill tone={item.active ? 'success' : 'neutral'}>{item.active ? 'Активна' : 'Отключена'}</StatusPill>
                  </td>
                  <td className={tableCell}>
                    {item.requiresApprovalForReplacement ? (
                      <StatusPill tone="warning">Нельзя заменять без подтверждения</StatusPill>
                    ) : (
                      <StatusPill tone="neutral">Обычная замена</StatusPill>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-950">Очередь `Позиция не найдена`</div>
            <div className="text-sm text-slate-500">Ручные строки не создают карточку справочника автоматически.</div>
          </div>
          <StatusPill tone={manualLines.length ? 'warning' : 'success'}>{manualLines.length}</StatusPill>
        </div>

        <div className="mt-4 grid gap-2">
          {manualLines.length ? (
            manualLines.map(({ request, line, room }) => (
              <div key={line.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-semibold text-slate-950">{line.manualName}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {request.createdBy} · кабинет {room?.number} · {formatDateTime(request.createdAt)} · количество {line.quantity}
                    </div>
                    {line.comment ? <div className="mt-1 text-sm text-slate-600">{line.comment}</div> : null}
                    <StatusPill className="mt-2" tone={statusTone(line.status)}>{requestLineStatusLabels[line.status]}</StatusPill>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => reviewManualLine(request.id, line.id, 'link')}>
                      <Link2 size={15} />
                      Привязать к существующей
                    </Button>
                    <Button variant="secondary" onClick={() => reviewManualLine(request.id, line.id, 'create')}>
                      <Plus size={15} />
                      Создать новую
                    </Button>
                    <Button variant="ghost" onClick={() => reviewManualLine(request.id, line.id, 'return')}>
                      <RotateCcw size={15} />
                      Вернуть на уточнение
                    </Button>
                    <Button variant="ghost" onClick={() => reviewManualLine(request.id, line.id, 'reject')}>
                      <XCircle size={15} />
                      Отклонить
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState>Ручных строк пока нет. В кабинете нажмите `Позиция не найдена`, чтобы показать очередь.</EmptyState>
          )}
        </div>
      </Panel>
    </PageTransition>
  )
}
