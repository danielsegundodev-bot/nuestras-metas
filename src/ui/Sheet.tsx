import { motion, useDragControls, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useRef, type ReactNode } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Bottom sheet: spring slide-up, drag handle to dismiss, Esc, focus trap, scroll lock. */
export function Sheet({
  title,
  onClose,
  onBack,
  children,
}: {
  title: string
  onClose(): void
  /** Shows a "Atrás" button before the title. */
  onBack?(): void
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  const controls = useDragControls()
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !panel.current) return
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (items.length === 0) return
    const first = items[0]!
    const last = items[items.length - 1]!
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === panel.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-[100]" onKeyDown={onKeyDown}>
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.2 }}
        onClick={onClose}
      />
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] w-full max-w-[640px] flex-col rounded-t-[20px] border-t border-separator bg-canvas outline-none"
        initial={{ y: reduce ? 0 : '100%' }}
        animate={{ y: 0 }}
        exit={{ y: reduce ? 0 : '100%' }}
        transition={reduce ? { duration: 0 } : { type: 'spring', damping: 34, stiffness: 340 }}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 600) onClose()
        }}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-2"
          onPointerDown={(e) => controls.start(e)}
        >
          <span aria-hidden className="h-1 w-9 rounded-full bg-fill" />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-1">
          <div className="flex min-w-0 items-center gap-1">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="-ml-2 min-h-11 shrink-0 rounded-lg px-2 text-body font-semibold text-accent"
              >
                ‹ Atrás
              </button>
            )}
            <h2
              id={titleId}
              className="min-w-0 truncate text-title-3 font-semibold tracking-[-0.01em]"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 min-h-11 min-w-11 rounded-lg px-2 text-body font-semibold text-accent"
          >
            Cerrar
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </motion.div>
    </div>
  )
}
