import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Paperclip,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { Button, Eyebrow, Panel, ProgressBar, fieldStyles } from '../components/ui'
import { useDemo } from '../context'

const loadingMs = 7200
const processingSteps = ['Разбираем заявки', 'Сверяем с прайсами', 'Собираем рабочую таблицу']
const demoRequestFiles = [
  { name: 'Ортопедические инструменты.xlsx', type: 'XLSX' },
  { name: 'Хирургические материалы.docx', type: 'DOCX' },
  { name: 'Терапия расходники май.xlsx', type: 'XLSX' },
  { name: 'Детская стоматология заявка.docx', type: 'DOCX' },
  { name: 'Стерилизация и дезсредства.xlsx', type: 'XLSX' },
]

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, value))
}

export function NeedPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const progressRef = useRef<number | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [attachedFile, setAttachedFile] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const {
    state: { needText, demoLoaded },
    applyDemo,
    updateNeedText,
    markStageComplete,
  } = useDemo()
  const uploadedFiles = [
    ...(demoLoaded ? demoRequestFiles : []),
    ...(attachedFile ? [{ name: attachedFile, type: attachedFile.split('.').pop()?.toUpperCase() ?? 'FILE' }] : []),
  ]

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      if (progressRef.current) window.clearInterval(progressRef.current)
    }
  }, [])

  function clearTimers() {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    if (progressRef.current) window.clearInterval(progressRef.current)
    timerRef.current = null
    progressRef.current = null
    startedAtRef.current = null
  }

  function finishProcessing() {
    clearTimers()
    setProgress(100)
    setIsProcessing(false)
    markStageComplete('table')
    navigate('/workspace/purchase/drafts/main')
  }

  function startProcessing() {
    if (isProcessing) return

    if (!demoLoaded) {
      applyDemo()
    }

    markStageComplete('need')
    setIsProcessing(true)
    setProgress(2)
    startedAtRef.current = Date.now()
    progressRef.current = window.setInterval(() => {
      const elapsed = Date.now() - (startedAtRef.current ?? Date.now())
      setProgress(Math.min(99, Math.round((elapsed / loadingMs) * 100)))
    }, 120)
    timerRef.current = window.setTimeout(finishProcessing, loadingMs)
  }

  return (
    <PageTransition className="space-y-6">
      <Panel className="rounded-[34px] p-6 md:p-8">
        <Eyebrow>Закупочный цикл / Потребность</Eyebrow>
        <div className="mt-5">
          <h1 className="display-section-title text-3xl text-neutral-950 md:text-[2.2rem]">
            Потребность
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-neutral-600">
            Сюда можно вставить грязный список позиций из заявок или приложить файлы из разных
            кабинетов. Демо показывает, как разрозненные заявки сходятся в один закупочный цикл.
          </p>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr),360px]">
          <textarea
            value={needText}
            onChange={(event) => updateNeedText(event.target.value)}
            rows={15}
            placeholder="Вставьте список позиций из заявок: каждая позиция с новой строки"
            className={`min-h-[420px] resize-none ${fieldStyles}`}
          />

          <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-neutral-950">Загруженные заявки</div>
                <div className="mt-1 text-xs leading-5 text-neutral-500">
                  Файлы из кабинетов и направлений
                </div>
              </div>
              <div className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-500">
                {uploadedFiles.length}
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {uploadedFiles.length ? (
                uploadedFiles.map((file) => {
                  const isExcel = file.type.includes('XLS') || file.name.toLowerCase().endsWith('.xlsx')
                  const Icon = isExcel ? FileSpreadsheet : FileText

                  return (
                    <div
                      key={file.name}
                      className="flex items-start gap-3 rounded-[18px] border border-neutral-200 bg-white px-3 py-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-neutral-200 bg-neutral-50 text-neutral-950">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="break-words text-sm font-semibold leading-5 text-neutral-950">
                          {file.name}
                        </div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
                          {file.type} · загружен
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="rounded-[18px] border border-dashed border-neutral-300 bg-white px-4 py-6 text-sm leading-6 text-neutral-500">
                  Нажмите `Демо`, чтобы показать пачку заявок из разных кабинетов.
                </div>
              )}
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".doc,.docx,.pdf,.xls,.xlsx"
          className="hidden"
          onChange={(event) => setAttachedFile(event.target.files?.[0]?.name ?? null)}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Paperclip size={16} />
            Прикрепить файл
          </Button>
          <div className="text-sm text-neutral-500">Поддерживаются Word, PDF и Excel</div>
        </div>

        {attachedFile ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            <div>
              <span className="font-semibold text-neutral-950">{attachedFile}</span> добавлен в список
              заявок справа.
            </div>
            <Button variant="ghost" onClick={() => setAttachedFile(null)}>
              <X size={15} />
              Удалить файл
            </Button>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button variant="ghost" onClick={applyDemo}>
            Демо
          </Button>
          <Button onClick={startProcessing} disabled={isProcessing}>
            Сформировать рабочую таблицу
            <ArrowRight size={16} />
          </Button>
        </div>
      </Panel>

      {isProcessing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-white/55 backdrop-blur-md" />
          <div className="relative w-full max-w-[520px] rounded-[28px] border border-neutral-200 bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.16)] md:p-6">
            <button
              type="button"
              onClick={() => {
                clearTimers()
                setIsProcessing(false)
                setProgress(0)
              }}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition hover:text-neutral-950"
              aria-label="Отменить загрузку"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-4 pr-10">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-neutral-200 bg-neutral-50">
                <Loader2 size={22} className="animate-spin" />
              </div>
              <div>
                <Eyebrow>Фоновая обработка</Eyebrow>
                <h2 className="display-section-title mt-4 text-2xl text-neutral-950">
                  Формируем рабочую таблицу
                </h2>
                <p className="mt-2 text-sm leading-7 text-neutral-600">
                  Собираем строки закупки, каталожные наименования, цены и источники значений.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <ProgressBar value={progress} />
              <div className="mt-2 text-right text-xs font-semibold text-neutral-500">{progress}%</div>
            </div>

            <div className="mt-5 grid gap-2 text-sm">
              {processingSteps.map((step, index) => {
                const stepStart = (index / processingSteps.length) * 100
                const stepEnd = ((index + 1) / processingSteps.length) * 100
                const stepProgress = clampProgress(((progress - stepStart) / (stepEnd - stepStart)) * 100)
                const isComplete = progress >= stepEnd
                const isActive = !isComplete && progress >= stepStart

                return (
                  <div
                    key={step}
                    className="relative flex items-center gap-3 overflow-hidden rounded-[16px] border border-neutral-200 bg-white px-3 py-2 text-neutral-700"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-neutral-100 transition-[width] duration-300 ease-out"
                      style={{ width: `${stepProgress}%` }}
                    />
                    <div className="relative flex h-[15px] w-[15px] shrink-0 items-center justify-center">
                      {isComplete ? (
                        <CheckCircle2 size={15} className="text-neutral-950" />
                      ) : isActive ? (
                        <Loader2 size={15} className="animate-spin text-neutral-950" />
                      ) : (
                        <span className="h-[15px] w-[15px] rounded-full border border-neutral-300 bg-white" />
                      )}
                    </div>
                    <span className="relative">{step}</span>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={finishProcessing}>
                Открыть сейчас
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PageTransition>
  )
}
