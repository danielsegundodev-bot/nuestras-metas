import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { useData } from '../data/store'
import { parseLocal } from '../lib/dates'
import { formatMoneyAuto } from '../lib/money'
import { personColor } from '../lib/people'
import type { Contribution, Goal } from '../lib/types'
import { Avatar, Button, Group } from './primitives'
import { errorMessage, useUi } from './ui'

const shortDay = (iso: string, now: Date): string => {
  const d = parseLocal(iso)
  return format(d, d.getFullYear() === now.getFullYear() ? 'd MMM' : 'd MMM yyyy', {
    locale: es,
  }).replace('.', '')
}

/** Recent contributions with edit/delete for the person's own entries. */
export function ActivityList({
  items,
  goals,
  now,
  showGoal = true,
}: {
  items: readonly Contribution[]
  goals: readonly Goal[]
  now: Date
  showGoal?: boolean
}) {
  const { profiles, session, deleteContribution, addContribution } = useData()
  const { openSheet, toast } = useUi()
  const [open, setOpen] = useState<string | null>(null)

  async function remove(c: Contribution) {
    setOpen(null)
    try {
      await deleteContribution(c.id)
      toast('Movimiento eliminado', {
        action: {
          label: 'Deshacer',
          run: () => {
            addContribution({
              goal_id: c.goal_id,
              amount: c.amount,
              currency: c.currency,
              fx_usd_mxn: c.fx_usd_mxn,
              date: c.date,
              note: c.note,
            }).catch((e) =>
              toast(errorMessage(e, 'No se pudo deshacer. Vuelve a agregarlo.'), { tone: 'error' }),
            )
          },
        },
      })
    } catch (e) {
      toast(errorMessage(e, 'No se pudo eliminar. Intenta de nuevo.'), { tone: 'error' })
    }
  }

  if (items.length === 0) {
    return (
      <Group>
        <p className="px-4 py-4 text-footnote text-ink-2">Todavía no hay movimientos.</p>
      </Group>
    )
  }

  return (
    <Group>
      {items.map((c) => {
        const person = profiles.find((p) => p.user_id === c.user_id)
        const goal = goals.find((g) => g.id === c.goal_id)
        const mine = c.user_id === session?.userId && !c.id.startsWith('tmp-')
        const expanded = open === c.id
        const title = showGoal
          ? `${goal?.emoji ?? ''} ${goal?.name ?? 'Meta'}`
          : c.amount < 0
            ? 'Retiro'
            : 'Ahorro'
        return (
          <div key={c.id}>
            <div className="flex min-h-14 items-center gap-3 py-2 pl-4 pr-1">
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
              <div className="shrink-0 text-right">
                <p className="num text-body font-semibold">
                  {formatMoneyAuto(c.amount, c.currency, { signed: true, entry: true })}
                </p>
                {c.currency === 'USD' && (
                  <p className="num text-caption text-ink-2">
                    ≈ {formatMoneyAuto(c.amount_mxn, 'MXN')}
                  </p>
                )}
              </div>
              {mine ? (
                <button
                  type="button"
                  aria-label="Más acciones"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : c.id)}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-2"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden fill="currentColor">
                    <circle cx="4" cy="10" r="1.6" />
                    <circle cx="10" cy="10" r="1.6" />
                    <circle cx="16" cy="10" r="1.6" />
                  </svg>
                </button>
              ) : (
                <span aria-hidden className="w-11 shrink-0" />
              )}
            </div>
            {expanded && (
              <div className="flex gap-2 px-4 pb-2">
                <Button
                  variant="plain"
                  className="px-3"
                  onClick={() => {
                    setOpen(null)
                    openSheet({ type: 'add', editing: c })
                  }}
                >
                  Editar
                </Button>
                <Button variant="danger" className="px-3" onClick={() => void remove(c)}>
                  Eliminar
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </Group>
  )
}
