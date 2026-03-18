import { createClient } from '@supabase/supabase-js'

// ── Credentials ────────────────────────────────────────────────────────────
// Finnhub key is server-side only in api/finnhub.js — kept here for ISIN search
// which is called directly. All price/FX calls go through the Vercel proxy.
export const FINNHUB_KEY = 'd6sg8l1r01qj447bia8gd6sg8l1r01qj447bia90'
// Proxy endpoint — Vercel serverless function forwards to Finnhub server-side (no CORS)
export const FINNHUB = '/api/finnhub?path='

// Supabase anon key is safe to be public — Row Level Security protects data.
export const sb = createClient(
  'https://imwhvwibxhfdatlytvjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltd2h2d2lieGhmZGF0bHl0dmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3ODQxODMsImV4cCI6MjA4OTM2MDE4M30.8CDKRlbY4eFZzyAX-iVg4YV8HFPyUMsL-7JgPrEkSBk'
)

// ── Static data ────────────────────────────────────────────────────────────
export const CRYPTO_MAP = { BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT', SOL: 'BINANCE:SOLUSDT' }

export const ETF_HOLDINGS = {
  VOO: [
    { symbol: 'AAPL',  name: 'Apple Inc.',       weight: 7.12 },
    { symbol: 'MSFT',  name: 'Microsoft',         weight: 6.48 },
    { symbol: 'NVDA',  name: 'NVIDIA Corp',       weight: 5.96 },
    { symbol: 'AMZN',  name: 'Amazon',            weight: 3.72 },
    { symbol: 'META',  name: 'Meta Platforms',    weight: 2.54 },
    { symbol: 'GOOGL', name: 'Alphabet A',        weight: 2.07 },
    { symbol: 'TSLA',  name: 'Tesla Inc.',        weight: 1.42 },
    { symbol: 'JPM',   name: 'JPMorgan Chase',    weight: 1.38 },
    { symbol: 'AVGO',  name: 'Broadcom',          weight: 1.18 },
    { symbol: 'XOM',   name: 'Exxon Mobil',       weight: 1.14 },
  ],
  QQQ: [
    { symbol: 'AAPL',  name: 'Apple Inc.',        weight: 8.93 },
    { symbol: 'MSFT',  name: 'Microsoft',         weight: 8.21 },
    { symbol: 'NVDA',  name: 'NVIDIA Corp',       weight: 8.07 },
    { symbol: 'AMZN',  name: 'Amazon',            weight: 5.14 },
    { symbol: 'META',  name: 'Meta Platforms',    weight: 4.87 },
    { symbol: 'TSLA',  name: 'Tesla Inc.',        weight: 3.62 },
    { symbol: 'GOOGL', name: 'Alphabet A',        weight: 2.68 },
    { symbol: 'AVGO',  name: 'Broadcom',          weight: 2.31 },
    { symbol: 'NFLX',  name: 'Netflix',           weight: 1.84 },
    { symbol: 'AMD',   name: 'AMD',               weight: 1.62 },
  ],
}

export const COLORS = ['#00d4aa','#4ea8de','#f7931a','#ffd166','#ff4d6d','#c77dff','#06d6a0','#118ab2']
export const delay  = ms => new Promise(r => setTimeout(r, ms))

// ── FX rates (fallback) ────────────────────────────────────────────────────
// Used when live fetch fails. Units of foreign currency per 1 USD.
export const DEFAULT_FX = {
  USD: 1,     EUR: 0.92,  GBP: 0.79,  GBp: 79,
  CHF: 0.89,  SEK: 10.5,  NOK: 10.8,  DKK: 6.9,
  CAD: 1.36,  AUD: 1.53,  HKD: 7.82,  JPY: 149,
  SGD: 1.35,  NZD: 1.67,  PLN: 4.0,   CZK: 23,
  HUF: 360,   TRY: 32,    ILS: 3.7,   ZAR: 18.5,
}

// Convert a price in any currency to USD.
// fxRates stores units_of_currency per 1 USD (e.g. EUR: 0.92 means 0.92 EUR = $1)
// So to get USD: price_in_foreign / rate = price_in_USD
export function toUSD(price, currency, fxRates = DEFAULT_FX) {
  if (!price || currency === 'USD') return price
  // GBp = pence. Convert via GBP rate.
  if (currency === 'GBp') {
    const gbpRate = fxRates.GBP || DEFAULT_FX.GBP || 0.79
    return (price / 100) / gbpRate
  }
  const rate = fxRates[currency] || DEFAULT_FX[currency]
  if (!rate) return price
  return price / rate
}

// ── Exchange symbol normalisation ──────────────────────────────────────────
const SUFFIX_TO_MIC = {
  AS: 'XAMS', AMS: 'XAMS', DE: 'XETR',  GR: 'XETR',
  PA: 'XPAR', BR:  'XBRU', MI: 'XMIL',  MC: 'XMAD',
  L:  'XLON', SW:  'XSWX', ST: 'XSTO',  OL: 'XOSL',
  CO: 'XCSE', HE:  'XHEL', VI: 'XWBO',  LS: 'XLIS',
  AT: 'XATH', WA:  'XWAR', PR: 'XPRA',  IS: 'XIST',
  TA: 'XTAE', T:   'XTSE', TO: 'XTSE',  AX: 'XASX',
  HK: 'XHKG',
}

const MIC_TO_SUFFIX = Object.fromEntries(
  Object.entries(SUFFIX_TO_MIC)
    .filter(([s]) => s.length <= 2)
    .map(([s, m]) => [m, s])
)

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

function toYahooSymbol(symbol, type) {
  if (type === 'crypto') return null
  if (!symbol) return null
  if (/\.[A-Z]{1,4}$/.test(symbol)) return symbol
  if (symbol.includes(':')) {
    const [mic, base] = symbol.split(':')
    const suffix = MIC_TO_SUFFIX[mic]
    return suffix ? `${base}.${suffix}` : base
  }
  return symbol
}

// ── Price fetching ─────────────────────────────────────────────────────────
// Yahoo quote via our Vercel proxy — returns { rawPrice, currency } or null
async function yahooQuote(symbol, type) {
  const ySym = toYahooSymbol(symbol, type)
  if (!ySym) return null
  try {
    const r = await fetch(`/api/yahoo?symbol=${encodeURIComponent(ySym)}`)
    if (!r.ok) return null
    const d = await r.json()
    const meta = d?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice || meta.regularMarketPrice <= 0) return null
    return { rawPrice: meta.regularMarketPrice, currency: (meta.currency || 'USD').toUpperCase() }
  } catch { return null }
}

// Always returns price in USD, or null if not found.
export async function fetchPrice(symbol, type, fxRates = DEFAULT_FX) {
  // Crypto via Binance feed (always USD)
  if (type === 'crypto') {
    try {
      const sym = CRYPTO_MAP[symbol] || `BINANCE:${symbol}USDT`
      const r = await fetch(`${FINNHUB}/quote&symbol=${sym}`)
      const d = await r.json()
      return d.c > 0 ? d.c : null
    } catch { return null }
  }

  const hasSuffix = symbol.includes('.') || symbol.includes(':')

  // European/suffixed: try Yahoo first (has currency metadata)
  if (hasSuffix) {
    try {
      const q = await yahooQuote(symbol, type)
      if (q) {
        const usd = toUSD(q.rawPrice, q.currency, fxRates)
        if (usd > 0) return usd
      }
    } catch {}
  }

  // Finnhub via proxy (good for US stocks)
  try {
    const sym = toFinnhubSymbol(symbol, type)
    const r = await fetch(`${FINNHUB}/quote&symbol=${sym}`)
    const d = await r.json()
    if (d.c > 0) {
      // US ticker with no suffix — Finnhub returns USD directly
      if (!hasSuffix) return d.c
    }
  } catch {}

  // Final fallback: Yahoo for plain US tickers
  if (!hasSuffix) {
    try {
      const q = await yahooQuote(symbol, type)
      if (q) {
        const usd = toUSD(q.rawPrice, q.currency, fxRates)
        if (usd > 0) return usd
      }
    } catch {}
  }

  return null
}

// Returns dividends with amounts converted to USD
export async function fetchDividends(symbol, fxRates = DEFAULT_FX) {
  try {
    const sym  = toFinnhubSymbol(symbol, 'stock')
    const from = new Date(); from.setFullYear(from.getFullYear() - 1)
    const r = await fetch(
      `${FINNHUB}/stock/dividend&symbol=${sym}&from=${from.toISOString().slice(0,10)}&to=${new Date().toISOString().slice(0,10)}`
    )
    const d = await r.json()
    if (!Array.isArray(d) || d.length === 0) return []
    return d.map(div => ({
      ...div,
      amountUSD: toUSD(div.amount || 0, (div.currency || 'USD').toUpperCase(), fxRates)
    }))
  } catch { return [] }
}

// ── FX rates ───────────────────────────────────────────────────────────────
// Uses Frankfurter (ECB data, truly free, no key, no CORS).
// Falls back to fawazahmed0 CDN (200+ currencies, no key, no rate limits).
export async function fetchAllFxRates() {
  // Attempt 1: Frankfurter — European Central Bank data, CORS-friendly
  try {
    const r = await fetch('https://api.frankfurter.dev/v1/latest?base=USD')
    if (r.ok) {
      const d = await r.json()
      if (d.rates && Object.keys(d.rates).length > 0) {
        const rates = { USD: 1 }
        for (const [k, v] of Object.entries(d.rates)) {
          if (v > 0) rates[k.toUpperCase()] = v
        }
        if (rates.GBP) rates.GBp = rates.GBP * 100
        return rates
      }
    }
  } catch {}

  // Attempt 2: fawazahmed0 via jsDelivr CDN — no key, no rate limits
  try {
    const r = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json')
    if (r.ok) {
      const d = await r.json()
      if (d.usd) {
        const rates = { USD: 1 }
        for (const [k, v] of Object.entries(d.usd)) {
          if (v > 0) rates[k.toUpperCase()] = v
        }
        if (rates.GBP) rates.GBp = rates.GBP * 100
        return Object.keys(rates).length > 2 ? rates : null
      }
    }
  } catch {}

  return null // both failed — App will use DEFAULT_FX
}
