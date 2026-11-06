import { useEffect, useState, type ReactNode } from 'react'
import { useData } from '../data/store'
import { formatDateTimeLong, formatDayLong, timestampDay } from '../lib/dates'
import { emWidth, formatMoney, formatMoneyAuto } from '../lib/money'
import { personColor } from '../lib/people'
import { Avatar, Button, Group } from './primitives'
import { Sheet } from './Sheet'
import { useUi, type SheetState } from './ui'
import { useRemoveContribution } from './useTxnActions'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-4 py-3">
      <p className="text-caption text-ink-2">{label}</p>
      <div className="mt-0.5 break-words text-body">{children}</div>
    </div>
  )
}

/** Detail of one movement, with edit / delete for the person's own entries. */
export function TransactionSheet({
  id,
  back,
}: {
  id: string
  back?: Exclude<SheetState, null>
}) {
  const { contributions, goals, profiles, session } = useData()
  const { closeSheet, openSheet } = useUi()
  const remove = useRemoveContribution()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const c = contributions.find((x) => x.id === id)
  useEffect(() => {
    if (!c) closeSheet()
  }, [c, closeSheet])
  if (!c) return null

  const person = profiles.find((p) => p.user_id === c.user_id)
  const goal = goals.find((g) => g.id === c.goal_id)
  const mine = c.user_id === session?.userId && !c.id.startsWith('tmp-')
  const withdrawal = c.amount < 0
  const amountText = formatMoney(c.amount, c.currency, { signed: true })
  const color = personColor(profiles, c.user_id)
  const createdDay = timestampDay(c.created_at)
  const otherDay = createdDay !== null && createdDay !== c.date
  const name = person?.display_name ?? 'la otra persona'

  return (
    <Sheet
      title={withdrawal ? 'Retiro' : 'Ahorro'}
      onClose={closeSheet}
      onBack={back ? () => openSheet(back) : undefined}
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-surface px-4 py-4" style={{ containerType: 'inline-size' }}>
          {withdrawal && (
            <span className="mb-1 inline-block rounded-full bg-danger/15 px-2.5 py-0.5 text-caption font-semibold text-danger">
              Retiro
            </span>
          )}
          <p
            className={`num whitespace-nowrap font-bold leading-tight tracking-[-0.02em] ${withdrawal ? 'text-danger' : ''}`}
            style={{ fontSize: `min(40px, ${(100 / emWidth(amountText)).toFixed(2)}cqw)` }}
          >
            {amountText}
          </p>
          {c.currency === 'USD' && (
            <p className="num mt-1 break-words text-footnote text-ink-2">
              ≈ {formatMoneyAuto(c.amount_mxn, 'MXN', { signed: true })}
              {c.fx_usd_mxn > 0 && ` · $${c.fx_usd_mxn.toFixed(2)} por dólar`}
            </p>
          )}
        </div>

        <Group>
          <Row label="Meta">
            {goal ? (
              <button
                type="button"
                onClick={() => openSheet({ type: 'goal', goalId: goal.id })}
                className="-my-2 flex min-h-11 w-full items-center gap-2 text-left text-accent"
              >
                <span aria-hidden>{goal.emoji}</span>
                <span className="min-w-0 flex-1 break-words">{goal.name}</span>
                <span aria-hidden className="text-ink-2">
                  ›
                </span>
              </button>
            ) : (
              <span className="text-ink-2">Meta eliminada</span>
            )}
          </Row>
          <Row label="Quién">
            <span className="flex items-center gap-2">
              <Avatar name={person?.display_name ?? '?'} color={color} size={28} />
              <span className="font-semibold" style={{ color }}>
                {person?.display_name ?? 'Sin nombre'}
              </span>
            </span>
          </Row>
          <Row label="Fecha y hora">
            {formatDateTimeLong(c.created_at) || formatDayLong(c.date)}
            {otherDay && createdDay && (
              <span className="mt-1 block text-footnote text-ink-2">
                Registrado el {formatDayLong(createdDay)} para el día {formatDayLong(c.date)}
              </span>
            )}
          </Row>
          <Row label="Nota">
            {c.note ? <span>{c.note}</span> : <span className="text-ink-2">Sin nota</span>}
          </Row>
        </Group>

        {mine ? (
          confirming ? (
            <div className="rounded-xl bg-surface px-4 py-3">
              <p className="text-body">¿Eliminar este movimiento?</p>
              <p className="text-footnote text-ink-2">Podrás deshacerlo unos segundos.</p>
              <div className="mt-2 flex gap-2">
                <Button variant="plain" className="flex-1" onClick={() => setConfirming(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    const ok = await remove(c)
                    if (ok) closeSheet()
                    else setBusy(false)
                  }}
                >
                  Sí, eliminar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button onClick={() => openSheet({ type: 'add', editing: c })}>Editar</Button>
              <Button variant="danger" onClick={() => setConfirming(true)}>
                Eliminar
              </Button>
            </div>
          )
        ) : (
          <p className="px-1 text-center text-footnote text-ink-2">
            Solo {name} puede editar este movimiento.
          </p>
        )}
      </div>
    </Sheet>
  )
}
