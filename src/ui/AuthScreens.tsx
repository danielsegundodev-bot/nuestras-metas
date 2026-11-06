import { useState, type FormEvent, type ReactNode } from 'react'
import { useData } from '../data/store'
import { InstallButton } from './InstallButton'
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

function Centered({ children, corner }: { children: ReactNode; corner?: ReactNode }) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[400px] flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      {corner && (
        <div className="absolute right-2 top-[calc(env(safe-area-inset-top)+4px)]">{corner}</div>
      )}
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
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : ''
      setError(
        msg.includes('invalid login credentials')
          ? 'El correo o la contraseña no coinciden.'
          : msg.includes('rate limit')
            ? 'Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.'
            : 'No se pudo entrar. Revisa tu conexión e intenta de nuevo.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Centered corner={<InstallButton />}>
      <div>
        <h1 className="text-large-title font-bold leading-tight tracking-[-0.02em]">
          Nuestras metas
        </h1>
        <p className="mt-1 text-body text-ink-2">Ahorren juntos y vean cómo avanzan.</p>
      </div>
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-3 text-left">
        <label className="sr-only" htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo"
          className={inputClass}
        />
        <label className="sr-only" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          className={inputClass}
        />
        {error && (
          <p role="alert" className="px-1 text-footnote text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || !email.trim() || !password} className="w-full">
          {busy ? 'Entrando…' : 'Entrar'}
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
