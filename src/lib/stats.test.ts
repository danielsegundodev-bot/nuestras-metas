import { describe, expect, it } from 'vitest'
import { formatMonthYear } from './dates'
import {
  contributionSplit,
  monthlyCumulativeSeries,
  progress,
  progressPct,
  projectCompletion,
  savedPerGoal,
  splitSummary,
  summarizeGoals,
  totalSaved,
} from './stats'
import type { Goal } from './types'

const c = (goal_id: string, user_id: string, amount_mxn: number, date: string) => ({
  goal_id,
  user_id,
  amount_mxn,
  date,
})

const rows = [
  c('casa', 'him', 10_000, '2026-01-10'),
  c('boda', 'her', 5_000, '2026-01-20'),
  c('casa', 'her', 3_000, '2026-03-05'),
  c('casa', 'him', -1_000, '2026-03-28'),
  c('boda', 'him', 2_000.5, '2026-04-01'),
]

const goal = (id: string, sort: number, target: number, archived = false): Goal => ({
  id,
  name: id,
  emoji: '',
  target_mxn: target,
  target_date: null,
  color: '#000',
  sort,
  archived,
  created_at: '2026-01-01T00:00:00Z',
})

describe('savedPerGoal / totalSaved', () => {
  it('sums net MXN per goal, subtracting withdrawals', () => {
    expect(savedPerGoal(rows)).toEqual({ casa: 12_000, boda: 7_000.5 })
    expect(totalSaved(rows)).toBe(19_000.5)
    expect(totalSaved(rows, ['boda'])).toBe(7_000.5)
  })
})

describe('progress', () => {
  it('is a clamped fraction', () => {
    expect(progress(250, 1000)).toBe(0.25)
    expect(progress(2000, 1000)).toBe(1)
    expect(progress(-5, 1000)).toBe(0)
    expect(progress(10, 0)).toBe(0)
    expect(progressPct(272_000, 800_000)).toBe(34)
  })
})

describe('summarizeGoals', () => {
  it('drops archived goals and sorts by `sort`', () => {
    const goals = [goal('boda', 1, 300_000), goal('casa', 0, 800_000), goal('old', 2, 1, true)]
    const s = summarizeGoals(goals, rows)
    expect(s.map((x) => x.goal.id)).toEqual(['casa', 'boda'])
    expect(s[0]!.saved).toBe(12_000)
    expect(s[0]!.progress).toBeCloseTo(0.015)
  })
})

describe('monthlyCumulativeSeries', () => {
  it('builds a gap-filled cumulative series by person', () => {
    const s = monthlyCumulativeSeries(rows, { userIds: ['him', 'her', 'nobody'] })
    expect(s.map((p) => p.month)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04'])
    expect(s[0]).toEqual({
      month: '2026-01',
      total: 15_000,
      byUser: { him: 10_000, her: 5_000, nobody: 0 },
    })
    expect(s[1]!.total).toBe(15_000)
    expect(s[2]!.byUser).toEqual({ him: 9_000, her: 8_000, nobody: 0 })
    expect(s[3]!.total).toBe(19_000.5)
  })

  it('filters by goal and extends to `until`', () => {
    const s = monthlyCumulativeSeries(rows, { goalId: 'boda', until: new Date(2026, 5, 15) })
    expect(s.map((p) => p.month)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
    ])
    expect(s.at(-1)!.byUser).toEqual({ her: 5_000, him: 2_000.5 })
  })

  it('is empty without data', () => {
    expect(monthlyCumulativeSeries([])).toEqual([])
  })
})

describe('contributionSplit', () => {
  it('computes shares all-time and per month', () => {
    const all = contributionSplit(rows)
    expect(all.byUser.him!.mxn).toBe(11_000.5)
    expect(all.byUser.her!.mxn).toBe(8_000)
    expect(all.byUser.him!.share + all.byUser.her!.share).toBeCloseTo(1)

    const { thisMonth } = splitSummary(rows, new Date(2026, 2, 31), ['him', 'her'])
    // March: him -1000 (counts as 0), her 3000
    expect(thisMonth.total).toBe(3_000)
    expect(thisMonth.byUser.her!.share).toBe(1)
    expect(thisMonth.byUser.him!.share).toBe(0)
  })

  it('returns zero shares for an empty month', () => {
    const s = contributionSplit(rows, { month: '2026-02', userIds: ['him', 'her'] })
    expect(s.total).toBe(0)
    expect(s.byUser).toEqual({ him: { mxn: 0, share: 0 }, her: { mxn: 0, share: 0 } })
  })
})

describe('projectCompletion', () => {
  const monthly = (months: number, amount: number) =>
    Array.from({ length: months }, (_, i) => {
      const d = new Date(2026, i, 15)
      return c(
        'casa',
        'him',
        amount,
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-15`,
      )
    })

  it('projects from the 6-month average', () => {
    // 10 months × 10k = 100k saved; avg over last 6 months = 10k; 50k left → 5 months
    const p = projectCompletion(monthly(10, 10_000), 150_000, new Date(2026, 9, 20))!
    expect(p.avgMonthly).toBe(10_000)
    expect(p.monthsLeft).toBe(5)
    expect(formatMonthYear(p.completion)).toBe('mar 2027')
  })

  it('only averages the last 6 months', () => {
    const data = [
      ...monthly(4, 50_000),
      ...monthly(10, 0)
        .slice(4)
        .map((r) => ({ ...r, amount_mxn: 6_000 })),
    ]
    // window May..Oct = 6 × 6k = 36k → avg 6k; saved = 200k + 36k = 236k; target 260k → 4 months
    const p = projectCompletion(data, 260_000, new Date(2026, 9, 1))!
    expect(p.avgMonthly).toBe(6_000)
    expect(p.monthsLeft).toBe(4)
  })

  it('uses a shorter window for young histories', () => {
    // Jan + Feb, now = Feb → 2 months of history, 20k / 2
    const p = projectCompletion(monthly(2, 10_000), 50_000, new Date(2026, 1, 28))!
    expect(p.avgMonthly).toBe(10_000)
    expect(p.monthsLeft).toBe(3)
  })

  it('returns null with < 2 months of data, no data, or a non-positive pace', () => {
    expect(projectCompletion(monthly(1, 10_000), 50_000, new Date(2026, 0, 31))).toBeNull()
    expect(projectCompletion([], 50_000, new Date(2026, 0, 31))).toBeNull()
    const flat = [c('casa', 'him', 10_000, '2025-01-01'), c('casa', 'him', -10_000, '2026-09-01')]
    expect(projectCompletion(flat, 50_000, new Date(2026, 9, 1))).toBeNull()
  })

  it('reports 0 months left when the goal is already reached', () => {
    const p = projectCompletion(monthly(3, 10_000), 20_000, new Date(2026, 2, 10))!
    expect(p.monthsLeft).toBe(0)
    expect(formatMonthYear(p.completion)).toBe('mar 2026')
  })

  it('can filter by goal', () => {
    const data = [...monthly(3, 10_000), c('boda', 'her', 1_000_000, '2026-02-01')]
    expect(projectCompletion(data, 100_000, new Date(2026, 2, 10), 'casa')!.monthsLeft).toBe(7)
  })
})

import { displayPct, progressRatio } from './stats'

describe('overfunded goals', () => {
  it('keeps the real ratio above 1 and caps the label at 999%', () => {
    expect(progressRatio(250, 100)).toBe(2.5)
    expect(displayPct(250, 100)).toBe(250)
    expect(displayPct(1e9, 100)).toBe(999)
    expect(displayPct(50, 0)).toBe(0)
  })
})
