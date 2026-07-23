import { CheckCircle2 } from 'lucide-react'
import { useRef, useState, type CSSProperties } from 'react'
import { formatDateTime, formatNumber } from '../lib/format'
import type { CatalogItem, RequestCartLine, Room } from '../types/demo'
import {
  Surface,
  TableFrame,
  TableViewport,
  WorkspaceButton,
  WorkspaceDialog,
  workspaceFieldClassName,
  workspaceTableCell,
  workspaceTableHeaderCell,
} from './workspace-v2'

function itemDisplayName(item?: CatalogItem) {
  return item?.fullName || item?.shortName || 'Ручная позиция'
}

export function ManualItemWorkspaceDialog({
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
  const initialFocusRef = useRef<HTMLInputElement>(null)

  return (
    <WorkspaceDialog
      open
      onClose={onClose}
      title="Позиция не найдена"
      description="Строка попадет в очередь разбора справочника."
      className="nurse-modal max-w-lg"
      initialFocusRef={initialFocusRef}
      footer={
        <>
          <WorkspaceButton variant="secondary" onClick={onClose}>
            Отмена
          </WorkspaceButton>
          <WorkspaceButton
            onClick={() => {
              onAdd(name, quantity, comment)
              onClose()
            }}
            disabled={!name.trim()}
          >
            Добавить в заявку
          </WorkspaceButton>
        </>
      }
    >
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm font-normal">
          <span>Текст позиции</span>
          <input
            ref={initialFocusRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={workspaceFieldClassName}
            placeholder="Насадка для нового наконечника"
          />
        </label>
        <label className="grid gap-1 text-sm font-normal">
          <span>Количество</span>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className={workspaceFieldClassName}
          />
        </label>
        <label className="grid gap-1 text-sm font-normal">
          <span>Комментарий</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className={`${workspaceFieldClassName} min-h-24 resize-none`}
            placeholder="не нашли в справочнике"
          />
        </label>
      </div>
    </WorkspaceDialog>
  )
}

export function RequestPreviewWorkspaceDialog({
  cart,
  catalog,
  room,
  responsibleName,
  comment,
  onClose,
  onConfirm,
}: {
  cart: RequestCartLine[]
  catalog: CatalogItem[]
  room?: Room
  responsibleName: string
  comment: string
  onClose: () => void
  onConfirm: () => void
}) {
  const createdAt = formatDateTime(new Date().toISOString())
  const knownCount = cart.filter((line) => line.itemId).length
  const manualCount = cart.length - knownCount
  const totalQuantity = cart.reduce((sum, line) => sum + line.quantity, 0)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <WorkspaceDialog
      open
      onClose={onClose}
      title="Проверка заявки перед отправкой"
      description="Проверьте состав и подтвердите отправку старшей медсестре."
      className="nurse-modal nurse-preview-dialog"
      bodyClassName="nurse-modal-body"
      initialFocusRef={confirmButtonRef}
      footer={
        <>
          <WorkspaceButton variant="secondary" onClick={onClose}>
            Закрыть
          </WorkspaceButton>
          <WorkspaceButton ref={confirmButtonRef} onClick={onConfirm} disabled={!cart.length}>
            Подтвердить
          </WorkspaceButton>
        </>
      }
    >
      <Surface level="panel" className="grid gap-3 p-3 text-sm md:grid-cols-2 xl:grid-cols-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Кабинет</div>
          <div className="mt-1 text-slate-950">
            {room ? `${room.number} · ${room.title}` : 'Кабинет не выбран'}
          </div>
          <div className="mt-0.5 text-xs text-slate-600">{room?.type}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Ответственная</div>
          <div className="mt-1 text-slate-950">{responsibleName || 'Не указан'}</div>
          <div className="mt-0.5 text-xs text-slate-600">Отправка старшей медсестре</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Состав</div>
          <div className="mt-1 text-slate-950">Строк: {cart.length}</div>
          <div className="mt-0.5 text-xs text-slate-600">
            Из справочника: {knownCount}, ручных: {manualCount}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Дата формирования</div>
          <div className="mt-1 text-slate-950">{createdAt}</div>
          <div className="mt-0.5 text-xs text-slate-600">Всего единиц: {formatNumber(totalQuantity)}</div>
        </div>
      </Surface>

      {comment.trim() ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <span className="font-semibold">Комментарий: </span>
          {comment}
        </div>
      ) : null}

      <TableFrame className="mt-4">
        <TableViewport label="Состав заявки перед отправкой">
          <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-[56px]" />
              <col />
              <col className="w-[150px]" />
              <col className="w-[96px]" />
              <col className="w-[80px]" />
              <col className="w-[180px]" />
            </colgroup>
            <thead>
              <tr>
                <th className={`${workspaceTableHeaderCell} text-center`}>№</th>
                <th className={workspaceTableHeaderCell}>Наименование</th>
                <th className={workspaceTableHeaderCell}>Раздел</th>
                <th className={`${workspaceTableHeaderCell} text-center`}>Кол-во</th>
                <th className={`${workspaceTableHeaderCell} text-center`}>Ед.</th>
                <th className={workspaceTableHeaderCell}>Упаковка</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((line, index) => {
                const item = line.itemId
                  ? catalog.find((candidate) => candidate.id === line.itemId)
                  : undefined

                return (
                  <tr key={line.id}>
                    <td className={`${workspaceTableCell} text-center`}>{index + 1}</td>
                    <td className={workspaceTableCell}>
                      <div className="font-medium text-slate-950">
                        {item ? itemDisplayName(item) : line.manualName}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600">
                        {item ? `${item.category}, ${item.unit}` : 'Ручная строка для разбора справочника'}
                      </div>
                    </td>
                    <td className={workspaceTableCell}>{item?.category ?? 'Ручная'}</td>
                    <td className={`${workspaceTableCell} text-center`}>{formatNumber(line.quantity)}</td>
                    <td className={`${workspaceTableCell} text-center`}>{item?.unit ?? 'шт'}</td>
                    <td className={workspaceTableCell}>{item?.packageLabel ?? 'Требует уточнения'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableViewport>
      </TableFrame>
    </WorkspaceDialog>
  )
}

export function RequestSubmitDoneWorkspaceDialog({ onClose }: { onClose: () => void }) {
  return (
    <WorkspaceDialog
      open
      onClose={onClose}
      title="Готово"
      description="Заявка отправлена старшей медсестре."
      className="nurse-modal max-w-md"
      footer={
        <WorkspaceButton className="w-full sm:w-auto" onClick={onClose}>
          Закрыть
        </WorkspaceButton>
      }
    >
      <div className="flex justify-center py-2">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 size={32} aria-hidden="true" />
        </div>
      </div>
    </WorkspaceDialog>
  )
}

export function RequestSubmitLoadingDialog({
  durationSeconds = 0.75,
  onClose,
}: {
  durationSeconds?: number
  onClose: () => void
}) {
  return (
    <WorkspaceDialog
      open
      onClose={onClose}
      title="Формируем заявку"
      description="Проверяем состав и отправляем заявку старшей медсестре."
      className="nurse-loading-dialog"
      closeOnBackdrop={false}
      footer={
        <WorkspaceButton variant="secondary" onClick={onClose}>
          Отмена
        </WorkspaceButton>
      }
    >
        <div className="nurse-loading-content" role="status" aria-live="polite" aria-busy="true">
          <img
            src="/brand/ultramed-main-logo.svg"
            alt="УльтраМед"
            className="h-auto w-full max-w-[280px] object-contain"
          />
          <div className="mt-1 text-xl text-slate-700">Снабжение</div>
          <div
            className="nurse-loading-track mt-6"
            style={{ '--loading-duration': `${durationSeconds}s` } as CSSProperties}
            aria-hidden="true"
          >
            <span />
          </div>
          <div className="mt-3 text-sm font-medium text-slate-700">
            Формируем заявку
          </div>
        </div>
    </WorkspaceDialog>
  )
}
