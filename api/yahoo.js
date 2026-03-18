// api/yahoo.js — Vercel serverless function
// Proxies Yahoo Finance chart requests server-side to bypass CORS.
// Called as: /api/yahoo?symbol=ASML.AS

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  const { symbol } = req.query
  if (!symbol) { res.status(400).json({ error: 'Missing symbol' }); return }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; folio-app/1.0)',
        'Accept': 'application/json',
      }
    })
    if (!r.ok) { res.status(r.status).json({ error: `Yahoo returned ${r.status}` }); return }
    const data = await r.json()
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    res.status(200).json(data)
  } catch (err) {
    res.status(502).json({ error: 'Yahoo fetch failed', detail: err.message })
  }
}
