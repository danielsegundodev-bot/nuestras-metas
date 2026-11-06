import { useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMonthShort, formatMonthYear, parseLocal } from '../lib/dates'
import { formatMoneyAuto, formatMoneyCompact } from '../lib/money'
import { orderProfiles, personColor } from '../lib/people'
import { monthlyCumulativeSeries } from '../lib/stats'
import type { Contribution, Goal, Profile } from '../lib/types'
import { cx, SectionTitle } from './primitives'
import { useMoney } from './ui'

interface Row {
  month: string
  [userId: string]: number | string
}

function ChartTooltip({
  active,
  payload,
  profiles,
  fmt,
}: {
  active?: boolean
  payload?: { payload: Row }[]
  profiles: Profile[]
  fmt(mxn: number): string
}) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  const total = profiles.reduce((a, p) => a + (Number(row[p.user_id]) || 0), 0)
  return (
    <div className="rounded-lg bg-surface px-3 py-2 text-caption shadow-[0_4px_20px_rgb(0_0_0/0.18)] ring-1 ring-separator">
      <p className="mb-1 font-semibold">{formatMonthYear(row.month)}</p>
      {profiles.map((p) => (
        <p key={p.user_id} className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ background: personColor(profiles, p.user_id) }}
          />
          <span className="text-ink-2">{p.display_name}</span>
          <span className="num ml-auto pl-3 font-semibold">{fmt(Number(row[p.user_id]) || 0)}</span>
        </p>
      ))}
      <p className="mt-1 flex justify-between border-t border-separator pt-1">
        <span className="text-ink-2">Juntos</span>
        <span className="num font-semibold">{fmt(total)}</span>
      </p>
    </div>
  )
}

/** Cumulative savings by month, stacked by person. Chart values are in the display currency. */
export function CumulativeChart({
  contributions,
  profiles,
  goals,
  now,
  fixedGoalId,
  title = 'Cómo vamos',
}: {
  contributions: readonly Contribution[]
  profiles: Profile[]
  /** Active goals, for the filter chips. Ignored when `fixedGoalId` is set. */
  goals: Goal[]
  now: Date
  fixedGoalId?: string
  title?: string
}) {
  const reduce = useReducedMotion()
  const { cur, conv } = useMoney()
  const [picked, setPicked] = useState<string | null>(null)
  const goalId = fixedGoalId ?? picked
  const people = useMemo(() => orderProfiles(profiles), [profiles])

  const data = useMemo<Row[]>(() => {
    const series = monthlyCumulativeSeries(contributions, {
      goalId,
      userIds: people.map((p) => p.user_id),
      until: now,
    })
    return series.map((pt) => {
      const row: Row = { month: pt.month }
      for (const p of people) row[p.user_id] = conv(pt.byUser[p.user_id] ?? 0)
      return row
    })
  }, [contributions, goalId, people, now, conv])

  const last = data[data.length - 1]
  const summary = last
    ? people
        .map(
          (p) =>
            `${p.display_name}: ${formatMoneyAuto(Number(last[p.user_id]) || 0, cur)}`,
        )
        .join(', ')
    : ''
  const showChips = !fixedGoalId && goals.length > 1

  return (
    <section aria-label={title}>
      {!fixedGoalId && <SectionTitle>{title}</SectionTitle>}
      {showChips && (
        <div
          role="radiogroup"
          aria-label="Filtrar por meta"
          className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
        >
          {[
            { id: null as string | null, label: 'Todas' },
            ...goals.map((g) => ({ id: g.id, label: `${g.emoji} ${g.name}` })),
          ].map((o) => {
            const active = o.id === picked
            return (
              <button
                key={o.id ?? 'all'}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPicked(o.id)}
                className={cx(
                  'relative h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-footnote font-semibold before:absolute before:inset-x-0 before:-inset-y-1 before:content-[""]',
                  active ? 'bg-ink text-canvas' : 'bg-fill text-ink-2',
                )}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )}
      {data.length < 2 ? (
        <p className="rounded-xl bg-surface px-4 py-6 text-footnote text-ink-2">
          La gráfica aparece cuando haya ahorros en dos meses distintos.
        </p>
      ) : (
        <div
          className="rounded-xl bg-surface px-2 pb-2 pt-4"
          role="img"
          aria-label={`${title}. Acumulado: ${summary}`}
        >
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={28}
                  tickMargin={8}
                  tick={{ fill: 'var(--ink-2)', fontSize: 12 }}
                  tickFormatter={(m: string, i: number) =>
                    i === 0 || m.endsWith('-01')
                      ? `${formatMonthShort(parseLocal(m))} ’${m.slice(2, 4)}`
                      : formatMonthShort(parseLocal(m))
                  }
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  tickCount={4}
                  tick={{ fill: 'var(--ink-2)', fontSize: 12 }}
                  tickFormatter={(v: number) => formatMoneyCompact(v, cur)}
                />
                <Tooltip
                  cursor={{ stroke: 'var(--separator)', strokeWidth: 1 }}
                  content={
                    <ChartTooltip
                      profiles={people}
                      fmt={(v) => formatMoneyAuto(v, cur)}
                    />
                  }
                />
                {people.map((p) => {
                  const color = personColor(people, p.user_id)
                  return (
                    <Area
                      key={p.user_id}
                      type="monotone"
                      dataKey={p.user_id}
                      stackId="people"
                      stroke={color}
                      strokeWidth={2}
                      fill={color}
                      fillOpacity={0.32}
                      isAnimationActive={!reduce}
                      animationDuration={700}
                    />
                  )
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 px-3 pt-2 text-caption text-ink-2">
            {people.map((p) => (
              <li key={p.user_id} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ background: personColor(people, p.user_id) }}
                />
                {p.display_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
