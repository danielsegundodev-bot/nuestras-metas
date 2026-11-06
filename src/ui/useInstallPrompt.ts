import { useCallback, useSyncExternalStore } from 'react'
import { isIOS, isIOSSafari, isStandalone, readEnv } from '../lib/platform'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallMode = 'prompt' | 'ios-safari' | 'ios-other' | null

// Module-level so the event is not lost if it fires before React mounts.
let deferred: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    emit()
  })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function computeMode(): InstallMode {
  if (typeof window === 'undefined' || installed) return null
  const env = readEnv()
  if (isStandalone(env)) return null
  if (deferred) return 'prompt'
  if (isIOS(env)) return isIOSSafari(env) ? 'ios-safari' : 'ios-other'
  return null
}

export function useInstallPrompt() {
  // Mode is a primitive string, so it is a stable snapshot.
  const mode = useSyncExternalStore(subscribe, computeMode, () => null)
  const promptInstall = useCallback(async () => {
    const e = deferred
    if (!e) return
    await e.prompt()
    await e.userChoice.catch(() => undefined)
    // The event can only be used once.
    deferred = null
    emit()
  }, [])
  return { mode, promptInstall }
}
