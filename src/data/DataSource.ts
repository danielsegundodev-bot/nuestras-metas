import type {
  Contribution,
  ContributionPatch,
  Goal,
  GoalPatch,
  NewContribution,
  NewGoal,
  Profile,
  ProfilePatch,
  Settings,
} from '../lib/types'

export interface Session {
  userId: string
  email: string | null
}

export type ChangeTable = 'contributions' | 'goals' | 'profiles' | 'settings'

export interface ChangeEvent {
  table: ChangeTable
}

/** Single data-access boundary. Implemented by Supabase and by the local demo adapter. */
export interface DataSource {
  readonly kind: 'supabase' | 'demo'

  // Auth
  getSession(): Promise<Session | null>
  /** Returns an unsubscribe function. */
  onAuthChange(cb: (session: Session | null) => void): () => void
  /** Email + password sign-in (users are created by hand in the Supabase dashboard). */
  signInWithPassword(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  /** Whether the signed-in email is in `allowed_emails`. */
  isAllowed(): Promise<boolean>

  // Profiles
  /** Current user's profile. */
  getProfile(): Promise<Profile | null>
  updateProfile(patch: ProfilePatch): Promise<Profile>
  listProfiles(): Promise<Profile[]>

  // Goals
  listGoals(): Promise<Goal[]>
  createGoal(goal: NewGoal): Promise<Goal>
  updateGoal(id: string, patch: GoalPatch): Promise<Goal>

  // Contributions (newest first)
  listContributions(): Promise<Contribution[]>
  addContribution(c: NewContribution): Promise<Contribution>
  updateContribution(id: string, patch: ContributionPatch): Promise<Contribution>
  deleteContribution(id: string): Promise<void>

  // Settings
  getSettings(): Promise<Settings>
  updateSettings(patch: Partial<Settings>): Promise<Settings>

  /** Live changes (realtime / other tabs). Returns an unsubscribe function. */
  subscribe(onChange: (e: ChangeEvent) => void): () => void
}

/** Newest first: by date, then creation time. */
export const byNewest = (a: Contribution, b: Contribution): number =>
  b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
