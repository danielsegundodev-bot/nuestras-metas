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

/**
 * One rule for money in the UI and the PDF: no cents once an amount reaches 1,000 (MXN
 * aggregates and individual MXN entries alike); below 1,000 cents appear when present.
 * An individual USD entry (`entry: true`) keeps its cents whatever its size.
 */
export function formatMoneyAuto(
  value: number,
  currency: Currency,
  opts: { signed?: boolean; entry?: boolean } = {},
): string {
  const abs = Math.abs(value)
  const keepCents = currency === 'USD' && opts.entry === true
  const decimals = abs >= 1_000 && !keepCents ? 0 : Number.isInteger(round2(value)) ? 0 : 2
  return formatMoney(value, currency, { decimals, signed: opts.signed })
}

const NBSP = '\u00a0'
const compactNumber = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 })

/** Short format for tight spots: "$950", "$272 k", "$1.2 M", "US$15 k". */
export function formatMoneyCompact(value: number, currency: Currency): string {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const symbol = currency === 'USD' ? 'US$' : '$'
  let body: string
  if (abs < 1_000) body = compactNumber.format(Math.round(abs * 100) / 100)
  else if (abs < 1_000_000)
    body = `${compactNumber.format(abs >= 10_000 ? Math.round(abs / 1_000) : Math.round(abs / 100) / 10)}${NBSP}k`
  else if (abs < 1_000_000_000)
    body = `${compactNumber.format(Math.round(abs / 100_000) / 10)}${NBSP}M`
  else body = `${compactNumber.format(Math.round(abs / 100_000_000) / 10)}${NBSP}mil${NBSP}M`
  return `${sign}${symbol}${body}`
}

/** Relative glyph widths (em) of tabular rounded numerals, used to size text without measuring. */
export function emWidth(text: string): number {
  let w = 0
  for (const ch of text) w += /[0-9$US]/.test(ch) ? 0.62 : /[.,]/.test(ch) ? 0.3 : 0.55
  return w
}

/**
 * Picks the text and font size so a number fits in `maxWidth` (same unit as the sizes).
 * Prefers the full figure shrunk down to `minSize`; only then falls back to the compact one.
 */
export function fitText(
  full: string,
  compact: string,
  opts: { maxWidth: number; maxSize: number; minSize: number },
): { text: string; size: number } {
  const size = (t: string) => Math.min(opts.maxSize, opts.maxWidth / emWidth(t))
  const sFull = size(full)
  if (sFull >= opts.minSize) return { text: full, size: sFull }
  return { text: compact, size: Math.max(opts.minSize, size(compact)) }
}

/** Live "1,234,567.5" formatting for the amount field. Returns the new text and caret. */
export function formatAmountInput(raw: string, caret: number = raw.length) {
  let intPart = ''
  let decPart = ''
  let seenDot = false
  let tokensBefore = 0 // digits and the dot that were kept and sit before the caret
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!
    let kept = false
    if (/\d/.test(ch)) {
      if (seenDot) {
        if (decPart.length < 2) {
          decPart += ch
          kept = true
        }
      } else if (intPart.replace(/^0+/, '').length < 12) {
        intPart += ch
        kept = true
      }
    } else if (ch === '.' && !seenDot) {
      seenDot = true
      kept = true
    }
    if (kept && i < caret) tokensBefore++
  }
  intPart = intPart.replace(/^0+(?=\d)/, '')
  let text = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (seenDot) {
    if (intPart === '') {
      text = '0'
      if (tokensBefore > 0) tokensBefore++
    }
    text += `.${decPart}`
  }
  let pos = 0
  let seen = 0
  while (pos < text.length && seen < tokensBefore) {
    if (text[pos] !== ',') seen++
    pos++
  }
  return { text, caret: pos }
}
