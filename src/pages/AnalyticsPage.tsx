import { BarChart3, Clock, PackageX, Truck } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { Panel, SectionHeader, StatusPill } from '../components/ui'
import { useDemo } from '../context'
import { getStockQuantity } from '../lib/demoLogic'

export function AnalyticsPage() {
  const {
    state: { catalog, stock, requests, replenishment, orders },
  } = useDemo()
  const belowMinimum = catalog.filter((item) => item.active && getStockQuantity(stock, item.id) < item.minStock).length
  const processedToday = requests.filter((request) => request.status !== 'sent').length
  const alternativeNeeded = replenishment.filter((line) => line.availabilityStatus === 'alternative-selected').length
  const partialReceipt = orders.filter((order) => order.status === 'partial-receipt').length

  return (
    <PageTransition className="grid gap-3">
      <Panel>
        <SectionHeader
          title="Аналитика"
          subtitle="Будущий раздел. Данные накапливаются, уверенные прогнозы и AI-рекомендации в MVP не включены."
        />
      </Panel>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: '5 позиций ниже минимума', value: belowMinimum, icon: PackageX, tone: 'danger' },
          { title: '3 заявки обработаны сегодня', value: processedToday, icon: Clock, tone: 'info' },
          { title: '2 позиции требуют альтернативного поставщика', value: alternativeNeeded, icon: Truck, tone: 'warning' },
          { title: '1 частичный приход', value: partialReceipt, icon: BarChart3, tone: 'neutral' },
        ].map((card) => {
          const Icon = card.icon
          return (
            <Panel key={card.title}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-50 text-emerald-700">
                  <Icon size={20} />
                </div>
                <StatusPill tone={card.tone as 'danger' | 'info' | 'warning' | 'neutral'}>mock</StatusPill>
              </div>
              <div className="mt-4 text-3xl font-semibold text-slate-950">{card.value}</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">{card.title.replace(/^\d+\s*/, '')}</div>
            </Panel>
          )
        })}
      </div>

      <div className="grid gap-3 xl:grid-cols-4">
        {[
          'Данные накапливаются',
          'Прогноз расхода появится после истории выдач',
          'Матрица поставщиков появится после истории заказов',
          'Позиции с регулярным дефицитом будут рассчитаны позже',
        ].map((text) => (
          <Panel key={text} className="bg-slate-50">
            <div className="font-semibold text-slate-950">{text}</div>
          </Panel>
        ))}
      </div>
    </PageTransition>
  )
}
