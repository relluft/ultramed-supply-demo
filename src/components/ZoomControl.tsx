import { Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '../lib/format'

const ZOOM_STORAGE_KEY = 'ultramed-ui-zoom'
const ZOOM_STEP = 0.05
const MIN_ZOOM = 0.8
const MAX_ZOOM = 1.25
const TABLE_ROUTES = new Set([
  '/cabinet',
  '/senior',
  '/stock',
  '/replenishment',
  '/orders/forming',
  '/orders',
  '/receipt',
  '/catalog',
  '/analytics',
])

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function readStoredZoom() {
  let stored: string | null = null

  try {
    stored = window.localStorage.getItem(ZOOM_STORAGE_KEY)
  } catch {
    stored = null
  }

  const parsed = stored ? Number(stored) : 1
  return Number.isFinite(parsed) ? clampZoom(parsed) : 1
}

export function ZoomControl() {
  const location = useLocation()
  const [zoom, setZoom] = useState(() => readStoredZoom())
  const isTableRoute = TABLE_ROUTES.has(location.pathname)

  useEffect(() => {
    if (!isTableRoute) {
      document.documentElement.style.setProperty('--app-zoom', '1')
      return
    }

    document.documentElement.style.setProperty('--app-zoom', String(zoom))
    try {
      window.localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom))
    } catch {
      // Storage can be unavailable in restricted browser modes.
    }
  }, [isTableRoute, zoom])

  const percent = useMemo(() => `${Math.round(zoom * 100)}%`, [zoom])
  const isDefault = Math.abs(zoom - 1) < 0.001

  function changeZoom(delta: number) {
    setZoom((current) => clampZoom(Number((current + delta).toFixed(2))))
  }

  if (!isTableRoute) return null

  return (
    <div
      className="flex w-fit self-end items-center gap-1 rounded-md border border-slate-200 bg-white/95 p-1 text-slate-700 shadow-sm"
      role="group"
      aria-label="Interface zoom"
    >
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 disabled:cursor-default disabled:opacity-40"
        title="Zoom out"
        aria-label="Zoom out"
        onClick={() => changeZoom(-ZOOM_STEP)}
        disabled={zoom <= MIN_ZOOM}
      >
        <Minus size={15} />
      </button>
      <button
        type="button"
        className={cn(
          'h-8 min-w-12 rounded-md px-2 text-xs font-normal tabular-nums hover:bg-slate-100',
          isDefault ? 'text-slate-500' : 'text-slate-900',
        )}
        title="Reset zoom"
        aria-label="Reset zoom"
        onClick={() => setZoom(1)}
      >
        {percent}
      </button>
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 disabled:cursor-default disabled:opacity-40"
        title="Zoom in"
        aria-label="Zoom in"
        onClick={() => changeZoom(ZOOM_STEP)}
        disabled={zoom >= MAX_ZOOM}
      >
        <Plus size={15} />
      </button>
    </div>
  )
}
