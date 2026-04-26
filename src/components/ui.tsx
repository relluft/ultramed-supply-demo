import type { ButtonHTMLAttributes, HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '../lib/format'

export function buttonStyles(variant: 'primary' | 'secondary' | 'ghost' = 'primary') {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:pointer-events-none disabled:opacity-50',
    variant === 'primary' &&
      'border border-neutral-900 bg-white text-neutral-950 shadow-sm hover:-translate-y-0.5 hover:bg-neutral-50',
    variant === 'secondary' &&
      'border border-neutral-200 bg-white text-neutral-950 hover:-translate-y-0.5 hover:border-neutral-300',
    variant === 'ghost' &&
      'border border-transparent bg-transparent text-neutral-500 hover:bg-white hover:text-neutral-950',
  )
}

export function Button({
  className,
  variant = 'primary',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  return <button type={type} className={cn(buttonStyles(variant), className)} {...props} />
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('panel rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm', className)}
      {...props}
    />
  )
}

export function Eyebrow({ children }: PropsWithChildren) {
  return (
    <span className="inline-flex rounded-full border border-neutral-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
      {children}
    </span>
  )
}

export function StatusPill({
  children,
  tone = 'neutral',
}: PropsWithChildren<{ tone?: 'neutral' | 'ready' | 'warning' | 'danger' | 'progress' }>) {
  const classes = {
    neutral: 'border-neutral-200 bg-white text-neutral-700',
    ready: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-rose-200 bg-rose-50 text-rose-800',
    progress: 'border-neutral-900 bg-neutral-900 text-white',
  }[tone]

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        classes,
      )}
    >
      {children}
    </span>
  )
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100">
      <div
        className="h-full rounded-full bg-neutral-950 transition-[width] duration-200"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export const fieldStyles =
  'w-full rounded-[18px] border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 text-neutral-950 outline-none transition hover:border-neutral-300 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5'
