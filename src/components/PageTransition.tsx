import { motion, useReducedMotion } from 'framer-motion'
import type { PropsWithChildren } from 'react'

export function PageTransition({
  children,
  className = '',
  respectReducedMotion = false,
}: PropsWithChildren<{ className?: string; respectReducedMotion?: boolean }>) {
  const prefersReducedMotion = useReducedMotion()
  const reduceMotion = respectReducedMotion && prefersReducedMotion

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
