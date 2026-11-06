import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Sheet } from './Sheet'
import { useInstallPrompt } from './useInstallPrompt'

/** Apple-style share glyph: a square with an up arrow. */
function ShareGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 15V3.5M8.5 7L12 3.5 15.5 7" />
      <path d="M8 10.5H6.5a1.5 1.5 0 0 0-1.5 1.5v7a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16" />
    </svg>
  )
}

function DownloadGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </svg>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex min-h-11 items-center gap-3 px-4 py-3">
      <span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-fill text-footnote font-semibold">
        {n}
      </span>
      <span className="text-body">{children}</span>
    </li>
  )
}

function IOSSheet({ safari, onClose }: { safari: boolean; onClose(): void }) {
  return (
    <Sheet title="Instalar en tu iPhone" onClose={onClose}>
      {safari ? (
        <>
          <p className="pb-3 text-footnote text-ink-2">
            Así la abres desde tu pantalla de inicio, como cualquier app.
          </p>
          <ol className="divide-y divide-separator overflow-hidden rounded-xl bg-surface">
            <Step n={1}>
              <span className="inline-flex items-center gap-1.5">
                Toca <ShareGlyph />
                <span className="sr-only">Compartir</span> en la barra de Safari.
              </span>
            </Step>
            <Step n={2}>
              Elige <span className="font-semibold">Agregar a inicio</span>{' '}
              <span className="text-ink-2">(Add to Home Screen)</span>.
            </Step>
          </ol>
        </>
      ) : (
        <p className="rounded-xl bg-surface px-4 py-3 text-body">
          Abre esta página en <span className="font-semibold">Safari</span> para poder instalarla.
          Copia el enlace, pégalo en Safari y repite este paso.
        </p>
      )}
    </Sheet>
  )
}

/** Quiet corner control. Renders nothing when installing isn't possible or already done. */
export function InstallButton({ className = '' }: { className?: string }) {
  const { mode, promptInstall } = useInstallPrompt()
  const [sheet, setSheet] = useState(false)
  if (!mode) return null

  return (
    <>
      <button
        type="button"
        aria-label="Instalar app"
        onClick={() => (mode === 'prompt' ? void promptInstall() : setSheet(true))}
        className={`flex min-h-11 items-center gap-1.5 rounded-full px-3 text-footnote font-semibold text-accent ${className}`}
      >
        <DownloadGlyph />
        <span>Instalar</span>
      </button>
      <AnimatePresence>
        {sheet && <IOSSheet safari={mode === 'ios-safari'} onClose={() => setSheet(false)} />}
      </AnimatePresence>
    </>
  )
}
