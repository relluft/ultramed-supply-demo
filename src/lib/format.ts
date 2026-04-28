export function formatMoney(value: number) {
  return `${new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))} ₽`
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value)
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export function parseNumericInput(value: string) {
  const normalized = value.replace(/\s+/g, '').replace(',', '.')
  const parsed = normalized === '' ? 0 : Number(normalized)

  return Number.isFinite(parsed) ? parsed : null
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
