import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cx } from './primitives'
import { useUi } from './ui'

/** Global toasts. Mounted once in the app shell, above the floating button. */
export function Toasts() {
  const { toasts, dismissToast } = useUi()
  const reduce = useReducedMotion()
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[300] flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout={!reduce}
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            className={cx(
              'pointer-events-auto flex min-h-11 max-w-[calc(100vw-32px)] items-center gap-3 rounded-full py-1 pl-4 pr-2 text-footnote font-semibold shadow-[0_6px_24px_rgb(0_0_0/0.22)]',
              t.tone === 'error' ? 'bg-danger text-on-accent' : 'bg-ink text-canvas',
            )}
          >
            <span>{t.message}</span>
            {t.action ? (
              <button
                type="button"
                onClick={() => {
                  t.action?.run()
                  dismissToast(t.id)
                }}
                className="min-h-11 rounded-full px-3 font-semibold underline underline-offset-2"
              >
                {t.action.label}
              </button>
            ) : (
              <span className="w-2" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
