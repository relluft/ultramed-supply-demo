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

export function parseNumericInput(value: string) {
  const normalized = value.replace(/\s+/g, '').replace(',', '.')
  const parsed = normalized === '' ? 0 : Number(normalized)

  return Number.isFinite(parsed) ? parsed : null
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
