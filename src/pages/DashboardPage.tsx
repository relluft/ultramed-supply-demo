import { ArrowRight, FileSpreadsheet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { Button, Panel } from '../components/ui'
import { useDemo } from '../context'

export function DashboardPage() {
  const navigate = useNavigate()
  const { startCycle } = useDemo()

  function handleStart() {
    startCycle()
    navigate('/workspace/purchase/cases/main/need')
  }

  return (
    <PageTransition>
      <Panel className="rounded-[34px] p-7 md:p-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-neutral-200 bg-white text-neutral-950">
              <FileSpreadsheet size={30} />
            </div>
            <h2 className="display-section-title mt-7 text-3xl text-neutral-950 md:text-4xl">
              Закупочный цикл
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-neutral-600">
              Прямой путь от потребности подразделений к рабочей таблице закупки и готовым заказам
              поставщикам.
            </p>
          </div>

          <Button className="px-6 py-3 text-base" onClick={handleStart}>
            Создать закупочный цикл
            <ArrowRight size={18} />
          </Button>
        </div>
      </Panel>
    </PageTransition>
  )
}
