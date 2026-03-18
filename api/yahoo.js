// api/yahoo.js — Vercel serverless function
// Uses Yahoo Finance v7 quote endpoint which includes:
//   - regularMarketPrice (current price)
//   - trailingAnnualDividendRate (annual dividend per share, in native currency)
//   - trailingAnnualDividendYield (annual yield as decimal, e.g. 0.013 = 1.3%)
//   - currency

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  const { symbol } = req.query
  if (!symbol) { res.status(400).json({ error: 'Missing symbol' }); return }

  // v7 quote endpoint — has fundamental data including dividend yield
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&fields=regularMarketPrice,currency,trailingAnnualDividendRate,trailingAnnualDividendYield,shortName,longName`

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    })

    if (!r.ok) {
      // Fallback to v8 chart endpoint for price-only
      const r2 = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
      )
      if (!r2.ok) { res.status(r.status).json({ error: `Yahoo returned ${r.status}` }); return }
      const data2 = await r2.json()
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
      // Wrap in same structure as v7 for consistent parsing
      const meta = data2?.chart?.result?.[0]?.meta
      if (meta?.regularMarketPrice) {
        return res.status(200).json({
          quoteResponse: {
            result: [{
              regularMarketPrice: meta.regularMarketPrice,
              currency: meta.currency || 'USD',
              trailingAnnualDividendRate: null,
              trailingAnnualDividendYield: null,
            }]
          }
        })
      }
      return res.status(502).json({ error: 'No price data' })
    }

    const data = await r.json()
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    res.status(200).json(data)
  } catch (err) {
    res.status(502).json({ error: 'Yahoo fetch failed', detail: err.message })
  }
}
