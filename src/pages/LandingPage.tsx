import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { buttonStyles } from '../components/ui'

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-[1520px] flex-col px-4 py-5 md:px-6 lg:px-8">
        <main className="flex flex-1 items-center justify-center py-8 md:py-12">
          <PageTransition className="panel w-full max-w-6xl overflow-hidden rounded-[42px] border border-neutral-200 bg-white px-6 py-12 text-center shadow-sm md:px-10 md:py-16 lg:px-14 lg:py-20">
            <div className="mx-auto max-w-4xl">
              <h1 className="display-title text-5xl text-neutral-950 md:text-8xl">
                UltraMed Supply
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-neutral-600 md:text-[1.18rem] md:leading-9">
                Закупочная таблица из заявок и прайсов - быстро и готово к проверке.
              </p>
              <Link to="/workspace" className={`mt-10 ${buttonStyles('primary')} px-8 py-3.5 text-base`}>
                Перейти в рабочее пространство
                <ArrowRight size={18} />
              </Link>
            </div>
          </PageTransition>
        </main>
      </div>
    </div>
  )
}
