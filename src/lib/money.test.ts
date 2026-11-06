import { describe, expect, it } from 'vitest'
import { formatMoney, formatMoneyCompact, fromMXN, toMXN } from './money'

describe('toMXN / fromMXN', () => {
  it('converts USD with the given rate and leaves MXN untouched', () => {
    expect(toMXN(100, 'USD', 18.5)).toBe(1850)
    expect(toMXN(10.01, 'USD', 17.3333)).toBe(173.51)
    expect(toMXN(2500, 'MXN', 18.5)).toBe(2500)
  })

  it('handles withdrawals (negative amounts)', () => {
    expect(toMXN(-50, 'USD', 20)).toBe(-1000)
  })

  it('converts back from MXN', () => {
    expect(fromMXN(1850, 'USD', 18.5)).toBe(100)
    expect(fromMXN(1850, 'MXN', 18.5)).toBe(1850)
    expect(fromMXN(1000, 'USD', 0)).toBe(0)
  })
})

describe('formatMoney', () => {
  it('formats MXN in es-MX without decimals for whole amounts', () => {
    expect(formatMoney(272000, 'MXN')).toBe('$272,000')
    expect(formatMoney(1234.5, 'MXN')).toBe('$1,234.50')
  })

  it('prefixes USD to disambiguate from MXN', () => {
    expect(formatMoney(1500, 'USD')).toBe('US$1,500')
    expect(formatMoney(-20.25, 'USD')).toBe('-US$20.25')
  })

  it('supports explicit decimals and signs', () => {
    expect(formatMoney(100, 'MXN', { decimals: 2 })).toBe('$100.00')
    expect(formatMoney(100, 'MXN', { signed: true })).toBe('+$100')
    expect(formatMoney(-100, 'MXN', { signed: true })).toBe('-$100')
  })
})

describe('formatMoneyCompact', () => {
  it('abbreviates thousands and millions', () => {
    expect(formatMoneyCompact(950, 'MXN')).toBe('$950')
    expect(formatMoneyCompact(1_250, 'MXN')).toBe('$1.3k')
    expect(formatMoneyCompact(272_000, 'MXN')).toBe('$272k')
    expect(formatMoneyCompact(800_000, 'MXN')).toBe('$800k')
    expect(formatMoneyCompact(1_200_000, 'MXN')).toBe('$1.2M')
    expect(formatMoneyCompact(15_000, 'USD')).toBe('US$15k')
    expect(formatMoneyCompact(-3_000, 'MXN')).toBe('-$3k')
  })
})
