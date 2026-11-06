import { useState, type FormEvent } from 'react'
import { goalColor, parseAmount } from '../lib/rings'
import { GOAL_COLORS, type Goal, type ISODate } from '../lib/types'
import { Button, cx, Field, inputClass } from './primitives'

export interface GoalValues {
  name: string
  emoji: string
  target_mxn: number
  target_date: ISODate | null
  color: string
}

const EMOJI_IDEAS = ['🏡', '💍', '✈️', '🛟', '🛋️', '🚗', '🎓', '🎁']
const COLOR_NAMES = ['verde', 'naranja', 'turquesa', 'morado', 'amarillo']

/** Create/edit form shared by the goal sheet and settings. */
export function GoalForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Goal
  submitLabel: string
  onSubmit(v: GoalValues): Promise<void>
  onCancel?(): void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🎯')
  const [targetText, setTargetText] = useState(initial ? String(initial.target_mxn) : '')
  const [date, setDate] = useState(initial?.target_date ?? '')
  const [color, setColor] = useState(initial?.color ?? GOAL_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const target = parseAmount(targetText)
  const valid = name.trim() !== '' && emoji.trim() !== '' && target !== null && target > 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || target === null) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        emoji: emoji.trim(),
        target_mxn: target,
        target_date: date || null,
        color,
      })
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'No se pudo guardar la meta.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex gap-3">
        <Field label="Emoji">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={8}
            aria-label="Emoji"
            className={cx(inputClass, 'w-16 text-center text-title-3')}
          />
        </Field>
        <div className="min-w-0 flex-1">
          <Field label="Nombre">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="Casa, viaje, boda…"
              className={inputClass}
            />
          </Field>
        </div>
      </div>
      <div className="-mt-2 flex flex-wrap gap-1">
        {EMOJI_IDEAS.map((e) => (
          <button
            key={e}
            type="button"
            aria-label={`Usar ${e}`}
            onClick={() => setEmoji(e)}
            className="min-h-11 min-w-11 rounded-lg text-title-3"
          >
            {e}
          </button>
        ))}
      </div>
      <Field label="Meta en pesos (MXN)">
        <input
          inputMode="decimal"
          value={targetText}
          onChange={(e) => setTargetText(e.target.value)}
          placeholder="800,000"
          className={cx(inputClass, 'num')}
        />
      </Field>
      <Field label="Fecha objetivo (opcional)">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
      </Field>
      <div>
        <p id="color-label" className="mb-1.5 px-1 text-footnote text-ink-2">
          Color
        </p>
        <div role="radiogroup" aria-labelledby="color-label" className="flex flex-wrap gap-1">
          {GOAL_COLORS.map((c, i) => {
            const on = c.toLowerCase() === color.toLowerCase()
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={COLOR_NAMES[i]}
                onClick={() => setColor(c)}
                className="flex size-11 items-center justify-center rounded-full"
              >
                <span
                  className="size-8 rounded-full"
                  style={{
                    background: goalColor(c),
                    boxShadow: on ? '0 0 0 2px var(--canvas), 0 0 0 4px var(--ink)' : undefined,
                  }}
                />
              </button>
            )
          })}
        </div>
      </div>
      {error && (
        <p role="alert" className="px-1 text-footnote text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={!valid || saving} className="flex-1">
          {saving ? 'Guardando…' : submitLabel}
        </Button>
        {onCancel && (
          <Button variant="plain" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
