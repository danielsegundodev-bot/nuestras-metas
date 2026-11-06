/** Pure platform detection. Everything takes an env argument so it can be tested without a browser. */
export interface PlatformEnv {
  userAgent: string
  /** navigator.platform — only used to spot iPadOS, which reports as a Mac. */
  platform?: string
  maxTouchPoints?: number
  /** navigator.standalone (iOS only). */
  navigatorStandalone?: boolean
  /** matchMedia('(display-mode: standalone)').matches */
  displayModeStandalone?: boolean
}

export function isStandalone(env: PlatformEnv): boolean {
  return env.navigatorStandalone === true || env.displayModeStandalone === true
}

export function isIOS(env: PlatformEnv): boolean {
  if (/iPhone|iPad|iPod/.test(env.userAgent)) return true
  return env.platform === 'MacIntel' && (env.maxTouchPoints ?? 0) > 1
}

/** Real Safari on iOS: not Chrome/Firefox/Edge/Opera/Google app, nor an in-app browser. */
export function isIOSSafari(env: PlatformEnv): boolean {
  if (!isIOS(env)) return false
  if (
    /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|DuckDuckGo|Instagram|FBAN|FBAV|Line\/|MicroMessenger|Snapchat|TikTok/.test(
      env.userAgent,
    )
  )
    return false
  return /Safari\//.test(env.userAgent) && /Version\//.test(env.userAgent)
}

export function readEnv(): PlatformEnv {
  const nav = navigator as Navigator & { standalone?: boolean }
  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    maxTouchPoints: nav.maxTouchPoints,
    navigatorStandalone: nav.standalone,
    displayModeStandalone: window.matchMedia?.('(display-mode: standalone)').matches,
  }
}
