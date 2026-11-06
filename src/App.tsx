// Phase 1 wiring shell — throwaway. The real UI lands in phase 2.
import { useMemo, useState, type FormEvent } from 'react'
import { useData } from './data/store'
import { formatMoney } from './lib/money'
import { progressPct, summarizeGoals, totalSaved } from './lib/stats'

function Login() {
  const { signIn } = useData()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await signIn(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el enlace')
    }
  }

  if (sent) return <p className="p-4">Revisa tu correo</p>
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 p-4">
      <h1 className="text-large-title font-semibold">Nuestras metas</h1>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@correo.com"
        className="rounded-lg bg-surface p-3"
      />
      <button type="submit" className="rounded-lg bg-accent p-3 text-white">
        Enviar enlace
      </button>
      {error && <p className="text-her">{error}</p>}
    </form>
  )
}

function Dashboard() {
  const { goals, contributions, isDemo, resetDemo, fx, signOut } = useData()
  const summaries = useMemo(() => summarizeGoals(goals, contributions), [goals, contributions])
  const total = totalSaved(contributions)

  return (
    <main className="mx-auto max-w-[640px] p-4">
      {isDemo && (
        <p className="mb-3 rounded-lg bg-surface p-2 text-caption text-ink-2">
          Modo demo ·{' '}
          <button type="button" className="text-accent" onClick={resetDemo}>
            Restablecer datos
          </button>
        </p>
      )}
      <h1 className="text-large-title font-semibold">Nuestras metas</h1>
      <p className="num text-title-2">{formatMoney(total, 'MXN')} juntos</p>
      <ul className="mt-4 divide-y divide-separator rounded-xl bg-surface">
        {summaries.map(({ goal, saved }) => (
          <li key={goal.id} className="p-3">
            {goal.emoji} {goal.name} — {progressPct(saved, goal.target_mxn)}% ·{' '}
            <span className="num">
              {formatMoney(saved, 'MXN')} de {formatMoney(goal.target_mxn, 'MXN')}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-caption text-ink-2">
        {contributions.length} movimientos · USD→MXN{' '}
        {fx ? `${fx.rate} (${fx.asOf}${fx.stale ? ', sin conexión' : ''})` : 'sin tipo de cambio'}
      </p>
      {!isDemo && (
        <button type="button" className="mt-4 text-accent" onClick={() => void signOut()}>
          Cerrar sesión
        </button>
      )}
    </main>
  )
}

export default function App() {
  const { status, error, signOut } = useData()
  switch (status) {
    case 'loading':
      return <p className="p-4 text-ink-2">Cargando…</p>
    case 'signedOut':
      return <Login />
    case 'denied':
      return (
        <div className="p-4">
          <p>Esta cuenta no tiene acceso</p>
          <button type="button" className="mt-2 text-accent" onClick={() => void signOut()}>
            Cerrar sesión
          </button>
        </div>
      )
    case 'error':
      return <p className="p-4 text-her">Algo salió mal: {error}</p>
    case 'ready':
      return <Dashboard />
  }
}
