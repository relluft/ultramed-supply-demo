import { motion } from 'framer-motion'

export function BrandedLoadingModal({
  title = 'Формируем заявку',
  durationSeconds = 1,
}: {
  title?: string
  durationSeconds?: number
}) {
  return (
    <div className="app-modal-backdrop z-[60] flex items-center justify-center px-4 py-6 backdrop-blur-sm">
      <motion.div
        className="app-panel relative flex w-full max-w-[420px] flex-col items-center overflow-hidden rounded-[28px] border px-7 py-7 text-center"
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <img
          src="/brand/ultramed-main-logo.svg"
          alt="УльтраМед"
          className="h-auto w-full max-w-[300px] object-contain"
        />
        <div className="mt-1 text-center text-2xl font-normal leading-none text-slate-600">
          Снабжение
        </div>
        <div className="mt-6 h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-slate-200">
          <motion.div
            className="h-full rounded-full bg-[#267e63]"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: durationSeconds, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="mt-3 text-sm font-normal text-slate-700">{title}</div>
      </motion.div>
    </div>
  )
}
