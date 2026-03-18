// api/yahoo.js — Vercel serverless function
// Uses Yahoo Finance v7 quote endpoint for price + dividend data

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  const { symbol } = req.query
  if (!symbol) { res.status(400).json({ error: 'Missing symbol' }); return }

  // Try multiple Yahoo endpoints in order
  const endpoints = [
    // v7 quote — has trailingAnnualDividendYield
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
  ]

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://finance.yahoo.com/',
    'Origin': 'https://finance.yahoo.com',
  }

  for (const url of endpoints) {
    try {
      const r = await fetch(url, { headers })
      if (!r.ok) continue

      const data = await r.json()
      const quote = data?.quoteResponse?.result?.[0]

      if (quote?.regularMarketPrice) {
        // No cache — always fetch fresh data for accuracy
        res.setHeader('Cache-Control', 'no-store')
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
    } catch {}
  }

  // Final fallback: v8 chart endpoint (price only, no dividend data)
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`
    const r = await fetch(url, { headers: { 'User-Agent': headers['User-Agent'], 'Accept': 'application/json' } })
    if (r.ok) {
      const data = await r.json()
      const meta = data?.chart?.result?.[0]?.meta
      if (meta?.regularMarketPrice) {
        res.setHeader('Cache-Control', 'no-store')
        return res.status(200).json({
          quoteResponse: {
            result: [{
              regularMarketPrice:          meta.regularMarketPrice,
              currency:                    meta.currency || 'USD',
              trailingAnnualDividendRate:  null,
              trailingAnnualDividendYield: null,
              shortName:                   '',
            }]
          }
        })
      }
    }
  } catch {}

  res.status(502).json({ error: 'No price data available for ' + symbol })
}
