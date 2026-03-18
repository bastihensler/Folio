import { createClient } from '@supabase/supabase-js'

// ── Credentials ───────────────────────────────────────────────────────────
// NOTE: Finnhub key is visible in client bundle — acceptable for personal use.
// For extra security, move to a Vercel environment variable (VITE_FINNHUB_KEY).
// API key lives in api/finnhub.js (server-side) — not needed in browser code anymore
export const FINNHUB_KEY = 'd6sg8l1r01qj447bia8gd6sg8l1r01qj447bia90'  // kept for reference only
// All Finnhub calls go through our Vercel proxy at /api/finnhub to avoid CORS
export const FINNHUB = '/api/finnhub?path='

// Supabase anon key is safe to be public — Row Level Security protects data.
export const sb = createClient(
  'https://imwhvwibxhfdatlytvjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltd2h2d2lieGhmZGF0bHl0dmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3ODQxODMsImV4cCI6MjA4OTM2MDE4M30.8CDKRlbY4eFZzyAX-iVg4YV8HFPyUMsL-7JgPrEkSBk'
)

// ── Static data ───────────────────────────────────────────────────────────
export const CRYPTO_MAP = { BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT', SOL: 'BINANCE:SOLUSDT' }

export const ETF_HOLDINGS = {
  VOO: [
    { symbol: 'AAPL', name: 'Apple Inc.',       weight: 7.12 },
    { symbol: 'MSFT', name: 'Microsoft',         weight: 6.48 },
    { symbol: 'NVDA', name: 'NVIDIA Corp',       weight: 5.96 },
    { symbol: 'AMZN', name: 'Amazon',            weight: 3.72 },
    { symbol: 'META', name: 'Meta Platforms',    weight: 2.54 },
    { symbol: 'GOOGL', name: 'Alphabet A',       weight: 2.07 },
    { symbol: 'TSLA', name: 'Tesla Inc.',        weight: 1.42 },
    { symbol: 'JPM',  name: 'JPMorgan Chase',    weight: 1.38 },
    { symbol: 'AVGO', name: 'Broadcom',          weight: 1.18 },
    { symbol: 'XOM',  name: 'Exxon Mobil',       weight: 1.14 },
  ],
  QQQ: [
    { symbol: 'AAPL', name: 'Apple Inc.',        weight: 8.93 },
    { symbol: 'MSFT', name: 'Microsoft',         weight: 8.21 },
    { symbol: 'NVDA', name: 'NVIDIA Corp',       weight: 8.07 },
    { symbol: 'AMZN', name: 'Amazon',            weight: 5.14 },
    { symbol: 'META', name: 'Meta Platforms',    weight: 4.87 },
    { symbol: 'TSLA', name: 'Tesla Inc.',        weight: 3.62 },
    { symbol: 'GOOGL', name: 'Alphabet A',       weight: 2.68 },
    { symbol: 'AVGO', name: 'Broadcom',          weight: 2.31 },
    { symbol: 'NFLX', name: 'Netflix',           weight: 1.84 },
    { symbol: 'AMD',  name: 'AMD',               weight: 1.62 },
  ],
}

export const COLORS = ['#00d4aa','#4ea8de','#f7931a','#ffd166','#ff4d6d','#c77dff','#06d6a0','#118ab2']
export const delay  = ms => new Promise(r => setTimeout(r, ms))

// ── FX rates ──────────────────────────────────────────────────────────────
// Fallback rates: units of foreign currency per 1 USD.
// Updated periodically — only used when live fetch fails.
export const DEFAULT_FX = {
  USD: 1,     EUR: 0.92,  GBP: 0.79,  GBp: 79,    // GBp = pence (stored separately)
  CHF: 0.89,  SEK: 10.5,  NOK: 10.8,  DKK: 6.9,
  CAD: 1.36,  AUD: 1.53,  HKD: 7.82,  JPY: 149,
  SGD: 1.35,  NZD: 1.67,  PLN: 4.0,   CZK: 23,
  HUF: 360,   TRY: 32,    ILS: 3.7,   ZAR: 18.5,
}

// Convert a price in any currency to USD.
// fxRates: map of { CURRENCY: units_per_1_USD }
// Fix #3: formula is price_in_foreign / (units_per_USD) = USD
// e.g. EUR: 100 EUR / 0.92 EUR_per_USD = 108.7 USD ✓
// e.g. GBp: 150p / 79 GBp_per_USD = 1.90 USD ✓
export function toUSD(price, currency, fxRates = DEFAULT_FX) {
  if (!price || currency === 'USD') return price
  const ccy = currency === 'GBP' ? 'GBp' : currency  // normalise GBP → GBp (pence scale)
  const rate = fxRates[ccy] ?? fxRates[currency] ?? DEFAULT_FX[ccy] ?? DEFAULT_FX[currency]
  if (!rate) return price  // unknown currency — pass through unchanged
  return price / rate
}

// ── Exchange symbol normalisation ─────────────────────────────────────────
// Maps Yahoo/Finnhub dot-suffix → Finnhub MIC prefix
const SUFFIX_TO_MIC = {
  AS: 'XAMS', AMS: 'XAMS',            // Amsterdam
  DE: 'XETR', GR: 'XETR',            // Xetra / Frankfurt
  PA: 'XPAR',                          // Paris
  BR: 'XBRU',                          // Brussels
  MI: 'XMIL',                          // Milan
  MC: 'XMAD',                          // Madrid
  L:  'XLON',                          // London
  SW: 'XSWX',                          // Zurich
  ST: 'XSTO',                          // Stockholm
  OL: 'XOSL',                          // Oslo
  CO: 'XCSE',                          // Copenhagen
  HE: 'XHEL',                          // Helsinki
  VI: 'XWBO',                          // Vienna
  LS: 'XLIS',                          // Lisbon
  AT: 'XATH',                          // Athens
  WA: 'XWAR',                          // Warsaw
  PR: 'XPRA',                          // Prague
  IS: 'XIST',                          // Istanbul
  TA: 'XTAE',                          // Tel Aviv
  T:  'XTSE', TO: 'XTSE',             // Toronto
  AX: 'XASX',                          // Sydney
  HK: 'XHKG',                          // Hong Kong
}

const MIC_TO_SUFFIX = Object.fromEntries(
  Object.entries(SUFFIX_TO_MIC).filter(([s]) => s.length <= 2).map(([s, m]) => [m, s])
)

// Convert any symbol format to Finnhub MIC prefix format: XAMS:ASML
function toFinnhubSymbol(symbol, type) {
  if (type === 'crypto') return CRYPTO_MAP[symbol] || `BINANCE:${symbol}USDT`
  if (!symbol) return symbol
  if (symbol.includes(':')) return symbol  // already MIC format
  const dot = symbol.lastIndexOf('.')
  if (dot > 0) {
    const base   = symbol.slice(0, dot)
    const suffix = symbol.slice(dot + 1).toUpperCase()
    const mic    = SUFFIX_TO_MIC[suffix]
    return mic ? `${mic}:${base}` : symbol
  }
  return symbol  // plain US ticker
}

// Convert any symbol format to Yahoo Finance suffix format: ASML.AS
function toYahooSymbol(symbol, type) {
  if (type === 'crypto') return null  // crypto handled by Finnhub/Binance
  if (!symbol) return null
  if (/\.[A-Z]{1,4}$/.test(symbol)) return symbol  // already Yahoo format
  if (symbol.includes(':')) {
    const [mic, base] = symbol.split(':')
    const suffix = MIC_TO_SUFFIX[mic]
    return suffix ? `${base}.${suffix}` : base
  }
  return symbol  // plain ticker
}

// ── Price fetching ────────────────────────────────────────────────────────
// Returns { price: number (USD), source: string, currency: string }
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

// fetchPrice: always returns price in USD, or null if not found.
// Pass live fxRates for accurate currency conversion.
export async function fetchPrice(symbol, type, fxRates = DEFAULT_FX) {
  // ── Crypto via Binance (USD quoted) ──
  if (type === 'crypto') {
    try {
      const sym = CRYPTO_MAP[symbol] || `BINANCE:${symbol}USDT`
      const r = await fetch(`${FINNHUB}/quote&symbol=${sym}`)
      const d = await r.json()
      return d.c > 0 ? d.c : null
    } catch { return null }
  }

  const hasSuffix = symbol.includes('.') || symbol.includes(':')

  // ── European / suffixed symbols: Yahoo first (better coverage + currency info) ──
  if (hasSuffix) {
    try {
      const q = await yahooQuote(symbol, type)
      if (q) {
        const usd = toUSD(q.rawPrice, q.currency, fxRates)
        if (usd > 0) return usd
      }
    } catch {}
  }

  // ── Finnhub (good for US stocks, some EU) ──
  try {
    const sym = toFinnhubSymbol(symbol, type)
    const r = await fetch(`${FINNHUB}/quote&symbol=${sym}`)
    const d = await r.json()
    // Finnhub returns USD for US stocks; for EU it sometimes returns local currency.
    // We treat Finnhub result as USD for US tickers (no suffix) and convert for others.
    if (d.c > 0) {
      if (!hasSuffix) return d.c  // US ticker — already USD
      // European via Finnhub: currency unknown, use Yahoo as more reliable
    }
  } catch {}

  // ── Final fallback: Yahoo for plain US tickers ──
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

// ── Dividends ─────────────────────────────────────────────────────────────
// Returns annualised dividend per share in USD
export async function fetchDividends(symbol, fxRates = DEFAULT_FX) {
  try {
    const sym = toFinnhubSymbol(symbol, 'stock')
    const from = new Date(); from.setFullYear(from.getFullYear() - 1)
    const r = await fetch(
      `${FINNHUB}/stock/dividend&symbol=${sym}&from=${from.toISOString().slice(0,10)}&to=${new Date().toISOString().slice(0,10)}`
    )
    const d = await r.json()
    if (!Array.isArray(d) || d.length === 0) return []
    // Fix #7: convert dividend amounts to USD using currency field if available
    return d.map(div => ({
      ...div,
      amountUSD: toUSD(div.amount || 0, (div.currency || 'USD').toUpperCase(), fxRates)
    }))
  } catch { return [] }
}

// ── FX rates ──────────────────────────────────────────────────────────────
// Returns map of { CURRENCY: units_per_1_USD } for all available currencies
export async function fetchAllFxRates() {
  try {
    const r = await fetch(`${FINNHUB}/forex/rates&base=USD`)
    const d = await r.json()
    if (!d.quote) return null
    const rates = { USD: 1 }
    for (const [ccy, val] of Object.entries(d.quote)) {
      if (val > 0) rates[ccy.toUpperCase()] = val
    }
    // Derive GBp (pence) = GBP rate × 100
    if (rates.GBP) rates.GBp = rates.GBP * 100
    return Object.keys(rates).length > 2 ? rates : null
  } catch { return null }
}
