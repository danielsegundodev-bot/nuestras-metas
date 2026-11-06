import type { Profile } from './types'

/** Profiles in a stable order (oldest first). Index 0 → --him, index 1 → --her by default. */
export const orderProfiles = (profiles: readonly Profile[]): Profile[] =>
  [...profiles].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.user_id.localeCompare(b.user_id),
  )

/**
 * CSS color for a person ("who contributed" only — never for goals). Uses the profile's
 * own color when set, else the --him / --her tokens by profile order.
 */
export function personColor(profiles: readonly Profile[], userId: string): string {
  const ordered = orderProfiles(profiles)
  const idx = ordered.findIndex((p) => p.user_id === userId)
  const own = ordered[idx]?.color
  if (own) return own
  return idx === 1 ? 'var(--her)' : 'var(--him)'
}

/** First letter for avatars. */
export const initial = (name: string): string => (name.trim()[0] ?? '?').toLocaleUpperCase('es-MX')
