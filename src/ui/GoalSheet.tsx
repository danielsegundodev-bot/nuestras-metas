import { useEffect, useMemo, useState } from 'react'
import { useData } from '../data/store'
import { formatDay } from '../lib/dates'
import { emWidth } from '../lib/money'
import { displayPct, summarizeGoals } from '../lib/stats'
import { ActivityList } from './Activity'
import { CumulativeChart } from './CumulativeChart'
import { GoalForm } from './GoalForm'
import { projectionText } from './GoalsList'
import { Button, Group, SectionTitle } from './primitives'
import { Rings } from './Rings'
import { Sheet } from './Sheet'
import { errorMessage, useMoney, useUi } from './ui'

const PAGE = 15

export function GoalSheet({ goalId }: { goalId: string }) {
  const { goals, contributions, profiles, updateGoal } = useData()
  const { closeSheet, openSheet, toast } = useUi()
  const { fmt } = useMoney()
  const [now] = useState(() => new Date())
  const [editing, setEditing] = useState(false)
  const [shown, setShown] = useState(PAGE)

  const goal = goals.find((g) => g.id === goalId)
  const mine = useMemo(
    () => contributions.filter((c) => c.goal_id === goalId),
    [contributions, goalId],
  )
  const summary = useMemo(
    () => (goal ? summarizeGoals([{ ...goal, archived: false }], mine)[0]! : null),
    [goal, mine],
  )

  useEffect(() => {
    if (!goal) closeSheet()
  }, [goal, closeSheet])
  if (!goal || !summary) return null

  const pct = displayPct(summary.saved, goal.target_mxn)
  const proj = projectionText(contributions, summary, now)

  async function archive() {
    try {
      await updateGoal(goalId, { archived: true })
      toast('Meta archivada')
      closeSheet()
    } catch (e) {
      toast(errorMessage(e, 'No se pudo archivar la meta.'), { tone: 'error' })
    }
  }

  return (
    <Sheet title={`${goal.emoji} ${goal.name}`} onClose={closeSheet}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-5">
          <Rings
            className="w-[132px] shrink-0"
            hole={0.62}
            maxStroke={16}
            label={`${goal.name}: ${pct}%`}
            items={[{ id: goal.id, progress: summary.ratio, color: goal.color, label: goal.name }]}
            center={<span className="num text-[18cqw] font-bold tracking-[-0.02em]">{pct}%</span>}
          />
          <div className="min-w-0 flex-1" style={{ containerType: 'inline-size' }}>
            <p
              className="num whitespace-nowrap font-bold tracking-[-0.02em]"
              style={{
                fontSize: `min(28px, ${(100 / emWidth(fmt(summary.saved))).toFixed(2)}cqw)`,
              }}
            >
              {fmt(summary.saved)}
            </p>
            <p className="num break-words text-footnote text-ink-2">de {fmt(goal.target_mxn)}</p>
            {proj && <p className="mt-1 text-footnote text-ink-2">{proj}</p>}
            {goal.target_date && (
              <p className="text-footnote text-ink-2">
                Fecha objetivo: {formatDay(goal.target_date)}
              </p>
            )}
          </div>
        </div>

        <Button onClick={() => openSheet({ type: 'add', goalId })}>
          Agregar ahorro a esta meta
        </Button>

        <CumulativeChart
          contributions={mine}
          profiles={profiles}
          goals={[]}
          now={now}
          fixedGoalId={goalId}
        />

        <section>
          <SectionTitle>Movimientos</SectionTitle>
          <ActivityList
            items={mine.slice(0, shown)}
            goals={goals}
            now={now}
            showGoal={false}
            back={{ type: 'goal', goalId }}
          />
          {mine.length > shown && (
            <Button variant="plain" className="mt-1" onClick={() => setShown((n) => n + PAGE)}>
              Mostrar más
            </Button>
          )}
        </section>

        <section>
          <SectionTitle>Editar meta</SectionTitle>
          {editing ? (
            <GoalForm
              initial={goal}
              submitLabel="Guardar cambios"
              onCancel={() => setEditing(false)}
              onSubmit={async (v) => {
                await updateGoal(goalId, v)
                toast('Meta actualizada')
                setEditing(false)
              }}
            />
          ) : (
            <Group>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex min-h-11 w-full items-center px-4 text-left text-body text-accent"
              >
                Cambiar nombre, monto, fecha o color
              </button>
              <button
                type="button"
                onClick={() => void archive()}
                className="flex min-h-11 w-full items-center px-4 text-left text-body text-danger"
              >
                Archivar meta
              </button>
            </Group>
          )}
        </section>
      </div>
    </Sheet>
  )
}
