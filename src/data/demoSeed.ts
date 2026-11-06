import { addMonths, startOfMonth } from 'date-fns'
import { toISODate } from '../lib/dates'
import { toMXN } from '../lib/money'
import type { Contribution, Currency, Goal, Profile, Settings } from '../lib/types'

export const DEMO_DANIEL = 'demo-daniel'
export const DEMO_ELLA = 'demo-ella'
export const DEMO_CASA = 'demo-goal-casa'
export const DEMO_BODA = 'demo-goal-boda'
export const DEMO_DICIEMBRES = 'demo-goal-diciembres'
export const DEMO_EMERGENCIA = 'demo-goal-emergencia'
export const DEMO_HOGAR = 'demo-goal-hogar'

export interface DemoData {
  profiles: Profile[]
  goals: Goal[]
  contributions: Contribution[]
  settings: Settings
}

/** Deterministic PRNG so the demo looks the same on every reset. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DANIEL_NOTES = ['Quincena', 'Bono', 'Horas extra', null, null, null]
const ELLA_NOTES = ['Quincena', 'Venta de ropa', 'Tandas', null, null, null]

/** ~14 months of irregular contributions ending at `now`, in both currencies. */
export function buildDemoData(now: Date = new Date()): DemoData {
  const rand = mulberry32(20260115)
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!
  const between = (lo: number, hi: number) => lo + rand() * (hi - lo)

  const createdBase = '2025-09-01T12:00:00.000Z'
  const profiles: Profile[] = [
    {
      user_id: DEMO_DANIEL,
      display_name: 'Daniel',
      currency: 'USD',
      color: null,
      created_at: createdBase,
    },
    {
      user_id: DEMO_ELLA,
      display_name: 'Ella',
      currency: 'MXN',
      color: null,
      created_at: '2025-09-01T12:05:00.000Z',
    },
  ]
  const goalRow = (
    id: string,
    name: string,
    emoji: string,
    target_mxn: number,
    color: string,
    sort: number,
  ): Goal => ({
    id,
    name,
    emoji,
    target_mxn,
    target_date: null,
    color,
    sort,
    archived: false,
    created_at: createdBase,
  })
  const goals: Goal[] = [
    goalRow(DEMO_CASA, 'Casa', '🏡', 800_000, '#34C759', 0),
    goalRow(DEMO_BODA, 'Boda', '💍', 300_000, '#FF9500', 1),
    goalRow(DEMO_DICIEMBRES, 'Diciembres juntos', '✈️', 300_000, '#30B0C7', 2),
    goalRow(DEMO_EMERGENCIA, 'Fondo de emergencia', '🛟', 150_000, '#AF52DE', 3),
    goalRow(DEMO_HOGAR, 'Nuestro hogar', '🛋️', 120_000, '#FFCC00', 4),
  ]

  /** Weighted goal choice for regular deposits. */
  const pickGoal = (weights: readonly [string, number][]): string => {
    let r = rand() * weights.reduce((a, [, w]) => a + w, 0)
    for (const [id, w] of weights) {
      r -= w
      if (r <= 0) return id
    }
    return weights[0]![0]
  }
  const DANIEL_GOALS: [string, number][] = [
    [DEMO_CASA, 0.5],
    [DEMO_BODA, 0.2],
    [DEMO_EMERGENCIA, 0.2],
    [DEMO_HOGAR, 0.1],
  ]
  const ELLA_GOALS: [string, number][] = [
    [DEMO_CASA, 0.3],
    [DEMO_BODA, 0.35],
    [DEMO_EMERGENCIA, 0.2],
    [DEMO_HOGAR, 0.15],
  ]

  const contributions: Contribution[] = []
  let seq = 0
  let fx = 18.6
  const today = toISODate(now)
  const push = (
    user_id: string,
    goal_id: string,
    amount: number,
    currency: Currency,
    date: Date,
    note: string | null,
  ) => {
    const iso = toISODate(date)
    if (iso > today) return
    const rate = Math.round(fx * 10_000) / 10_000
    contributions.push({
      id: `demo-${++seq}`,
      goal_id,
      user_id,
      amount,
      currency,
      fx_usd_mxn: rate,
      amount_mxn: toMXN(amount, currency, rate),
      date: iso,
      note,
      created_at: `${iso}T${String(10 + (seq % 12)).padStart(2, '0')}:00:00.000Z`,
    })
  }

  const first = addMonths(startOfMonth(now), -13)
  for (let m = 0; m < 14; m++) {
    const month = addMonths(first, m)
    const y = month.getFullYear()
    const mo = month.getMonth()
    // FX drifts in the 17–20 band.
    fx = Math.min(20, Math.max(17, fx + between(-0.45, 0.45)))
    const isDec = mo === 11

    // Daniel: 1–3 deposits in USD, bigger in December (aguinaldo-like bonus).
    const dCount = 1 + Math.floor(rand() * 3)
    for (let i = 0; i < dCount; i++) {
      const day = 1 + Math.floor(rand() * 27)
      const amount = Math.round(between(180, 850) / 10) * 10
      const goal = pickGoal(DANIEL_GOALS)
      push(DEMO_DANIEL, goal, amount, 'USD', new Date(y, mo, day), pick(DANIEL_NOTES))
    }
    // Flight money builds up before every December and is spent in December.
    if (mo >= 8 && mo <= 10) {
      push(DEMO_DANIEL, DEMO_DICIEMBRES, 350, 'USD', new Date(y, mo, 12), 'Para los vuelos')
      push(DEMO_ELLA, DEMO_DICIEMBRES, 2_500, 'MXN', new Date(y, mo, 14), null)
    }
    if (isDec) push(DEMO_DANIEL, DEMO_CASA, 1500, 'USD', new Date(y, mo, 20), 'Bono de fin de año')

    // Ella: 2–4 deposits in MXN, skipping a month now and then.
    if (rand() > 0.08) {
      const eCount = 2 + Math.floor(rand() * 3)
      for (let i = 0; i < eCount; i++) {
        const day = 1 + Math.floor(rand() * 27)
        const amount = Math.round(between(1_500, 8_500) / 50) * 50
        const goal = pickGoal(ELLA_GOALS)
        push(DEMO_ELLA, goal, amount, 'MXN', new Date(y, mo, day), pick(ELLA_NOTES))
      }
    }
    if (isDec) push(DEMO_ELLA, DEMO_BODA, 12_000, 'MXN', new Date(y, mo, 18), 'Aguinaldo')

    // Two withdrawals over the period: the December trip and a venue deposit.
    if (isDec)
      push(DEMO_DANIEL, DEMO_DICIEMBRES, -900, 'USD', new Date(y, mo, 3), 'Vuelos y regalos')
    if (m === 5)
      push(DEMO_ELLA, DEMO_BODA, -6_000, 'MXN', new Date(y, mo, 22), 'Anticipo del salón')
  }

  const settings: Settings = { move_date: '2026-01-15', return_date: '2031-01-15' }
  return { profiles, goals, contributions, settings }
}
