import { differenceInCalendarDays, endOfMonth, startOfDay } from 'date-fns'
import { parseLocal } from './dates'
import type { ISODate } from './types'

/** December is when they are together. */
export const isDecember = (now: Date): boolean => now.getMonth() === 11

/** Days until the next December 1st (0 during December). */
export function daysUntilDecember(now: Date): number {
  if (isDecember(now)) return 0
  return differenceInCalendarDays(new Date(now.getFullYear(), 11, 1), startOfDay(now))
}

export type DecemberState = 'past' | 'current' | 'future'

export interface DecemberMark {
  year: number
  state: DecemberState
}

/** Every December that overlaps [moveDate, returnDate], with its state relative to `now`. */
export function decembersBetween(
  moveDate: ISODate | null,
  returnDate: ISODate | null,
  now: Date,
): DecemberMark[] {
  if (!moveDate || !returnDate) return []
  const move = parseLocal(moveDate)
  const ret = parseLocal(returnDate)
  if (ret < move) return []
  const out: DecemberMark[] = []
  for (let y = move.getFullYear(); y <= ret.getFullYear(); y++) {
    const decStart = new Date(y, 11, 1)
    const decEnd = endOfMonth(decStart)
    if (decEnd < move || decStart > ret) continue
    const state: DecemberState = now > decEnd ? 'past' : now >= decStart ? 'current' : 'future'
    out.push({ year: y, state })
  }
  return out
}
