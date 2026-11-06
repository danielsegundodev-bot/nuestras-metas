export const FX_URL = 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=MXN'
export const FX_CACHE_KEY = 'nuestras-metas:fx-usd-mxn'
export const FX_TTL_MS = 12 * 60 * 60 * 1000

export interface FxRate {
  /** MXN per 1 USD. */
  rate: number
  /** Date the rate refers to (`yyyy-MM-dd`, from the provider). */
  asOf: string
  /** True when the network fetch failed and an old cached value is returned. */
  stale: boolean
}

interface CachedFx {
  rate: number
  asOf: string
  fetchedAt: number
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export interface FxDeps {
  fetchFn?: typeof fetch
  storage?: StorageLike | null
  now?: () => number
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readCachedFx(storage: StorageLike | null = defaultStorage()): CachedFx | null {
  try {
    const raw = storage?.getItem(FX_CACHE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as CachedFx
    return typeof v.rate === 'number' && v.rate > 0 ? v : null
  } catch {
    return null
  }
}

/**
 * USD→MXN rate. Uses a 12h localStorage cache; on network failure falls back to the
 * last cached value (stale: true). Returns null when there is nothing to fall back to —
 * the UI must then ask the user to type the rate.
 */
export async function getUsdMxn(deps: FxDeps = {}): Promise<FxRate | null> {
  const fetchFn = deps.fetchFn ?? globalThis.fetch?.bind(globalThis)
  const storage = deps.storage === undefined ? defaultStorage() : deps.storage
  const now = (deps.now ?? Date.now)()

  const cached = readCachedFx(storage)
  if (cached && now - cached.fetchedAt < FX_TTL_MS) {
    return { rate: cached.rate, asOf: cached.asOf, stale: false }
  }

  try {
    if (!fetchFn) throw new Error('fetch unavailable')
    const res = await fetchFn(FX_URL)
    if (!res.ok) throw new Error(`fx http ${res.status}`)
    const body = (await res.json()) as { date?: string; rates?: { MXN?: number } }
    const rate = body.rates?.MXN
    if (typeof rate !== 'number' || !(rate > 0)) throw new Error('fx bad payload')
    const fresh: CachedFx = {
      rate,
      asOf: body.date ?? new Date(now).toISOString().slice(0, 10),
      fetchedAt: now,
    }
    try {
      storage?.setItem(FX_CACHE_KEY, JSON.stringify(fresh))
    } catch {
      /* storage full / unavailable: ignore */
    }
    return { rate: fresh.rate, asOf: fresh.asOf, stale: false }
  } catch {
    return cached ? { rate: cached.rate, asOf: cached.asOf, stale: true } : null
  }
}
