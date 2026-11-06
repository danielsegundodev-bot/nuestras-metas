import { describe, expect, it } from 'vitest'
import { savedPerGoal } from '../lib/stats'
import { buildDemoData, DEMO_BODA, DEMO_CASA } from './demoSeed'

describe('buildDemoData', () => {
  const now = new Date(2026, 10, 6)
  const d = buildDemoData(now)

  it('is deterministic', () => {
    expect(buildDemoData(now)).toEqual(d)
  })

  it('spans ~14 months in both currencies with a couple of withdrawals, none in the future', () => {
    const months = new Set(d.contributions.map((c) => c.date.slice(0, 7)))
    expect(months.size).toBeGreaterThanOrEqual(13)
    expect(d.contributions.some((c) => c.currency === 'USD')).toBe(true)
    expect(d.contributions.some((c) => c.currency === 'MXN')).toBe(true)
    expect(d.contributions.filter((c) => c.amount < 0)).toHaveLength(2)
    expect(d.contributions.every((c) => c.date <= '2026-11-06')).toBe(true)
    expect(d.contributions.every((c) => c.fx_usd_mxn >= 17 && c.fx_usd_mxn <= 20)).toBe(true)
  })

  it('leaves both goals partially funded', () => {
    const saved = savedPerGoal(d.contributions)
    expect(saved[DEMO_CASA]).toBeGreaterThan(0)
    expect(saved[DEMO_CASA]).toBeLessThan(800_000)
    expect(saved[DEMO_BODA]).toBeGreaterThan(0)
    expect(saved[DEMO_BODA]).toBeLessThan(300_000)
  })
})
