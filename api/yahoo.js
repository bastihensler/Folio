// api/yahoo.js — Vercel serverless function
// Handles two modes:
//   ?symbol=ASML.AS         → price + dividend yield (v7 quote)
//   ?symbol=XGSD.L&mode=etf → price + dividend + holdings + sectors (ETF enrichment)

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/',
  'Origin': 'https://finance.yahoo.com',
}

async function fetchQuote(symbol) {
  const urls = [
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
  ]
  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: HEADERS })
      if (!r.ok) continue
      const d = await r.json()
      const q = d?.quoteResponse?.result?.[0]
      if (q?.regularMarketPrice) return q
    } catch {}
  }
  // v8 chart fallback
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
      { headers: HEADERS }
    )
    if (r.ok) {
      const d = await r.json()
      const m = d?.chart?.result?.[0]?.meta
      if (m?.regularMarketPrice) return {
        regularMarketPrice: m.regularMarketPrice,
        currency: m.currency,
        trailingAnnualDividendRate: null,
        trailingAnnualDividendYield: null,
        shortName: '',
      }
    }
  } catch {}
  return null
}

async function fetchEtfData(symbol) {
  // Yahoo quoteSummary — returns holdings, sector weights, expense ratio
  const urls = [
    `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=topHoldings,fundProfile,defaultKeyStatistics`,
    `https://query2.finance.yahoo.com/v11/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=topHoldings,fundProfile,defaultKeyStatistics`,
  ]
  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: HEADERS })
      if (!r.ok) continue
      const d = await r.json()
      const result = d?.quoteSummary?.result?.[0]
      if (result) return result
    } catch {}
  }
  return null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  const { symbol, mode } = req.query
  if (!symbol) { res.status(400).json({ error: 'Missing symbol' }); return }

  // ── ETF enrichment mode ─────────────────────────────────────────────────
  if (mode === 'etf') {
    const [quote, etfData] = await Promise.all([
      fetchQuote(symbol),
      fetchEtfData(symbol),
    ])

    if (!quote && !etfData) {
      return res.status(502).json({ error: 'No data for ' + symbol })
    }

    const topHoldings = etfData?.topHoldings
    const fundProfile = etfData?.fundProfile
    const keyStats    = etfData?.defaultKeyStatistics

    // Parse holdings
    const holdings = (topHoldings?.holdings || []).slice(0, 50).map(h => ({
      symbol: h.symbol || '',
      name:   h.holdingName || h.symbol || '',
      weight: h.holdingPercent ? parseFloat((h.holdingPercent * 100).toFixed(2)) : 0,
    })).filter(h => h.weight > 0)

    // Parse sector weights
    const sectors = {}
    for (const s of (topHoldings?.sectorWeightings || [])) {
      for (const [k, v] of Object.entries(s)) {
        if (k !== 'realestate') { // normalise
          const name = k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1')
          sectors[name] = parseFloat((v * 100).toFixed(1))
        } else {
          sectors['Real Estate'] = parseFloat((v * 100).toFixed(1))
        }
      }
    }

    // Expense ratio (annualReportExpenseRatio is a decimal, e.g. 0.005 = 0.5%)
    const ter = keyStats?.annualReportExpenseRatio?.raw != null
      ? parseFloat((keyStats.annualReportExpenseRatio.raw * 100).toFixed(2))
      : (fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio?.raw != null
          ? parseFloat((fundProfile.feesExpensesInvestment.annualReportExpenseRatio.raw * 100).toFixed(2))
          : null)

    // Dividend yield from quote
    const divYield = quote?.trailingAnnualDividendYield
      ? parseFloat((quote.trailingAnnualDividendYield * 100).toFixed(2))
      : null

    return res.status(200).json({
      quoteResponse: {
        result: [{
          regularMarketPrice:          quote?.regularMarketPrice ?? null,
          currency:                    quote?.currency ?? 'EUR',
          trailingAnnualDividendYield: quote?.trailingAnnualDividendYield ?? null,
          trailingAnnualDividendRate:  quote?.trailingAnnualDividendRate  ?? null,
          shortName:                   quote?.shortName ?? '',
        }]
      },
      // ETF-specific enrichment data
      etf: {
        ter,
        divYield,
        holdings: holdings.length > 0 ? holdings : null,
        sectors:  Object.keys(sectors).length > 0 ? sectors : null,
      }
    })
  }

  // ── Standard quote mode ─────────────────────────────────────────────────
  const quote = await fetchQuote(symbol)
  if (!quote) return res.status(502).json({ error: 'No price data for ' + symbol })

  return res.status(200).json({
    quoteResponse: {
      result: [{
        regularMarketPrice:          quote.regularMarketPrice,
        currency:                    quote.currency || 'USD',
        trailingAnnualDividendRate:  quote.trailingAnnualDividendRate  ?? null,
        trailingAnnualDividendYield: quote.trailingAnnualDividendYield ?? null,
        shortName:                   quote.shortName || '',
      }]
    }
  })
}
