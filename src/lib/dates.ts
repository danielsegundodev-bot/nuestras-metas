import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ISODate } from './types'

/** `yyyy-MM-dd` for a local Date. */
export const toISODate = (d: Date): ISODate => format(d, 'yyyy-MM-dd')

/** `yyyy-MM` month key for a local Date or ISO date string. */
export const monthKey = (d: Date | ISODate): string =>
  typeof d === 'string' ? d.slice(0, 7) : format(d, 'yyyy-MM')

/** Parses `yyyy-MM-dd` or `yyyy-MM` as a local date. */
export const parseLocal = (s: string): Date => parseISO(s.length === 7 ? `${s}-01` : s)

/** "mar 2029" */
export const formatMonthYear = (d: Date | string): string =>
  format(typeof d === 'string' ? parseLocal(d) : d, 'MMM yyyy', { locale: es }).replace('.', '')

/** "mar" — axis labels. */
export const formatMonthShort = (d: Date | string): string =>
  format(typeof d === 'string' ? parseLocal(d) : d, 'MMM', { locale: es }).replace('.', '')

/** "6 nov 2026" */
export const formatDay = (d: Date | string): string =>
  format(typeof d === 'string' ? parseLocal(d) : d, 'd MMM yyyy', { locale: es }).replace('.', '')

/** "octubre 2026" */
export const formatMonthLong = (d: Date | string): string =>
  format(typeof d === 'string' ? parseLocal(d) : d, 'MMMM yyyy', { locale: es })

/** "jueves 6 de noviembre de 2026" (accepts an ISO date or a Date). */
export const formatDayLong = (d: Date | string): string =>
  format(typeof d === 'string' ? parseLocal(d) : d, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })

/** "jueves 6 de noviembre de 2026, 10:42 a. m." in the device's time zone. */
export function formatDateTimeLong(timestamp: string | Date): string {
  const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  if (Number.isNaN(d.getTime())) return ''
  const h = d.getHours()
  const h12 = h % 12 === 0 ? 12 : h % 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  // Non-breaking spaces keep "10:42 a. m." on one line.
  return `${formatDayLong(d)}, ${h12}:${mm}\u00a0${h < 12 ? 'a.\u00a0m.' : 'p.\u00a0m.'}`
}

/** Local `yyyy-MM-dd` of a timestamp (created_at), or null when it can't be parsed. */
export function timestampDay(timestamp: string): ISODate | null {
  const d = new Date(timestamp)
  return Number.isNaN(d.getTime()) ? null : toISODate(d)
}
