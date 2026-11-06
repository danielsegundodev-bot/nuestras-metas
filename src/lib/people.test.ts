import { describe, expect, it } from 'vitest'
import { initial, personColor } from './people'
import type { Profile } from './types'

const p = (user_id: string, created_at: string, color: string | null = null): Profile => ({
  user_id,
  display_name: user_id,
  currency: 'MXN',
  color,
  created_at,
})

describe('personColor', () => {
  it('falls back to --him / --her by profile age, honoring custom colors', () => {
    const profiles = [p('ella', '2026-01-02'), p('daniel', '2026-01-01')]
    expect(personColor(profiles, 'daniel')).toBe('var(--him)')
    expect(personColor(profiles, 'ella')).toBe('var(--her)')
    expect(
      personColor([p('ella', '2026-01-02', '#123456'), p('daniel', '2026-01-01')], 'ella'),
    ).toBe('#123456')
  })

  it('gets an initial', () => {
    expect(initial(' ella')).toBe('E')
    expect(initial('')).toBe('?')
  })
})
