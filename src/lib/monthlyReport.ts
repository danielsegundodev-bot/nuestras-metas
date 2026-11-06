import { addMonths, endOfMonth, startOfMonth } from 'date-fns'
import { formatMonthLong, monthKey, parseLocal, toISODate } from './dates'
import { fromMXN } from './money'
import { orderProfiles } from './people'
import {
  contributionSplit,
  progress,
  progressPct,
  projectCompletion,
  type Projection,
} from './stats'
import type { Contribution, Currency, Goal, ISODate, Profile } from './types'

const round2 = (n: number) => Math.round(n * 100) / 100

/** Person fallbacks when a profile has no color (same hexes as --him / --her). */
const DEFAULT_PERSON_COLORS = ['#5856D6', '#FF2D55']

export interface ReportGoal {
  id: string
  name: string
  color: string
  targetMxn: number
  /** Net MXN saved up to the end of the month. */
  saved: number
  /** [0, 1] */
  progress: number
  pct: number
  /** Net MXN saved during the month. */
  savedThisMonth: number
  /** "A este ritmo", computed as of the end of the month. */
  projection: Projection | null
}

export interface ReportPerson {
  userId: string
  name: string
  color: string
  month: { mxn: number; share: number }
  allTime: { mxn: number; share: number }
}

export interface ReportMovement {
  id: string
  date: ISODate
  userId: string
  person: string
  goal: string
  amount: number
  currency: Currency
  amountMxn: number
  fx: number
  note: string | null
}

export interface MonthlyReport {
  /** `yyyy-MM` */
  month: string
  /** "octubre 2026" */
  monthLabel: string
  /** `yyyy-MM-dd` of the first and last day of the month. */
  from: ISODate
  to: ISODate
  totals: {
    monthMxn: number
    /** null when no fx rate is available. */
    monthUsd: number | null
    /** Net MXN saved together, all time, as of the end of the month. */
    allTimeMxn: number
    previousMonthMxn: number
    deltaMxn: number
    /** Relative change vs previous month; null when the previous month is 0. */
    deltaPct: number | null
  }
  goals: ReportGoal[]
  people: ReportPerson[]
  /** Sorted by date (then creation time), never truncated. */
  movements: ReportMovement[]
  fxRate: number | null
  /** Number of archived goals (their movements are excluded). */
  archivedCount: number
}

/** `yyyy-MM` list from the first contribution to `now`'s month (oldest first). Empty with no data. */
export function reportMonths(
  contributions: readonly Pick<Contribution, 'date'>[],
  now: Date,
): string[] {
  if (contributions.length === 0) return []
  let first = contributions[0]!.date
  for (const c of contributions) if (c.date < first) first = c.date
  const out: string[] = []
  const end = startOfMonth(now)
  for (let d = startOfMonth(parseLocal(first)); d <= end; d = addMonths(d, 1)) out.push(monthKey(d))
  return out
}

/** Previous month if it has data, else the current one. */
export function defaultReportMonth(
  contributions: readonly Pick<Contribution, 'date'>[],
  now: Date,
): string {
  const prev = monthKey(addMonths(startOfMonth(now), -1))
  return contributions.some((c) => monthKey(c.date) === prev) ? prev : monthKey(now)
}

/** Pure data shaping for the monthly PDF. Archived goals are excluded everywhere. */
export function buildMonthlyReport(
  goals: readonly Goal[],
  contributions: readonly Contribution[],
  profiles: readonly Profile[],
  month: string,
  fxRate: number | null,
): MonthlyReport {
  const monthStart = startOfMonth(parseLocal(month))
  const monthEnd = endOfMonth(monthStart)
  const from = toISODate(monthStart)
  const to = toISODate(monthEnd)
  const prevKey = monthKey(addMonths(monthStart, -1))

  const activeGoals = goals
    .filter((g) => !g.archived)
    .sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at))
  const ids = new Set(activeGoals.map((g) => g.id))
  const mine = contributions.filter((c) => ids.has(c.goal_id))
  const asOfEnd = mine.filter((c) => c.date <= to)
  const inMonth = asOfEnd.filter((c) => monthKey(c.date) === month)
  const fx = fxRate && fxRate > 0 ? fxRate : null

  const sum = (rows: readonly Contribution[]) => round2(rows.reduce((a, c) => a + c.amount_mxn, 0))
  const monthMxn = sum(inMonth)
  const previousMonthMxn = sum(asOfEnd.filter((c) => monthKey(c.date) === prevKey))

  const reportGoals: ReportGoal[] = activeGoals.map((g) => {
    const rows = asOfEnd.filter((c) => c.goal_id === g.id)
    const saved = sum(rows)
    return {
      id: g.id,
      name: g.name,
      color: g.color,
      targetMxn: g.target_mxn,
      saved,
      progress: progress(saved, g.target_mxn),
      pct: progressPct(saved, g.target_mxn),
      savedThisMonth: sum(rows.filter((c) => monthKey(c.date) === month)),
      projection: projectCompletion(asOfEnd, g.target_mxn, monthEnd, g.id),
    }
  })

  const ordered = orderProfiles(profiles)
  const userIds = ordered.map((p) => p.user_id)
  const splitMonth = contributionSplit(inMonth, { userIds })
  const splitAll = contributionSplit(asOfEnd, { userIds })
  const people: ReportPerson[] = ordered.map((p, i) => ({
    userId: p.user_id,
    name: p.display_name,
    color: p.color ?? DEFAULT_PERSON_COLORS[i === 1 ? 1 : 0]!,
    month: splitMonth.byUser[p.user_id]!,
    allTime: splitAll.byUser[p.user_id]!,
  }))

  const goalName = new Map(activeGoals.map((g) => [g.id, g.name]))
  const personName = new Map(profiles.map((p) => [p.user_id, p.display_name]))
  const movements: ReportMovement[] = [...inMonth]
    .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))
    .map((c) => ({
      id: c.id,
      date: c.date,
      userId: c.user_id,
      person: personName.get(c.user_id) ?? '—',
      goal: goalName.get(c.goal_id) ?? '—',
      amount: c.amount,
      currency: c.currency,
      amountMxn: c.amount_mxn,
      fx: c.fx_usd_mxn,
      note: c.note,
    }))

  return {
    month,
    monthLabel: formatMonthLong(monthStart),
    from,
    to,
    totals: {
      monthMxn,
      monthUsd: fx ? fromMXN(monthMxn, 'USD', fx) : null,
      allTimeMxn: sum(asOfEnd),
      previousMonthMxn,
      deltaMxn: round2(monthMxn - previousMonthMxn),
      deltaPct: previousMonthMxn > 0 ? (monthMxn - previousMonthMxn) / previousMonthMxn : null,
    },
    goals: reportGoals,
    people,
    movements,
    fxRate: fx,
    archivedCount: goals.length - activeGoals.length,
  }
}
