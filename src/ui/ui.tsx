import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useData } from '../data/store'
import { formatMoney, formatMoneyCompact, fromMXN } from '../lib/money'
import type { Contribution, Currency } from '../lib/types'

export type SheetState =
  | null
  | { type: 'add'; goalId?: string; editing?: Contribution }
  | { type: 'goal'; goalId: string }
  | { type: 'settings'; focus?: 'goals' }

export interface Toast {
  id: number
  message: string
  tone: 'ok' | 'error'
  action?: { label: string; run: () => void }
}

interface UiValue {
  currency: Currency
  setCurrency(c: Currency): void
  sheet: SheetState
  openSheet(s: Exclude<SheetState, null>): void
  closeSheet(): void
  toasts: Toast[]
  toast(message: string, opts?: { tone?: Toast['tone']; action?: Toast['action'] }): void
  dismissToast(id: number): void
}

const UiContext = createContext<UiValue | null>(null)
const CUR_KEY = 'nuestras-metas:display-currency'

function readCurrency(): Currency {
  try {
    return localStorage.getItem(CUR_KEY) === 'USD' ? 'USD' : 'MXN'
  } catch {
    return 'MXN'
  }
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(readCurrency)
  const [sheet, setSheet] = useState<SheetState>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c)
    try {
      localStorage.setItem(CUR_KEY, c)
    } catch {
      /* ignore */
    }
  }, [])
  const dismissToast = useCallback(
    (id: number) => setToasts((t) => t.filter((x) => x.id !== id)),
    [],
  )
  const toast = useCallback<UiValue['toast']>(
    (message, opts) => {
      const id = ++seq.current
      setToasts((t) => [
        ...t.slice(-2),
        { id, message, tone: opts?.tone ?? 'ok', action: opts?.action },
      ])
      setTimeout(() => dismissToast(id), opts?.action ? 6500 : 4000)
    },
    [dismissToast],
  )

  const value = useMemo<UiValue>(
    () => ({
      currency,
      setCurrency,
      sheet,
      openSheet: (s) => setSheet(s),
      closeSheet: () => setSheet(null),
      toasts,
      toast,
      dismissToast,
    }),
    [currency, setCurrency, sheet, toasts, toast, dismissToast],
  )
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUi(): UiValue {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>')
  return ctx
}

/** Formats MXN amounts in the header's display currency (falls back to MXN without a rate). */
export function useMoney() {
  const { fx } = useData()
  const { currency } = useUi()
  const cur: Currency = currency === 'USD' && fx ? 'USD' : 'MXN'
  const rate = fx?.rate ?? 0
  return useMemo(
    () => ({
      cur,
      /** MXN amount → display-currency number. */
      conv: (mxn: number) => fromMXN(mxn, cur, rate),
      fmt: (mxn: number, signed = false) =>
        formatMoney(fromMXN(mxn, cur, rate), cur, { decimals: 0, signed }),
      compact: (mxn: number) => formatMoneyCompact(fromMXN(mxn, cur, rate), cur),
    }),
    [cur, rate],
  )
}

export const errorMessage = (e: unknown, fallback: string): string =>
  e instanceof Error && e.message ? e.message : fallback
