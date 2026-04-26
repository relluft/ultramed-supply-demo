import { Download, FileSpreadsheet, LoaderCircle } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { Button, Panel, ProgressBar, StatusPill, buttonStyles } from '../components/ui'
import { getDocuments } from '../data/mockData'
import { useDemo } from '../context'
import { formatMoney } from '../lib/format'

export function DocumentsPage() {
  const {
    state: { rows, generation },
    startDocumentGeneration,
    setDocumentProgress,
    completeDocumentGeneration,
    markStageComplete,
  } = useDemo()
  const documents = getDocuments(rows)
  const activeDocument = documents.find((document) => document.id === generation.documentId)

  useEffect(() => {
    markStageComplete('documents')
  }, [markStageComplete])

  useEffect(() => {
    if (generation.status !== 'generating') {
      return
    }

    const startedAt = Date.now()
    const durationMs = 3000
    const timer = window.setInterval(() => {
      const nextProgress = ((Date.now() - startedAt) / durationMs) * 100
      setDocumentProgress(nextProgress)

      if (nextProgress >= 100) {
        window.clearInterval(timer)
        completeDocumentGeneration()
      }
    }, 160)

    return () => window.clearInterval(timer)
  }, [completeDocumentGeneration, generation.status, setDocumentProgress])

  if (!rows.length) {
    return <Navigate to="/workspace/purchase/cases/main/need" replace />
  }

  return (
    <PageTransition className="space-y-5">
      <Panel className="rounded-[34px] p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Закупочный цикл / Документы
            </div>
            <h1 className="display-title mt-4 text-4xl text-neutral-950 md:text-6xl">
              Документы закупки
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
              Система группирует строки по закрепленным поставщикам и готовит отдельные заказы.
            </p>
          </div>
          <Link to="/workspace/purchase/drafts/main" className={`${buttonStyles('secondary')} px-4 py-2.5 text-sm`}>
            Назад в таблицу
          </Link>
        </div>
      </Panel>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr),360px]">
        <Panel className="rounded-[32px] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xl font-semibold text-neutral-950">Готовые файлы</div>
              <div className="mt-1 text-sm text-neutral-500">
                Итоговая таблица и заказы по поставщикам из mock-данных.
              </div>
            </div>
            <StatusPill tone="ready">{documents.length} документов</StatusPill>
          </div>

          <div className="mt-6 grid gap-3">
            {documents.map((document) => {
              const isActive = generation.documentId === document.id
              const isReady = isActive && generation.status === 'ready'

              return (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => startDocumentGeneration(document.id)}
                  className={`rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5 ${
                    isActive ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 bg-white hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-neutral-200 bg-white">
                        <FileSpreadsheet size={19} />
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-950">{document.title}</div>
                        <div className="mt-1 text-sm leading-6 text-neutral-500">{document.subtitle}</div>
                        <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                          {document.rowCount} строк · {formatMoney(document.total)}
                        </div>
                      </div>
                    </div>
                    <StatusPill tone={isReady ? 'ready' : isActive ? 'progress' : 'neutral'}>
                      {isReady ? 'Готов' : isActive ? 'Генерация' : 'Сформировать'}
                    </StatusPill>
                  </div>
                </button>
              )
            })}
          </div>
        </Panel>

        <Panel className="rounded-[32px] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-neutral-200 bg-neutral-50">
              {generation.status === 'generating' ? (
                <LoaderCircle size={20} className="animate-spin" />
              ) : (
                <Download size={20} />
              )}
            </div>
            <div>
              <div className="text-xl font-semibold text-neutral-950">Статус генерации</div>
              <div className="text-sm text-neutral-500">
                {activeDocument ? activeDocument.title : 'Выберите документ'}
              </div>
            </div>
          </div>

          {generation.status === 'idle' ? (
            <div className="mt-6 rounded-[22px] border border-dashed border-neutral-300 p-5 text-sm leading-7 text-neutral-500">
              После клика по документу здесь появится прогресс генерации.
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-neutral-700">
                  {generation.status === 'generating'
                    ? 'Система собирает файл и проверяет строки.'
                    : 'Файл готов в интерфейсе демо.'}
                </div>
                <div className="text-sm font-semibold text-neutral-950">{generation.progress}%</div>
              </div>
              <ProgressBar value={generation.progress} />

              {generation.status === 'ready' && activeDocument ? (
                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                  <div className="font-semibold text-emerald-950">{activeDocument.title}</div>
                  <div className="mt-1 text-sm leading-6 text-emerald-800">
                    Скачивание имитируется: в MVP реальный XLSX не создается.
                  </div>
                  <Button className="mt-4 w-full justify-center" variant="secondary">
                    <Download size={16} />
                    Скачать документ
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </Panel>
      </section>
    </PageTransition>
  )
}
