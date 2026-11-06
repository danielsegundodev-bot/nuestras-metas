import { daysUntilDecember, decembersBetween, isDecember } from '../lib/december'
import type { Settings } from '../lib/types'
import { cx, Group } from './primitives'
import { useUi } from './ui'

export function DecemberStrip({ settings, now }: { settings: Settings; now: Date }) {
  const { openSheet } = useUi()
  const together = isDecember(now)
  const days = daysUntilDecember(now)
  const marks = decembersBetween(settings.move_date, settings.return_date, now)

  return (
    <Group>
      <div className="px-4 py-3">
        <p className="text-body font-semibold">
          {together
            ? 'Estamos juntos ❤'
            : days === 1
              ? 'Falta 1 día para diciembre'
              : `Faltan ${days} días para diciembre`}
        </p>
        {marks.length > 0 ? (
          <ol
            aria-label="Diciembres juntos"
            className="mt-3 flex items-start justify-between gap-1"
          >
            {marks.map((m, i) => (
              <li key={m.year} className="relative flex min-w-0 flex-1 flex-col items-center gap-1">
                {i > 0 && (
                  <span
                    aria-hidden
                    className={cx(
                      'absolute right-1/2 top-[13px] h-0.5 w-full',
                      m.state === 'future' ? 'bg-fill' : 'bg-accent',
                    )}
                  />
                )}
                <span
                  className={cx(
                    'num relative flex size-7 items-center justify-center rounded-full text-caption font-bold',
                    m.state === 'past' && 'bg-accent text-on-accent',
                    m.state === 'current' && 'bg-surface text-accent ring-2 ring-accent',
                    m.state === 'future' && 'bg-fill text-ink-2',
                  )}
                >
                  {i + 1}
                </span>
                <span className="num text-caption text-ink-2">
                  <span className="sr-only">
                    {m.state === 'past'
                      ? 'Ya pasó, '
                      : m.state === 'current'
                        ? 'Este, '
                        : 'Falta, '}
                  </span>
                  dic {m.year}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <button
            type="button"
            onClick={() => openSheet({ type: 'settings' })}
            className="mt-1 min-h-11 text-footnote text-accent"
          >
            Configura tu fecha de mudanza
          </button>
        )}
      </div>
    </Group>
  )
}
