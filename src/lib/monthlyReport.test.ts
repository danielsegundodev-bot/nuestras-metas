import { describe, expect, it } from 'vitest'
import { buildMonthlyReport, defaultReportMonth, reportMonths } from './monthlyReport'
import type { Contribution, Goal, Profile } from './types'

const profiles: Profile[] = [
  {
    user_id: 'd',
    display_name: 'Daniel',
    currency: 'USD',
    color: null,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    user_id: 'a',
    display_name: 'Ana Rosa',
    currency: 'MXN',
    color: '#32ADE6',
    created_at: '2025-01-02T00:00:00Z',
  },
]
const goal = (id: string, sort: number, target: number, archived = false): Goal => ({
  id,
  name: id,
  emoji: '🏡',
  target_mxn: target,
  target_date: null,
  color: '#34C759',
  sort,
  archived,
  created_at: '2025-01-01T00:00:00Z',
})
let n = 0
const c = (goal_id: string, user_id: string, amount_mxn: number, date: string): Contribution => ({
  id: `c${n++}`,
  goal_id,
  user_id,
  amount: amount_mxn,
  currency: 'MXN',
  fx_usd_mxn: 18,
  amount_mxn,
  date,
  note: null,
  created_at: `${date}T12:00:00Z`,
})

const goals = [goal('casa', 0, 100_000), goal('boda', 1, 50_000), goal('old', 2, 1_000, true)]
const rows = [
  c('casa', 'd', 10_000, '2026-08-31'),
  c('casa', 'a', 5_000, '2026-09-01'),
  c('boda', 'a', 2_000, '2026-09-30'),
  c('casa', 'd', -1_000, '2026-09-15'),
  c('casa', 'd', 9_000, '2026-10-01'), // after the month: must not count
  c('old', 'd', 700, '2026-09-10'), // archived: excluded
]

describe('buildMonthlyReport', () => {
  const r = buildMonthlyReport(goals, rows, profiles, '2026-09', 20)

  it('respects month boundaries (first and last day)', () => {
    expect(r.from).toBe('2026-09-01')
    expect(r.to).toBe('2026-09-30')
    expect(r.movements.map((m) => m.date)).toEqual(['2026-09-01', '2026-09-15', '2026-09-30'])
    expect(r.monthLabel).toBe('septiembre 2026')
  })

  it('computes month and as-of-month-end totals, withdrawals net', () => {
    expect(r.totals.monthMxn).toBe(6_000)
    expect(r.totals.monthUsd).toBe(300)
    expect(r.totals.allTimeMxn).toBe(16_000)
    const casa = r.goals.find((g) => g.id === 'casa')!
    expect(casa.saved).toBe(14_000)
    expect(casa.savedThisMonth).toBe(4_000)
    expect(casa.pct).toBe(14)
    expect(r.goals.find((g) => g.id === 'boda')!.savedThisMonth).toBe(2_000)
  })

  it('compares with the previous month', () => {
    expect(r.totals.previousMonthMxn).toBe(10_000)
    expect(r.totals.deltaMxn).toBe(-4_000)
    expect(r.totals.deltaPct).toBeCloseTo(-0.4)
    const first = buildMonthlyReport(goals, rows, profiles, '2026-08', null)
    expect(first.totals.deltaPct).toBeNull()
    expect(first.totals.monthUsd).toBeNull()
  })

  it('computes split shares per person with profile names', () => {
    const [d, a] = r.people
    expect(d!.name).toBe('Daniel')
    expect(d!.month.mxn).toBe(-1_000)
    expect(d!.month.share).toBe(0)
    expect(a!.month.share).toBe(1)
    expect(a!.color).toBe('#32ADE6')
    expect(d!.color).toBe('#5856D6')
    expect(d!.allTime.share).toBeCloseTo(9_000 / 16_000)
  })

  it('excludes archived goals and reports their count', () => {
    expect(r.goals.map((g) => g.id)).toEqual(['casa', 'boda'])
    expect(r.movements.some((m) => m.goal === 'old')).toBe(false)
    expect(r.archivedCount).toBe(1)
  })

  it('projects as of month end, ignoring later contributions', () => {
    const casa = r.goals.find((g) => g.id === 'casa')!
    expect(casa.projection).not.toBeNull()
    // history Aug..Sep = 2 months, net 14,000 → 7,000/month; remaining 86,000 → 13 months
    expect(casa.projection!.avgMonthly).toBe(7_000)
    expect(casa.projection!.monthsLeft).toBe(13)
  })
})

describe('reportMonths / defaultReportMonth', () => {
  const now = new Date(2026, 10, 6) // 6 nov 2026
  it('lists months from the first contribution to now', () => {
    expect(reportMonths(rows, now)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11'])
    expect(reportMonths([], now)).toEqual([])
  })
  it('defaults to previous month if it has data, else current', () => {
    expect(defaultReportMonth(rows, now)).toBe('2026-10')
    expect(defaultReportMonth([c('casa', 'd', 1, '2026-09-01')], now)).toBe('2026-11')
  })
})
