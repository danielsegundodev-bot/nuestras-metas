import { useState, type FormEvent, type ReactNode } from 'react'
import { useData } from '../data/store'
import { Button, inputClass } from './primitives'

function Mark() {
  // The app icon motif, small: two overlapping rings.
  return (
    <svg width="64" height="40" viewBox="0 0 64 40" aria-hidden fill="none" strokeWidth="5">
      <circle cx="22" cy="20" r="14" stroke="var(--goal-green)" />
      <circle cx="42" cy="20" r="14" stroke="var(--goal-orange)" />
    </svg>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[400px] flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <Mark />
      {children}
    </main>
  )
}

export function LoadingScreen() {
  return (
    <Centered>
      <p className="text-footnote text-ink-2" role="status">
        Cargando…
      </p>
    </Centered>
  )
}

export function LoginScreen() {
  const { signIn } = useData()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim())
      setSent(true)
    } catch {
      setError('No se pudo enviar el enlace. Revisa el correo e intenta de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <Centered>
        <div>
          <h1 className="text-title-2 font-bold tracking-[-0.02em]">Revisa tu correo</h1>
          <p className="mt-2 text-body text-ink-2">
            Enviamos un enlace a <span className="font-semibold text-ink">{email}</span>. Ábrelo en
            este dispositivo para entrar.
          </p>
        </div>
        <Button variant="plain" onClick={() => setSent(false)}>
          Usar otro correo
        </Button>
      </Centered>
    )
  }

  return (
    <Centered>
      <div>
        <h1 className="text-large-title font-bold leading-tight tracking-[-0.02em]">
          Nuestras metas
        </h1>
        <p className="mt-1 text-body text-ink-2">Ahorren juntos y vean cómo avanzan.</p>
      </div>
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-3 text-left">
        <label className="sr-only" htmlFor="email">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className={inputClass}
        />
        {error && (
          <p role="alert" className="px-1 text-footnote text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || !email.trim()} className="w-full">
          {busy ? 'Enviando…' : 'Enviar enlace'}
        </Button>
      </form>
    </Centered>
  )
}

export function DeniedScreen() {
  const { signOut, session } = useData()
  return (
    <Centered>
      <div>
        <h1 className="text-title-2 font-bold tracking-[-0.02em]">Esta cuenta no tiene acceso</h1>
        <p className="mt-2 text-body text-ink-2">
          {session?.email ? (
            <>
              Entraste con <span className="font-semibold text-ink">{session.email}</span>.{' '}
            </>
          ) : null}
          Esta app es solo para dos personas. Prueba con otro correo.
        </p>
      </div>
      <Button className="w-full" onClick={() => void signOut()}>
        Cerrar sesión
      </Button>
    </Centered>
  )
}

export function ErrorScreen({ message }: { message: string | null }) {
  const { refresh } = useData()
  return (
    <Centered>
      <div>
        <h1 className="text-title-2 font-bold tracking-[-0.02em]">No pudimos cargar tus metas</h1>
        <p className="mt-2 text-body text-ink-2">
          Revisa tu conexión e intenta de nuevo.
          {message ? <span className="mt-2 block text-caption">{message}</span> : null}
        </p>
      </div>
      <Button className="w-full" onClick={() => window.location.reload()}>
        Reintentar
      </Button>
      <Button variant="plain" onClick={() => void refresh()}>
        Recargar datos
      </Button>
    </Centered>
  )
}
