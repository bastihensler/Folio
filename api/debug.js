// api/debug.js — temporary debug endpoint
// Visit: yourapp.vercel.app/api/debug?symbol=ASML.AS
// Shows the raw Yahoo Finance response so we can see what fields are returned

export default async function handler(req, res) {
  const { symbol = 'ASML.AS' } = req.query

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    })

    const data = await r.json()
    const quote = data?.quoteResponse?.result?.[0] || {}

    // Return only the fields we care about + status info
    res.status(200).json({
      status: r.status,
      symbol,
      found: !!quote.regularMarketPrice,
      price: quote.regularMarketPrice,
      currency: quote.currency,
      trailingAnnualDividendYield: quote.trailingAnnualDividendYield,
      trailingAnnualDividendRate: quote.trailingAnnualDividendRate,
      dividendYield: quote.dividendYield,
      dividendRate: quote.dividendRate,
      shortName: quote.shortName,
      // All keys returned by Yahoo for this symbol
      allKeys: Object.keys(quote),
      // Raw response in case we need to inspect
      raw: quote,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
