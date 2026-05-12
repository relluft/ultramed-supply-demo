import { motion } from 'framer-motion'

export function BrandedLoadingModal({ title = 'Формируем заявку' }: { title?: string }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#f4fbf8]/82 px-4 py-6 backdrop-blur-sm">
      <motion.div
        className="relative flex w-full max-w-[420px] flex-col items-center overflow-hidden rounded-[28px] border border-[#d9ebe4] bg-[linear-gradient(180deg,#ffffff_0%,#f5fbf8_100%)] px-7 py-7 text-center shadow-[0_32px_70px_rgba(16,37,29,0.18)]"
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,#79e2a6,transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(229,255,241,0.72)_0%,rgba(255,255,255,0)_52%)]" />
        <img
          src="/brand/ultramed-main-logo.svg"
          alt="УльтраМед"
          className="relative h-auto w-full max-w-[300px] object-contain"
        />
        <div className="relative mt-1 text-center text-2xl font-normal leading-none text-[#6089bb]">
          Снабжение
        </div>
        <div className="relative mt-6 h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-[#dcefe7]">
          <motion.div
            className="h-full rounded-full bg-[#267e63]"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="relative mt-3 text-sm font-normal text-[#17362d]">{title}</div>
      </motion.div>
    </div>
  )
}
