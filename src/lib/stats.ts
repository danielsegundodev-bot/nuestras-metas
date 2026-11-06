import { addMonths, differenceInCalendarMonths, startOfMonth } from 'date-fns'
import { monthKey, parseLocal } from './dates'
import type { Contribution, Goal } from './types'

type Contrib = Pick<Contribution, 'goal_id' | 'user_id' | 'amount_mxn' | 'date'>

const round2 = (n: number) => Math.round(n * 100) / 100

/** Net MXN saved per goal id (withdrawals subtract). */
export function savedPerGoal(contributions: readonly Contrib[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const c of contributions) out[c.goal_id] = round2((out[c.goal_id] ?? 0) + c.amount_mxn)
  return out
}

export function totalSaved(contributions: readonly Contrib[], goalIds?: readonly string[]): number {
  const ids = goalIds ? new Set(goalIds) : null
  let sum = 0
  for (const c of contributions) if (!ids || ids.has(c.goal_id)) sum += c.amount_mxn
  return round2(sum)
}

/** Progress as a fraction in [0, 1]. */
export function progress(saved: number, target: number): number {
  if (!(target > 0)) return 0
  return Math.min(1, Math.max(0, saved / target))
}

/** Progress as a whole percentage in [0, 100]. */
export const progressPct = (saved: number, target: number): number =>
  Math.round(progress(saved, target) * 100)

export interface GoalSummary {
  goal: Goal
  saved: number
  /** [0, 1] */
  progress: number
}

/** Active goals sorted by `sort`, with saved amounts and progress. */
export function summarizeGoals(
  goals: readonly Goal[],
  contributions: readonly Contrib[],
): GoalSummary[] {
  const saved = savedPerGoal(contributions)
  return goals
    .filter((g) => !g.archived)
    .sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at))
    .map((goal) => {
      const s = saved[goal.id] ?? 0
      return { goal, saved: s, progress: progress(s, goal.target_mxn) }
    })
}

export interface SeriesPoint {
  /** `yyyy-MM` */
  month: string
  /** Cumulative MXN for all people at the end of the month. */
  total: number
  /** Cumulative MXN per user id at the end of the month. */
  byUser: Record<string, number>
}

export interface SeriesOptions {
  /** Restrict to one goal. */
  goalId?: string | null
  /** Users always present in `byUser` (zero-filled), e.g. both profile ids. */
  userIds?: readonly string[]
  /** Last month to include (default: month of the last contribution). */
  until?: Date
}

/** Cumulative savings by month, split by person. One point per month, gaps filled. */
export function monthlyCumulativeSeries(
  contributions: readonly Contrib[],
  opts: SeriesOptions = {},
): SeriesPoint[] {
  const rows = opts.goalId ? contributions.filter((c) => c.goal_id === opts.goalId) : contributions
  if (rows.length === 0) return []

  const users = new Set(opts.userIds ?? [])
  const perMonth = new Map<string, Record<string, number>>()
  let first = rows[0]!.date
  let last = rows[0]!.date
  for (const c of rows) {
    users.add(c.user_id)
    if (c.date < first) first = c.date
    if (c.date > last) last = c.date
    const k = monthKey(c.date)
    const m = perMonth.get(k) ?? {}
    m[c.user_id] = (m[c.user_id] ?? 0) + c.amount_mxn
    perMonth.set(k, m)
  }

  const start = startOfMonth(parseLocal(first))
  const end = startOfMonth(opts.until ?? parseLocal(last))
  const running: Record<string, number> = Object.fromEntries([...users].map((u) => [u, 0]))
  const out: SeriesPoint[] = []
  for (let d = start; d <= end; d = addMonths(d, 1)) {
    const k = monthKey(d)
    const m = perMonth.get(k)
    if (m) for (const [u, v] of Object.entries(m)) running[u] = round2((running[u] ?? 0) + v)
    const byUser = { ...running }
    out.push({ month: k, byUser, total: round2(Object.values(byUser).reduce((a, b) => a + b, 0)) })
  }
  return out
}

export interface Split {
  /** Sum of positive per-person nets (denominator of `share`). */
  total: number
  byUser: Record<string, { mxn: number; share: number }>
}

/**
 * Who contributed: net MXN per person and their share. A person whose net is negative
 * (more withdrawn than deposited) counts as 0 for the share.
 */
export function contributionSplit(
  contributions: readonly Contrib[],
  opts: { month?: string; userIds?: readonly string[] } = {},
): Split {
  const byUserNet: Record<string, number> = Object.fromEntries(
    (opts.userIds ?? []).map((u) => [u, 0]),
  )
  for (const c of contributions) {
    if (opts.month && monthKey(c.date) !== opts.month) continue
    byUserNet[c.user_id] = round2((byUserNet[c.user_id] ?? 0) + c.amount_mxn)
  }
  const total = round2(Object.values(byUserNet).reduce((a, v) => a + Math.max(0, v), 0))
  const byUser: Split['byUser'] = {}
  for (const [u, mxn] of Object.entries(byUserNet)) {
    byUser[u] = { mxn, share: total > 0 ? Math.max(0, mxn) / total : 0 }
  }
  return { total, byUser }
}

/** Split for all time and for the month of `now`. */
export function splitSummary(
  contributions: readonly Contrib[],
  now: Date,
  userIds?: readonly string[],
): { allTime: Split; thisMonth: Split } {
  return {
    allTime: contributionSplit(contributions, { userIds }),
    thisMonth: contributionSplit(contributions, { month: monthKey(now), userIds }),
  }
}

export const PROJECTION_WINDOW_MONTHS = 6

export interface Projection {
  /** Average net MXN per month over the window. */
  avgMonthly: number
  /** Whole months until the target is reached (0 if already reached). */
  monthsLeft: number
  /** First day of the estimated completion month. */
  completion: Date
}

/**
 * Estimates when `target` is reached at the current pace: average net MXN per month over
 * the last 6 calendar months (current month included). The window is shortened when the
 * history is younger than 6 months. Returns null with < 2 months of history or a
 * non-positive average.
 */
export function projectCompletion(
  contributions: readonly Contrib[],
  target: number,
  now: Date,
  goalId?: string,
): Projection | null {
  const rows = goalId ? contributions.filter((c) => c.goal_id === goalId) : contributions
  if (rows.length === 0) return null

  const thisMonth = startOfMonth(now)
  let first = rows[0]!.date
  for (const c of rows) if (c.date < first) first = c.date
  const historyMonths = differenceInCalendarMonths(thisMonth, startOfMonth(parseLocal(first))) + 1
  if (historyMonths < 2) return null

  const windowMonths = Math.min(PROJECTION_WINDOW_MONTHS, historyMonths)
  const windowStart = monthKey(addMonths(thisMonth, -(windowMonths - 1)))
  const nowKey = monthKey(thisMonth)
  let saved = 0
  let inWindow = 0
  for (const c of rows) {
    saved += c.amount_mxn
    const k = monthKey(c.date)
    if (k >= windowStart && k <= nowKey) inWindow += c.amount_mxn
  }
  const avgMonthly = round2(inWindow / windowMonths)
  if (!(avgMonthly > 0)) return null

  const remaining = target - saved
  const monthsLeft = remaining <= 0 ? 0 : Math.ceil(remaining / avgMonthly)
  return { avgMonthly, monthsLeft, completion: addMonths(thisMonth, monthsLeft) }
}
