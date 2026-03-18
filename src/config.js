import { createClient } from '@supabase/supabase-js'

export const FINNHUB_KEY = 'd6sg8l1r01qj447bia8gd6sg8l1r01qj447bia90'
export const FINNHUB = 'https://finnhub.io/api/v1'
export const CRYPTO_MAP = { BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT', SOL: 'BINANCE:SOLUSDT' }

export const sb = createClient(
  'https://imwhvwibxhfdatlytvjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltd2h2d2lieGhmZGF0bHl0dmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3ODQxODMsImV4cCI6MjA4OTM2MDE4M30.8CDKRlbY4eFZzyAX-iVg4YV8HFPyUMsL-7JgPrEkSBk'
)

export const ETF_HOLDINGS = {
  VOO: [
    { symbol: 'AAPL', name: 'Apple Inc.', weight: 7.12 },
    { symbol: 'MSFT', name: 'Microsoft', weight: 6.48 },
    { symbol: 'NVDA', name: 'NVIDIA Corp', weight: 5.96 },
    { symbol: 'AMZN', name: 'Amazon', weight: 3.72 },
    { symbol: 'META', name: 'Meta Platforms', weight: 2.54 },
    { symbol: 'GOOGL', name: 'Alphabet A', weight: 2.07 },
    { symbol: 'TSLA', name: 'Tesla Inc.', weight: 1.42 },
    { symbol: 'JPM', name: 'JPMorgan Chase', weight: 1.38 },
    { symbol: 'AVGO', name: 'Broadcom', weight: 1.18 },
    { symbol: 'XOM', name: 'Exxon Mobil', weight: 1.14 },
  ],
  QQQ: [
    { symbol: 'AAPL', name: 'Apple Inc.', weight: 8.93 },
    { symbol: 'MSFT', name: 'Microsoft', weight: 8.21 },
    { symbol: 'NVDA', name: 'NVIDIA Corp', weight: 8.07 },
    { symbol: 'AMZN', name: 'Amazon', weight: 5.14 },
    { symbol: 'META', name: 'Meta Platforms', weight: 4.87 },
    { symbol: 'TSLA', name: 'Tesla Inc.', weight: 3.62 },
    { symbol: 'GOOGL', name: 'Alphabet A', weight: 2.68 },
    { symbol: 'AVGO', name: 'Broadcom', weight: 2.31 },
    { symbol: 'NFLX', name: 'Netflix', weight: 1.84 },
    { symbol: 'AMD', name: 'AMD', weight: 1.62 },
  ],
}

export const COLORS = ['#00d4aa','#4ea8de','#f7931a','#ffd166','#ff4d6d','#c77dff','#06d6a0','#118ab2']

export const delay = ms => new Promise(r => setTimeout(r, ms))

export async function fetchPrice(symbol, type) {
  try {
    const sym = type === 'crypto' ? (CRYPTO_MAP[symbol] || `BINANCE:${symbol}USDT`) : symbol
    const r = await fetch(`${FINNHUB}/quote?symbol=${sym}&token=${FINNHUB_KEY}`)
    const d = await r.json()
    return d.c || null
  } catch { return null }
}

export async function fetchDividends(symbol) {
  try {
    const from = new Date(); from.setFullYear(from.getFullYear() - 1)
    const r = await fetch(`${FINNHUB}/stock/dividend?symbol=${symbol}&from=${from.toISOString().slice(0,10)}&to=${new Date().toISOString().slice(0,10)}&token=${FINNHUB_KEY}`)
    const d = await r.json()
    return Array.isArray(d) ? d : []
  } catch { return [] }
}

export async function fetchEurRate() {
  try {
    const r = await fetch(`${FINNHUB}/forex/rates?base=USD&token=${FINNHUB_KEY}`)
    const d = await r.json()
    return d.quote?.EUR || null
  } catch { return null }
}
