import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/format'
import '../styles/workspace-v2.css'

export type Density = 'compact' | 'standard' | 'comfortable'

const DENSITY_STORAGE_KEY = 'ultramed-nurse-ui-density'
const DEFAULT_DENSITY: Density = 'standard'
const DENSITIES = new Set<Density>(['compact', 'standard', 'comfortable'])

type WorkspaceUiContextValue = {
  density: Density
  setDensity: (density: Density) => void
}

const WorkspaceUiContext = createContext<WorkspaceUiContextValue | null>(null)

function readStoredDensity(): Density {
  if (typeof window === 'undefined') return DEFAULT_DENSITY

  try {
    const storedDensity = window.localStorage.getItem(DENSITY_STORAGE_KEY)
    return storedDensity && DENSITIES.has(storedDensity as Density)
      ? (storedDensity as Density)
      : DEFAULT_DENSITY
  } catch {
    return DEFAULT_DENSITY
  }
}

export function WorkspaceUiProvider({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  const [density, setDensityState] = useState<Density>(readStoredDensity)

  const setDensity = useCallback((nextDensity: Density) => {
    setDensityState(DENSITIES.has(nextDensity) ? nextDensity : DEFAULT_DENSITY)
  }, [])

  useLayoutEffect(() => {
    const root = document.documentElement
    const previousZoom = root.style.getPropertyValue('--app-zoom')
    const previousPriority = root.style.getPropertyPriority('--app-zoom')
    root.style.setProperty('--app-zoom', '1')

    return () => {
      if (previousZoom) {
        root.style.setProperty('--app-zoom', previousZoom, previousPriority)
      } else {
        root.style.removeProperty('--app-zoom')
      }
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, density)
    } catch {
      // Storage can be unavailable in restricted browser modes.
    }
  }, [density])

  return (
    <WorkspaceUiContext.Provider value={{ density, setDensity }}>
      <div
        className={cn('workspace-v2-root', className)}
        data-ui-mode="workspace-v2"
        data-density={density}
      >
        {children}
      </div>
    </WorkspaceUiContext.Provider>
  )
}

export function useWorkspaceUi() {
  const context = useContext(WorkspaceUiContext)
  if (!context) {
    throw new Error('useWorkspaceUi must be used inside WorkspaceUiProvider')
  }
  return context
}

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  level?: 'page' | 'panel' | 'raised'
  interactive?: boolean
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  { level = 'panel', interactive = false, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn('workspace-surface', className)}
      data-surface={level}
      data-interactive={interactive || undefined}
      {...props}
    />
  )
})

export type WorkspaceButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'

export function workspaceButtonClassName(variant: WorkspaceButtonVariant = 'primary') {
  return cn('workspace-button', `workspace-button--${variant}`)
}

export const WorkspaceButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: WorkspaceButtonVariant }
>(function WorkspaceButton({ className, variant = 'primary', type = 'button', ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(workspaceButtonClassName(variant), className)}
      {...props}
    />
  )
})

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: WorkspaceButtonVariant }
>(function IconButton({ className, variant = 'ghost', type = 'button', ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        workspaceButtonClassName(variant),
        'workspace-icon-button',
        className,
      )}
      {...props}
    />
  )
})

export const workspaceFieldClassName = 'workspace-field'

export const WorkspaceField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function WorkspaceField({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(workspaceFieldClassName, className)}
      {...props}
    />
  )
})

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export const StatusBadge = forwardRef<
  HTMLSpanElement,
  HTMLAttributes<HTMLSpanElement> & { tone?: StatusTone }
>(function StatusBadge({ className, tone = 'neutral', ...props }, ref) {
  return (
    <span
      ref={ref}
      className={cn('workspace-status-badge', className)}
      data-tone={tone}
      {...props}
    />
  )
})

export const TableFrame = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function TableFrame({ className, ...props }, ref) {
    return <div ref={ref} className={cn('workspace-table-frame', className)} {...props} />
  },
)

export const TableViewport = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { label?: string }
>(function TableViewport(
  { className, label = 'Таблица данных', tabIndex, onScroll, ...props },
  ref,
) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [canScrollBackward, setCanScrollBackward] = useState(false)
  const [canScrollForward, setCanScrollForward] = useState(false)

  const updateScrollState = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
    setCanScrollBackward(viewport.scrollLeft > 1)
    setCanScrollForward(viewport.scrollLeft < maxScrollLeft - 1)
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    updateScrollState()
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateScrollState)
    observer?.observe(viewport)
    if (viewport.firstElementChild) observer?.observe(viewport.firstElementChild)
    window.addEventListener('resize', updateScrollState)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateScrollState)
    }
  }, [updateScrollState])

  const isHorizontallyScrollable = canScrollBackward || canScrollForward

  return (
    <div
      ref={(node) => {
        viewportRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      className={cn('workspace-table-viewport', className)}
      role="region"
      aria-label={label}
      tabIndex={tabIndex ?? (isHorizontallyScrollable ? 0 : -1)}
      data-can-scroll-backward={canScrollBackward || undefined}
      data-can-scroll-forward={canScrollForward || undefined}
      onScroll={(event) => {
        updateScrollState()
        onScroll?.(event)
      }}
      {...props}
    />
  )
})

export const workspaceTableHeaderCell =
  'workspace-table-header-cell'
export const workspaceTableCell = 'workspace-table-cell'

type HorizontalScrollerProps = PropsWithChildren<{
  className?: string
  viewportClassName?: string
  label?: string
  scrollAmount?: number
}>

export function HorizontalScroller({
  children,
  className,
  viewportClassName,
  label = 'Горизонтальный список',
  scrollAmount = 280,
}: HorizontalScrollerProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [canScrollBackward, setCanScrollBackward] = useState(false)
  const [canScrollForward, setCanScrollForward] = useState(false)

  const updateScrollState = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
    setCanScrollBackward(viewport.scrollLeft > 1)
    setCanScrollForward(viewport.scrollLeft < maxScrollLeft - 1)
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    updateScrollState()
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateScrollState)
    observer?.observe(viewport)
    if (viewport.firstElementChild) observer?.observe(viewport.firstElementChild)
    window.addEventListener('resize', updateScrollState)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateScrollState)
    }
  }, [updateScrollState])

  function preferredScrollBehavior(): ScrollBehavior {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth'
  }

  function scrollByAmount(direction: -1 | 1) {
    viewportRef.current?.scrollBy({
      left: direction * scrollAmount,
      behavior: preferredScrollBehavior(),
    })
  }

  return (
    <div
      className={cn('workspace-horizontal-scroller', className)}
      data-can-scroll-backward={canScrollBackward || undefined}
      data-can-scroll-forward={canScrollForward || undefined}
    >
      <IconButton
        className="workspace-horizontal-scroller__button workspace-horizontal-scroller__button--back"
        aria-label="Прокрутить список влево"
        disabled={!canScrollBackward}
        onClick={() => scrollByAmount(-1)}
      >
        <span aria-hidden="true">‹</span>
      </IconButton>
      <div
        ref={viewportRef}
        className={cn('workspace-horizontal-scroller__viewport', viewportClassName)}
        role="region"
        aria-label={label}
        tabIndex={0}
        onScroll={updateScrollState}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            scrollByAmount(-1)
          } else if (event.key === 'ArrowRight') {
            event.preventDefault()
            scrollByAmount(1)
          } else if (event.key === 'Home') {
            event.preventDefault()
            viewportRef.current?.scrollTo({
              left: 0,
              behavior: preferredScrollBehavior(),
            })
          } else if (event.key === 'End') {
            event.preventDefault()
            viewportRef.current?.scrollTo({
              left: viewportRef.current.scrollWidth,
              behavior: preferredScrollBehavior(),
            })
          }
        }}
      >
        {children}
      </div>
      <IconButton
        className="workspace-horizontal-scroller__button workspace-horizontal-scroller__button--forward"
        aria-label="Прокрутить список вправо"
        disabled={!canScrollForward}
        onClick={() => scrollByAmount(1)}
      >
        <span aria-hidden="true">›</span>
      </IconButton>
    </div>
  )
}

type WorkspacePortalProps = PropsWithChildren<{
  className?: string
  container?: Element | DocumentFragment | null
}>

export function WorkspacePortal({
  children,
  className,
  container,
}: WorkspacePortalProps) {
  const { density } = useWorkspaceUi()
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={cn('workspace-portal-root', className)}
      data-ui-mode="workspace-v2"
      data-density={density}
    >
      {children}
    </div>,
    container ?? document.body,
  )
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

let bodyScrollLockCount = 0
let previousBodyOverflow = ''

function lockBodyScroll() {
  if (bodyScrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  bodyScrollLockCount += 1
}

function unlockBodyScroll() {
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1)
  if (bodyScrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow
  }
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute('hidden') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.getClientRects().length > 0,
  )
}

export type WorkspaceDialogProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  description?: ReactNode
  footer?: ReactNode
  className?: string
  bodyClassName?: string
  initialFocusRef?: RefObject<HTMLElement | null>
  closeLabel?: string
  closeOnBackdrop?: boolean
}

export function WorkspaceDialog({
  open,
  onClose,
  title,
  children,
  description,
  footer,
  className,
  bodyClassName,
  initialFocusRef,
  closeLabel = 'Закрыть диалог',
  closeOnBackdrop = true,
}: WorkspaceDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    lockBodyScroll()

    const frame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current
      if (!dialog) return
      const initialTarget =
        initialFocusRef?.current ?? getFocusableElements(dialog)[0] ?? dialog
      initialTarget.focus({ preventScroll: true })
    })

    function handleKeyDown(event: KeyboardEvent) {
      const dialog = dialogRef.current
      if (!dialog) return

      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return
      const focusableElements = getFocusableElements(dialog)
      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog.focus({ preventScroll: true })
        return
      }

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      unlockBodyScroll()
      restoreFocusRef.current?.focus({ preventScroll: true })
      restoreFocusRef.current = null
    }
  }, [initialFocusRef, open])

  if (!open) return null

  return (
    <WorkspacePortal>
      <div
        className="workspace-dialog-backdrop"
        onMouseDown={(event) => {
          if (closeOnBackdrop && event.target === event.currentTarget) onClose()
        }}
      >
        <div
          ref={dialogRef}
          className={cn('workspace-dialog', className)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
        >
          <header className="workspace-dialog__header">
            <div className="workspace-dialog__heading">
              <h2 id={titleId} className="workspace-dialog__title">
                {title}
              </h2>
              {description ? (
                <div id={descriptionId} className="workspace-dialog__description">
                  {description}
                </div>
              ) : null}
            </div>
            <IconButton aria-label={closeLabel} onClick={onClose}>
              <span aria-hidden="true">×</span>
            </IconButton>
          </header>
          <div className={cn('workspace-dialog__body', bodyClassName)}>{children}</div>
          {footer ? <footer className="workspace-dialog__footer">{footer}</footer> : null}
        </div>
      </div>
    </WorkspacePortal>
  )
}
