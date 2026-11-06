import { useEffect, useRef, useState } from 'react'
import { useData } from '../data/store'
import { orderProfiles } from '../lib/people'
import { goalColor } from '../lib/rings'
import type { Currency, Goal } from '../lib/types'
import { GoalForm } from './GoalForm'
import { Button, Field, Group, inputClass, SectionTitle, Segmented } from './primitives'
import { Sheet } from './Sheet'
import { errorMessage, useUi } from './ui'

const PERSON_COLORS = ['#5856D6', '#FF2D55', '#32ADE6', '#A2845E']

function Arrow({ dir }: { dir: 'up' | 'down' }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={dir === 'up' ? 'M3 10l5-5 5 5' : 'M3 6l5 5 5-5'} />
    </svg>
  )
}

export function SettingsSheet({ focus }: { focus?: 'goals' }) {
  const {
    me,
    profiles,
    goals,
    settings,
    isDemo,
    updateProfile,
    updateSettings,
    createGoal,
    updateGoal,
    signOut,
    resetDemo,
  } = useData()
  const { closeSheet, toast } = useUi()
  const goalsRef = useRef<HTMLElement>(null)
  const [name, setName] = useState(me?.display_name ?? '')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (focus === 'goals') goalsRef.current?.scrollIntoView({ block: 'start' })
  }, [focus])

  const active = goals.filter((g) => !g.archived)
  const archived = goals.filter((g) => g.archived)

  async function run(fn: () => Promise<unknown>, ok?: string) {
    try {
      await fn()
      if (ok) toast(ok)
    } catch (e) {
      toast(errorMessage(e, 'No se pudo guardar. Intenta de nuevo.'), { tone: 'error' })
    }
  }

  async function move(g: Goal, delta: -1 | 1) {
    const order = active.map((x) => x.id)
    const i = order.indexOf(g.id)
    const j = i + delta
    if (j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j]!, order[i]!]
    await run(async () => {
      for (const [idx, id] of order.entries()) {
        const current = goals.find((x) => x.id === id)
        if (current && current.sort !== idx) await updateGoal(id, { sort: idx })
      }
    })
  }

  const myIndex = orderProfiles(profiles).findIndex((p) => p.user_id === me?.user_id)
  const effectiveColor = me?.color ?? (myIndex === 1 ? '#FF2D55' : '#5856D6')
  const nextSort = goals.reduce((m, g) => Math.max(m, g.sort), -1) + 1

  return (
    <Sheet title="Ajustes" onClose={closeSheet}>
      <div className="flex flex-col gap-7">
        <section aria-label="Mi perfil" className="flex flex-col gap-4">
          <SectionTitle>Mi perfil</SectionTitle>
          <Field label="Nombre">
            <input
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                const v = name.trim()
                if (v && v !== me?.display_name)
                  void run(() => updateProfile({ display_name: v }), 'Guardado')
                else setName(me?.display_name ?? '')
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className={inputClass}
            />
          </Field>
          <div>
            <p className="mb-1.5 px-1 text-footnote text-ink-2">Moneda en la que ahorras</p>
            <Segmented<Currency>
              label="Moneda"
              value={me?.currency ?? 'MXN'}
              onChange={(c) => void run(() => updateProfile({ currency: c }), 'Guardado')}
              options={[
                { value: 'MXN', label: 'Pesos (MXN)' },
                { value: 'USD', label: 'Dólares (USD)' },
              ]}
            />
          </div>
          <div>
            <p id="my-color" className="mb-1.5 px-1 text-footnote text-ink-2">
              Tu color en gráficas y movimientos
            </p>
            <div role="radiogroup" aria-labelledby="my-color" className="flex flex-wrap gap-1">
              {PERSON_COLORS.map((c) => {
                const on = effectiveColor.toLowerCase() === c.toLowerCase()
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`Color ${c}`}
                    onClick={() => void run(() => updateProfile({ color: c }), 'Guardado')}
                    className="flex size-11 items-center justify-center rounded-full"
                  >
                    <span
                      className="size-8 rounded-full"
                      style={{
                        background: c,
                        boxShadow: on ? '0 0 0 2px var(--canvas), 0 0 0 4px var(--ink)' : undefined,
                      }}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section aria-label="Mudanza">
          <SectionTitle>Mudanza</SectionTitle>
          <Group>
            <label className="flex min-h-11 items-center justify-between gap-4 px-4">
              <span className="text-body">Me voy</span>
              <input
                type="date"
                value={settings.move_date ?? ''}
                onChange={(e) =>
                  void run(() => updateSettings({ move_date: e.target.value || null }), 'Guardado')
                }
                className="min-h-11 bg-transparent text-right text-body text-ink outline-none"
              />
            </label>
            <label className="flex min-h-11 items-center justify-between gap-4 px-4">
              <span className="text-body">Regreso</span>
              <input
                type="date"
                value={settings.return_date ?? ''}
                onChange={(e) =>
                  void run(
                    () => updateSettings({ return_date: e.target.value || null }),
                    'Guardado',
                  )
                }
                className="min-h-11 bg-transparent text-right text-body text-ink outline-none"
              />
            </label>
          </Group>
          <p className="mt-1.5 px-1 text-caption text-ink-2">
            Con estas fechas contamos los diciembres que pasarán juntos.
          </p>
        </section>

        <section ref={goalsRef} aria-label="Metas" className="scroll-mt-2">
          <SectionTitle>Metas</SectionTitle>
          {active.length > 0 && (
            <Group>
              {active.map((g, i) => (
                <div key={g.id} className="flex min-h-11 items-center gap-1 py-1 pl-4 pr-1">
                  <span
                    aria-hidden
                    className="mr-2 size-3 shrink-0 rounded-full"
                    style={{ background: goalColor(g.color) }}
                  />
                  <span className="min-w-0 flex-1 text-body leading-tight">
                    <span aria-hidden>{g.emoji}</span> {g.name}
                  </span>
                  <button
                    type="button"
                    aria-label={`Subir ${g.name}`}
                    disabled={i === 0}
                    onClick={() => void move(g, -1)}
                    className="flex min-h-11 min-w-11 items-center justify-center text-accent disabled:text-ink-2/40"
                  >
                    <Arrow dir="up" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Bajar ${g.name}`}
                    disabled={i === active.length - 1}
                    onClick={() => void move(g, 1)}
                    className="flex min-h-11 min-w-11 items-center justify-center text-accent disabled:text-ink-2/40"
                  >
                    <Arrow dir="down" />
                  </button>
                  <Button
                    variant="plain"
                    className="px-2 text-footnote"
                    onClick={() =>
                      void run(() => updateGoal(g.id, { archived: true }), 'Meta archivada')
                    }
                  >
                    Archivar
                  </Button>
                </div>
              ))}
            </Group>
          )}
          <p className="mt-1.5 px-1 text-caption text-ink-2">
            El orden aquí es el de los anillos: la primera meta es el anillo de afuera.
          </p>

          <div className="mt-3">
            {adding ? (
              <GoalForm
                submitLabel="Agregar meta"
                onCancel={() => setAdding(false)}
                onSubmit={async (v) => {
                  await createGoal({ ...v, sort: nextSort })
                  toast('Meta agregada')
                  setAdding(false)
                }}
              />
            ) : (
              <Button variant="plain" className="-ml-3" onClick={() => setAdding(true)}>
                Agregar meta
              </Button>
            )}
          </div>

          {archived.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 px-1 text-footnote text-ink-2">Archivadas</p>
              <Group>
                {archived.map((g) => (
                  <div key={g.id} className="flex min-h-11 items-center gap-2 py-1 pl-4 pr-1">
                    <span className="min-w-0 flex-1 truncate text-body text-ink-2">
                      <span aria-hidden>{g.emoji}</span> {g.name}
                    </span>
                    <Button
                      variant="plain"
                      className="px-3 text-footnote"
                      onClick={() =>
                        void run(() => updateGoal(g.id, { archived: false }), 'Meta restaurada')
                      }
                    >
                      Restaurar
                    </Button>
                  </div>
                ))}
              </Group>
            </div>
          )}
        </section>

        <section aria-label="Cuenta">
          <Group>
            {isDemo ? (
              <button
                type="button"
                onClick={() => {
                  resetDemo()
                  toast('Datos de demo restablecidos')
                }}
                className="flex min-h-11 w-full items-center px-4 text-left text-body text-danger"
              >
                Restablecer datos de demo
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex min-h-11 w-full items-center px-4 text-left text-body text-danger"
              >
                Cerrar sesión
              </button>
            )}
          </Group>
        </section>
      </div>
    </Sheet>
  )
}
