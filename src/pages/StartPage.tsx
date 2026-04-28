import { ArrowRight, ClipboardList, PackageCheck, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { RoleSwitcher } from '../components/RoleSwitcher'
import { Button, Panel, StatusPill } from '../components/ui'
import { useDemo } from '../context'
import { roleLabels } from '../lib/demoLogic'
import type { DemoRole } from '../types/demo'

export function StartPage() {
  const navigate = useNavigate()
  const {
    state: { role, demoStarted },
    startDemo,
  } = useDemo()
  const [selectedRole, setSelectedRole] = useState<DemoRole>(role)

  function openDemo() {
    startDemo(selectedRole)
    navigate(selectedRole === 'senior-nurse' ? '/senior' : '/cabinet')
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <PageTransition className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col justify-center">
        <Panel className="grid gap-6 p-5 md:p-7 lg:grid-cols-[minmax(0,1.1fr),420px]">
          <section className="flex flex-col justify-between gap-10">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="info">Демо на mock-данных</StatusPill>
                {demoStarted ? <StatusPill tone="success">Демо уже запущено</StatusPill> : null}
              </div>

              <h1 className="mt-6 text-4xl font-semibold tracking-normal text-slate-950 md:text-6xl">
                UltraMed Supply
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                Контур снабжения стоматологии: заявки, склад, пополнение, поставщики.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                { icon: ClipboardList, title: 'Заявка', text: 'Кабинет отправляет расходники.' },
                { icon: PackageCheck, title: 'Склад', text: 'Старшая медсестра выдает и видит остатки.' },
                { icon: ShieldCheck, title: 'Заказ', text: 'Пополнение и приход фиксируются в журнале.' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <Icon size={20} className="text-emerald-700" />
                    <div className="mt-3 font-semibold text-slate-950">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-500">{item.text}</div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-950">Выберите роль для демонстрации</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Переключатель нужен только в MVP. В реальном продукте роль будет определяться входом пользователя.
            </p>

            <div className="mt-4">
              <RoleSwitcher selectedRole={selectedRole} onSelect={setSelectedRole} />
            </div>

            <div className="mt-5 rounded-md border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Откроется экран</div>
              <div className="mt-1 text-xl font-semibold text-slate-950">{roleLabels[selectedRole]}</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                {selectedRole === 'senior-nurse'
                  ? 'Рабочий стол, склад, пополнение, заказы, приход и журнал.'
                  : 'Кабинет с поиском справочника, корзиной и историей своих заявок.'}
              </div>
            </div>

            <Button className="mt-5 w-full" onClick={openDemo}>
              Запустить демо
              <ArrowRight size={17} />
            </Button>
          </section>
        </Panel>
      </PageTransition>
    </div>
  )
}
