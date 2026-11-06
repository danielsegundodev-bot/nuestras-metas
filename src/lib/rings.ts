import { GOAL_COLORS } from './types'

export interface RingSpec {
  /** Radius of the ring's centerline. */
  r: number
  /** Stroke width. */
  stroke: number
}

export interface RingOptions {
  /** Padding between the outermost ring and the viewBox edge. */
  pad?: number
  /** Gap between neighbouring rings. */
  gap?: number
  /** Inner "hole" radius as a fraction of the outer radius (room for the center total). */
  hole?: number
  /** Thickest stroke allowed (few goals shouldn't make fat rings). */
  maxStroke?: number
}

/**
 * Geometry for `count` concentric rings inside a square viewBox of `size`. Ring 0 is the
 * outermost. Strokes shrink as rings are added so 5 goals still leave a readable center.
 */
export function ringGeometry(count: number, size: number, opts: RingOptions = {}): RingSpec[] {
  if (count <= 0) return []
  const { pad = 2, gap = 3, hole = 0.46, maxStroke = 22 } = opts
  const outer = size / 2 - pad
  const band = outer * (1 - hole)
  const stroke = Math.min(maxStroke, (band - (count - 1) * gap) / count)
  return Array.from({ length: count }, (_, i) => ({
    r: outer - stroke / 2 - i * (stroke + gap),
    stroke,
  }))
}

const PALETTE_VARS = [
  '--goal-green',
  '--goal-orange',
  '--goal-teal',
  '--goal-purple',
  '--goal-yellow',
]

/**
 * CSS color for a goal. Stored hex values from the default palette map to the theme
 * tokens (so dark mode gets its brighter variants); custom colors pass through.
 */
export function goalColor(hex: string): string {
  const i = GOAL_COLORS.findIndex((c) => c.toLowerCase() === hex.toLowerCase())
  return i >= 0 ? `var(${PALETTE_VARS[i]})` : hex
}

/** Parses what a person types into an amount field ("1,234.50", "$ 900"). null if invalid. */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[\s$,]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned) && !/^\.\d{1,2}$/.test(cleaned)) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}
