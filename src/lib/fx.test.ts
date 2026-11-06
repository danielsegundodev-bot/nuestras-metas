import { describe, expect, it, vi } from 'vitest'
import { FX_CACHE_KEY, FX_TTL_MS, getUsdMxn } from './fx'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  }
}

const ok = (rate: number, date = '2026-11-05') =>
  vi.fn(async () => new Response(JSON.stringify({ base: 'USD', date, rates: { MXN: rate } })))

const NOW = Date.UTC(2026, 10, 6, 12)

describe('getUsdMxn', () => {
  it('fetches and caches the rate', async () => {
    const storage = memoryStorage()
    const fetchFn = ok(18.42)
    const r = await getUsdMxn({ fetchFn, storage, now: () => NOW })
    expect(r).toEqual({ rate: 18.42, asOf: '2026-11-05', stale: false })
    expect(JSON.parse(storage.data.get(FX_CACHE_KEY)!).fetchedAt).toBe(NOW)
  })

  it('uses a fresh cache without hitting the network', async () => {
    const storage = memoryStorage({
      [FX_CACHE_KEY]: JSON.stringify({ rate: 19, asOf: '2026-11-04', fetchedAt: NOW - 1000 }),
    })
    const fetchFn = ok(18)
    const r = await getUsdMxn({ fetchFn, storage, now: () => NOW })
    expect(r).toEqual({ rate: 19, asOf: '2026-11-04', stale: false })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('falls back to an expired cache when the fetch fails', async () => {
    const storage = memoryStorage({
      [FX_CACHE_KEY]: JSON.stringify({
        rate: 19,
        asOf: '2026-11-01',
        fetchedAt: NOW - FX_TTL_MS - 1,
      }),
    })
    const fetchFn = vi.fn(async () => {
      throw new Error('offline')
    })
    const r = await getUsdMxn({ fetchFn, storage, now: () => NOW })
    expect(r).toEqual({ rate: 19, asOf: '2026-11-01', stale: true })
  })

  it('returns null with no cache and no network', async () => {
    const fetchFn = vi.fn(async () => new Response('nope', { status: 500 }))
    expect(await getUsdMxn({ fetchFn, storage: memoryStorage(), now: () => NOW })).toBeNull()
  })
})
