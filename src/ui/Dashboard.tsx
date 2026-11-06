import { AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useData } from '../data/store'
import { monthKey } from '../lib/dates'
import { summarizeGoals } from '../lib/stats'
import { ActivityList } from './Activity'
import { AddSheet } from './AddSheet'
import { CumulativeChart } from './CumulativeChart'
import { DecemberStrip } from './DecemberStrip'
import { GoalSheet } from './GoalSheet'
import { GoalsList } from './GoalsList'
import { Header } from './Header'
import { Hero } from './Hero'
import { SectionTitle } from './primitives'
import { SettingsSheet } from './SettingsSheet'
import { SplitBars } from './SplitBars'
import { useUi } from './ui'

export function Dashboard() {
  const { goals, contributions, profiles, settings, isDemo, fx, me, refreshFx } = useData()
  const { sheet, openSheet } = useUi()
  const [now] = useState(() => new Date())

  const summaries = useMemo(() => summarizeGoals(goals, contributions), [goals, contributions])
  const activeGoals = useMemo(() => summaries.map((s) => s.goal), [summaries])
  const live = useMemo(() => {
    const ids = new Set(activeGoals.map((g) => g.id))
    return contributions.filter((c) => ids.has(c.goal_id))
  }, [contributions, activeGoals])
  const total = useMemo(() => summaries.reduce((a, s) => a + s.saved, 0), [summaries])
  const monthDelta = useMemo(() => {
    const k = monthKey(now)
    return live.filter((c) => monthKey(c.date) === k).reduce((a, c) => a + c.amount_mxn, 0)
  }, [live, now])

  return (
    <>
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-4 pb-[calc(112px+env(safe-area-inset-bottom))]">
        {isDemo && (
          <p className="mt-3 rounded-xl bg-surface px-4 py-2 text-caption text-ink-2">
            Modo demo: datos de ejemplo, guardados solo en este navegador.
          </p>
        )}
        <Header />
        {!fx && me && (
          <p className="rounded-xl bg-surface px-4 py-3 text-footnote text-ink-2">
            No pudimos obtener el tipo de cambio, así que todo se muestra en pesos.{' '}
            <button type="button" onClick={() => void refreshFx()} className="min-h-11 text-accent">
              Reintentar
            </button>
          </p>
        )}
        <Hero
          summaries={summaries}
          total={total}
          monthDelta={monthDelta}
          hasContributions={live.length > 0}
        />
        <DecemberStrip settings={settings} now={now} />
        <GoalsList summaries={summaries} contributions={live} now={now} />
        {live.length > 0 && (
          <CumulativeChart contributions={live} profiles={profiles} goals={activeGoals} now={now} />
        )}
        {live.length > 0 && <SplitBars contributions={live} profiles={profiles} now={now} />}
        <section aria-label="Movimientos recientes">
          <SectionTitle>Movimientos recientes</SectionTitle>
          <ActivityList items={live.slice(0, 10)} goals={goals} now={now} />
        </section>
      </main>

      {!sheet && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[calc(16px+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => openSheet({ type: 'add' })}
            className="pointer-events-auto flex min-h-14 items-center gap-2 rounded-full bg-accent px-6 text-body font-semibold text-on-accent shadow-[0_6px_20px_rgb(0_0_0/0.25)]"
          >
            <span aria-hidden className="text-title-3 leading-none">
              +
            </span>
            Agregar ahorro
          </button>
        </div>
      )}

      <AnimatePresence>
        {sheet?.type === 'add' && (
          <AddSheet
            key={sheet.editing?.id ?? 'new'}
            goalId={sheet.goalId}
            editing={sheet.editing}
          />
        )}
        {sheet?.type === 'goal' && <GoalSheet key={sheet.goalId} goalId={sheet.goalId} />}
        {sheet?.type === 'settings' && <SettingsSheet key="settings" focus={sheet.focus} />}
      </AnimatePresence>
    </>
  )
}
