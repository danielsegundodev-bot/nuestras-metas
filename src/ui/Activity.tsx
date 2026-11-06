import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useData } from '../data/store'
import { parseLocal } from '../lib/dates'
import { formatMoneyAuto } from '../lib/money'
import { personColor } from '../lib/people'
import type { Contribution, Goal } from '../lib/types'
import { Avatar, Group } from './primitives'
import { useUi, type SheetState } from './ui'

export const shortDay = (iso: string, now: Date): string => {
  const d = parseLocal(iso)
  return format(d, d.getFullYear() === now.getFullYear() ? 'd MMM' : 'd MMM yyyy', {
    locale: es,
  }).replace('.', '')
}

/** Recent contributions. Each row opens the transaction detail sheet. */
export function ActivityList({
  items,
  goals,
  now,
  showGoal = true,
  back,
}: {
  items: readonly Contribution[]
  goals: readonly Goal[]
  now: Date
  showGoal?: boolean
  /** Where the detail sheet's "Atrás" goes. */
  back?: Exclude<SheetState, null>
}) {
  const { profiles } = useData()
  const { openSheet } = useUi()

  if (items.length === 0) {
    return (
      <Group>
        <p className="px-4 py-4 text-footnote text-ink-2">Todavía no hay movimientos.</p>
      </Group>
    )
  }

  const rows = items.map((c) => {
    const person = profiles.find((p) => p.user_id === c.user_id)
    const goal = goals.find((g) => g.id === c.goal_id)
    const title = showGoal
      ? `${goal?.emoji ?? ''} ${goal?.name ?? 'Meta'}`
      : c.amount < 0
        ? 'Retiro'
        : 'Ahorro'
    return (
      <button
        key={c.id}
        type="button"
        onClick={() => openSheet({ type: 'txn', id: c.id, back })}
        className="flex min-h-14 w-full items-center gap-3 py-2 pl-4 pr-3 text-left active:bg-fill"
      >
        <Avatar name={person?.display_name ?? '?'} color={personColor(profiles, c.user_id)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body">
            {title}
            {showGoal && c.amount < 0 && <span className="text-ink-2"> · retiro</span>}
          </p>
          <p className="truncate text-caption text-ink-2">
            {person?.display_name} · {shortDay(c.date, now)}
            {c.note ? ` · ${c.note}` : ''}
          </p>
        </div>
        <div className="max-w-[58%] shrink-0 text-right">
          <p className="num truncate text-body font-semibold">
            {formatMoneyAuto(c.amount, c.currency, { signed: true, entry: true })}
          </p>
          {c.currency === 'USD' && (
            <p className="num truncate text-caption text-ink-2">
              ≈ {formatMoneyAuto(c.amount_mxn, 'MXN')}
            </p>
          )}
        </div>
        <svg
          aria-hidden
          width="8"
          height="14"
          viewBox="0 0 8 14"
          className="shrink-0 text-ink-2/60"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 1l6 6-6 6" />
        </svg>
      </button>
    )
  })

  return <Group>{rows}</Group>
}
