import { CheckCircle2, Link2, Plus, RotateCcw, X, XCircle } from 'lucide-react'
import { useState, type PropsWithChildren } from 'react'
import { PageTransition } from '../components/PageTransition'
import { Button, EmptyState, Panel, SectionHeader, StatusPill, tableCell, tableHeaderCell } from '../components/ui'
import {
  IconButton,
  StatusBadge,
  Surface,
  TableViewport,
  WorkspaceButton,
  WorkspaceDialog,
  WorkspaceField,
  workspaceTableCell,
  workspaceTableHeaderCell,
} from '../components/workspace-v2'
import { useDemo } from '../context'
import { requestLineStatusLabels, roleToRoomId, statusTone } from '../lib/demoLogic'
import { formatDate, formatDateTime } from '../lib/format'
import type { CatalogItem, DemoRole } from '../types/demo'

function CatalogTableViewport({
  workspaceV2,
  children,
}: PropsWithChildren<{ workspaceV2: boolean }>) {
  if (workspaceV2) {
    return (
      <TableViewport label="Справочник материалов">
        {children}
      </TableViewport>
    )
  }

  return <div className="overflow-x-auto">{children}</div>
}

type CabinetMaterialRow = {
  id: string
  item: CatalogItem
  quantity: number
  expiresAt?: string
}

const cabinetExpiryDatesByItemId: Record<string, string[]> = {
  'item-needles-30g': ['2028-06-30'],
  'item-articaine': ['2026-08-18', '2027-09-30'],
  'item-cofferdam': ['2027-06-30'],
  'item-adhesive': ['2026-06-30', '2027-04-30'],
  'item-composite-a2': ['2026-09-12', '2027-12-31'],
  'item-suture-4-0': ['2026-05-31'],
  'item-prophy-paste': ['2026-08-31'],
  'item-fluoride-varnish': ['2026-07-10', '2027-05-31'],
  'item-chlorhexidine': ['2026-08-05', '2027-02-28'],
  'item-surface-wipes': ['2026-09-30'],
  'item-sterile-gauze': ['2028-01-31'],
  'item-airflow-powder': ['2027-03-31'],
  'item-sterilization-indicators': ['2026-06-15'],
  'item-tray-adhesive': ['2026-09-15'],
  'item-a-silicone': ['2026-09-20', '2027-11-30'],
  'item-light-body': ['2027-10-31'],
  'item-bite-registration': ['2026-08-25'],
  'item-temp-cement': ['2027-08-31'],
  'item-ortho-primer': ['2026-04-30'],
}

function cabinetMaterialRows(catalog: CatalogItem[], role: DemoRole): CabinetMaterialRow[] {
  const roleOffset = role === 'nurse-101' ? 0 : role === 'nurse-102' ? 1 : 2

  return catalog.flatMap((item, itemIndex) => {
    const expiryDates = cabinetExpiryDatesByItemId[item.id]
    if (!expiryDates?.length) {
      return [{
        id: `${item.id}--no-expiry`,
        item,
        quantity: 2 + ((itemIndex + roleOffset) % 3),
      }]
    }

    return expiryDates.map((expiresAt, batchIndex) => ({
      id: `${item.id}--${expiresAt}`,
      item,
      quantity: expiryDates.length > 1
        ? 1 + ((batchIndex + roleOffset) % 2)
        : 1 + ((itemIndex + roleOffset) % 3),
      expiresAt,
    }))
  })
}

function expiryTone(expiresAt: string): 'success' | 'warning' | 'danger' {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(`${expiresAt}T23:59:59`)
  const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000)

  if (daysRemaining < 0) return 'danger'
  if (daysRemaining <= 75) return 'warning'
  return 'success'
}

function expiryLabel(expiresAt: string) {
  const tone = expiryTone(expiresAt)
  if (tone === 'danger') return `Просрочено · ${formatDate(expiresAt)}`
  if (tone === 'warning') return `Внимание · до ${formatDate(expiresAt)}`
  return `Годен до ${formatDate(expiresAt)}`
}

export function CatalogPage({
  readOnly = false,
  uiMode = 'legacy',
}: {
  readOnly?: boolean
  uiMode?: 'legacy' | 'workspace-v2'
}) {
  const {
    state: { catalog, suppliers, requests, rooms, role, removedCabinetMaterialBatchIds },
    reviewManualLine,
    removeCabinetMaterialBatch,
  } = useDemo()
  const [pendingRemoval, setPendingRemoval] = useState<CabinetMaterialRow | null>(null)
  const [materialSearch, setMaterialSearch] = useState('')
  const [materialCategory, setMaterialCategory] = useState('all')
  const [materialExpiryFilter, setMaterialExpiryFilter] = useState('all')
  const [materialSort, setMaterialSort] = useState('expiry-priority')
  const activeMaterials = catalog.filter((item) => item.active)
  const roomId = roleToRoomId(role)
  const removedBatchIds = new Set(roomId ? removedCabinetMaterialBatchIds?.[roomId] ?? [] : [])
  const cabinetRows = cabinetMaterialRows(activeMaterials, role).filter((row) => !removedBatchIds.has(row.id))
  const materialCategories = Array.from(new Set(cabinetRows.map((row) => row.item.category))).sort((a, b) => a.localeCompare(b, 'ru'))
  const normalizedMaterialSearch = materialSearch.trim().toLocaleLowerCase('ru')
  const visibleCabinetRows = cabinetRows
    .filter((row) => {
      const matchesSearch = !normalizedMaterialSearch || [row.item.fullName, row.item.category, row.item.packageLabel]
        .some((value) => value.toLocaleLowerCase('ru').includes(normalizedMaterialSearch))
      const matchesCategory = materialCategory === 'all' || row.item.category === materialCategory
      const rowExpiryStatus = row.expiresAt ? expiryTone(row.expiresAt) : 'none'
      const matchesExpiry = materialExpiryFilter === 'all' || rowExpiryStatus === materialExpiryFilter
      return matchesSearch && matchesCategory && matchesExpiry
    })
    .sort((left, right) => {
      if (materialSort === 'name') {
        return left.item.fullName.localeCompare(right.item.fullName, 'ru') || (left.expiresAt ?? '').localeCompare(right.expiresAt ?? '')
      }
      if (materialSort === 'category') {
        return left.item.category.localeCompare(right.item.category, 'ru') || left.item.fullName.localeCompare(right.item.fullName, 'ru')
      }
      if (materialSort === 'quantity-desc') {
        return right.quantity - left.quantity || left.item.fullName.localeCompare(right.item.fullName, 'ru')
      }
      if (materialSort === 'expiry-asc') {
        if (!left.expiresAt && !right.expiresAt) return left.item.fullName.localeCompare(right.item.fullName, 'ru')
        if (!left.expiresAt) return 1
        if (!right.expiresAt) return -1
        return left.expiresAt.localeCompare(right.expiresAt) || left.item.fullName.localeCompare(right.item.fullName, 'ru')
      }

      const priority: Record<'danger' | 'warning' | 'success' | 'none', number> = { danger: 0, warning: 1, success: 2, none: 3 }
      const leftStatus = left.expiresAt ? expiryTone(left.expiresAt) : 'none'
      const rightStatus = right.expiresAt ? expiryTone(right.expiresAt) : 'none'
      return priority[leftStatus] - priority[rightStatus]
        || left.item.fullName.localeCompare(right.item.fullName, 'ru')
        || (left.expiresAt ?? '').localeCompare(right.expiresAt ?? '')
    })
  const isWorkspaceV2 = uiMode === 'workspace-v2'
  const PanelView = isWorkspaceV2 ? Surface : Panel
  const StatusView = isWorkspaceV2 ? StatusBadge : StatusPill
  const headerCellClass = isWorkspaceV2 ? workspaceTableHeaderCell : tableHeaderCell
  const cellClass = isWorkspaceV2 ? workspaceTableCell : tableCell
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
    <PageTransition
      respectReducedMotion={isWorkspaceV2}
      className={isWorkspaceV2 ? 'nurse-page grid gap-4' : 'grid gap-4'}
    >
      <PanelView className={isWorkspaceV2 ? 'p-[var(--ui-panel-padding)]' : undefined}>
        <SectionHeader
          title="Материалы"
          subtitle={
            readOnly
              ? 'Справочник регулярных стоматологических расходников и материалов для просмотра в кабинете.'
              : 'Единый справочник регулярных стоматологических расходников и материалов, доступный кабинетам для формирования заявок.'
          }
        />
      </PanelView>

      {!readOnly ? (
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ['Активные материалы', activeMaterials.length, 'success'],
            ['Разделы справочника', categoryCount, 'info'],
            ['Требуют согласования замены', replacementApprovalCount, replacementApprovalCount ? 'warning' : 'success'],
            ['Ручные строки на разбор', manualLines.length, manualLines.length ? 'warning' : 'success'],
          ].map(([label, value, tone]) => (
            <PanelView key={label} className={isWorkspaceV2 ? 'p-[var(--ui-panel-padding)]' : 'p-3'}>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
              <StatusView className="mt-2" tone={tone as 'success' | 'warning' | 'info'}>Контроль</StatusView>
            </PanelView>
          ))}
        </div>
      ) : null}

      {readOnly ? (
        <PanelView className="nurse-materials-toolbar p-[var(--ui-panel-padding)]">
          <label className="nurse-materials-filter nurse-materials-filter--search">
            <span>Поиск</span>
            <WorkspaceField
              type="search"
              value={materialSearch}
              onChange={(event) => setMaterialSearch(event.target.value)}
              placeholder="Название, категория или упаковка"
            />
          </label>
          <label className="nurse-materials-filter">
            <span>Статус срока</span>
            <select className="workspace-field" value={materialExpiryFilter} onChange={(event) => setMaterialExpiryFilter(event.target.value)}>
              <option value="all">Все статусы</option>
              <option value="danger">Просрочено</option>
              <option value="warning">Требует внимания</option>
              <option value="success">Годен</option>
              <option value="none">Срок не учитывается</option>
            </select>
          </label>
          <label className="nurse-materials-filter">
            <span>Категория</span>
            <select className="workspace-field" value={materialCategory} onChange={(event) => setMaterialCategory(event.target.value)}>
              <option value="all">Все категории</option>
              {materialCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="nurse-materials-filter">
            <span>Сортировка</span>
            <select className="workspace-field" value={materialSort} onChange={(event) => setMaterialSort(event.target.value)}>
              <option value="expiry-priority">Сначала критичные</option>
              <option value="expiry-asc">По ближайшему сроку</option>
              <option value="name">По названию</option>
              <option value="category">По категории</option>
              <option value="quantity-desc">По количеству</option>
            </select>
          </label>
          <div className="nurse-materials-filter-summary">Показано: {visibleCabinetRows.length} из {cabinetRows.length}</div>
        </PanelView>
      ) : null}

      <PanelView className="overflow-hidden p-0">
        <CatalogTableViewport workspaceV2={isWorkspaceV2}>
          {readOnly ? (
            <table className="nurse-materials-table w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className={headerCellClass}>№</th>
                  <th className={headerCellClass}>Название</th>
                  <th className={headerCellClass}>Категория</th>
                  <th className={headerCellClass}>Единица измерения</th>
                  <th className={headerCellClass}>Упаковка</th>
                  <th className={headerCellClass}>Количество</th>
                  <th className={headerCellClass}>Срок годности</th>
                  <th className={headerCellClass}><span className="sr-only">Действия</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleCabinetRows.map((row, index) => (
                  <tr key={row.id} data-expiry-tone={row.expiresAt ? expiryTone(row.expiresAt) : undefined}>
                    <td className={`${cellClass} nurse-materials-index`}>{index + 1}</td>
                    <td className={`${cellClass} nurse-materials-name`}>{row.item.fullName}</td>
                    <td className={cellClass}>{row.item.category}</td>
                    <td className={cellClass}>{row.item.unit}</td>
                    <td className={cellClass}>{row.item.packageLabel || '—'}</td>
                    <td className={`${cellClass} nurse-materials-quantity`}>{row.quantity}</td>
                    <td className={`${cellClass} nurse-materials-expiry`}>
                      {row.expiresAt ? (
                        <span className="nurse-materials-expiry-label" data-tone={expiryTone(row.expiresAt)}>
                          {expiryLabel(row.expiresAt)}
                        </span>
                      ) : (
                        <span className="text-slate-500">Не требуется</span>
                      )}
                    </td>
                    <td className={`${cellClass} nurse-materials-actions`}>
                      <IconButton
                        className="nurse-materials-delete"
                        aria-label={`Удалить ${row.item.shortName}${row.expiresAt ? `, срок до ${formatDate(row.expiresAt)}` : ''}`}
                        title="Удалить позицию из кабинета"
                        onClick={() => setPendingRemoval(row)}
                      >
                        <X size={17} aria-hidden="true" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[1320px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={headerCellClass}>№</th>
                <th className={headerCellClass}>Полное название</th>
                <th className={headerCellClass}>Короткое</th>
                <th className={headerCellClass}>Категория</th>
                <th className={headerCellClass}>Ед.</th>
                <th className={headerCellClass}>Упаковка</th>
                <th className={headerCellClass}>Кратность</th>
                <th className={headerCellClass}>Мин.</th>
                <th className={headerCellClass}>Желат.</th>
                <th className={headerCellClass}>Основной</th>
                <th className={headerCellClass}>Альтернативы</th>
                <th className={headerCellClass}>Активность</th>
                <th className={headerCellClass}>Замена</th>
              </tr>
            </thead>
            <tbody>
              {activeMaterials.map((item, index) => (
                <tr key={item.id}>
                  <td className={cellClass}>{index + 1}</td>
                  <td className={cellClass}>{item.fullName}</td>
                  <td className={cellClass}>
                    <div className="font-semibold text-slate-950">{item.shortName}</div>
                    {item.shortName.includes('4181') ||
                    item.shortName.includes('4182') ||
                    item.shortName.includes('4191') ||
                    item.shortName.includes('4192') ? (
                      <div className="mt-1 text-xs font-semibold text-amber-700">Проверять диаметр и абразивность: 4181/4182/4191/4192</div>
                    ) : null}
                  </td>
                  <td className={cellClass}>{item.category}</td>
                  <td className={cellClass}>{item.unit}</td>
                  <td className={cellClass}>{item.packageLabel}</td>
                  <td className={cellClass}>{item.orderMultiple ?? 1}</td>
                  <td className={cellClass}>{item.minStock}</td>
                  <td className={cellClass}>{item.desiredStock}</td>
                  <td className={cellClass}>{supplierName(item.primarySupplierId)}</td>
                  <td className={cellClass}>{item.alternativeSupplierIds.map(supplierName).join(', ') || '—'}</td>
                  <td className={cellClass}>
                    <StatusView tone={item.active ? 'success' : 'neutral'}>{item.active ? 'Активна' : 'Отключена'}</StatusView>
                  </td>
                  <td className={cellClass}>
                    {item.requiresApprovalForReplacement ? (
                      <StatusView tone="warning">Нельзя заменять без подтверждения</StatusView>
                    ) : (
                      <StatusView tone="neutral">Обычная замена</StatusView>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </CatalogTableViewport>
      </PanelView>

      {readOnly ? (
        <WorkspaceDialog
          open={Boolean(pendingRemoval)}
          onClose={() => setPendingRemoval(null)}
          title="Удалить материал из кабинета?"
          description="Проверьте выбранную позицию. Это действие удалит только указанную партию из текущего кабинета."
          footer={
            <>
              <WorkspaceButton variant="secondary" onClick={() => setPendingRemoval(null)}>
                Отмена
              </WorkspaceButton>
              <WorkspaceButton
                variant="danger"
                onClick={() => {
                  if (!pendingRemoval) return
                  removeCabinetMaterialBatch(pendingRemoval.id)
                  setPendingRemoval(null)
                }}
              >
                Удалить
              </WorkspaceButton>
            </>
          }
        >
          {pendingRemoval ? (
            <div className="grid gap-2 text-sm">
              <div className="font-medium text-slate-950">{pendingRemoval.item.fullName}</div>
              <div className="text-slate-600">
                Количество: {pendingRemoval.quantity} {pendingRemoval.item.unit}
                {pendingRemoval.expiresAt ? ` · срок годности до ${formatDate(pendingRemoval.expiresAt)}` : ' · срок годности не учитывается'}
              </div>
            </div>
          ) : null}
        </WorkspaceDialog>
      ) : null}

      {!readOnly && (missingFieldCount || archivedMaterials.length) ? (
        <PanelView className={isWorkspaceV2 ? 'p-[var(--ui-panel-padding)]' : 'p-3'}>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {missingFieldCount ? <StatusView tone="warning">{missingFieldCount} карточек требуют уточнения цены</StatusView> : null}
            {archivedMaterials.length ? <StatusView tone="neutral">{archivedMaterials.length} архивных позиций скрыто из материалов</StatusView> : null}
          </div>
        </PanelView>
      ) : null}

      {!readOnly ? (
        <PanelView>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-950">Очередь `Позиция не найдена`</div>
              <div className="text-sm text-slate-500">Ручные строки не создают карточку справочника автоматически.</div>
            </div>
            <StatusView tone={manualLines.length ? 'warning' : 'success'}>{manualLines.length}</StatusView>
          </div>

          <div className="mt-4 grid gap-2">
            {manualLines.length ? (
              manualLines.map(({ request, line, room }) => (
                <div key={line.id} className="app-soft-card rounded-md border p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-semibold text-slate-950">{line.manualName}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {request.createdBy} · кабинет {room?.number} · {formatDateTime(request.createdAt)} · количество {line.quantity}
                      </div>
                      {line.comment ? <div className="mt-1 text-sm text-slate-600">{line.comment}</div> : null}
                      <StatusView className="mt-2" tone={statusTone(line.status)}>{requestLineStatusLabels[line.status]}</StatusView>
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
        </PanelView>
      ) : null}
    </PageTransition>
  )
}
