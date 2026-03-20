// Visit: /api/debug?symbol=XGSD.DE&mode=etf  to see full ETF data
// Visit: /api/debug?symbol=XGSD.DE            to see quote data only

export default async function handler(req, res) {
  const { symbol = 'XGSD.DE', mode } = req.query

  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Referer': 'https://finance.yahoo.com/',
  }

  const out = { symbol, mode, results: {} }

  // Test v7 quote
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`, { headers: HEADERS })
    const d = await r.json()
    const q = d?.quoteResponse?.result?.[0] || {}
    out.results.v7_quote = {
      status: r.status,
      price: q.regularMarketPrice,
      currency: q.currency,
      trailingAnnualDividendYield: q.trailingAnnualDividendYield,
      trailingAnnualDividendRate: q.trailingAnnualDividendRate,
      shortName: q.shortName,
    }
  } catch (e) { out.results.v7_quote = { error: e.message } }

  // Test quoteSummary (ETF holdings/sectors/TER)
  if (mode === 'etf') {
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=topHoldings,fundProfile,defaultKeyStatistics`,
        { headers: HEADERS }
      )
      const d = await r.json()
      const result = d?.quoteSummary?.result?.[0] || {}
      out.results.quoteSummary = {
        status: r.status,
        holdings_count: result.topHoldings?.holdings?.length,
        top3_holdings: result.topHoldings?.holdings?.slice(0, 3),
        sector_count: result.topHoldings?.sectorWeightings?.length,
        sectors_raw: result.topHoldings?.sectorWeightings?.slice(0, 3),
        ter_keyStats: result.defaultKeyStatistics?.annualReportExpenseRatio,
        ter_fundProfile: result.fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio,
        error: d?.quoteSummary?.error,
      }
    } catch (e) { out.results.quoteSummary = { error: e.message } }
  }

  res.status(200).json(out)
}
