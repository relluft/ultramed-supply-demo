import type { ButtonHTMLAttributes, HTMLAttributes, PropsWithChildren, ReactNode } from 'react'
import { cn } from '../lib/format'

export function buttonStyles(
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' = 'primary',
) {
  return cn(
    'inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-normal transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20 disabled:pointer-events-none disabled:opacity-45',
    variant === 'primary' && 'border border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800',
    variant === 'secondary' && 'border border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50',
    variant === 'ghost' && 'border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950',
    variant === 'danger' && 'border border-rose-600 bg-rose-600 text-white hover:bg-rose-700',
    variant === 'success' && 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
  )
}

export function Button({
  className,
  variant = 'primary',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
}) {
  return <button type={type} className={cn(buttonStyles(variant), className)} {...props} />
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)]', className)} {...props} />
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-2xl font-normal text-slate-950">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  )
}

export function StatusPill({
  children,
  tone = 'neutral',
  className,
}: PropsWithChildren<{
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}>) {
  const classes = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-rose-200 bg-rose-50 text-rose-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
  }[tone]

  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center justify-center rounded-md border px-2 py-0.5 text-xs font-normal',
        classes,
        className,
      )}
    >
      {children}
    </span>
  )
}

export function EmptyState({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn('rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500', className)}>
      {children}
    </div>
  )
}

export const fieldStyles =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10'

export const tableHeaderCell =
  'sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-3 py-2 text-left text-xs font-normal uppercase tracking-wide text-slate-500 backdrop-blur'

export const tableCell = 'border-b border-slate-100 px-3 py-2 align-top text-sm text-slate-700 first:border-l-[3px] first:border-l-transparent'
