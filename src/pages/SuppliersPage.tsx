import { Mail, Phone, Truck } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { Panel, SectionHeader, StatusPill } from '../components/ui'
import { useDemo } from '../context'
import { formatDate } from '../lib/format'

export function SuppliersPage() {
  const {
    state: { suppliers, catalog, orders },
  } = useDemo()

  return (
    <PageTransition className="grid gap-3">
      <Panel>
        <SectionHeader title="Поставщики" subtitle="Три разрешенных поставщика в demo-контуре UltraMed Supply." />
      </Panel>

      <div className="grid gap-3 xl:grid-cols-3">
        {suppliers.map((supplier) => {
          const linkedItems = catalog.filter(
            (item) => item.primarySupplierId === supplier.id || item.alternativeSupplierIds.includes(supplier.id),
          )
          const orderLines = orders
            .filter((order) => order.supplierId === supplier.id)
            .flatMap((order) => order.lines)

          return (
            <Panel key={supplier.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-semibold text-slate-950">{supplier.name}</div>
                  <div className="mt-1 text-sm text-slate-500">{supplier.role}</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-50 text-emerald-700">
                  <Truck size={20} />
                </div>
              </div>

              <div className="grid gap-2 text-sm">
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Менеджер</div>
                  <div className="mt-1 font-semibold text-slate-950">{supplier.manager}</div>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone size={15} />
                  {supplier.phone}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail size={15} />
                  {supplier.email}
                </div>
              </div>

              <div className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                <div className="font-semibold text-slate-950">Условия</div>
                {supplier.terms}
              </div>

              <div className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                <div className="font-semibold text-slate-950">Комментарий</div>
                {supplier.comment}
              </div>

              <div className="mt-auto flex flex-wrap gap-2">
                <StatusPill tone="info">{linkedItems.length} связанных позиций</StatusPill>
                <StatusPill tone={orderLines.length ? 'warning' : 'neutral'}>
                  {orderLines.length} строк в заказах
                </StatusPill>
                <StatusPill>{formatDate('2026-04-28T10:15:00+03:00')}</StatusPill>
              </div>
            </Panel>
          )
        })}
      </div>
    </PageTransition>
  )
}
