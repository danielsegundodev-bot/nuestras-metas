import type { Currency } from './types'

const round2 = (n: number) => Math.round(n * 100) / 100

/** Converts an amount in `currency` to MXN using a USD→MXN rate. */
export function toMXN(amount: number, currency: Currency, usdMxn: number): number {
  return currency === 'USD' ? round2(amount * usdMxn) : amount
}

/** Converts an MXN amount to `currency` using a USD→MXN rate. */
export function fromMXN(mxn: number, currency: Currency, usdMxn: number): number {
  if (currency === 'MXN') return mxn
  if (!(usdMxn > 0)) return 0
  return round2(mxn / usdMxn)
}

export interface FormatMoneyOptions {
  /** Fraction digits. Default: 0 for whole amounts, 2 otherwise. */
  decimals?: number
  /** Prefix positive numbers with "+" (useful for activity rows). */
  signed?: boolean
}

const fmtCache = new Map<string, Intl.NumberFormat>()
function numberFormat(currency: Currency, decimals: number, signed: boolean) {
  const key = `${currency}|${decimals}|${signed}`
  let f = fmtCache.get(key)
  if (!f) {
    f = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      signDisplay: signed ? 'exceptZero' : 'auto',
    })
    fmtCache.set(key, f)
  }
  return f
}

/**
 * es-MX currency format. MXN → "$1,234", USD → "US$1,234" (narrow "$" is ambiguous
 * next to MXN, so USD gets an explicit "US" prefix).
 */
export function formatMoney(
  value: number,
  currency: Currency,
  opts: FormatMoneyOptions = {},
): string {
  const decimals = opts.decimals ?? (Number.isInteger(round2(value)) ? 0 : 2)
  const s = numberFormat(currency, decimals, opts.signed ?? false).format(value)
  return currency === 'USD' ? s.replace('$', 'US$') : s
}

const compactNumber = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 })

/** Short format for tight spots: "$950", "$272k", "$1.2M", "US$15k". */
export function formatMoneyCompact(value: number, currency: Currency): string {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const symbol = currency === 'USD' ? 'US$' : '$'
  let body: string
  if (abs < 1_000) body = compactNumber.format(Math.round(abs))
  else if (abs < 1_000_000)
    body = `${compactNumber.format(abs >= 10_000 ? Math.round(abs / 1_000) : Math.round(abs / 100) / 10)}k`
  else body = `${compactNumber.format(Math.round(abs / 100_000) / 10)}M`
  return `${sign}${symbol}${body}`
}
