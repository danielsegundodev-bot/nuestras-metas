import { describe, expect, it } from 'vitest'
import { savedPerGoal } from '../lib/stats'
import {
  buildDemoData,
  DEMO_BODA,
  DEMO_CASA,
  DEMO_DICIEMBRES,
  DEMO_EMERGENCIA,
  DEMO_HOGAR,
} from './demoSeed'

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

  it('seeds the five goals from the migration, all partially funded', () => {
    expect(d.goals.map((g) => g.name)).toEqual([
      'Casa',
      'Boda',
      'Diciembres juntos',
      'Fondo de emergencia',
      'Nuestro hogar',
    ])
    const saved = savedPerGoal(d.contributions)
    for (const g of d.goals) {
      expect(saved[g.id]).toBeGreaterThan(0)
      expect(saved[g.id]).toBeLessThan(g.target_mxn)
    }
    expect([DEMO_CASA, DEMO_BODA, DEMO_DICIEMBRES, DEMO_EMERGENCIA, DEMO_HOGAR]).toHaveLength(5)
  })

  it('spends the December flight money in December', () => {
    const dec = d.contributions.filter((c) => c.goal_id === DEMO_DICIEMBRES && c.amount < 0)
    expect(dec.length).toBeGreaterThan(0)
    expect(dec.every((c) => c.date.slice(5, 7) === '12')).toBe(true)
  })
})
