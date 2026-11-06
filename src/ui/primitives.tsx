import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { initial } from '../lib/people'

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ')

export interface SegOption<T extends string> {
  value: T
  label: ReactNode
  disabled?: boolean
}

/** iOS-style segmented control. `compact` is the 36px header variant (hit area stays 44px). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  compact = false,
  className,
}: {
  options: SegOption<T>[]
  value: T
  onChange(v: T): void
  label: string
  compact?: boolean
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('flex rounded-[10px] bg-fill p-0.5', compact ? 'h-9' : 'h-11', className)}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cx(
              'relative flex-1 rounded-[8px] px-3 text-footnote font-semibold transition-colors',
              compact && 'before:absolute before:inset-x-0 before:-inset-y-1 before:content-[""]',
              active ? 'bg-segment text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : 'text-ink-2',
              o.disabled && 'opacity-40',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Button({
  variant = 'primary',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'plain' | 'danger' }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-body font-semibold transition-opacity disabled:opacity-40',
        variant === 'primary' && 'bg-accent text-on-accent',
        variant === 'plain' && 'text-accent',
        variant === 'danger' && 'text-danger',
        className,
      )}
    />
  )
}

/** Sentence-case section title above a group (never all-caps). */
export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex min-h-8 items-end justify-between gap-3 px-1">
      <h2 className="text-title-3 font-semibold tracking-[-0.01em]">{children}</h2>
      {aside}
    </div>
  )
}

/** Grouped inset container (iOS list). Children are rows; hairlines come from divide-y. */
export function Group({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx('divide-y divide-separator overflow-hidden rounded-xl bg-surface', className)}
    >
      {children}
    </div>
  )
}

/** Person avatar: initial on a tint, ringed in the person's color (color = who, never goal). */
export function Avatar({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="num inline-flex shrink-0 items-center justify-center rounded-full font-bold text-ink"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `color-mix(in srgb, ${color} 18%, transparent)`,
        boxShadow: `inset 0 0 0 2px ${color}`,
      }}
    >
      {initial(name)}
    </span>
  )
}

export const inputClass =
  'min-h-11 w-full rounded-lg bg-surface px-3 text-body text-ink placeholder:text-ink-2 outline-none focus-visible:outline-2 focus-visible:outline-accent'

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-footnote text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block px-1 text-caption text-ink-2">{hint}</span>}
    </label>
  )
}
