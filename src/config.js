import { createClient } from '@supabase/supabase-js'

export const FINNHUB = '/api/finnhub?path='

export const sb = createClient(
  'https://imwhvwibxhfdatlytvjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltd2h2d2lieGhmZGF0bHl0dmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3ODQxODMsImV4cCI6MjA4OTM2MDE4M30.8CDKRlbY4eFZzyAX-iVg4YV8HFPyUMsL-7JgPrEkSBk'
)

export const CRYPTO_MAP = { BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT', SOL: 'BINANCE:SOLUSDT' }
export const COLORS = ['#00d4aa','#4ea8de','#f7931a','#ffd166','#ff4d6d','#c77dff','#06d6a0','#118ab2']
export const delay  = ms => new Promise(r => setTimeout(r, ms))

// ── ETF metadata ───────────────────────────────────────────────────────────
// ter: Total Expense Ratio %
// sectors: approximate allocation % by sector
// holdings: top stock positions with weight %
// Covers both ticker and ISIN-based lookups (e.g. VWRL.AS = IE00B3RBWM25)
export const ETF_DATA = {
  // ── Vanguard ──
  VOO: {
    name: 'Vanguard S&P 500 ETF', ter: 0.03,
    sectors: { Technology: 31.4, Financials: 13.2, Healthcare: 12.1, 'Consumer Discretionary': 10.8, Industrials: 8.7, 'Communication Services': 8.5, 'Consumer Staples': 5.9, Energy: 3.8, Utilities: 2.4, Materials: 2.1, 'Real Estate': 2.3 },
    holdings: [
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
  },
  QQQ: {
    name: 'Invesco QQQ Trust', ter: 0.20,
    sectors: { Technology: 51.2, 'Communication Services': 17.3, 'Consumer Discretionary': 13.6, Healthcare: 6.4, Industrials: 4.8, 'Consumer Staples': 4.1, Financials: 1.2, Utilities: 0.9, Materials: 0.5 },
    holdings: [
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
  },
  // ── Vanguard FTSE All-World (most common European ETF) ──
  'VWRL.AS': {
    name: 'Vanguard FTSE All-World ETF', ter: 0.22,
    sectors: { Technology: 24.8, Financials: 16.2, Healthcare: 11.3, Industrials: 10.9, 'Consumer Discretionary': 10.2, 'Communication Services': 7.8, 'Consumer Staples': 6.4, Energy: 4.8, Materials: 3.9, Utilities: 2.8, 'Real Estate': 2.5 },
    holdings: [
      { symbol: 'AAPL',  name: 'Apple Inc.',        weight: 4.21 },
      { symbol: 'MSFT',  name: 'Microsoft',         weight: 3.84 },
      { symbol: 'NVDA',  name: 'NVIDIA Corp',       weight: 3.52 },
      { symbol: 'AMZN',  name: 'Amazon',            weight: 2.19 },
      { symbol: 'META',  name: 'Meta Platforms',    weight: 1.51 },
      { symbol: 'GOOGL', name: 'Alphabet A',        weight: 1.22 },
      { symbol: 'TSLA',  name: 'Tesla Inc.',        weight: 0.84 },
      { symbol: 'JPM',   name: 'JPMorgan Chase',    weight: 0.81 },
      { symbol: 'AVGO',  name: 'Broadcom',          weight: 0.70 },
      { symbol: 'LLY',   name: 'Eli Lilly',         weight: 0.65 },
    ],
  },
  'VWCE.DE': {
    name: 'Vanguard FTSE All-World Acc', ter: 0.22,
    sectors: { Technology: 24.8, Financials: 16.2, Healthcare: 11.3, Industrials: 10.9, 'Consumer Discretionary': 10.2, 'Communication Services': 7.8, 'Consumer Staples': 6.4, Energy: 4.8, Materials: 3.9, Utilities: 2.8, 'Real Estate': 2.5 },
    holdings: [
      { symbol: 'AAPL',  name: 'Apple Inc.',        weight: 4.21 },
      { symbol: 'MSFT',  name: 'Microsoft',         weight: 3.84 },
      { symbol: 'NVDA',  name: 'NVIDIA Corp',       weight: 3.52 },
      { symbol: 'AMZN',  name: 'Amazon',            weight: 2.19 },
      { symbol: 'META',  name: 'Meta Platforms',    weight: 1.51 },
      { symbol: 'GOOGL', name: 'Alphabet A',        weight: 1.22 },
      { symbol: 'TSLA',  name: 'Tesla Inc.',        weight: 0.84 },
      { symbol: 'JPM',   name: 'JPMorgan Chase',    weight: 0.81 },
    ],
  },
  // ── iShares ──
  'IWDA.AS': {
    name: 'iShares Core MSCI World ETF', ter: 0.20,
    sectors: { Technology: 25.4, Financials: 15.3, Healthcare: 12.8, Industrials: 11.2, 'Consumer Discretionary': 10.6, 'Communication Services': 8.1, 'Consumer Staples': 6.2, Energy: 4.5, Materials: 3.2, Utilities: 2.2, 'Real Estate': 2.8 },
    holdings: [
      { symbol: 'AAPL',  name: 'Apple Inc.',        weight: 5.12 },
      { symbol: 'MSFT',  name: 'Microsoft',         weight: 4.68 },
      { symbol: 'NVDA',  name: 'NVIDIA Corp',       weight: 4.29 },
      { symbol: 'AMZN',  name: 'Amazon',            weight: 2.68 },
      { symbol: 'META',  name: 'Meta Platforms',    weight: 1.84 },
      { symbol: 'GOOGL', name: 'Alphabet A',        weight: 1.49 },
      { symbol: 'TSLA',  name: 'Tesla Inc.',        weight: 1.02 },
      { symbol: 'JPM',   name: 'JPMorgan Chase',    weight: 0.99 },
      { symbol: 'AVGO',  name: 'Broadcom',          weight: 0.85 },
      { symbol: 'LLY',   name: 'Eli Lilly',         weight: 0.79 },
    ],
  },
  'CSPX.AS': {
    name: 'iShares Core S&P 500 ETF', ter: 0.07,
    sectors: { Technology: 31.4, Financials: 13.2, Healthcare: 12.1, 'Consumer Discretionary': 10.8, Industrials: 8.7, 'Communication Services': 8.5, 'Consumer Staples': 5.9, Energy: 3.8, Utilities: 2.4, Materials: 2.1, 'Real Estate': 2.3 },
    holdings: [
      { symbol: 'AAPL',  name: 'Apple Inc.',        weight: 7.12 },
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
  },
  'EMIM.AS': {
    name: 'iShares Core MSCI EM IMI', ter: 0.18,
    sectors: { Technology: 22.1, Financials: 21.4, 'Consumer Discretionary': 12.3, 'Communication Services': 9.8, Materials: 8.2, Industrials: 6.9, Energy: 6.4, 'Consumer Staples': 5.8, Healthcare: 4.3, Utilities: 2.2, 'Real Estate': 1.4 },
    holdings: [
      { symbol: 'TSM',   name: 'Taiwan Semiconductor', weight: 7.82 },
      { symbol: 'TCEHY', name: 'Tencent Holdings',     weight: 3.94 },
      { symbol: 'BABA',  name: 'Alibaba Group',        weight: 2.31 },
      { symbol: 'SMSN',  name: 'Samsung Electronics',  weight: 3.48 },
      { symbol: 'RELIANCE', name: 'Reliance Industries', weight: 1.84 },
    ],
  },
  // ── Xtrackers / DWS ──
  'XDWD.DE': {
    name: 'Xtrackers MSCI World Swap ETF', ter: 0.19,
    sectors: { Technology: 25.4, Financials: 15.3, Healthcare: 12.8, Industrials: 11.2, 'Consumer Discretionary': 10.6, 'Communication Services': 8.1, 'Consumer Staples': 6.2, Energy: 4.5, Materials: 3.2, Utilities: 2.2, 'Real Estate': 2.8 },
    holdings: [
      { symbol: 'AAPL',  name: 'Apple Inc.',        weight: 5.12 },
      { symbol: 'MSFT',  name: 'Microsoft',         weight: 4.68 },
      { symbol: 'NVDA',  name: 'NVIDIA Corp',       weight: 4.29 },
      { symbol: 'AMZN',  name: 'Amazon',            weight: 2.68 },
      { symbol: 'META',  name: 'Meta Platforms',    weight: 1.84 },
    ],
  },
  // ── L&G ──
  'AIAG.L': {
    name: 'L&G Artificial Intelligence ETF', ter: 0.49,
    sectors: { Technology: 68.4, 'Communication Services': 14.2, Industrials: 9.8, Healthcare: 4.2, Financials: 3.4 },
    holdings: [
      { symbol: 'NVDA',  name: 'NVIDIA Corp',       weight: 8.42 },
      { symbol: 'MSFT',  name: 'Microsoft',         weight: 7.18 },
      { symbol: 'GOOGL', name: 'Alphabet A',        weight: 6.84 },
      { symbol: 'AMZN',  name: 'Amazon',            weight: 6.12 },
      { symbol: 'META',  name: 'Meta Platforms',    weight: 5.94 },
      { symbol: 'CRM',   name: 'Salesforce',        weight: 4.21 },
      { symbol: 'ORCL',  name: 'Oracle',            weight: 3.87 },
      { symbol: 'NOW',   name: 'ServiceNow',        weight: 3.54 },
    ],
  },
  // ── ARK ──
  ARKK: {
    name: 'ARK Innovation ETF', ter: 0.75,
    sectors: { Technology: 42.1, Healthcare: 28.4, 'Communication Services': 14.8, Industrials: 9.2, Financials: 5.5 },
    holdings: [
      { symbol: 'TSLA',  name: 'Tesla Inc.',        weight: 12.84 },
      { symbol: 'COIN',  name: 'Coinbase',          weight: 9.21 },
      { symbol: 'ROKU',  name: 'Roku',              weight: 8.14 },
      { symbol: 'SQ',    name: 'Block Inc.',        weight: 7.82 },
      { symbol: 'SPOT',  name: 'Spotify',           weight: 6.94 },
    ],
  },
}

// Also support lookup by base ticker (without exchange suffix)
// e.g. user holds 'VWRL' → look up as 'VWRL.AS'
export const ETF_ALIASES = {
  VWRL: 'VWRL.AS', VWCE: 'VWCE.DE',
  IWDA: 'IWDA.AS', CSPX: 'CSPX.AS',
  EMIM: 'EMIM.AS', XDWD: 'XDWD.DE',
  AIAG: 'AIAG.L',
  SPY:  'VOO',     IVV:  'VOO',   // treat SPY/IVV as VOO-equivalent
}

// Resolve ETF symbol to ETF_DATA key
export function resolveEtf(symbol) {
  if (!symbol) return null
  const s = symbol.toUpperCase()
  return ETF_DATA[s] ? s : (ETF_ALIASES[s] ? ETF_ALIASES[s] : null)
}

// Backward-compat export used in exposure calculations
export const ETF_HOLDINGS = Object.fromEntries(
  Object.entries(ETF_DATA).map(([k, v]) => [k, v.holdings])
)

// ── FX rates ───────────────────────────────────────────────────────────────
export const DEFAULT_FX = {
  EUR: 1,
  USD: 1.087, GBP: 0.858, GBp: 85.8,
  CHF: 0.965, SEK: 11.4,  NOK: 11.7,  DKK: 7.46,
  CAD: 1.48,  AUD: 1.67,  HKD: 8.48,  JPY: 162,
  SGD: 1.46,  NZD: 1.81,  PLN: 4.34,  CZK: 25.0,
  HUF: 391,   TRY: 34.8,  ILS: 4.02,  ZAR: 20.1,
}

export function toEUR(price, currency, fxRates = DEFAULT_FX) {
  if (price == null || price === 0) return 0
  const ccy = (currency || 'EUR').toUpperCase()
  if (ccy === 'EUR') return price
  if (ccy === 'GBP') return price / (fxRates.GBP ?? DEFAULT_FX.GBP)
  const rate = ccy === 'GBp'
    ? ((fxRates.GBP ?? DEFAULT_FX.GBP) * 100)
    : (fxRates[ccy] ?? DEFAULT_FX[ccy])
  if (!rate) { console.warn(`[toEUR] Unknown currency "${ccy}"`); return price }
  return price / rate
}

export async function fetchAllFxRates() {
  try {
    const r = await fetch('https://api.frankfurter.dev/v1/latest?base=EUR')
    if (r.ok) {
      const d = await r.json()
      if (d.rates && Object.keys(d.rates).length > 0) {
        const rates = { EUR: 1 }
        for (const [k, v] of Object.entries(d.rates)) if (v > 0) rates[k.toUpperCase()] = v
        if (rates.GBP) rates.GBp = rates.GBP * 100
        return rates
      }
    }
  } catch {}
  try {
    const r = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json')
    if (r.ok) {
      const d = await r.json()
      if (d.eur) {
        const rates = { EUR: 1 }
        for (const [k, v] of Object.entries(d.eur)) if (v > 0) rates[k.toUpperCase()] = v
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
  PA: 'XPAR', BR: 'XBRU',  MI: 'XMIL', MC: 'XMAD',
  L:  'XLON', SW: 'XSWX',  ST: 'XSTO', OL: 'XOSL',
  CO: 'XCSE', HE: 'XHEL',  VI: 'XWBO', LS: 'XLIS',
  AT: 'XATH', WA: 'XWAR',  T:  'XTSE', TO: 'XTSE',
  AX: 'XASX', HK: 'XHKG',
}
const MIC_TO_SUFFIX = Object.fromEntries(
  Object.entries(SUFFIX_TO_MIC).filter(([s]) => s.length <= 2).map(([s, m]) => [m, s])
)
const SUFFIX_TO_CCY = {
  AS: 'EUR', PA: 'EUR', BR: 'EUR', MI: 'EUR', MC: 'EUR',
  DE: 'EUR', GR: 'EUR', HE: 'EUR', VI: 'EUR', LS: 'EUR',
  L: 'GBp', SW: 'CHF', ST: 'SEK', OL: 'NOK', CO: 'DKK',
  WA: 'PLN', T: 'CAD', TO: 'CAD', AX: 'AUD', HK: 'HKD',
}

function toYahooSymbol(symbol) {
  if (!symbol) return null
  if (/\.[A-Z]{1,4}$/.test(symbol)) return symbol
  if (symbol.includes(':')) {
    const [mic, base] = symbol.split(':')
    const suffix = MIC_TO_SUFFIX[mic]
    return suffix ? `${base}.${suffix}` : base
  }
  return symbol
}

function toFinnhubSymbol(symbol, type) {
  if (type === 'crypto') return CRYPTO_MAP[symbol] || `BINANCE:${symbol}USDT`
  if (!symbol) return symbol
  if (symbol.includes(':')) return symbol
  const dot = symbol.lastIndexOf('.')
  if (dot > 0) {
    const suffix = symbol.slice(dot + 1).toUpperCase()
    const mic = SUFFIX_TO_MIC[suffix]
    return mic ? `${mic}:${symbol.slice(0, dot)}` : symbol
  }
  return symbol
}

function nativeCurrency(symbol, type) {
  if (type === 'crypto') return 'USD'
  const dot = symbol.lastIndexOf('.')
  if (dot > 0) return SUFFIX_TO_CCY[symbol.slice(dot + 1).toUpperCase()] || 'EUR'
  if (symbol.includes(':')) {
    const suffix = MIC_TO_SUFFIX[symbol.split(':')[0]]
    return suffix ? (SUFFIX_TO_CCY[suffix] || 'EUR') : 'USD'
  }
  return 'USD'
}

// ── Price + metadata fetching ──────────────────────────────────────────────
// yahooQuote calls the v7 quote endpoint which includes dividend yield data.
// Response structure: { quoteResponse: { result: [{ regularMarketPrice, currency,
//   trailingAnnualDividendRate, trailingAnnualDividendYield }] } }
async function yahooQuote(symbol) {
  const ySym = toYahooSymbol(symbol)
  if (!ySym) return null
  try {
    const r = await fetch(`/api/yahoo?symbol=${encodeURIComponent(ySym)}`)
    if (!r.ok) return null
    const d = await r.json()

    // v7 quote format
    const q = d?.quoteResponse?.result?.[0]
    if (q?.regularMarketPrice && q.regularMarketPrice > 0) {
      return {
        price:         q.regularMarketPrice,
        currency:      (q.currency || 'EUR').toUpperCase(),
        // trailingAnnualDividendYield is a decimal ratio (0.013 = 1.3%)
        dividendYield: q.trailingAnnualDividendYield != null && q.trailingAnnualDividendYield > 0
          ? parseFloat((q.trailingAnnualDividendYield * 100).toFixed(2))
          : null,
        // trailingAnnualDividendRate is the annual $ amount per share
        dividendRate: q.trailingAnnualDividendRate || null,
      }
    }

    // Fallback: v8 chart format (when v7 fails and proxy falls back)
    const meta = d?.chart?.result?.[0]?.meta
    if (meta?.regularMarketPrice && meta.regularMarketPrice > 0) {
      return {
        price:         meta.regularMarketPrice,
        currency:      (meta.currency || 'EUR').toUpperCase(),
        dividendYield: null,
        dividendRate:  null,
      }
    }

    return null
  } catch { return null }
}

export async function fetchPrice(symbol, type, fxRates = DEFAULT_FX) {
  // Primary: Yahoo (has currency metadata)
  try {
    const q = await yahooQuote(symbol)
    if (q && q.price > 0) return toEUR(q.price, q.currency, fxRates)
  } catch {}
  // Fallback: Finnhub
  try {
    const sym = toFinnhubSymbol(symbol, type)
    const r   = await fetch(`${FINNHUB}/quote&symbol=${sym}`)
    const d   = await r.json()
    if (d.c > 0) return toEUR(d.c, nativeCurrency(symbol, type), fxRates)
  } catch {}
  return null
}

// Fetches price AND dividend yield from Yahoo in one call (saves API calls)
export async function fetchPriceAndYield(symbol, type, fxRates = DEFAULT_FX) {
  // For ETFs: curated ETF_DATA provides TER and can supplement dividend data
  const etfKey  = resolveEtf(symbol)
  const etfMeta = etfKey ? ETF_DATA[etfKey] : null

  // Primary: Yahoo v7 quote — has price + trailingAnnualDividendYield
  try {
    const q = await yahooQuote(symbol)
    if (q && q.price > 0) {
      const priceEUR = toEUR(q.price, q.currency, fxRates)

      // Dividend yield: prefer Yahoo's trailing yield %
      // If Yahoo only gives the annual rate (not yield %), calculate it from price
      let divYield = q.dividendYield  // already in % (e.g. 1.3)
      if (divYield == null && q.dividendRate && q.dividendRate > 0 && priceEUR > 0) {
        const rateEUR = toEUR(q.dividendRate, q.currency, fxRates)
        divYield = parseFloat(((rateEUR / priceEUR) * 100).toFixed(2))
      }

      return {
        price:         priceEUR,
        dividendYield: divYield,
        // TER from curated data — Yahoo does not provide expense ratios
        annualFee:     etfMeta ? etfMeta.ter : null,
      }
    }
  } catch {}

  // Fallback: Finnhub for price only (no dividend data available)
  try {
    const sym = toFinnhubSymbol(symbol, type)
    const r   = await fetch(`${FINNHUB}/quote&symbol=${sym}`)
    const d   = await r.json()
    if (d.c > 0) {
      return {
        price:         toEUR(d.c, nativeCurrency(symbol, type), fxRates),
        dividendYield: null,
        annualFee:     etfMeta ? etfMeta.ter : null,
      }
    }
  } catch {}

  return null
}

// Returns dividends with amounts in EUR (for stocks — ETFs use Yahoo yield)
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
