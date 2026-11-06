import { useMemo } from 'react'
import { orderProfiles, personColor } from '../lib/people'
import { splitSummary, type Split } from '../lib/stats'
import type { Contribution, Profile } from '../lib/types'
import { SectionTitle } from './primitives'

function SplitRow({ label, split, people }: { label: string; split: Split; people: Profile[] }) {
  const pcts = people.map((p) => Math.round((split.byUser[p.user_id]?.share ?? 0) * 100))
  // Keep two-person rounding honest: shares always add to 100.
  if (people.length === 2 && split.total > 0) pcts[1] = 100 - pcts[0]!
  const empty = split.total <= 0
  return (
    <div className="px-4 py-3">
      <p className="mb-2 text-footnote text-ink-2">{label}</p>
      <div
        role="img"
        aria-label={
          empty ? 'Sin aportes' : people.map((p, i) => `${p.display_name} ${pcts[i]}%`).join(', ')
        }
        className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-fill"
      >
        {!empty &&
          people.map((p) => (
            <div
              key={p.user_id}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${(split.byUser[p.user_id]?.share ?? 0) * 100}%`,
                background: personColor(people, p.user_id),
              }}
            />
          ))}
      </div>
      <p className="mt-2 flex flex-wrap justify-between gap-x-4 text-footnote">
        {empty ? (
          <span className="text-ink-2">Sin aportes todavía</span>
        ) : (
          people.map((p, i) => (
            <span key={p.user_id} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ background: personColor(people, p.user_id) }}
              />
              {p.display_name} <span className="num font-semibold">{pcts[i]}%</span>
            </span>
          ))
        )}
      </p>
    </div>
  )
}

export function SplitBars({
  contributions,
  profiles,
  now,
}: {
  contributions: readonly Contribution[]
  profiles: Profile[]
  now: Date
}) {
  const people = useMemo(() => orderProfiles(profiles), [profiles])
  const { allTime, thisMonth } = useMemo(
    () =>
      splitSummary(
        contributions,
        now,
        people.map((p) => p.user_id),
      ),
    [contributions, now, people],
  )
  return (
    <section aria-label="Quién ha aportado">
      <SectionTitle>Quién ha aportado</SectionTitle>
      <div className="divide-y divide-separator overflow-hidden rounded-xl bg-surface">
        <SplitRow label="Este mes" split={thisMonth} people={people} />
        <SplitRow label="Desde el inicio" split={allTime} people={people} />
      </div>
    </section>
  )
}
