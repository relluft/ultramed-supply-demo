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
  const activeMaterials = catalog.filter((item) => item.active)
  const archivedMaterials = catalog.filter((item) => !item.active)
  const categoryCount = new Set(activeMaterials.map((item) => item.category)).size
  const manualLines = requests.flatMap((request) =>
    request.lines
      .filter((line) => line.manualName)
      .map((line) => ({ request, line, room: rooms.find((room) => room.id === request.roomId) })),
  )
  const missingFieldCount = activeMaterials.filter((item) => !item.price || !item.packageLabel).length
  const replacementApprovalCount = activeMaterials.filter((item) => item.requiresApprovalForReplacement).length

  function supplierName(id?: string) {
    return suppliers.find((supplier) => supplier.id === id)?.name ?? '—'
  }

  return (
    <PageTransition className="grid gap-4">
      <Panel>
        <SectionHeader
          title="Материалы"
          subtitle="Единый справочник регулярных стоматологических расходников и материалов, доступный кабинетам для формирования заявок."
        />
      </Panel>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ['Активные материалы', activeMaterials.length, 'success'],
          ['Разделы справочника', categoryCount, 'info'],
          ['Требуют согласования замены', replacementApprovalCount, replacementApprovalCount ? 'warning' : 'success'],
          ['Ручные строки на разбор', manualLines.length, manualLines.length ? 'warning' : 'success'],
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
          <table className="w-full min-w-[1320px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={tableHeaderCell}>№</th>
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
              {activeMaterials.map((item, index) => (
                <tr key={item.id}>
                  <td className={tableCell}>{index + 1}</td>
                  <td className={tableCell}>{item.fullName}</td>
                  <td className={tableCell}>
                    <div className="font-semibold text-slate-950">{item.shortName}</div>
                    {item.shortName.includes('4181') ||
                    item.shortName.includes('4182') ||
                    item.shortName.includes('4191') ||
                    item.shortName.includes('4192') ? (
                      <div className="mt-1 text-xs font-semibold text-amber-700">Проверять диаметр и абразивность: 4181/4182/4191/4192</div>
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

      {missingFieldCount || archivedMaterials.length ? (
        <Panel className="p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {missingFieldCount ? <StatusPill tone="warning">{missingFieldCount} карточек требуют уточнения цены</StatusPill> : null}
            {archivedMaterials.length ? <StatusPill tone="neutral">{archivedMaterials.length} архивных позиций скрыто из материалов</StatusPill> : null}
          </div>
        </Panel>
      ) : null}

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
