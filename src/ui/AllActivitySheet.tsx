import { useMemo, useState } from 'react'
import { useData } from '../data/store'
import { formatMonthLong, monthKey } from '../lib/dates'
import type { Contribution } from '../lib/types'
import { ActivityList } from './Activity'
import { Button } from './primitives'
import { Sheet } from './Sheet'
import { useUi } from './ui'

const PAGE = 60

/** Every movement of active goals, newest first, grouped by month. */
export function AllActivitySheet() {
  const { goals, contributions } = useData()
  const { closeSheet } = useUi()
  const [now] = useState(() => new Date())
  const [shown, setShown] = useState(PAGE)

  const live = useMemo(() => {
    const active = new Set(goals.filter((g) => !g.archived).map((g) => g.id))
    return contributions.filter((c) => active.has(c.goal_id))
  }, [goals, contributions])

  const groups = useMemo(() => {
    const out: { key: string; items: Contribution[] }[] = []
    for (const c of live.slice(0, shown)) {
      const k = monthKey(c.date)
      const last = out[out.length - 1]
      if (last && last.key === k) last.items.push(c)
      else out.push({ key: k, items: [c] })
    }
    return out
  }, [live, shown])

  return (
    <Sheet title="Movimientos" onClose={closeSheet}>
      <div className="flex flex-col gap-5">
        {groups.map((g) => (
          <section key={g.key} aria-label={formatMonthLong(g.key)}>
            <h3 className="mb-1.5 px-1 text-footnote font-semibold capitalize text-ink-2">
              {formatMonthLong(g.key)}
            </h3>
            <ActivityList items={g.items} goals={goals} now={now} back={{ type: 'activity' }} />
          </section>
        ))}
        {live.length > shown && (
          <Button variant="plain" onClick={() => setShown((n) => n + PAGE)}>
            Mostrar más
          </Button>
        )}
      </div>
    </Sheet>
  )
}
