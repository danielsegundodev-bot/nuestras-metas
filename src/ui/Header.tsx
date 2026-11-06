import { useEffect, useRef, useState } from 'react'
import { useData } from '../data/store'
import { personColor } from '../lib/people'
import type { Currency } from '../lib/types'
import { InstallButton } from './InstallButton'
import { Avatar, Segmented } from './primitives'
import { useUi } from './ui'

function AvatarMenu() {
  const { me, profiles, isDemo, signOut } = useData()
  const { openSheet } = useUi()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const item = 'flex min-h-11 w-full items-center px-4 text-left text-body'
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label="Menú de cuenta"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex size-11 items-center justify-center rounded-full"
      >
        <Avatar
          name={me?.display_name ?? '?'}
          color={me ? personColor(profiles, me.user_id) : 'var(--him)'}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-52 divide-y divide-separator overflow-hidden rounded-xl bg-surface shadow-[0_8px_30px_rgb(0_0_0/0.2)] ring-1 ring-separator"
        >
          <button
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false)
              openSheet({ type: 'settings' })
            }}
          >
            Mi perfil
          </button>
          <button
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false)
              openSheet({ type: 'settings', focus: 'goals' })
            }}
          >
            Metas
          </button>
          {!isDemo && (
            <button
              role="menuitem"
              className={`${item} text-danger`}
              onClick={() => void signOut()}
            >
              Cerrar sesión
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function Header() {
  const { fx } = useData()
  const { currency, setCurrency } = useUi()
  return (
    <header className="pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-end gap-1 pt-1">
        <InstallButton />
        <Segmented<Currency>
          compact
          label="Moneda"
          className="w-[116px]"
          value={fx ? currency : 'MXN'}
          onChange={setCurrency}
          options={[
            { value: 'MXN', label: 'MXN' },
            { value: 'USD', label: 'USD', disabled: !fx },
          ]}
        />
        <AvatarMenu />
      </div>
      <h1 className="mt-1 text-large-title font-bold leading-tight tracking-[-0.02em]">
        Nuestras metas
      </h1>
    </header>
  )
}
