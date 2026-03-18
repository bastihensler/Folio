// api/finnhub.js — Vercel serverless function
// Proxies requests to Finnhub server-side, bypassing browser CORS restrictions.
// Called from the frontend as: /api/finnhub?path=/quote&symbol=AAPL

const FINNHUB_KEY = 'd6sg8l1r01qj447bia8gd6sg8l1r01qj447bia90'
const FINNHUB_BASE = 'https://finnhub.io/api/v1'

export default async function handler(req, res) {
  // Allow requests from our own app
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  const { path, ...params } = req.query
  if (!path) { res.status(400).json({ error: 'Missing path param' }); return }

  // Build Finnhub URL — append all query params plus the API key
  const qs = new URLSearchParams({ ...params, token: FINNHUB_KEY }).toString()
  const url = `${FINNHUB_BASE}${path}?${qs}`

  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'folio-app/1.0' } })
    const data = await r.json()
    // Cache for 60s on Vercel edge (reduces redundant API calls)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    res.status(200).json(data)
  } catch (err) {
    res.status(502).json({ error: 'Finnhub fetch failed', detail: err.message })
  }
}
