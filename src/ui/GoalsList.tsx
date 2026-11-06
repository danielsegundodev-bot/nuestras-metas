import { projectCompletion, progressPct, type GoalSummary } from '../lib/stats'
import { formatMonthYear } from '../lib/dates'
import { goalColor } from '../lib/rings'
import type { Contribution } from '../lib/types'
import { Button, Group, SectionTitle } from './primitives'
import { useMoney, useUi } from './ui'

const MAX_PROJECTION_YEARS = 40

export function projectionText(
  contributions: readonly Contribution[],
  summary: GoalSummary,
  now: Date,
): string | null {
  if (summary.progress >= 1) return 'Meta cumplida'
  const p = projectCompletion(contributions, summary.goal.target_mxn, now, summary.goal.id)
  if (!p || p.monthsLeft > MAX_PROJECTION_YEARS * 12) return null
  return `A este ritmo: ${formatMonthYear(p.completion)}`
}

export function GoalsList({
  summaries,
  contributions,
  now,
}: {
  summaries: GoalSummary[]
  contributions: readonly Contribution[]
  now: Date
}) {
  const { fmt } = useMoney()
  const { openSheet } = useUi()

  return (
    <section aria-label="Metas">
      <SectionTitle>Metas</SectionTitle>
      {summaries.length === 0 ? (
        <Group>
          <div className="flex flex-col items-start gap-3 px-4 py-4">
            <p className="text-body">Aún no tienen metas. Creen la primera.</p>
            <Button onClick={() => openSheet({ type: 'settings', focus: 'goals' })}>
              Crear una meta
            </Button>
          </div>
        </Group>
      ) : (
        <Group>
          {summaries.map((s) => {
            const proj = projectionText(contributions, s, now)
            const pct = progressPct(s.saved, s.goal.target_mxn)
            return (
              <button
                key={s.goal.id}
                type="button"
                onClick={() => openSheet({ type: 'goal', goalId: s.goal.id })}
                className="block min-h-11 w-full px-4 py-3 text-left"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-body font-semibold">
                    <span aria-hidden>{s.goal.emoji}</span> {s.goal.name}
                  </span>
                  <span className="num shrink-0 text-body font-semibold">{pct}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`Progreso de ${s.goal.name}`}
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mt-2 h-2 overflow-hidden rounded-full"
                  style={{
                    background: `color-mix(in srgb, ${goalColor(s.goal.color)} 18%, transparent)`,
                  }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(s.progress * 100, s.saved > 0 ? 1.5 : 0)}%`,
                      background: goalColor(s.goal.color),
                    }}
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-caption text-ink-2">
                  <span className="num">
                    {fmt(s.saved)} de {fmt(s.goal.target_mxn)}
                  </span>
                  {proj && <span>{proj}</span>}
                </div>
              </button>
            )
          })}
        </Group>
      )}
    </section>
  )
}
