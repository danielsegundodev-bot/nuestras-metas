import { useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useData } from '../data/store'
import { toISODate } from '../lib/dates'
import { formatAmountInput, formatMoneyAuto, toMXN } from '../lib/money'
import { goalColor, parseAmount } from '../lib/rings'
import type { Contribution, Currency } from '../lib/types'
import { Button, cx, Field, inputClass, Segmented } from './primitives'
import { Sheet } from './Sheet'
import { errorMessage, useUi } from './ui'

type Kind = 'deposit' | 'withdrawal'

/** Sanity bounds for a typed USD→MXN rate. */
const MIN_RATE = 5
const MAX_RATE = 50

/** Add (or edit) a contribution. Bottom sheet. */
export function AddSheet({ goalId, editing }: { goalId?: string; editing?: Contribution }) {
  const { goals, me, fx, addContribution, updateContribution } = useData()
  const { closeSheet, toast } = useUi()

  const choices = useMemo(
    () => goals.filter((g) => !g.archived || g.id === editing?.goal_id),
    [goals, editing],
  )
  const [kind, setKind] = useState<Kind>(editing && editing.amount < 0 ? 'withdrawal' : 'deposit')
  const [amountText, setAmountText] = useState(
    editing ? formatAmountInput(String(Math.abs(editing.amount))).text : '',
  )
  const amountRef = useRef<HTMLInputElement>(null)
  const caretRef = useRef<number | null>(null)
  const [currency, setCurrency] = useState<Currency>(editing?.currency ?? me?.currency ?? 'MXN')
  const [pickedGoal, setPickedGoal] = useState<string | null>(
    editing?.goal_id ?? goalId ?? choices[0]?.id ?? null,
  )
  const [date, setDate] = useState(() => editing?.date ?? toISODate(new Date()))
  const [note, setNote] = useState(editing?.note ?? '')
  const [rateText, setRateText] = useState('')
  const [customRate, setCustomRate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-place the caret after live thousands separators change the text length.
  useLayoutEffect(() => {
    if (caretRef.current !== null && amountRef.current) {
      amountRef.current.setSelectionRange(caretRef.current, caretRef.current)
      caretRef.current = null
    }
  })

  function onAmountChange(e: ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value
    let caret = e.target.selectionStart ?? raw.length
    // Some keyboards (es-ES) type "," as the decimal mark.
    if ((e.nativeEvent as InputEvent).data === ',' && !raw.includes('.')) {
      raw = `${raw.slice(0, caret - 1)}.${raw.slice(caret)}`
    }
    const f = formatAmountInput(raw, caret)
    caret = f.caret
    caretRef.current = caret
    setAmountText(f.text)
  }

  // Long numbers shrink to stay inside the card instead of scrolling sideways.
  const amountFont = Math.max(22, Math.min(48, Math.floor(430 / Math.max(amountText.length, 1))))

  const amount = parseAmount(amountText)
  // Editing keeps the rate of the day the entry was made; new entries use today's rate.
  const knownRate =
    editing && editing.currency === currency ? editing.fx_usd_mxn : (fx?.rate ?? null)
  const typedRate = Number(rateText.replace(',', '.'))
  const askRate = currency === 'USD' && knownRate === null
  const typingRate = currency === 'USD' && (customRate || askRate)
  const typedOk = rateText.trim() !== '' && typedRate >= MIN_RATE && typedRate <= MAX_RATE
  const rate = typingRate ? (typedOk ? typedRate : null) : knownRate
  const rateOk = currency === 'MXN' || (rate !== null && rate > 0)
  const valid = amount !== null && amount > 0 && pickedGoal !== null && rateOk && date !== ''
  const mxnEquivalent =
    amount !== null && amount > 0 && currency === 'USD' && rate ? toMXN(amount, 'USD', rate) : null

  const rateIsToday = !editing || editing.currency !== currency
  const submitLabel = editing
    ? 'Guardar cambios'
    : kind === 'withdrawal'
      ? 'Registrar retiro'
      : 'Agregar ahorro'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid || amount === null || pickedGoal === null || saving) return
    setSaving(true)
    setError(null)
    const signed = kind === 'withdrawal' ? -amount : amount
    const fxRate = rate ?? 1
    try {
      if (editing) {
        await updateContribution(editing.id, {
          goal_id: pickedGoal,
          amount: signed,
          currency,
          fx_usd_mxn: fxRate,
          date,
          note: note.trim() || null,
        })
        toast('Movimiento actualizado')
      } else {
        await addContribution({
          goal_id: pickedGoal,
          amount: signed,
          currency,
          fx_usd_mxn: fxRate,
          date,
          note: note.trim() || null,
        })
        toast(kind === 'withdrawal' ? 'Retiro registrado' : 'Ahorro agregado')
      }
      closeSheet()
    } catch (err) {
      setError(errorMessage(err, 'No se pudo guardar. Revisa tu conexión e intenta de nuevo.'))
      setSaving(false)
    }
  }

  return (
    <Sheet title={editing ? 'Editar movimiento' : 'Agregar ahorro'} onClose={closeSheet}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Segmented<Kind>
          label="Tipo de movimiento"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'deposit', label: 'Ahorro' },
            { value: 'withdrawal', label: 'Retiro' },
          ]}
        />

        <div className="rounded-xl bg-surface px-4 pb-3 pt-3">
          <label htmlFor="amount" className="text-footnote text-ink-2">
            Monto
          </label>
          <input
            id="amount"
            ref={amountRef}
            inputMode="decimal"
            autoComplete="off"
            autoFocus={!editing}
            placeholder="0"
            value={amountText}
            onChange={onAmountChange}
            style={{ fontSize: amountFont }}
            aria-invalid={amountText !== '' && amount === null}
            className="num block w-full min-w-0 bg-transparent font-bold leading-tight tracking-[-0.02em] text-ink outline-none placeholder:text-ink-2/50"
          />
          <p className="num mt-0.5 min-h-5 text-footnote text-ink-2" aria-live="polite">
            {mxnEquivalent !== null
              ? `Son ${formatMoneyAuto(mxnEquivalent, 'MXN')}`
              : amountText !== '' && amount === null
                ? 'Escribe solo números, por ejemplo 1500 o 1,500.50'
                : ''}
          </p>
          <Segmented<Currency>
            label="Moneda"
            value={currency}
            onChange={setCurrency}
            className="mt-3"
            options={[
              { value: 'MXN', label: 'MXN' },
              { value: 'USD', label: 'USD' },
            ]}
          />
        </div>

        {currency === 'USD' && !typingRate && knownRate !== null && (
          <p className="num -mt-2 flex flex-wrap items-center gap-x-2 px-1 text-caption text-ink-2">
            <span>
              1 USD = ${knownRate.toFixed(2)} ·{' '}
              {rateIsToday ? 'tipo de cambio de hoy' : 'tipo de cambio guardado'}
            </span>
            <button
              type="button"
              onClick={() => {
                setRateText(knownRate.toFixed(2))
                setCustomRate(true)
              }}
              className="-my-3 min-h-11 px-1 font-semibold text-accent"
            >
              Cambiar
            </button>
          </p>
        )}
        {typingRate && (
          <Field
            label="Tipo de cambio (pesos por 1 dólar)"
            hint={
              askRate
                ? 'No pudimos obtener el tipo de cambio. Escríbelo para continuar.'
                : 'Solo se usa en este movimiento.'
            }
          >
            <input
              inputMode="decimal"
              placeholder="18.50"
              autoFocus={customRate}
              value={rateText}
              onChange={(e) => setRateText(e.target.value)}
              aria-invalid={rateText.trim() !== '' && !typedOk}
              className={cx(inputClass, 'num')}
            />
            {rateText.trim() !== '' && !typedOk && (
              <span role="alert" className="mt-1.5 block px-1 text-caption text-danger">
                Escribe un número entre {MIN_RATE} y {MAX_RATE}, por ejemplo 18.50.
              </span>
            )}
            {customRate && knownRate !== null && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setCustomRate(false)
                }}
                className="mt-1 min-h-11 px-1 text-caption font-semibold text-accent"
              >
                Usar el automático (${knownRate.toFixed(2)})
              </button>
            )}
          </Field>
        )}

        <div>
          <p id="goal-label" className="mb-1.5 px-1 text-footnote text-ink-2">
            Meta
          </p>
          {choices.length === 0 ? (
            <p className="rounded-xl bg-surface px-4 py-3 text-footnote text-ink-2">
              Primero crea una meta en Ajustes.
            </p>
          ) : (
            <div role="radiogroup" aria-labelledby="goal-label" className="flex flex-wrap gap-2">
              {choices.map((g) => {
                const on = g.id === pickedGoal
                const color = goalColor(g.color)
                return (
                  <button
                    key={g.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPickedGoal(g.id)}
                    className="min-h-11 rounded-full bg-surface px-4 text-footnote font-semibold"
                    style={
                      on
                        ? {
                            background: `color-mix(in srgb, ${color} 20%, var(--surface))`,
                            boxShadow: `inset 0 0 0 2px ${color}`,
                          }
                        : undefined
                    }
                  >
                    <span aria-hidden>{g.emoji}</span> {g.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="divide-y divide-separator overflow-hidden rounded-xl bg-surface">
          <label className="flex min-h-11 items-center justify-between gap-4 px-4">
            <span className="text-body">Fecha</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-h-11 bg-transparent text-right text-body text-ink outline-none"
            />
          </label>
          <label className="flex min-h-11 items-center gap-4 px-4">
            <span className="text-body">Nota</span>
            <input
              value={note}
              maxLength={120}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opcional"
              className="min-h-11 min-w-0 flex-1 bg-transparent text-right text-body text-ink outline-none placeholder:text-ink-2"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="px-1 text-footnote text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={!valid || saving} className="w-full">
          {saving ? 'Guardando…' : submitLabel}
        </Button>
      </form>
    </Sheet>
  )
}
