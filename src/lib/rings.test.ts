import { describe, expect, it } from 'vitest'
import { goalColor, parseAmount, ringGeometry } from './rings'

describe('ringGeometry', () => {
  it('returns nothing for zero goals', () => {
    expect(ringGeometry(0, 300)).toEqual([])
  })

  it('keeps rings inside the viewBox and outside the center hole', () => {
    for (const n of [1, 2, 3, 5, 8]) {
      const rings = ringGeometry(n, 300)
      expect(rings).toHaveLength(n)
      const outerEdge = rings[0]!.r + rings[0]!.stroke / 2
      const last = rings[n - 1]!
      const innerEdge = last.r - last.stroke / 2
      expect(outerEdge).toBeLessThanOrEqual(150)
      expect(innerEdge).toBeGreaterThanOrEqual(150 * 0.46 - 1)
    }
  })

  it('never overlaps neighbours and thins strokes as goals grow', () => {
    const five = ringGeometry(5, 300)
    for (let i = 1; i < five.length; i++) {
      const gapBetween =
        five[i - 1]!.r - five[i - 1]!.stroke / 2 - (five[i]!.r + five[i]!.stroke / 2)
      expect(gapBetween).toBeGreaterThanOrEqual(2.99)
    }
    expect(five[0]!.stroke).toBeLessThan(ringGeometry(2, 300)[0]!.stroke)
    expect(ringGeometry(1, 300)[0]!.stroke).toBe(22)
  })
})

describe('goalColor', () => {
  it('maps palette hex to theme tokens, case-insensitively', () => {
    expect(goalColor('#34C759')).toBe('var(--goal-green)')
    expect(goalColor('#ffcc00')).toBe('var(--goal-yellow)')
  })
  it('passes custom colors through', () => {
    expect(goalColor('#123456')).toBe('#123456')
  })
})

describe('parseAmount', () => {
  it('parses plain and formatted numbers', () => {
    expect(parseAmount('1,234.50')).toBe(1234.5)
    expect(parseAmount(' $900 ')).toBe(900)
    expect(parseAmount('.5')).toBe(0.5)
  })
  it('rejects junk and extra decimals', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('1.234')).toBeNull()
    expect(parseAmount('-5')).toBeNull()
  })
})
