import { progressPct, type GoalSummary } from '../lib/stats'
import { goalColor } from '../lib/rings'
import { Group, Button } from './primitives'
import { Rings } from './Rings'
import { useMoney, useUi } from './ui'

/** The one bold thing: concentric rings, total in the middle, legend below. */
export function Hero({
  summaries,
  total,
  monthDelta,
  hasContributions,
}: {
  summaries: GoalSummary[]
  total: number
  monthDelta: number
  hasContributions: boolean
}) {
  const { fmt, compact } = useMoney()
  const { openSheet } = useUi()

  return (
    <section aria-label="Resumen de metas">
      <Rings
        className="mx-auto w-full max-w-[300px]"
        label={`Progreso de ${summaries.length} metas. Ahorrado juntos: ${fmt(total)}`}
        items={summaries.map((s) => ({
          id: s.goal.id,
          progress: s.progress,
          color: s.goal.color,
          label: s.goal.name,
        }))}
        center={
          <>
            <span className="text-[4.6cqw] leading-tight text-ink-2">Ahorrado juntos</span>
            <span className="num text-[8.4cqw] font-bold leading-none tracking-[-0.02em]">
              {fmt(total)}
            </span>
          </>
        }
      />
      {hasContributions ? (
        <p className="mt-3 text-center text-footnote text-ink-2">
          <span className="num font-semibold text-ink">{fmt(monthDelta, true)}</span> este mes
        </p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-2 text-center">
          <p className="text-footnote text-ink-2">Aún no hay ahorros. Empiecen por el primero.</p>
          <Button onClick={() => openSheet({ type: 'add' })}>Agrega el primer ahorro</Button>
        </div>
      )}

      {summaries.length > 0 && (
        <Group className="mt-5">
          {summaries.map(({ goal, saved }) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => openSheet({ type: 'goal', goalId: goal.id })}
              className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left"
            >
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full"
                style={{ background: goalColor(goal.color) }}
              />
              <span className="min-w-0 flex-1 truncate text-body">
                <span aria-hidden>{goal.emoji}</span> {goal.name}
              </span>
              <span className="num shrink-0 text-footnote font-semibold">
                {progressPct(saved, goal.target_mxn)}%
              </span>
              <span className="num hidden shrink-0 text-footnote text-ink-2 min-[460px]:inline">
                {compact(saved)} / {compact(goal.target_mxn)}
              </span>
            </button>
          ))}
        </Group>
      )}
    </section>
  )
}
