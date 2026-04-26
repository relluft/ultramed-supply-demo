import { ArrowRight } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { PurchaseTable } from '../components/PurchaseTable'
import { Panel, buttonStyles } from '../components/ui'
import { getPurchaseTotal, getReviewCount } from '../data/mockData'
import { useDemo } from '../context'
import { formatMoney } from '../lib/format'

export function TablePage() {
  const {
    state: { rows, demoLoaded },
    markStageComplete,
  } = useDemo()

  if (!demoLoaded || !rows.length) {
    return <Navigate to="/workspace/purchase/cases/main/need" replace />
  }

  const kpis = [
    ['Строк всего', String(rows.length)],
    ['Требуют проверки', String(getReviewCount(rows))],
    ['Сумма закупки', formatMoney(getPurchaseTotal(rows))],
  ]

  return (
    <PageTransition className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
          Закупочный цикл / Рабочая таблица
        </div>
        <Link
          to="/workspace/purchase/documents/main"
          onClick={() => markStageComplete('documents')}
          className={`${buttonStyles('primary')} px-4 py-2.5 text-sm`}
        >
          Перейти к документам
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {kpis.map(([label, value]) => (
          <Panel key={label} className="rounded-[24px] px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              {label}
            </div>
            <div className="mt-2 text-xl font-semibold text-neutral-950">{value}</div>
          </Panel>
        ))}
      </div>

      <PurchaseTable />

      <div className="flex justify-end">
        <Link
          to="/workspace/purchase/documents/main"
          onClick={() => markStageComplete('documents')}
          className={`${buttonStyles('primary')} px-5 py-3 text-sm`}
        >
          Перейти к документам
          <ArrowRight size={16} />
        </Link>
      </div>
    </PageTransition>
  )
}
