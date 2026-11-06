import { describe, expect, it } from 'vitest'
import { daysUntilDecember, decembersBetween, isDecember } from './december'

describe('isDecember / daysUntilDecember', () => {
  it('counts calendar days to the next December 1st', () => {
    expect(daysUntilDecember(new Date(2026, 10, 6, 23, 59))).toBe(25)
    expect(daysUntilDecember(new Date(2026, 10, 30))).toBe(1)
    expect(daysUntilDecember(new Date(2026, 0, 1))).toBe(334)
  })

  it('is 0 during December', () => {
    expect(isDecember(new Date(2026, 11, 1))).toBe(true)
    expect(isDecember(new Date(2026, 11, 31, 23))).toBe(true)
    expect(isDecember(new Date(2027, 0, 1))).toBe(false)
    expect(daysUntilDecember(new Date(2026, 11, 15))).toBe(0)
  })
})

describe('decembersBetween', () => {
  const move = '2026-01-15'
  const ret = '2031-01-15'

  it('lists the five Decembers of the 5-year stay', () => {
    const d = decembersBetween(move, ret, new Date(2026, 10, 6))
    expect(d.map((x) => x.year)).toEqual([2026, 2027, 2028, 2029, 2030])
    expect(d.every((x) => x.state === 'future')).toBe(true)
  })

  it('marks past, current and future', () => {
    const d = decembersBetween(move, ret, new Date(2027, 11, 20))
    expect(d.map((x) => x.state)).toEqual(['past', 'current', 'future', 'future', 'future'])
    const after = decembersBetween(move, ret, new Date(2031, 5, 1))
    expect(after.every((x) => x.state === 'past')).toBe(true)
  })

  it('includes a December when the move happens mid-December', () => {
    expect(
      decembersBetween('2026-12-10', '2027-06-01', new Date(2026, 0, 1)).map((x) => x.year),
    ).toEqual([2026])
  })

  it('handles missing or inverted dates', () => {
    expect(decembersBetween(null, ret, new Date())).toEqual([])
    expect(decembersBetween(ret, move, new Date())).toEqual([])
  })
})
