import { describe, expect, it } from 'vitest'
import { formatDateTimeLong, formatDayLong, timestampDay } from './dates'

describe('date formatting', () => {
  it('formats a full es-MX date and time', () => {
    expect(formatDateTimeLong(new Date(2026, 10, 6, 10, 42))).toBe(
      'viernes 6 de noviembre de 2026, 10:42 a. m.',
    )
    expect(formatDateTimeLong(new Date(2026, 10, 6, 0, 5))).toBe(
      'viernes 6 de noviembre de 2026, 12:05 a. m.',
    )
    expect(formatDateTimeLong(new Date(2026, 10, 6, 15, 0))).toBe(
      'viernes 6 de noviembre de 2026, 3:00 p. m.',
    )
  })
  it('formats a day from an ISO date', () => {
    expect(formatDayLong('2026-11-05')).toBe('jueves 5 de noviembre de 2026')
  })
  it('returns the local day of a timestamp', () => {
    expect(timestampDay(new Date(2026, 10, 6, 23, 59).toISOString())).toBe('2026-11-06')
    expect(timestampDay('nope')).toBeNull()
  })
})
