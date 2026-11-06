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
