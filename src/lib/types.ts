export type Currency = 'MXN' | 'USD'

export const CURRENCIES: readonly Currency[] = ['MXN', 'USD'] as const

/** ISO calendar date, `yyyy-MM-dd`. */
export type ISODate = string

export interface Profile {
  user_id: string
  display_name: string
  currency: Currency
  /** CSS color for "who contributed"; null → fall back to --him / --her. */
  color: string | null
  /** Emoji shown as the avatar; null → initial. */
  avatar: string | null
  created_at: string
}

export interface Goal {
  id: string
  name: string
  emoji: string
  target_mxn: number
  target_date: ISODate | null
  color: string
  sort: number
  archived: boolean
  created_at: string
}

export interface Contribution {
  id: string
  goal_id: string
  user_id: string
  /** Positive = deposit, negative = withdrawal, in `currency`. */
  amount: number
  currency: Currency
  /** USD→MXN rate at time of entry. */
  fx_usd_mxn: number
  /** MXN value (computed by the DB; computed locally in demo mode). */
  amount_mxn: number
  date: ISODate
  note: string | null
  created_at: string
}

export interface Settings {
  move_date: ISODate | null
  return_date: ISODate | null
}

export interface NewContribution {
  goal_id: string
  amount: number
  currency: Currency
  fx_usd_mxn: number
  date?: ISODate
  note?: string | null
}

export type ContributionPatch = Partial<
  Pick<Contribution, 'goal_id' | 'amount' | 'currency' | 'fx_usd_mxn' | 'date' | 'note'>
>

export interface NewGoal {
  name: string
  emoji: string
  target_mxn: number
  color: string
  target_date?: ISODate | null
  sort?: number
}

export type GoalPatch = Partial<Omit<Goal, 'id' | 'created_at'>>

export type ProfilePatch = Partial<Pick<Profile, 'display_name' | 'currency' | 'color' | 'avatar'>>

/** Default goal palette (DESIGN.md). */
export const GOAL_COLORS = ['#34C759', '#FF9500', '#30B0C7', '#AF52DE', '#FFCC00'] as const
