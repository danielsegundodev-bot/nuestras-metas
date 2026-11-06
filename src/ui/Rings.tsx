import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { goalColor, ringGeometry } from '../lib/rings'

export interface RingItem {
  id: string
  /** Saved / target ratio. Above 1 the ring is full and a darker second lap overlaps it. */
  progress: number
  color: string
  label: string
}

const SIZE = 300

/**
 * Concentric progress rings, hand-rolled SVG. Ring 0 is the outermost. Sweeps from 0 on
 * mount and animates to new values on change (instant under reduced motion).
 */
export function Rings({
  items,
  hole = 0.46,
  maxStroke,
  center,
  className,
  label,
}: {
  items: RingItem[]
  hole?: number
  maxStroke?: number
  center?: ReactNode
  className?: string
  label: string
}) {
  const reduce = useReducedMotion()
  const geo = ringGeometry(items.length || 1, SIZE, { hole, maxStroke })
  return (
    <div className={className} style={{ containerType: 'inline-size' }}>
      <div className="relative aspect-square w-full">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={label}
        >
          {items.length === 0 && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={geo[0]!.r}
              fill="none"
              stroke="var(--ink-2)"
              strokeOpacity={0.18}
              strokeWidth={geo[0]!.stroke}
            />
          )}
          {items.map((it, i) => {
            const g = geo[i]!
            const color = goalColor(it.color)
            const raw = Math.min(1000, Math.max(0, it.progress))
            const p = Math.min(1, raw)
            // Past one lap, the darker second lap shows the fraction beyond a whole number of laps.
            const extra = raw - 1
            const p2 = extra <= 0 ? 0 : Math.max(0.04, Number.isInteger(extra) ? 0.999 : extra % 1)
            const dark = `color-mix(in srgb, ${color} 62%, black)`
            return (
              <g key={it.id}>
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={g.r}
                  fill="none"
                  stroke={color}
                  strokeOpacity={0.18}
                  strokeWidth={g.stroke}
                />
                <motion.circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={g.r}
                  fill="none"
                  stroke={color}
                  strokeWidth={g.stroke}
                  strokeLinecap="round"
                  initial={{ pathLength: reduce ? p : 0, opacity: p > 0 ? 1 : 0 }}
                  animate={{ pathLength: p, opacity: p > 0 ? 1 : 0 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }
                  }
                />
                {p2 > 0 && (
                  <motion.circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={g.r}
                    fill="none"
                    stroke={dark}
                    strokeWidth={g.stroke}
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 2px rgb(0 0 0 / 0.35))' }}
                    initial={{ pathLength: reduce ? p2 : 0 }}
                    animate={{ pathLength: p2 }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.9 + i * 0.08 }
                    }
                  />
                )}
              </g>
            )
          })}
        </svg>
        {center && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {center}
          </div>
        )}
      </div>
    </div>
  )
}
