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
    expect(formatMoneyCompact(1_250, 'MXN')).toBe('$1.3\u00a0k')
    expect(formatMoneyCompact(272_000, 'MXN')).toBe('$272\u00a0k')
    expect(formatMoneyCompact(800_000, 'MXN')).toBe('$800\u00a0k')
    expect(formatMoneyCompact(1_200_000, 'MXN')).toBe('$1.2\u00a0M')
    expect(formatMoneyCompact(15_000, 'USD')).toBe('US$15\u00a0k')
    expect(formatMoneyCompact(-3_000, 'MXN')).toBe('-$3\u00a0k')
  })
})

import { formatAmountInput, formatMoneyAuto, fitText } from './money'

describe('formatMoneyAuto', () => {
  it('drops cents from 1,000 up, keeps them below', () => {
    expect(formatMoneyAuto(10379.6, 'MXN')).toBe('$10,380')
    expect(formatMoneyAuto(8090, 'MXN')).toBe('$8,090')
    expect(formatMoneyAuto(950.5, 'MXN')).toBe('$950.50')
    expect(formatMoneyAuto(0.01, 'MXN')).toBe('$0.01')
    expect(formatMoneyAuto(15_300_000, 'MXN')).toBe('$15,300,000')
  })
  it('keeps cents for individual USD entries', () => {
    expect(formatMoneyAuto(1234.5, 'USD', { entry: true })).toBe('US$1,234.50')
    expect(formatMoneyAuto(1234.5, 'USD')).toBe('US$1,235')
    expect(formatMoneyAuto(500, 'USD', { entry: true, signed: true })).toBe('+US$500')
  })
})

describe('formatMoneyCompact (es-MX)', () => {
  it('uses spaced k / M suffixes', () => {
    expect(formatMoneyCompact(2_000_000, 'MXN')).toBe('$2\u00a0M')
    expect(formatMoneyCompact(500_000, 'MXN')).toBe('$500\u00a0k')
    expect(formatMoneyCompact(15_300_000, 'MXN')).toBe('$15.3\u00a0M')
  })
})

describe('fitText', () => {
  const o = { maxWidth: 40, maxSize: 8.4, minSize: 5.6 }
  it('keeps short figures at full size', () => {
    expect(fitText('$412,300', '$412 k', o).size).toBeCloseTo(8.4, 1)
  })
  it('shrinks long figures but keeps them whole while they fit', () => {
    const r = fitText('$15,300,000', '$15.3 M', o)
    expect(r.text).toBe('$15,300,000')
    expect(r.size).toBeLessThan(8.4)
    expect(r.size).toBeGreaterThanOrEqual(5.6)
  })
  it('falls back to compact when even the min size does not fit', () => {
    expect(fitText('US$15,300,000.00', 'US$15.3 M', o).text).toBe('US$15.3 M')
  })
})

describe('formatAmountInput', () => {
  it('adds thousands separators and limits decimals', () => {
    expect(formatAmountInput('1234567').text).toBe('1,234,567')
    expect(formatAmountInput('1,234.567').text).toBe('1,234.56')
    expect(formatAmountInput('.5').text).toBe('0.5')
    expect(formatAmountInput('007').text).toBe('7')
    expect(formatAmountInput('12abc').text).toBe('12')
    expect(formatAmountInput('1234.').text).toBe('1,234.')
  })
  it('caps the integer part at 12 digits', () => {
    expect(formatAmountInput('1234567890123').text).toBe('123,456,789,012')
  })
  it('keeps the caret after the same digit', () => {
    // typed "5" after "1,234" -> raw "1,2345" caret 6
    const r = formatAmountInput('1,2345', 6)
    expect(r.text).toBe('12,345')
    expect(r.caret).toBe(6)
    expect(formatAmountInput('1,2x34', 4).caret).toBe(3)
  })
})
