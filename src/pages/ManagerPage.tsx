import { BarChart3, Clock, FileWarning, Network, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { Panel, StatusPill, buttonStyles } from '../components/ui'
import { getPurchaseTotal, getReviewCount } from '../data/mockData'
import { useDemo } from '../context'
import { formatMoney } from '../lib/format'

export function ManagerPage() {
  const {
    state: { rows },
  } = useDemo()
  const total = rows.length ? getPurchaseTotal(rows) : 386420
  const noPriceCount = rows.length ? rows.filter((row) => row.price <= 0).length : 4
  const reviewCount = rows.length ? getReviewCount(rows) : 7

  const metrics = [
    { label: 'Сумма закупочного цикла', value: formatMoney(total), icon: WalletCards },
    { label: 'Строки без цены', value: String(noPriceCount), icon: FileWarning },
    { label: 'Строки на ручную проверку', value: String(reviewCount), icon: BarChart3 },
    { label: 'Ручные часы', value: '10 -> 4', icon: Clock },
  ]

  return (
    <div className="min-h-screen px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1580px] gap-6 xl:grid-cols-[286px,minmax(0,1fr)]">
        <aside className="rounded-[30px] border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-semibold text-neutral-950">Кабинет руководителя</div>
          <div className="mt-2 text-sm leading-6 text-neutral-500">Управленческий слой пилота.</div>
          <div className="mt-6 space-y-2">
            {['Сводка', 'Закупочные циклы', 'Отклонения', 'Эффект масштабирования', 'Отчеты'].map(
              (item, index) => (
                <button
                  key={item}
                  className={`w-full rounded-full border px-4 py-3 text-sm font-semibold transition ${
                    index === 0
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {item}
                </button>
              ),
            )}
          </div>
          <Link to="/" className={`mt-6 w-full ${buttonStyles('secondary')}`}>
            На landing
          </Link>
        </aside>

        <PageTransition className="space-y-6">
          <Panel className="rounded-[34px] p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Пилот закупок / Сводка
                </div>
                <h1 className="display-title mt-4 text-4xl text-neutral-950 md:text-6xl">
                  Сводка для руководителя
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">
                  Отдельный кабинет показывает управленческий результат, который закупщик не видит
                  в рабочей таблице.
                </p>
              </div>
              <StatusPill tone="ready">Пилотная оценка</StatusPill>
            </div>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <Panel key={metric.label} className="rounded-[26px] p-5">
                  <Icon size={20} className="text-neutral-500" />
                  <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    {metric.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-neutral-950">{metric.value}</div>
                </Panel>
              )
            })}
          </div>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr),360px]">
            <Panel className="rounded-[32px] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-neutral-200 bg-neutral-50">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <div className="text-xl font-semibold text-neutral-950">Вывод по пилоту</div>
                  <div className="text-sm text-neutral-500">Стоматология и базовые расходники</div>
                </div>
              </div>
              <div className="mt-6 space-y-4 text-sm leading-7 text-neutral-600">
                <p>
                  Демонстрационный цикл показывает, что закупочная таблица собирается в единый
                  контур: строки нормализуются, спорные позиции подсвечиваются, а заказы
                  поставщикам формируются из уже проверенной таблицы.
                </p>
                <p>
                  Основная ценность пилота - не замена закупщика, а сокращение ручной сверки и
                  управляемая фиксация отклонений до отправки заказа.
                </p>
              </div>
            </Panel>

            <Panel className="rounded-[32px] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-neutral-200 bg-neutral-50">
                  <Network size={20} />
                </div>
                <div>
                  <div className="text-xl font-semibold text-neutral-950">Масштабирование</div>
                  <div className="text-sm text-neutral-500">Расчет на сеть</div>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {[
                  ['Площадок в расчете', '5+'],
                  ['Повторяемость цикла', 'ежемесячно'],
                  ['Экономия ручного времени', 'до 60%'],
                  ['Следующий шаг', 'реальные заявки и прайсы'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[18px] border border-neutral-200 bg-neutral-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.14em] text-neutral-400">{label}</div>
                    <div className="mt-1 font-semibold text-neutral-950">{value}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        </PageTransition>
      </div>
    </div>
  )
}
