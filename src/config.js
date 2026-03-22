import { createClient } from '@supabase/supabase-js'

export const FINNHUB = '/api/finnhub?path='

export const sb = createClient(
  'https://imwhvwibxhfdatlytvjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltd2h2d2lieGhmZGF0bHl0dmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3ODQxODMsImV4cCI6MjA4OTM2MDE4M30.8CDKRlbY4eFZzyAX-iVg4YV8HFPyUMsL-7JgPrEkSBk'
)

export const CRYPTO_MAP = { BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT', SOL: 'BINANCE:SOLUSDT' }
export const COLORS = ['#00d4aa','#4ea8de','#f7931a','#ffd166','#ff4d6d','#c77dff','#06d6a0','#118ab2']
export const delay  = ms => new Promise(r => setTimeout(r, ms))

// ── Stock country lookup ───────────────────────────────────────────────────
// Country of incorporation / primary listing for common individual stocks.
// Used when a stock is held directly (not via ETF).
// Exchange suffix is also a good proxy: .AS=NL, .PA=FR, .DE=DE, .L=GB etc.
export const STOCK_COUNTRY = {
  // US tech / megacap
  AAPL: 'United States', MSFT: 'United States', NVDA: 'United States',
  AMZN: 'United States', META: 'United States', GOOGL: 'United States',
  GOOG: 'United States', TSLA: 'United States', AVGO: 'United States',
  JPM:  'United States', XOM:  'United States', LLY:  'United States',
  UNH:  'United States', V:    'United States', JNJ:  'United States',
  WMT:  'United States', PG:   'United States', MA:   'United States',
  HD:   'United States', CVX:  'United States', MRK:  'United States',
  ABBV: 'United States', COST: 'United States', NFLX: 'United States',
  AMD:  'United States', CRM:  'United States', ORCL: 'United States',
  NOW:  'United States', ADBE: 'United States', QCOM: 'United States',
  INTC: 'United States', COIN: 'United States', ROKU: 'United States',
  SQ:   'United States', SPOT: 'United States', BRK_B: 'United States',
  // Netherlands
  'ASML.AS': 'Netherlands', 'HEIA.AS': 'Netherlands', 'PHIA.AS': 'Netherlands',
  'INGA.AS': 'Netherlands', 'RDSA.AS': 'Netherlands', 'UNA.AS':  'Netherlands',
  'ADYEN.AS': 'Netherlands', 'NN.AS': 'Netherlands', 'MT.AS': 'Netherlands',
  // Germany
  'SAP.DE': 'Germany', 'SIE.DE': 'Germany', 'ALV.DE': 'Germany',
  'BMW.DE': 'Germany', 'BAYN.DE': 'Germany', 'MBG.DE': 'Germany',
  'DTE.DE': 'Germany', 'DB1.DE': 'Germany', 'EOAN.DE': 'Germany',
  // France
  'MC.PA': 'France', 'TTE.PA': 'France', 'SAN.PA': 'France',
  'AIR.PA': 'France', 'OR.PA': 'France', 'BNP.PA': 'France',
  // UK
  'SHEL.L': 'United Kingdom', 'AZN.L': 'United Kingdom', 'HSBA.L': 'United Kingdom',
  'ULVR.L': 'United Kingdom', 'BP.L': 'United Kingdom', 'GSK.L': 'United Kingdom',
  // Switzerland
  'NESN.SW': 'Switzerland', 'ROG.SW': 'Switzerland', 'NOVN.SW': 'Switzerland',
  // Emerging markets
  TSM:   'Taiwan', TCEHY: 'China', BABA: 'China', SMSN: 'South Korea',
  RELIANCE: 'India',
  // Crypto — no country, use 'Global'
  BTC: 'Global', ETH: 'Global', SOL: 'Global',
}

// Derive country from exchange suffix when not in STOCK_COUNTRY
const SUFFIX_TO_COUNTRY = {
  AS: 'Netherlands', PA: 'France',    BR: 'Belgium',    MI: 'Italy',
  MC: 'Spain',       DE: 'Germany',   GR: 'Germany',    HE: 'Finland',
  VI: 'Austria',     LS: 'Portugal',  L:  'United Kingdom',
  SW: 'Switzerland', ST: 'Sweden',    OL: 'Norway',     CO: 'Denmark',
  WA: 'Poland',      AT: 'Greece',    T:  'Canada',      TO: 'Canada',
  AX: 'Australia',   HK: 'Hong Kong',
}

export function stockCountry(symbol) {
  if (!symbol) return 'Unknown'
  // Direct lookup
  if (STOCK_COUNTRY[symbol]) return STOCK_COUNTRY[symbol]
  // Derive from suffix
  const dot = symbol.lastIndexOf('.')
  if (dot > 0) {
    const suffix = symbol.slice(dot + 1).toUpperCase()
    if (SUFFIX_TO_COUNTRY[suffix]) return SUFFIX_TO_COUNTRY[suffix]
  }
  // Plain US ticker with no suffix → assume US
  if (!/[.\-:]/.test(symbol)) return 'United States'
  return 'Unknown'
}

// ── ETF metadata ───────────────────────────────────────────────────────────
// Each ETF has: ter, sectors{}, countries{}, holdings[]
// countries: approximate % by country of incorporation / listing
export const ETF_DATA = {

  // ── US index ETFs ──────────────────────────────────────────────────────
  VOO: {
    name: 'Vanguard S&P 500 ETF', ter: 0.03, dist: false,
    sectors:  { Technology: 31.4, Financials: 13.2, Healthcare: 12.1, 'Consumer Discretionary': 10.8, Industrials: 8.7, 'Communication Services': 8.5, 'Consumer Staples': 5.9, Energy: 3.8, Utilities: 2.4, Materials: 2.1, 'Real Estate': 2.3 },
    countries: { 'United States': 100 },
    holdings: [
      { symbol: 'AAPL',  name: 'Apple Inc.',        weight: 7.12 },
      { symbol: 'MSFT',  name: 'Microsoft',          weight: 6.48 },
      { symbol: 'NVDA',  name: 'NVIDIA Corp',        weight: 5.96 },
      { symbol: 'AMZN',  name: 'Amazon',             weight: 3.72 },
      { symbol: 'META',  name: 'Meta Platforms',     weight: 2.54 },
      { symbol: 'GOOGL', name: 'Alphabet A',         weight: 2.07 },
      { symbol: 'TSLA',  name: 'Tesla Inc.',         weight: 1.42 },
      { symbol: 'JPM',   name: 'JPMorgan Chase',     weight: 1.38 },
      { symbol: 'AVGO',  name: 'Broadcom',           weight: 1.18 },
      { symbol: 'XOM',   name: 'Exxon Mobil',        weight: 1.14 },
      { symbol: 'UNH',   name: 'UnitedHealth Group', weight: 1.08 },
      { symbol: 'LLY',   name: 'Eli Lilly',          weight: 1.04 },
      { symbol: 'V',     name: 'Visa Inc.',           weight: 0.98 },
      { symbol: 'COST',  name: 'Costco',              weight: 0.94 },
      { symbol: 'WMT',   name: 'Walmart',             weight: 0.91 },
      { symbol: 'MA',    name: 'Mastercard',          weight: 0.87 },
      { symbol: 'NFLX',  name: 'Netflix',             weight: 0.84 },
      { symbol: 'HD',    name: 'Home Depot',          weight: 0.82 },
      { symbol: 'PG',    name: 'Procter & Gamble',   weight: 0.79 },
      { symbol: 'JNJ',   name: 'Johnson & Johnson',  weight: 0.76 },
    ],
  },

  QQQ: {
    name: 'Invesco QQQ Trust', ter: 0.20, dist: false,
    sectors:  { Technology: 51.2, 'Communication Services': 17.3, 'Consumer Discretionary': 13.6, Healthcare: 6.4, Industrials: 4.8, 'Consumer Staples': 4.1, Financials: 1.2, Utilities: 0.9, Materials: 0.5 },
    countries: { 'United States': 100 },
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
      { symbol: 'COST',  name: 'Costco',             weight: 1.48 },
      { symbol: 'QCOM',  name: 'Qualcomm',          weight: 1.42 },
      { symbol: 'ADBE',  name: 'Adobe',             weight: 1.38 },
      { symbol: 'MSTR',  name: 'MicroStrategy',     weight: 1.24 },
      { symbol: 'PEP',   name: 'PepsiCo',           weight: 1.18 },
      { symbol: 'CSCO',  name: 'Cisco Systems',     weight: 1.14 },
      { symbol: 'LIN',   name: 'Linde PLC',         weight: 1.08 },
      { symbol: 'INTC',  name: 'Intel Corp',        weight: 0.94 },
      { symbol: 'INTU',  name: 'Intuit',            weight: 0.88 },
      { symbol: 'MU',    name: 'Micron Technology', weight: 0.84 },
    ],
  },

  // ── Vanguard global ────────────────────────────────────────────────────
  'VWRL.AS': {
    name: 'Vanguard FTSE All-World ETF', ter: 0.22, dist: true,
    sectors:  { Technology: 24.8, Financials: 16.2, Healthcare: 11.3, Industrials: 10.9, 'Consumer Discretionary': 10.2, 'Communication Services': 7.8, 'Consumer Staples': 6.4, Energy: 4.8, Materials: 3.9, Utilities: 2.8, 'Real Estate': 2.5 },
    countries: { 'United States': 64.2, Japan: 5.8, 'United Kingdom': 4.1, France: 3.2, Canada: 3.1, Switzerland: 2.6, Germany: 2.4, Australia: 2.1, Netherlands: 1.2, 'South Korea': 1.8, Taiwan: 2.1, India: 1.9, Other: 5.5 },
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
    name: 'Vanguard FTSE All-World Acc', ter: 0.22, dist: false,
    sectors:  { Technology: 24.8, Financials: 16.2, Healthcare: 11.3, Industrials: 10.9, 'Consumer Discretionary': 10.2, 'Communication Services': 7.8, 'Consumer Staples': 6.4, Energy: 4.8, Materials: 3.9, Utilities: 2.8, 'Real Estate': 2.5 },
    countries: { 'United States': 64.2, Japan: 5.8, 'United Kingdom': 4.1, France: 3.2, Canada: 3.1, Switzerland: 2.6, Germany: 2.4, Australia: 2.1, Netherlands: 1.2, 'South Korea': 1.8, Taiwan: 2.1, India: 1.9, Other: 5.5 },
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

  // ── iShares ────────────────────────────────────────────────────────────
  'IWDA.AS': {
    name: 'iShares Core MSCI World ETF', ter: 0.20, dist: false,
    sectors:  { Technology: 25.4, Financials: 15.3, Healthcare: 12.8, Industrials: 11.2, 'Consumer Discretionary': 10.6, 'Communication Services': 8.1, 'Consumer Staples': 6.2, Energy: 4.5, Materials: 3.2, Utilities: 2.2, 'Real Estate': 2.8 },
    countries: { 'United States': 70.8, Japan: 6.2, 'United Kingdom': 4.4, France: 3.4, Canada: 3.2, Switzerland: 2.8, Germany: 2.5, Australia: 2.2, Netherlands: 1.3, Sweden: 1.0, Other: 2.2 },
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
    name: 'iShares Core S&P 500 ETF', ter: 0.07, dist: false,
    sectors:  { Technology: 31.4, Financials: 13.2, Healthcare: 12.1, 'Consumer Discretionary': 10.8, Industrials: 8.7, 'Communication Services': 8.5, 'Consumer Staples': 5.9, Energy: 3.8, Utilities: 2.4, Materials: 2.1, 'Real Estate': 2.3 },
    countries: { 'United States': 100 },
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
    name: 'iShares Core MSCI EM IMI', ter: 0.18, dist: false,
    sectors:  { Technology: 22.1, Financials: 21.4, 'Consumer Discretionary': 12.3, 'Communication Services': 9.8, Materials: 8.2, Industrials: 6.9, Energy: 6.4, 'Consumer Staples': 5.8, Healthcare: 4.3, Utilities: 2.2, 'Real Estate': 1.4 },
    countries: { China: 27.1, India: 16.8, Taiwan: 14.2, 'South Korea': 11.4, Brazil: 5.8, 'Saudi Arabia': 4.1, 'South Africa': 3.4, Mexico: 2.8, Indonesia: 2.1, Thailand: 1.8, Other: 10.5 },
    holdings: [
      { symbol: 'TSM',      name: 'Taiwan Semiconductor', weight: 7.82 },
      { symbol: 'TCEHY',   name: 'Tencent Holdings',     weight: 3.94 },
      { symbol: 'BABA',    name: 'Alibaba Group',        weight: 2.31 },
      { symbol: 'SMSN',    name: 'Samsung Electronics',  weight: 3.48 },
      { symbol: 'RELIANCE', name: 'Reliance Industries', weight: 1.84 },
    ],
  },

  // ── Xtrackers ──────────────────────────────────────────────────────────
  'XDWD.DE': {
    name: 'Xtrackers MSCI World Swap ETF', ter: 0.19, dist: false,
    sectors:  { Technology: 25.4, Financials: 15.3, Healthcare: 12.8, Industrials: 11.2, 'Consumer Discretionary': 10.6, 'Communication Services': 8.1, 'Consumer Staples': 6.2, Energy: 4.5, Materials: 3.2, Utilities: 2.2, 'Real Estate': 2.8 },
    countries: { 'United States': 70.8, Japan: 6.2, 'United Kingdom': 4.4, France: 3.4, Canada: 3.2, Switzerland: 2.8, Germany: 2.5, Australia: 2.2, Netherlands: 1.3, Other: 3.2 },
    holdings: [
      { symbol: 'AAPL',  name: 'Apple Inc.',        weight: 5.12 },
      { symbol: 'MSFT',  name: 'Microsoft',         weight: 4.68 },
      { symbol: 'NVDA',  name: 'NVIDIA Corp',       weight: 4.29 },
      { symbol: 'AMZN',  name: 'Amazon',            weight: 2.68 },
      { symbol: 'META',  name: 'Meta Platforms',    weight: 1.84 },
    ],
  },

  // ── L&G ───────────────────────────────────────────────────────────────
  'AIAG.L': {
    name: 'L&G Artificial Intelligence ETF', ter: 0.49, dist: true,
    sectors:  { Technology: 68.4, 'Communication Services': 14.2, Industrials: 9.8, Healthcare: 4.2, Financials: 3.4 },
    countries: { 'United States': 82.4, Taiwan: 4.8, Netherlands: 3.2, China: 3.1, 'South Korea': 2.8, Other: 3.7 },
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

  // ── ARK ───────────────────────────────────────────────────────────────
  ARKK: {
    name: 'ARK Innovation ETF', ter: 0.75, dist: true,
    sectors:  { Technology: 42.1, Healthcare: 28.4, 'Communication Services': 14.8, Industrials: 9.2, Financials: 5.5 },
    countries: { 'United States': 88.4, Sweden: 4.2, Israel: 3.8, Other: 3.6 },
    holdings: [
      { symbol: 'TSLA',  name: 'Tesla Inc.',        weight: 12.84 },
      { symbol: 'COIN',  name: 'Coinbase',          weight: 9.21 },
      { symbol: 'ROKU',  name: 'Roku',              weight: 8.14 },
      { symbol: 'SQ',    name: 'Block Inc.',        weight: 7.82 },
      { symbol: 'SPOT',  name: 'Spotify',           weight: 6.94 },
    ],
  },

  // ── iShares Core EURO STOXX 50 (SXRT) — IE00B53L3W79 — Acc ─────────
  'SXRT.DE': {
    name: 'iShares Core EURO STOXX 50 ETF', ter: 0.10, dist: false,
    sectors: { Financials: 24.8, Industrials: 21.8, Technology: 16.7, 'Consumer Discretionary': 10.9, Healthcare: 6.0, 'Consumer Staples': 5.5, Utilities: 4.5, Energy: 4.1, Materials: 3.3, 'Communication Services': 2.4 },
    countries: { France: 30.0, Germany: 29.5, Netherlands: 18.1, Spain: 10.5, Italy: 7.3, Belgium: 1.5, Other: 3.1 },
    holdings: [
      { symbol: 'ASML.AS', name: 'ASML Holding',        weight: 10.53 },
      { symbol: 'SIE.DE',  name: 'Siemens AG',          weight: 4.41 },
      { symbol: 'SAP.DE',  name: 'SAP SE',              weight: 4.13 },
      { symbol: 'SAN.PA',  name: 'Banco Santander',     weight: 3.65 },
      { symbol: 'SU.PA',   name: 'Schneider Electric',  weight: 3.38 },
      { symbol: 'ALV.DE',  name: 'Allianz SE',          weight: 3.26 },
      { symbol: 'TTE.PA',  name: 'TotalEnergies',       weight: 3.14 },
      { symbol: 'MC.PA',   name: 'LVMH',                weight: 3.06 },
      { symbol: 'IBE.MC',  name: 'Iberdrola',           weight: 2.73 },
      { symbol: 'UCG.MI',  name: 'UniCredit',           weight: 2.71 },
    ],
  },

  // ── iShares Core MSCI EMU (SXR7) — IE00B53QG562 — Acc ──────────────
  'SXR7.DE': {
    name: 'iShares Core MSCI EMU ETF', ter: 0.12, dist: false,
    sectors: { Financials: 22.4, Industrials: 18.6, Technology: 13.8, 'Consumer Discretionary': 10.2, Healthcare: 9.4, 'Consumer Staples': 7.1, Utilities: 5.8, Energy: 4.2, Materials: 4.1, 'Communication Services': 2.8, 'Real Estate': 1.6 },
    countries: { France: 32.1, Germany: 26.4, Netherlands: 14.8, Spain: 9.2, Italy: 8.4, Belgium: 3.2, Finland: 2.1, Ireland: 1.8, Other: 2.0 },
    holdings: [
      { symbol: 'ASML.AS', name: 'ASML Holding',        weight: 8.42 },
      { symbol: 'SAP.DE',  name: 'SAP SE',              weight: 4.18 },
      { symbol: 'SIE.DE',  name: 'Siemens AG',          weight: 3.94 },
      { symbol: 'SU.PA',   name: 'Schneider Electric',  weight: 3.12 },
      { symbol: 'MC.PA',   name: 'LVMH',                weight: 2.98 },
      { symbol: 'ALV.DE',  name: 'Allianz SE',          weight: 2.84 },
      { symbol: 'SAN.PA',  name: 'Banco Santander',     weight: 2.61 },
      { symbol: 'TTE.PA',  name: 'TotalEnergies',       weight: 2.44 },
      { symbol: 'INGA.AS', name: 'ING Groep',           weight: 2.18 },
      { symbol: 'AIR.PA',  name: 'Airbus',              weight: 2.04 },
    ],
  },

  // ── iShares Global Clean Energy (IQQH) — IE00B1XNHC34 — Dist ───────
  // ~1.2% dividend yield, TER 0.65%
  'IQQH.DE': {
    name: 'iShares Global Clean Energy ETF', ter: 0.65, dist: true, dividendYield: 1.17,
    sectors: { Utilities: 62.4, Technology: 18.8, Industrials: 12.6, Energy: 4.2, Materials: 2.0 },
    countries: { 'United States': 42.1, Denmark: 9.8, Spain: 7.4, China: 7.2, Germany: 5.8, 'United Kingdom': 4.9, Italy: 4.2, Brazil: 3.8, Canada: 3.4, Other: 11.4 },
    holdings: [
      { symbol: 'ENPH',    name: 'Enphase Energy',      weight: 8.84 },
      { symbol: 'ORSTED.CO', name: 'Ørsted',            weight: 8.21 },
      { symbol: 'SEDG',    name: 'SolarEdge',           weight: 6.94 },
      { symbol: 'NEE',     name: 'NextEra Energy',      weight: 6.42 },
      { symbol: 'BEP',     name: 'Brookfield Renewable',weight: 5.18 },
      { symbol: 'FSLR',    name: 'First Solar',         weight: 4.84 },
      { symbol: 'EDP.LS',  name: 'EDP',                 weight: 4.12 },
      { symbol: 'IBE.MC',  name: 'Iberdrola',           weight: 3.94 },
      { symbol: 'VWS.CO',  name: 'Vestas Wind',         weight: 3.62 },
      { symbol: 'RNW.TO',  name: 'TransAlta Renewables',weight: 2.84 },
    ],
  },

  // ── L&G Artificial Intelligence (AIAI) — IE00BK5BCD43 — Acc ─────────
  // Different from AIAG.L (which is distributing). This is accumulating.
  'AIAI.L': {
    name: 'L&G Artificial Intelligence UCITS ETF', ter: 0.49, dist: false,
    sectors: { Technology: 68.4, 'Communication Services': 14.2, Industrials: 9.8, Healthcare: 4.2, Financials: 3.4 },
    countries: { 'United States': 82.4, Taiwan: 4.8, Netherlands: 3.2, China: 3.1, 'South Korea': 2.8, Other: 3.7 },
    holdings: [
      { symbol: 'NVDA',  name: 'NVIDIA Corp',        weight: 8.42 },
      { symbol: 'MSFT',  name: 'Microsoft',          weight: 7.18 },
      { symbol: 'GOOGL', name: 'Alphabet A',         weight: 6.84 },
      { symbol: 'AMZN',  name: 'Amazon',             weight: 6.12 },
      { symbol: 'META',  name: 'Meta Platforms',     weight: 5.94 },
      { symbol: 'CRM',   name: 'Salesforce',         weight: 4.21 },
      { symbol: 'ORCL',  name: 'Oracle',             weight: 3.87 },
      { symbol: 'NOW',   name: 'ServiceNow',         weight: 3.54 },
    ],
  },

  // ── VanEck Video Gaming & Esports (ESPO) — IE00BYWQWR46 — Acc ───────
  'ESPO.AS': {
    name: 'VanEck Video Gaming & Esports ETF', ter: 0.55, dist: false,
    sectors: { Technology: 52.8, 'Communication Services': 38.4, 'Consumer Discretionary': 8.8 },
    countries: { 'United States': 38.2, Japan: 22.4, China: 14.8, 'South Korea': 8.4, Taiwan: 6.2, Other: 10.0 },
    holdings: [
      { symbol: 'NVDA',   name: 'NVIDIA Corp',        weight: 8.14 },
      { symbol: 'RBLX',   name: 'Roblox',             weight: 7.82 },
      { symbol: 'SE',     name: 'Sea Limited',        weight: 6.94 },
      { symbol: '9984.T', name: 'SoftBank Group',     weight: 6.42 },
      { symbol: 'ATVI',   name: 'Activision Blizzard',weight: 5.84 },
      { symbol: 'EA',     name: 'Electronic Arts',    weight: 5.12 },
      { symbol: 'TCEHY',  name: 'Tencent',            weight: 4.84 },
      { symbol: 'NTES',   name: 'NetEase',            weight: 4.21 },
    ],
  },

  // ── Vanguard FTSE Emerging Markets (VFEM) — IE00B3VVMM84 — Dist ─────
  // ~2.8% div yield, TER 0.17%
  'VFEM.AS': {
    name: 'Vanguard FTSE Emerging Markets ETF', ter: 0.17, dist: true, dividendYield: 2.84,
    sectors: { Technology: 22.4, Financials: 21.8, 'Consumer Discretionary': 12.6, 'Communication Services': 9.4, Materials: 8.4, Industrials: 7.2, Energy: 6.8, 'Consumer Staples': 5.8, Healthcare: 3.8, Utilities: 2.2, 'Real Estate': 1.4 },
    countries: { China: 26.8, India: 17.2, Taiwan: 14.8, 'South Korea': 11.2, Brazil: 5.4, 'Saudi Arabia': 4.2, 'South Africa': 3.6, Mexico: 2.8, Indonesia: 2.2, Thailand: 1.8, Other: 10.0 },
    holdings: [
      { symbol: 'TSM',      name: 'Taiwan Semiconductor', weight: 7.84 },
      { symbol: 'TCEHY',   name: 'Tencent Holdings',     weight: 3.94 },
      { symbol: 'SMSN',    name: 'Samsung Electronics',  weight: 3.48 },
      { symbol: 'BABA',    name: 'Alibaba Group',        weight: 2.84 },
      { symbol: 'RELIANCE', name: 'Reliance Industries', weight: 2.14 },
      { symbol: 'MELI',    name: 'MercadoLibre',        weight: 1.84 },
      { symbol: 'INFY',    name: 'Infosys',             weight: 1.62 },
      { symbol: 'PDD',     name: 'PDD Holdings',        weight: 1.48 },
    ],
  },

  // ── Vanguard S&P 500 Dist (VUSA) — IE00B3XXRP09 — Dist ──────────────
  // ~1.3% div yield, TER 0.07%, same index as VOO
  'VUSA.AS': {
    name: 'Vanguard S&P 500 UCITS ETF (Dist)', ter: 0.07, dist: true, dividendYield: 1.31,
    sectors: { Technology: 31.4, Financials: 13.2, Healthcare: 12.1, 'Consumer Discretionary': 10.8, Industrials: 8.7, 'Communication Services': 8.5, 'Consumer Staples': 5.9, Energy: 3.8, Utilities: 2.4, Materials: 2.1, 'Real Estate': 2.3 },
    countries: { 'United States': 100 },
    holdings: [
      { symbol: 'AAPL',  name: 'Apple Inc.',      weight: 7.12 },
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
  },

  // ── Xtrackers MSCI World IT (XDWT) — IE00BM67HT60 — Acc ─────────────
  'XDWT.DE': {
    name: 'Xtrackers MSCI World Information Technology ETF', ter: 0.25, dist: false,
    sectors: { Technology: 100 },
    countries: { 'United States': 84.2, Taiwan: 5.8, Netherlands: 3.2, Japan: 2.4, 'South Korea': 2.1, Other: 2.3 },
    holdings: [
      { symbol: 'AAPL',  name: 'Apple Inc.',      weight: 17.84 },
      { symbol: 'MSFT',  name: 'Microsoft',       weight: 16.42 },
      { symbol: 'NVDA',  name: 'NVIDIA Corp',     weight: 14.18 },
      { symbol: 'AVGO',  name: 'Broadcom',        weight: 4.84 },
      { symbol: 'ASML.AS', name: 'ASML Holding', weight: 3.42 },
      { symbol: 'ORCL',  name: 'Oracle',         weight: 3.18 },
      { symbol: 'AMD',   name: 'AMD',            weight: 2.94 },
      { symbol: 'QCOM',  name: 'Qualcomm',       weight: 2.42 },
      { symbol: 'ADBE',  name: 'Adobe',          weight: 2.14 },
      { symbol: 'CRM',   name: 'Salesforce',     weight: 2.08 },
    ],
  },

  // ── Xtrackers MSCI World Materials (XDWM) — IE00BM67HS53 — Acc ──────
  'XDWM.DE': {
    name: 'Xtrackers MSCI World Materials ETF', ter: 0.25, dist: false,
    sectors: { Materials: 100 },
    countries: { 'United States': 30.4, Australia: 18.2, Japan: 9.4, Canada: 9.2, 'United Kingdom': 8.4, Germany: 5.8, Switzerland: 4.2, France: 3.8, Other: 10.6 },
    holdings: [
      { symbol: 'LIN',     name: 'Linde PLC',        weight: 9.84 },
      { symbol: 'BHP.AX',  name: 'BHP Group',        weight: 8.42 },
      { symbol: 'RIO.L',   name: 'Rio Tinto',        weight: 7.18 },
      { symbol: 'APD',     name: 'Air Products',     weight: 4.84 },
      { symbol: 'SHW',     name: 'Sherwin-Williams', weight: 4.21 },
      { symbol: 'FCX',     name: 'Freeport-McMoRan', weight: 3.94 },
      { symbol: 'VALE',    name: 'Vale SA',          weight: 3.62 },
      { symbol: 'NEM',     name: 'Newmont',          weight: 3.18 },
      { symbol: 'DOW',     name: 'Dow Inc.',         weight: 2.84 },
      { symbol: 'ECL',     name: 'Ecolab',          weight: 2.62 },
    ],
  },

  // ── Xtrackers S&P 500 Equal Weight (XDEW) — IE00BLNMYC90 — Acc ──────
  'XDEW.DE': {
    name: 'Xtrackers S&P 500 Equal Weight ETF', ter: 0.15, dist: false,
    sectors: { Industrials: 14.8, Financials: 13.2, Technology: 12.8, Healthcare: 12.4, 'Consumer Discretionary': 10.8, 'Consumer Staples': 6.8, Energy: 6.4, Materials: 5.8, Utilities: 5.4, 'Real Estate': 5.2, 'Communication Services': 6.4 },
    countries: { 'United States': 100 },
    holdings: [
      { symbol: 'AAPL',  name: 'Apple Inc.',      weight: 0.22 },
      { symbol: 'MSFT',  name: 'Microsoft',       weight: 0.22 },
      { symbol: 'NVDA',  name: 'NVIDIA Corp',     weight: 0.22 },
      { symbol: 'JPM',   name: 'JPMorgan Chase',  weight: 0.22 },
      { symbol: 'XOM',   name: 'Exxon Mobil',     weight: 0.22 },
    ],
  },

  // ── Xtrackers STOXX Europe 600 (DX2X) — LU0328475792 — Acc ──────────
  'DX2X.DE': {
    name: 'Xtrackers STOXX Europe 600 ETF', ter: 0.20, dist: false,
    sectors: { Financials: 18.4, Industrials: 16.8, Healthcare: 14.2, 'Consumer Staples': 10.8, Technology: 9.4, 'Consumer Discretionary': 9.2, Energy: 6.4, Materials: 5.8, Utilities: 4.8, 'Real Estate': 2.4, 'Communication Services': 1.8 },
    countries: { 'United Kingdom': 22.4, France: 17.8, Switzerland: 14.2, Germany: 13.8, Netherlands: 6.4, Sweden: 5.8, Denmark: 4.2, Spain: 3.8, Italy: 3.4, Other: 8.2 },
    holdings: [
      { symbol: 'NESN.SW',  name: 'Nestlé',            weight: 3.84 },
      { symbol: 'ROG.SW',   name: 'Roche',             weight: 3.12 },
      { symbol: 'ASML.AS',  name: 'ASML Holding',      weight: 2.94 },
      { symbol: 'NOVN.SW',  name: 'Novartis',          weight: 2.64 },
      { symbol: 'SAP.DE',   name: 'SAP SE',            weight: 2.42 },
      { symbol: 'AZN.L',    name: 'AstraZeneca',       weight: 2.28 },
      { symbol: 'SHEL.L',   name: 'Shell',             weight: 2.14 },
      { symbol: 'HSBA.L',   name: 'HSBC',              weight: 1.94 },
      { symbol: 'NOVO-B.CO', name: 'Novo Nordisk',     weight: 1.84 },
      { symbol: 'SIE.DE',   name: 'Siemens AG',        weight: 1.72 },
    ],
  },

  // ── iShares Core MSCI Europe Dist (IMEU/IQQY) — IE00B1YZSC51 ─────────
  // Dist, ~2.8% yield, TER 0.12%
  'IMEU.AS': {
    name: 'iShares Core MSCI Europe ETF (Dist)', ter: 0.12, dist: true, dividendYield: 2.84,
    sectors: { Financials: 18.8, Healthcare: 14.4, Industrials: 14.2, 'Consumer Staples': 11.2, Technology: 8.4, 'Consumer Discretionary': 8.2, Energy: 6.8, Materials: 5.4, Utilities: 4.8, 'Communication Services': 4.2, 'Real Estate': 3.6 },
    countries: { 'United Kingdom': 22.4, France: 15.8, Switzerland: 13.4, Germany: 12.8, Netherlands: 5.8, Sweden: 5.4, Denmark: 4.8, Spain: 4.2, Italy: 3.8, Other: 11.6 },
    holdings: [
      { symbol: 'NESN.SW',  name: 'Nestlé',            weight: 3.42 },
      { symbol: 'ASML.AS',  name: 'ASML Holding',      weight: 3.12 },
      { symbol: 'ROG.SW',   name: 'Roche',             weight: 2.84 },
      { symbol: 'AZN.L',    name: 'AstraZeneca',       weight: 2.64 },
      { symbol: 'NOVN.SW',  name: 'Novartis',          weight: 2.42 },
      { symbol: 'NOVO-B.CO', name: 'Novo Nordisk',     weight: 2.18 },
      { symbol: 'SHEL.L',   name: 'Shell',             weight: 2.04 },
      { symbol: 'SAP.DE',   name: 'SAP SE',            weight: 1.94 },
      { symbol: 'HSBA.L',   name: 'HSBC',              weight: 1.84 },
      { symbol: 'LVMH.PA',  name: 'LVMH',              weight: 1.62 },
    ],
  },

  // ── iShares STOXX Global Dividend 100 (ISPA/EXSH) — DE000A0F5UH1 ────
  // Dist, ~4.2% yield, TER 0.46%
  'ISPA.DE': {
    name: 'iShares STOXX Global Select Dividend 100 ETF', ter: 0.46, dist: true, dividendYield: 4.21,
    sectors: { Financials: 22.4, Utilities: 14.8, 'Consumer Staples': 12.4, Energy: 11.2, Industrials: 10.8, 'Real Estate': 9.4, Materials: 6.2, Healthcare: 5.8, Technology: 4.2, 'Communication Services': 2.8 },
    countries: { 'United States': 22.4, Japan: 14.8, Australia: 11.2, Canada: 9.4, 'United Kingdom': 8.8, Germany: 6.4, France: 5.8, Switzerland: 4.2, Netherlands: 3.4, Other: 13.6 },
    holdings: [
      { symbol: 'T',       name: 'AT&T',               weight: 3.84 },
      { symbol: 'BTI',     name: 'British American Tobacco', weight: 3.42 },
      { symbol: 'BCE.TO',  name: 'BCE Inc.',            weight: 3.18 },
      { symbol: 'VALE',    name: 'Vale SA',             weight: 2.94 },
      { symbol: 'BHP.AX',  name: 'BHP Group',          weight: 2.64 },
      { symbol: 'EQNR.OL', name: 'Equinor',            weight: 2.42 },
      { symbol: 'RIO.L',   name: 'Rio Tinto',          weight: 2.18 },
      { symbol: 'ENB.TO',  name: 'Enbridge',           weight: 2.04 },
      { symbol: 'NGG.L',   name: 'National Grid',      weight: 1.94 },
      { symbol: 'KKPNY',   name: 'Koninklijke KPN',    weight: 1.82 },
    ],
  },

  // ── iShares STOXX Europe Small 200 (EXSE) — DE000A0D8QZ7 ─────────────
  // Dist, ~2.2% yield, TER 0.16%
  'EXSE.DE': {
    name: 'iShares STOXX Europe Small 200 ETF', ter: 0.16, dist: true, dividendYield: 2.21,
    sectors: { Industrials: 22.4, Technology: 14.8, 'Consumer Discretionary': 13.2, Healthcare: 11.4, Financials: 10.8, Materials: 8.4, 'Consumer Staples': 6.2, 'Real Estate': 5.8, Energy: 3.4, Utilities: 3.6 },
    countries: { 'United Kingdom': 20.4, Sweden: 14.8, Germany: 12.4, Switzerland: 9.8, France: 9.2, Netherlands: 6.4, Denmark: 5.8, Italy: 5.2, Spain: 3.8, Other: 12.2 },
    holdings: [
      { symbol: 'IMCD.AS', name: 'IMCD Group',        weight: 1.84 },
      { symbol: 'BESI.AS', name: 'BE Semiconductor',  weight: 1.62 },
      { symbol: 'SDXO.AS', name: 'SBM Offshore',      weight: 1.42 },
      { symbol: 'BOY.L',   name: 'Bodycote',          weight: 1.21 },
      { symbol: 'SDRY.L',  name: 'Superdry',          weight: 1.04 },
    ],
  },

  // ── VanEck World Equal Weight (TSWE) — NL0010408704 — Dist ───────────
  // Dist, ~1.8% yield, TER 0.20%
  'TSWE.AS': {
    name: 'VanEck World Equal Weight Screened ETF', ter: 0.20, dist: true, dividendYield: 1.84,
    sectors: { Technology: 14.8, Industrials: 14.2, Financials: 13.8, Healthcare: 13.4, 'Consumer Discretionary': 10.8, 'Consumer Staples': 8.2, Energy: 6.4, Materials: 5.8, Utilities: 5.4, 'Real Estate': 3.6, 'Communication Services': 3.6 },
    countries: { 'United States': 52.4, Japan: 9.4, 'United Kingdom': 5.8, Canada: 4.8, France: 4.2, Germany: 3.8, Switzerland: 3.4, Australia: 3.2, Netherlands: 2.4, Other: 10.6 },
    holdings: [
      { symbol: 'AAPL',   name: 'Apple Inc.',      weight: 0.38 },
      { symbol: 'MSFT',   name: 'Microsoft',       weight: 0.38 },
      { symbol: 'JPM',    name: 'JPMorgan Chase',  weight: 0.38 },
      { symbol: 'UNH',    name: 'UnitedHealth',    weight: 0.38 },
      { symbol: 'JNJ',    name: 'Johnson & Johnson', weight: 0.38 },
    ],
  },

  // ── SPDR MSCI World Technology (SPFT) — IE00BYTRRD19 — Acc ───────────
  'SPFT.DE': {
    name: 'SPDR MSCI World Technology ETF', ter: 0.30, dist: false,
    sectors: { Technology: 100 },
    countries: { 'United States': 84.2, Taiwan: 5.4, Netherlands: 3.2, Japan: 2.6, 'South Korea': 2.2, Other: 2.4 },
    holdings: [
      { symbol: 'AAPL',    name: 'Apple Inc.',      weight: 18.42 },
      { symbol: 'MSFT',    name: 'Microsoft',       weight: 16.84 },
      { symbol: 'NVDA',    name: 'NVIDIA Corp',     weight: 14.62 },
      { symbol: 'AVGO',    name: 'Broadcom',        weight: 4.94 },
      { symbol: 'ASML.AS', name: 'ASML Holding',   weight: 3.48 },
      { symbol: 'ORCL',    name: 'Oracle',         weight: 3.24 },
      { symbol: 'AMD',     name: 'AMD',            weight: 2.84 },
      { symbol: 'QCOM',    name: 'Qualcomm',       weight: 2.54 },
    ],
  },

  // ── Amundi MSCI World (LCUW/CW8) — LU0274211480 — Acc ────────────────
  'LCUW.DE': {
    name: 'Amundi MSCI World UCITS ETF', ter: 0.38, dist: false,
    sectors: { Technology: 25.4, Financials: 15.3, Healthcare: 12.8, Industrials: 11.2, 'Consumer Discretionary': 10.6, 'Communication Services': 8.1, 'Consumer Staples': 6.2, Energy: 4.5, Materials: 3.2, Utilities: 2.2, 'Real Estate': 2.8 },
    countries: { 'United States': 70.8, Japan: 6.2, 'United Kingdom': 4.4, France: 3.4, Canada: 3.2, Switzerland: 2.8, Germany: 2.5, Australia: 2.2, Netherlands: 1.3, Other: 3.2 },
    holdings: [
      { symbol: 'AAPL',  name: 'Apple Inc.',      weight: 5.12 },
      { symbol: 'MSFT',  name: 'Microsoft',       weight: 4.68 },
      { symbol: 'NVDA',  name: 'NVIDIA Corp',     weight: 4.29 },
      { symbol: 'AMZN',  name: 'Amazon',          weight: 2.68 },
      { symbol: 'META',  name: 'Meta Platforms',  weight: 1.84 },
      { symbol: 'GOOGL', name: 'Alphabet A',      weight: 1.49 },
      { symbol: 'TSLA',  name: 'Tesla Inc.',      weight: 1.02 },
      { symbol: 'JPM',   name: 'JPMorgan Chase',  weight: 0.99 },
    ],
  },

  // ── Xtrackers MSCI World Swap (DBXW) — LU0852473528 — Acc ────────────
  'DBXW.DE': {
    name: 'Xtrackers MSCI World Swap UCITS ETF', ter: 0.19, dist: false,
    sectors: { Technology: 25.4, Financials: 15.3, Healthcare: 12.8, Industrials: 11.2, 'Consumer Discretionary': 10.6, 'Communication Services': 8.1, 'Consumer Staples': 6.2, Energy: 4.5, Materials: 3.2, Utilities: 2.2, 'Real Estate': 2.8 },
    countries: { 'United States': 70.8, Japan: 6.2, 'United Kingdom': 4.4, France: 3.4, Canada: 3.2, Switzerland: 2.8, Germany: 2.5, Australia: 2.2, Netherlands: 1.3, Other: 3.2 },
    holdings: [
      { symbol: 'AAPL',  name: 'Apple Inc.',      weight: 5.12 },
      { symbol: 'MSFT',  name: 'Microsoft',       weight: 4.68 },
      { symbol: 'NVDA',  name: 'NVIDIA Corp',     weight: 4.29 },
      { symbol: 'AMZN',  name: 'Amazon',          weight: 2.68 },
      { symbol: 'META',  name: 'Meta Platforms',  weight: 1.84 },
    ],
  },

  // ── Xtrackers AI & Big Data (XAIX) — IE00BGV5VN51 — Acc ─────────────
  'XAIX.DE': {
    name: 'Xtrackers Artificial Intelligence & Big Data ETF', ter: 0.35, dist: false,
    sectors: { Technology: 72.4, 'Communication Services': 16.8, Industrials: 6.4, Healthcare: 2.8, Financials: 1.6 },
    countries: { 'United States': 78.4, Taiwan: 5.8, Netherlands: 3.4, China: 3.2, Japan: 2.8, 'South Korea': 2.4, Other: 4.0 },
    holdings: [
      { symbol: 'NVDA',    name: 'NVIDIA Corp',     weight: 9.42 },
      { symbol: 'MSFT',    name: 'Microsoft',       weight: 8.18 },
      { symbol: 'GOOGL',   name: 'Alphabet A',      weight: 7.84 },
      { symbol: 'META',    name: 'Meta Platforms',  weight: 6.94 },
      { symbol: 'AMZN',    name: 'Amazon',          weight: 6.12 },
      { symbol: 'ASML.AS', name: 'ASML Holding',   weight: 3.48 },
      { symbol: 'TSM',     name: 'Taiwan Semiconductor', weight: 3.12 },
      { symbol: 'CRM',     name: 'Salesforce',     weight: 2.94 },
    ],
  },

  // ── iShares MSCI Europe Consumer Staples (ESIS) — IE00BMW42074 — Acc ─
  'ESIS.DE': {
    name: 'iShares MSCI Europe Consumer Staples ETF', ter: 0.18, dist: false,
    sectors: { 'Consumer Staples': 100 },
    countries: { 'United Kingdom': 22.4, Switzerland: 20.8, France: 16.4, Netherlands: 12.4, Belgium: 8.2, Germany: 7.4, Denmark: 6.8, Sweden: 3.8, Other: 1.8 },
    holdings: [
      { symbol: 'NESN.SW',  name: 'Nestlé',            weight: 16.84 },
      { symbol: 'ULVR.L',   name: 'Unilever',          weight: 8.42 },
      { symbol: 'BNZL.L',   name: 'Bunzl',             weight: 5.18 },
      { symbol: 'DIAGEO.L', name: 'Diageo',            weight: 4.94 },
      { symbol: 'AB-INBEV.BR', name: 'AB InBev',       weight: 4.62 },
      { symbol: 'CARLB.CO', name: 'Carlsberg',         weight: 3.84 },
      { symbol: 'OR.PA',    name: "L'Oréal",           weight: 3.62 },
      { symbol: 'DANONE.PA', name: 'Danone',           weight: 3.18 },
    ],
  },

  // ── iShares MSCI Europe Consumer Disc (ESID) — separate ISIN, keep ETF ─
  'ESID.DE': {
    name: 'iShares MSCI Europe Consumer Discretionary ETF', ter: 0.18, dist: false,
    sectors: { 'Consumer Discretionary': 100 },
    countries: { France: 24.2, Germany: 21.4, 'United Kingdom': 14.8, Sweden: 10.4, Italy: 8.2, Switzerland: 6.4, Netherlands: 5.8, Other: 8.8 },
    holdings: [
      { symbol: 'MC.PA',    name: 'LVMH',              weight: 12.84 },
      { symbol: 'MBG.DE',   name: 'Mercedes-Benz',     weight: 7.42 },
      { symbol: 'BMW.DE',   name: 'BMW AG',            weight: 6.18 },
      { symbol: 'RMS.PA',   name: 'Hermès',            weight: 5.94 },
      { symbol: 'VOW3.DE',  name: 'Volkswagen',        weight: 4.84 },
      { symbol: 'KER.PA',   name: 'Kering',            weight: 4.12 },
      { symbol: 'AD.AS',    name: 'Ahold Delhaize',    weight: 3.84 },
      { symbol: 'ITX.MC',   name: 'Inditex',           weight: 3.62 },
    ],
  },

  // ── HSBC Hang Seng Tech UCITS ETF — IE00BMWXKN31 — Acc ───────────────
  // Trades in HKD. Listed as HSTE.L (London), 3033.HK (Hong Kong)
  // Tracks top 30 tech stocks on HKEX: Meituan, Tencent, Alibaba, JD, Xiaomi etc.
  'HSTE.L': {
    name: 'HSBC Hang Seng Tech UCITS ETF', ter: 0.50, dist: false,
    sectors: { Technology: 42.8, 'Consumer Discretionary': 28.4, 'Communication Services': 16.2, Financials: 8.4, Industrials: 4.2 },
    countries: { 'Hong Kong / China': 98.2, Other: 1.8 },
    holdings: [
      { symbol: '700.HK',  name: 'Tencent Holdings',   weight: 9.84 },
      { symbol: '9988.HK', name: 'Alibaba Group',      weight: 8.42 },
      { symbol: '3690.HK', name: 'Meituan',            weight: 7.94 },
      { symbol: '9618.HK', name: 'JD.com',             weight: 6.84 },
      { symbol: '1810.HK', name: 'Xiaomi Corp',        weight: 6.42 },
      { symbol: '9999.HK', name: 'NetEase',            weight: 5.18 },
      { symbol: '2382.HK', name: 'Sunny Optical',      weight: 4.84 },
      { symbol: '6618.HK', name: 'JD Health',          weight: 4.12 },
      { symbol: '3888.HK', name: 'Kingsoft Corp',      weight: 3.94 },
      { symbol: '1024.HK', name: 'Kuaishou',           weight: 3.62 },
      { symbol: '268.HK',  name: 'Kingdee Int.',       weight: 3.18 },
      { symbol: '2015.HK', name: 'Li Auto',            weight: 2.94 },
      { symbol: '9866.HK', name: 'NIO Inc.',           weight: 2.84 },
      { symbol: '285.HK',  name: 'BYD Electronic',     weight: 2.64 },
      { symbol: '772.HK',  name: 'China Literature',   weight: 2.42 },
      { symbol: '9626.HK', name: 'Bilibili',           weight: 2.18 },
      { symbol: '2013.HK', name: 'Weimob Inc.',        weight: 1.94 },
      { symbol: '6690.HK', name: 'Haier Smart Home',   weight: 1.84 },
      { symbol: '1347.HK', name: 'Hua Hong Semi',      weight: 1.62 },
      { symbol: '9961.HK', name: 'Trip.com Group',     weight: 1.48 },
    ],
  },

  // ── Amundi STOXX Europe 600 Industrials (C6I) — LU1834987890 — Acc ───
  'C6I.PA': {
    name: 'Amundi STOXX Europe 600 Industrials ETF', ter: 0.30, dist: false,
    sectors: { Industrials: 100 },
    countries: { France: 18.4, Germany: 16.8, 'United Kingdom': 14.2, Sweden: 12.4, Switzerland: 9.8, Denmark: 7.4, Spain: 5.8, Netherlands: 4.8, Other: 10.4 },
    holdings: [
      { symbol: 'SIE.DE',   name: 'Siemens AG',        weight: 11.84 },
      { symbol: 'ABB.SW',   name: 'ABB Ltd',           weight: 7.42 },
      { symbol: 'SU.PA',    name: 'Schneider Electric', weight: 7.18 },
      { symbol: 'AIR.PA',   name: 'Airbus',            weight: 6.94 },
      { symbol: 'BA.L',     name: 'BAE Systems',       weight: 4.84 },
      { symbol: 'VOLV-B.ST', name: 'Volvo',            weight: 3.62 },
      { symbol: 'SAND.ST',  name: 'Sandvik',           weight: 3.18 },
      { symbol: 'ATLAS-B.ST', name: 'Atlas Copco',     weight: 2.94 },
    ],
  },

  // ── Vanguard High Dividend Yield ──────────────────────────────────────
  // ISIN: IE00B8GKDB10 | TER: 0.29% | Dist quarterly ~2.6% yield
  // Tickers: VHYL.AS (Amsterdam), VGWD.DE (Xetra), VHYL.L (London)
  'VHYL.AS': {
    name: 'Vanguard FTSE All-World High Dividend Yield ETF', ter: 0.29, dist: true,
    dividendYield: 2.64,
    sectors: { Financials: 22.1, Industrials: 14.8, Healthcare: 11.2, Energy: 9.4, 'Consumer Staples': 9.1, Technology: 8.3, Materials: 6.2, Utilities: 5.8, 'Consumer Discretionary': 5.4, 'Real Estate': 4.2, 'Communication Services': 3.5 },
    countries: { 'United States': 17.8, Japan: 14.2, 'United Kingdom': 9.1, Australia: 8.4, Canada: 6.8, France: 5.2, Germany: 4.8, Switzerland: 4.1, China: 3.9, Taiwan: 3.4, 'South Korea': 3.1, Other: 19.2 },
    holdings: [
      { symbol: 'TSM',      name: 'Taiwan Semiconductor',   weight: 2.18 },
      { symbol: 'NESN.SW',  name: 'Nestlé',                 weight: 1.84 },
      { symbol: 'NOVN.SW',  name: 'Novartis',               weight: 1.62 },
      { symbol: 'SHEL.L',   name: 'Shell',                  weight: 1.58 },
      { symbol: 'TTE.PA',   name: 'TotalEnergies',          weight: 1.41 },
      { symbol: 'HSBA.L',   name: 'HSBC',                   weight: 1.38 },
      { symbol: 'RIO.L',    name: 'Rio Tinto',              weight: 1.24 },
      { symbol: 'BHP.AX',   name: 'BHP Group',              weight: 1.21 },
      { symbol: '8058.T',   name: 'Mitsubishi Corp',        weight: 1.18 },
      { symbol: 'EQNR.OL',  name: 'Equinor',               weight: 1.12 },
      { symbol: 'CVX',      name: 'Chevron',                weight: 1.08 },
      { symbol: 'XOM',      name: 'Exxon Mobil',            weight: 1.04 },
      { symbol: 'ENB.TO',   name: 'Enbridge',               weight: 0.98 },
      { symbol: 'BCE.TO',   name: 'BCE Inc.',               weight: 0.94 },
      { symbol: 'AZN.L',    name: 'AstraZeneca',            weight: 0.91 },
    ],
  },

  // ── Xtrackers Dividend ─────────────────────────────────────────────────
  // ISIN: LU0292096186 | TER: 0.50% | Dist quarterly ~4.5% yield
  'XGSD.DE': {
    name: 'Xtrackers STOXX Global Select Dividend 100', ter: 0.50, dist: true,
    dividendYield: 4.57,
    sectors:  { Technology: 36.2, Industrials: 15.8, Financials: 9.4, Healthcare: 8.3, 'Real Estate': 6.3, Energy: 6.0, 'Consumer Staples': 5.8, 'Consumer Discretionary': 5.7, 'Communication Services': 5.1, Materials: 0.9, Utilities: 0.7 },
    countries: { 'United States': 38.4, Japan: 12.8, Australia: 10.2, 'United Kingdom': 8.4, Canada: 7.6, Germany: 5.2, France: 4.1, Switzerland: 3.8, Netherlands: 2.4, Other: 7.1 },
    holdings: [
      { symbol: 'AAPL',    name: 'Apple Inc.',           weight: 8.90 },
      { symbol: 'AVGO',    name: 'Broadcom Inc.',        weight: 7.88 },
      { symbol: 'JDEP.AS', name: "JDE Peet's N.V.",     weight: 5.01 },
      { symbol: 'MSFT',    name: 'Microsoft',            weight: 4.56 },
      { symbol: 'FUTU',    name: 'Futu Holdings',        weight: 4.14 },
      { symbol: 'TT',      name: 'Trane Technologies',   weight: 2.91 },
      { symbol: 'EQNR.OL', name: 'Equinor ASA',         weight: 2.84 },
      { symbol: 'UNH',     name: 'UnitedHealth Group',   weight: 2.76 },
      { symbol: 'CAT',     name: 'Caterpillar Inc.',     weight: 2.61 },
      { symbol: 'BCE.TO',  name: 'BCE Inc.',             weight: 2.44 },
      { symbol: 'ENB.TO',  name: 'Enbridge Inc.',        weight: 2.38 },
      { symbol: 'BHP.AX',  name: 'BHP Group',            weight: 2.21 },
      { symbol: 'RIO.L',   name: 'Rio Tinto',            weight: 2.14 },
      { symbol: 'TotalEnergies.PA', name: 'TotalEnergies', weight: 2.08 },
      { symbol: '8031.T',  name: 'Mitsui & Co.',         weight: 1.94 },
    ],
  },
}

export const ETF_ALIASES = {
  VWRL: 'VWRL.AS', VWCE: 'VWCE.DE',
  IWDA: 'IWDA.AS', CSPX: 'CSPX.AS',
  EMIM: 'EMIM.AS', XDWD: 'XDWD.DE',
  AIAG: 'AIAG.L',
  // Xtrackers STOXX Global Select Dividend 100 (ISIN: LU0292096186)
  XGSD: 'XGSD.DE', 'XGSD.DE': 'XGSD.DE',
  DXSB: 'XGSD.DE', 'DXSB.DE': 'XGSD.DE',
  // Vanguard FTSE All-World High Dividend Yield (ISIN: IE00B8GKDB10)
  // Listed as VHYL on London/Amsterdam, VGWD on Xetra
  VHYL: 'VHYL.AS', 'VHYL.AS': 'VHYL.AS', 'VHYL.L': 'VHYL.AS',
  VGWD: 'VHYL.AS', 'VGWD.DE': 'VHYL.AS',
  SPY:  'VOO',     IVV:  'VOO',
}

// ISIN → ETF_DATA key mapping for direct ISIN lookups
export const ISIN_TO_ETF = {
  // Vanguard
  'IE00B3RBWM25': 'VWRL.AS',  // Vanguard FTSE All-World Dist
  'IE00BK5BQT80': 'VWCE.DE',  // Vanguard FTSE All-World Acc
  'IE00B8GKDB10': 'VHYL.AS',  // Vanguard FTSE All-World High Dividend Yield
  'IE00B3VVMM84': 'VFEM.AS',  // Vanguard FTSE Emerging Markets Dist
  'IE00B3XXRP09': 'VUSA.AS',  // Vanguard S&P 500 Dist
  // iShares
  'IE00B4L5Y983': 'IWDA.AS',  // iShares Core MSCI World Acc
  'IE00B5BMR087': 'CSPX.AS',  // iShares Core S&P 500 Acc
  'IE00BKM4GZ66': 'EMIM.AS',  // iShares Core MSCI EM IMI
  'IE00B53L3W79': 'SXRT.DE',  // iShares Core EURO STOXX 50 Acc
  'IE00B53QG562': 'SXR7.DE',  // iShares Core MSCI EMU Acc
  'IE00B1XNHC34': 'IQQH.DE',  // iShares Global Clean Energy Dist
  'IE00B1YZSC51': 'IMEU.AS',  // iShares Core MSCI Europe Dist
  'DE000A0F5UH1': 'ISPA.DE',  // iShares STOXX Global Select Dividend 100
  'DE000A0D8QZ7': 'EXSE.DE',  // iShares STOXX Europe Small 200 Dist
  'IE00BMW42074': 'ESIS.DE',  // iShares MSCI Europe Consumer Staples Acc
  'IE00BMWXKN31': 'HSTE.L',   // HSBC Hang Seng Tech UCITS ETF (HKD, London-listed)
  // Xtrackers
  'LU0292096186': 'XGSD.DE',  // Xtrackers STOXX Global Select Dividend 100
  'LU0274208692': 'XDWD.DE',  // Xtrackers MSCI World (old ISIN)
  'LU0274211480': 'LCUW.DE',  // Amundi/Xtrackers MSCI World (some share ISIN)
  'IE00BM67HT60': 'XDWT.DE',  // Xtrackers MSCI World IT Acc
  'IE00BM67HS53': 'XDWM.DE',  // Xtrackers MSCI World Materials Acc
  'IE00BLNMYC90': 'XDEW.DE',  // Xtrackers S&P 500 Equal Weight Acc
  'LU0328475792': 'DX2X.DE',  // Xtrackers STOXX Europe 600 Acc
  'LU0852473528': 'DBXW.DE',  // Xtrackers MSCI World Swap Acc
  'IE00BGV5VN51': 'XAIX.DE',  // Xtrackers AI & Big Data Acc
  // L&G
  'IE00B3F81R35': 'AIAG.L',   // L&G AI ETF Dist
  'IE00BK5BCD43': 'AIAI.L',   // L&G AI ETF Acc
  // VanEck
  'NL0010408704': 'TSWE.AS',  // VanEck World Equal Weight Dist
  'IE00BYWQWR46': 'ESPO.AS',  // VanEck Video Gaming & Esports Acc
  // Amundi
  'LU1834987890': 'C6I.PA',   // Amundi STOXX Europe 600 Industrials Acc
  // SPDR
  'IE00BYTRRD19': 'SPFT.DE',  // SPDR MSCI World Technology Acc
}

export function resolveEtf(symbolOrIsin) {
  if (!symbolOrIsin) return null
  const s = symbolOrIsin.toUpperCase()
  // Direct key in ETF_DATA
  if (ETF_DATA[s]) return s
  // Alias lookup
  if (ETF_ALIASES[s]) return ETF_ALIASES[s]
  // ISIN lookup
  if (ISIN_TO_ETF[symbolOrIsin]) return ISIN_TO_ETF[symbolOrIsin]
  // Partial match: strip exchange suffix and try again (e.g. XGSD.XETR → XGSD.DE)
  const dot = s.lastIndexOf('.')
  if (dot > 0) {
    const base = s.slice(0, dot)
    if (ETF_ALIASES[base]) return ETF_ALIASES[base]
    // Try with common suffixes
    for (const suffix of ['DE', 'AS', 'L', 'PA']) {
      const candidate = `${base}.${suffix}`
      if (ETF_DATA[candidate]) return candidate
    }
  }
  return null
}

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
  const raw = currency || 'EUR'
  // Check for GBp (pence) BEFORE uppercasing — 'GBp'.toUpperCase() = 'GBP' which loses the pence flag
  if (raw === 'GBp' || raw === 'GBp'.toUpperCase() && price > 500) {
    // GBp = pence: divide by 100 to get GBP, then convert to EUR
    const gbpRate = fxRates.GBP ?? DEFAULT_FX.GBP
    return (price / 100) / gbpRate
  }
  const ccy = raw.toUpperCase()
  if (ccy === 'EUR') return price
  if (ccy === 'GBP') return price / (fxRates.GBP ?? DEFAULT_FX.GBP)
  const rate = fxRates[ccy] ?? DEFAULT_FX[ccy]
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
  // Already has Yahoo suffix (e.g. SXRT.DE, ASML.AS)
  if (/\.[A-Z]{1,4}$/.test(symbol)) return symbol
  // Has Finnhub MIC prefix (e.g. XETR:SXRT) — convert to Yahoo format
  if (symbol.includes(':')) {
    const [mic, base] = symbol.split(':')
    const suffix = MIC_TO_SUFFIX[mic]
    return suffix ? `${base}.${suffix}` : base
  }
  // Plain ticker with no suffix — check if it's in ETF_DATA with a suffix
  // e.g. 'SXRT' → ETF_DATA has 'SXRT.DE' → return 'SXRT.DE'
  const upper = symbol.toUpperCase()
  const etfKey = ETF_DATA[upper + '.DE'] ? upper + '.DE'
    : ETF_DATA[upper + '.AS'] ? upper + '.AS'
    : ETF_DATA[upper + '.L']  ? upper + '.L'
    : ETF_DATA[upper + '.PA'] ? upper + '.PA'
    : null
  if (etfKey) return etfKey
  // Also check aliases
  if (ETF_ALIASES[upper]) return ETF_ALIASES[upper]
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

async function yahooQuote(symbol, etfMode = false) {
  const ySym = toYahooSymbol(symbol)
  if (!ySym) return null
  try {
    const url = etfMode
      ? `/api/yahoo?symbol=${encodeURIComponent(ySym)}&mode=etf`
      : `/api/yahoo?symbol=${encodeURIComponent(ySym)}`
    const r = await fetch(url)
    if (!r.ok) return null
    const d = await r.json()
    const q = d?.quoteResponse?.result?.[0]
    if (q?.regularMarketPrice && q.regularMarketPrice > 0) {
      return {
        price:        q.regularMarketPrice,
        currency:     q.currency || 'EUR',  // preserve GBp case — do NOT uppercase here
        dividendYield: (q.trailingAnnualDividendYield != null && q.trailingAnnualDividendYield > 0)
          ? q.trailingAnnualDividendYield : null,
        dividendRate: q.trailingAnnualDividendRate || null,
        // ETF enrichment data from quoteSummary (only in etfMode)
        etf: d.etf || null,
      }
    }
    return null
  } catch { return null }
}

export async function fetchPrice(symbol, type, fxRates = DEFAULT_FX) {
  try {
    const q = await yahooQuote(symbol)
    if (q && q.price > 0) return toEUR(q.price, q.currency, fxRates)
  } catch {}
  try {
    const sym = toFinnhubSymbol(symbol, type)
    const r   = await fetch(`${FINNHUB}/quote&symbol=${sym}`)
    const d   = await r.json()
    if (d.c > 0) return toEUR(d.c, nativeCurrency(symbol, type), fxRates)
  } catch {}
  return null
}

export async function fetchPriceAndYield(symbol, type, fxRates = DEFAULT_FX) {
  const etfKey  = resolveEtf(symbol)
  const etfMeta = etfKey ? ETF_DATA[etfKey] : null
  const isEtf   = type === 'etf'

  // Curated ETF_DATA is authoritative for TER, dividend yield, holdings, sectors, countries.
  // Yahoo Finance is unreliable for UCITS ETF dividend data — use it for price only.
  const curatedTer      = etfMeta?.ter           ?? null
  const curatedDivYield = etfMeta?.dividendYield  ?? null
  const curatedHoldings = etfMeta?.holdings       ?? null
  const curatedSectors  = etfMeta?.sectors        ?? null
  const curatedCountries= etfMeta?.countries      ?? null
  const curatedDist     = etfMeta != null ? (etfMeta.dist ?? null) : null

  // Primary: Yahoo for price + dividend yield
  let priceEUR = null
  let divYield = curatedDivYield  // start with curated value

  try {
    const q = await yahooQuote(symbol, isEtf)
    if (q && q.price > 0) {
      priceEUR = toEUR(q.price, q.currency, fxRates)

      // Only override curated yield if we have live data
      if (divYield == null) {
        if (q.dividendYield != null && q.dividendYield > 0) {
          // Yahoo returns as decimal ratio: 0.035 = 3.5%
          divYield = parseFloat((q.dividendYield * 100).toFixed(2))
        } else if (q.dividendRate != null && q.dividendRate > 0 && priceEUR > 0) {
          const rateEUR = toEUR(q.dividendRate, q.currency, fxRates)
          divYield = parseFloat(((rateEUR / priceEUR) * 100).toFixed(2))
        } else if (q.etf?.divYield != null && q.etf.divYield > 0) {
          divYield = q.etf.divYield
        }
      }

      const holdings = curatedHoldings ?? q.etf?.holdings ?? null
      const sectors  = curatedSectors  ?? q.etf?.sectors  ?? null

      return {
        price:         priceEUR,
        dividendYield: divYield,
        annualFee:     curatedTer ?? q.etf?.ter ?? null,
        holdings, sectors, countries: curatedCountries,
        dist: etfMeta?.dist ?? null,  // true=distributing, false=acc, null=unknown
      }
    }
  } catch (e) { console.warn('[fetchPriceAndYield]', symbol, e?.message) }

  // Finnhub fallback for price
  try {
    const sym = toFinnhubSymbol(symbol, type)
    const r   = await fetch(`${FINNHUB}/quote&symbol=${sym}`)
    const d   = await r.json()
    if (d.c > 0) {
      priceEUR = toEUR(d.c, nativeCurrency(symbol, type), fxRates)
    }
  } catch {}

  // If we have a price but no dividend yet, try Finnhub dividend history for stocks
  if (priceEUR && priceEUR > 0 && divYield == null && type === 'stock') {
    try {
      // Try with full symbol first, then base ticker (without exchange suffix)
      let divs = await fetchDividends(symbol, fxRates)
      if (!divs.length) {
        // Strip exchange suffix and try plain ticker (e.g. ASML.AS → ASML)
        const dot = symbol.lastIndexOf('.')
        if (dot > 0) divs = await fetchDividends(symbol.slice(0, dot), fxRates)
      }
      if (divs.length > 0) {
        const annualEUR = divs.reduce((s, d) => s + (d.amountEUR || 0), 0)
        if (annualEUR > 0) divYield = parseFloat(((annualEUR / priceEUR) * 100).toFixed(2))
      }
    } catch {}
  }

  if (priceEUR && priceEUR > 0) {
    return {
      price: priceEUR, dividendYield: divYield,
      annualFee: curatedTer, holdings: curatedHoldings,
      sectors: curatedSectors, countries: curatedCountries,
      dist: curatedDist,
    }
  }

  return null
}

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
