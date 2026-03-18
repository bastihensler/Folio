import { createClient } from '@supabase/supabase-js'

// ── Credentials ────────────────────────────────────────────────────────────
// All price calls go via Vercel proxy (api/finnhub.js) — key stays server-side.
// Fix #14: FINNHUB_KEY removed from browser bundle entirely.
export const FINNHUB = '/api/finnhub?path='

export const sb = createClient(
  'https://imwhvwibxhfdatlytvjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltd2h2d2lieGhmZGF0bHl0dmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3ODQxODMsImV4cCI6MjA4OTM2MDE4M30.8CDKRlbY4eFZzyAX-iVg4YV8HFPyUMsL-7JgPrEkSBk'
)

// ── Static data ────────────────────────────────────────────────────────────
export const CRYPTO_MAP = { BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT', SOL: 'BINANCE:SOLUSDT' }

export const ETF_HOLDINGS = {
  VOO: [
    { symbol: 'AAPL',  name: 'Apple Inc.',     weight: 7.12 },
    { symbol: 'MSFT',  name: 'Microsoft',       weight: 6.48 },
    { symbol: 'NVDA',  name: 'NVIDIA Corp',     weight: 5.96 },
    { symbol: 'AMZN',  name: 'Amazon',          weight: 3.72 },
    { symbol: 'META',  name: 'Meta Platforms',  weight: 2.54 },
    { symbol: 'GOOGL', name: 'Alphabet A',      weight: 2.07 },
    { symbol: 'TSLA',  name: 'Tesla Inc.',      weight: 1.42 },
    { symbol: 'JPM',   name: 'JPMorgan Chase',  weight: 1.38 },
    { symbol: 'AVGO',  name: 'Broadcom',        weight: 1.18 },
    { symbol: 'XOM',   name: 'Exxon Mobil',     weight: 1.14 },
  ],
  QQQ: [
    { symbol: 'AAPL',  name: 'Apple Inc.',      weight: 8.93 },
    { symbol: 'MSFT',  name: 'Microsoft',       weight: 8.21 },
    { symbol: 'NVDA',  name: 'NVIDIA Corp',     weight: 8.07 },
    { symbol: 'AMZN',  name: 'Amazon',          weight: 5.14 },
    { symbol: 'META',  name: 'Meta Platforms',  weight: 4.87 },
    { symbol: 'TSLA',  name: 'Tesla Inc.',      weight: 3.62 },
    { symbol: 'GOOGL', name: 'Alphabet A',      weight: 2.68 },
    { symbol: 'AVGO',  name: 'Broadcom',        weight: 2.31 },
    { symbol: 'NFLX',  name: 'Netflix',         weight: 1.84 },
    { symbol: 'AMD',   name: 'AMD',             weight: 1.62 },
  ],
}

export const COLORS = ['#00d4aa','#4ea8de','#f7931a','#ffd166','#ff4d6d','#c77dff','#06d6a0','#118ab2']
export const delay  = ms => new Promise(r => setTimeout(r, ms))

// ── FX rates ───────────────────────────────────────────────────────────────
// Base currency: EUR. rates[CCY] = units of CCY per 1 EUR.
// e.g. USD: 1.087  →  1 EUR = 1.087 USD  →  toEUR(p, 'USD') = p / 1.087
export const DEFAULT_FX = {
  EUR: 1,
  USD: 1.087, GBP: 0.858, GBp: 85.8,   // GBp = pence = GBP * 100
  CHF: 0.965, SEK: 11.4,  NOK: 11.7,   DKK: 7.46,
  CAD: 1.48,  AUD: 1.67,  HKD: 8.48,   JPY: 162,
  SGD: 1.46,  NZD: 1.81,  PLN: 4.34,   CZK: 25.0,
  HUF: 391,   TRY: 34.8,  ILS: 4.02,   ZAR: 20.1,
}

// Fix #1: toEUR — GBp (pence) handled explicitly before generic lookup.
// Old code had a dead branch that never reached the pence conversion.
export function toEUR(price, currency, fxRates = DEFAULT_FX) {
  if (price == null || price === 0) return 0
  const ccy = (currency || 'EUR').toUpperCase()
  if (ccy === 'EUR') return price
  // GBp = pence: 14200p → /100 → 142 GBP → /0.858 → €165.5
  if (ccy === 'GBP') return price / (fxRates.GBP ?? DEFAULT_FX.GBP)
  if (ccy === 'GBP') return price   // never reached — guards above
  const rate = ccy === 'GBp'
    ? ((fxRates.GBP ?? DEFAULT_FX.GBP) * 100)   // GBp rate = GBP * 100
    : (fxRates[ccy] ?? DEFAULT_FX[ccy])
  if (!rate) {
    console.warn(`[toEUR] Unknown currency "${ccy}" — returning price unchanged`)
    return price
  }
  return price / rate
}

// ── FX rate fetching ───────────────────────────────────────────────────────
// Primary:  Frankfurter (ECB data, free, no key, no CORS)
// Fallback: fawazahmed0 via jsDelivr CDN (200+ currencies, no key)
// Returns { CCY: units_per_1_EUR, EUR: 1 }
export async function fetchAllFxRates() {
  // Attempt 1: Frankfurter (ECB)
  try {
    const r = await fetch('https://api.frankfurter.dev/v1/latest?base=EUR')
    if (r.ok) {
      const d = await r.json()
      if (d.rates && Object.keys(d.rates).length > 0) {
        const rates = { EUR: 1 }
        for (const [k, v] of Object.entries(d.rates)) {
          if (v > 0) rates[k.toUpperCase()] = v
        }
        if (rates.GBP) rates.GBp = rates.GBP * 100
        return rates
      }
    }
  } catch {}

  // Attempt 2: fawazahmed0 via jsDelivr
  try {
    const r = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json')
    if (r.ok) {
      const d = await r.json()
      if (d.eur) {
        const rates = { EUR: 1 }
        for (const [k, v] of Object.entries(d.eur)) {
          if (v > 0) rates[k.toUpperCase()] = v
        }
        if (rates.GBP) rates.GBp = rates.GBP * 100
        return Object.keys(rates).length > 2 ? rates : null
      }
    }
  } catch {}

  return null
}

// ── Exchange symbol helpers ────────────────────────────────────────────────
const SUFFIX_TO_MIC = {
  AS: 'XAMS', AMS: 'XAMS', DE: 'XETR', GR: 'XETR',
  PA: 'XPAR', BR:  'XBRU', MI: 'XMIL', MC: 'XMAD',
  L:  'XLON', SW:  'XSWX', ST: 'XSTO', OL: 'XOSL',
  CO: 'XCSE', HE:  'XHEL', VI: 'XWBO', LS: 'XLIS',
  AT: 'XATH', WA:  'XWAR', T:  'XTSE', TO: 'XTSE',
  AX: 'XASX', HK:  'XHKG',
}

const MIC_TO_SUFFIX = Object.fromEntries(
  Object.entries(SUFFIX_TO_MIC)
    .filter(([s]) => s.length <= 2)
    .map(([s, m]) => [m, s])
)

// Fix #2: map exchange suffix to native currency for Finnhub fallback
// Yahoo Finance returns currency metadata so this is only needed as a fallback
const SUFFIX_TO_CCY = {
  AS: 'EUR', PA: 'EUR', BR: 'EUR', MI: 'EUR', MC: 'EUR', // Euronext
  DE: 'EUR', GR: 'EUR', HE: 'EUR', VI: 'EUR', LS: 'EUR', // Xetra + others EUR
  L:  'GBp',                                               // London Stock Exchange (pence)
  SW: 'CHF',                                               // Zurich
  ST: 'SEK',                                               // Stockholm
  OL: 'NOK',                                               // Oslo
  CO: 'DKK',                                               // Copenhagen
  WA: 'PLN',                                               // Warsaw
  T:  'CAD', TO: 'CAD',                                   // Toronto
  AX: 'AUD',                                               // Sydney
  HK: 'HKD',                                               // Hong Kong
}

// Convert symbol to Yahoo Finance dot-suffix format (ASML.AS)
function toYahooSymbol(symbol) {
  if (!symbol) return null
  if (/\.[A-Z]{1,4}$/.test(symbol)) return symbol        // already has suffix
  if (symbol.includes(':')) {
    const [mic, base] = symbol.split(':')
    const suffix = MIC_TO_SUFFIX[mic]
    return suffix ? `${base}.${suffix}` : base
  }
  return symbol   // plain US ticker
}

// Convert symbol to Finnhub MIC:TICKER format (XAMS:ASML)
function toFinnhubSymbol(symbol, type) {
  if (type === 'crypto') return CRYPTO_MAP[symbol] || `BINANCE:${symbol}USDT`
  if (!symbol) return symbol
  if (symbol.includes(':')) return symbol
  const dot = symbol.lastIndexOf('.')
  if (dot > 0) {
    const base   = symbol.slice(0, dot)
    const suffix = symbol.slice(dot + 1).toUpperCase()
    const mic    = SUFFIX_TO_MIC[suffix]
    return mic ? `${mic}:${base}` : symbol
  }
  return symbol
}

// Determine the expected native currency of a symbol from its exchange suffix
function nativeCurrency(symbol, type) {
  if (type === 'crypto') return 'USD'
  const dot = symbol.lastIndexOf('.')
  if (dot > 0) return SUFFIX_TO_CCY[symbol.slice(dot + 1).toUpperCase()] || 'EUR'
  if (symbol.includes(':')) {
    const suffix = MIC_TO_SUFFIX[symbol.split(':')[0]]
    return suffix ? (SUFFIX_TO_CCY[suffix] || 'EUR') : 'USD'
  }
  return 'USD'  // plain ticker — assume US
}

// ── Price fetching ─────────────────────────────────────────────────────────
// Primary:  Yahoo Finance via /api/yahoo — currency metadata included in response
// Fallback: Finnhub via /api/finnhub — currency derived from SUFFIX_TO_CCY (Fix #2)
// Always returns price in EUR, or null.

async function yahooPrice(symbol, fxRates) {
  const ySym = toYahooSymbol(symbol)
  if (!ySym) return null
  try {
    const r    = await fetch(`/api/yahoo?symbol=${encodeURIComponent(ySym)}`)
    if (!r.ok) return null
    const d    = await r.json()
    const meta = d?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice || meta.regularMarketPrice <= 0) return null
    const currency = (meta.currency || 'EUR').toUpperCase()
    return toEUR(meta.regularMarketPrice, currency, fxRates)
  } catch { return null }
}

async function finnhubPrice(symbol, type, fxRates) {
  try {
    const sym = toFinnhubSymbol(symbol, type)
    const r   = await fetch(`${FINNHUB}/quote&symbol=${sym}`)
    const d   = await r.json()
    if (!d.c || d.c <= 0) return null
    // Fix #2: use known currency per exchange, not blindly assume EUR
    const currency = nativeCurrency(symbol, type)
    return toEUR(d.c, currency, fxRates)
  } catch { return null }
}

export async function fetchPrice(symbol, type, fxRates = DEFAULT_FX) {
  const yp = await yahooPrice(symbol, fxRates)
  if (yp && yp > 0) return yp
  const fp = await finnhubPrice(symbol, type, fxRates)
  if (fp && fp > 0) return fp
  return null
}

// Returns dividends with amounts converted to EUR
export async function fetchDividends(symbol, fxRates = DEFAULT_FX) {
  try {
    const sym  = toFinnhubSymbol(symbol, 'stock')
    const from = new Date(); from.setFullYear(from.getFullYear() - 1)
    const r    = await fetch(
      `${FINNHUB}/stock/dividend&symbol=${sym}&from=${from.toISOString().slice(0,10)}&to=${new Date().toISOString().slice(0,10)}`
    )
    const d = await r.json()
    if (!Array.isArray(d) || d.length === 0) return []
    return d.map(div => ({
      ...div,
      amountEUR: toEUR(div.amount || 0, (div.currency || 'EUR').toUpperCase(), fxRates)
    }))
  } catch { return [] }
}
