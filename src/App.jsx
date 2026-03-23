import { useState, useEffect, useMemo, useRef } from 'react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { sb, ETF_DATA, ETF_HOLDINGS, ETF_ALIASES, ISIN_TO_ETF, US_ISIN_TO_TICKER, resolveEtf, stockCountry, COLORS, delay, fetchPrice, fetchPriceAndYield, fetchDividends, fetchAllFxRates, DEFAULT_FX, FINNHUB } from './config.js'
import { Card, SLabel, Btn, FLabel, Inp, Sel, Modal, thS, Td, fmtE, fmtN, pct } from './ui.jsx'
import AuthScreen from './AuthScreen.jsx'

const TABS = ['overview', 'holdings', 'stocks', 'etfs', 'income', 'transactions', 'allocation', 'exposure', 'risk']

export default function App() {
  const [user,          setUser]          = useState(null)
  const [authChecked,   setAuthChecked]   = useState(false)
  const [holdings,      setHoldings]      = useState([])
  const [txns,          setTxns]          = useState([])
  const [tab,           setTab]           = useState('overview')
  const [fxRates,       setFxRates]       = useState(DEFAULT_FX)   // live FX map
  const [liveEur,       setLiveEur]       = useState(false)
  const [fetchStatus,   setFetchStatus]   = useState('idle')
  const [fetchLog,      setFetchLog]      = useState([])
  const [lastUpdated,   setLastUpdated]   = useState(null)
  const [perfData,      setPerfData]      = useState(() => {
    try { const c = localStorage.getItem('folio_perf'); return c ? JSON.parse(c) : [] } catch { return [] }
  })
  const [showAddH,      setShowAddH]      = useState(false)
  const [showAddT,      setShowAddT]      = useState(false)
  const [showProfile,   setShowProfile]   = useState(false)
  const [csvMsg,        setCsvMsg]        = useState('')
  // Fix #5: declare isinResults state before it's used
  const [isinResults,   setIsinResults]   = useState([])
  const [editingField,  setEditingField]  = useState(null)  // { id, field, value }
  const [holdingDetail, setHoldingDetail] = useState(null)  // holding object for detail modal
  const [detailEdit,    setDetailEdit]    = useState({})    // edited field values
  const [detailTxn,     setDetailTxn]     = useState({ type: 'buy', qty: '', price: '', fee: '0', date: new Date().toISOString().slice(0,10), note: '' })
  const [detailSaving,  setDetailSaving]  = useState(false)
  const [sortState,     setSortState]     = useState({})    // { tabKey: { col, dir } }

  // Cycle sort: none → asc → desc → none
  const cycleSort = (tabKey, col) => {
    setSortState(s => {
      const cur = s[tabKey]
      if (!cur || cur.col !== col) return { ...s, [tabKey]: { col, dir: 'asc' } }
      if (cur.dir === 'asc')       return { ...s, [tabKey]: { col, dir: 'desc' } }
      return { ...s, [tabKey]: null }
    })
  }
  const sortRows = (rows, tabKey) => {
    const s = sortState[tabKey]
    if (!s) return rows
    return [...rows].sort((a, b) => {
      let av = a[s.col], bv = b[s.col]
      if (av == null) av = typeof bv === 'string' ? '' : -Infinity
      if (bv == null) bv = typeof av === 'string' ? '' : -Infinity
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
      return s.dir === 'asc' ? cmp : -cmp
    })
  }
  const SortTh = ({ label, tabKey, col, style = {} }) => {
    const s = sortState[tabKey]
    const active = s?.col === col
    const arrow = !active ? '' : s.dir === 'asc' ? ' ↑' : ' ↓'
    return (
      <th onClick={() => cycleSort(tabKey, col)}
        style={{ ...style, padding: '7px 8px', textAlign: 'left', fontSize: 9, color: active ? 'var(--accent)' : 'var(--muted)', fontFamily: 'DM Mono', letterSpacing: '0.8px', fontWeight: 400, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
        {label}{arrow}
      </th>
    )
  }
  const [isinLookup,    setIsinLookup]    = useState('idle')
  const fileRef = useRef()

  // All values stored and displayed in EUR natively — no conversion needed
  const usdPerEur = fxRates.USD || 1.087  // for header display only

  // ── Auth ──────────────────────────────────────────────────────────────
  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setAuthChecked(true)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (user) loadData() }, [user])

  // On load: fix wrong types AND wrong symbols from ISIN lookup errors
  useEffect(() => {
    if (!holdings.length) return
    // Fix holdings wrongly stored as 'stock' that are actually ETFs
    holdings.filter(h => h.type !== 'etf' && resolveEtf(h.symbol)).forEach(async h => {
      await sb.from('holdings').update({ type: 'etf' }).eq('id', h.id)
      setHoldings(hs => hs.map(x => x.id === h.id ? { ...x, type: 'etf' } : x))
    })
    const needsBackfill = holdings.filter(h =>
      h.type === 'etf' && !h.etfHoldings && resolveEtf(h.symbol)
    )
    if (!needsBackfill.length) return
    needsBackfill.forEach(async h => {
      const etfKey  = resolveEtf(h.symbol)
      const etfMeta = etfKey ? ETF_DATA[etfKey] : null
      if (!etfMeta) return
      const freshHoldings  = etfMeta.holdings.slice(0, 50)
      const freshSectors   = etfMeta.sectors
      const freshCountries = etfMeta.countries || null
      const topSec = Object.entries(etfMeta.sectors).sort((a, b) => b[1] - a[1])[0]?.[0]
      await sb.from('holdings').update({
        etf_holdings:      freshHoldings,
        sector_breakdown:  freshSectors,
        country_breakdown: freshCountries,
        annual_fee:        etfMeta.ter,
        dividend_yield:    etfMeta.dividendYield ?? h.dividendYield,
        dist:              etfMeta.dist ?? null,
        sector:            topSec || h.sector,
      }).eq('id', h.id)
      setHoldings(hs => hs.map(x => x.id !== h.id ? x : {
        ...x,
        etfHoldings:      freshHoldings,
        sectorBreakdown:  freshSectors,
        countryBreakdown: freshCountries,
        annualFee:        etfMeta.ter,
        dividendYield:    etfMeta.dividendYield ?? x.dividendYield,
        dist:             etfMeta.dist ?? x.dist,
        sector:           topSec || x.sector,
      }))
    })
  }, [holdings.length])

  // Backfill missing ETF metadata for existing holdings after load
  useEffect(() => {
    if (!holdings.length) return
    const needsBackfill = holdings.filter(h =>
      h.type === 'etf' && !h.etfHoldings && resolveEtf(h.symbol)
    )
    if (!needsBackfill.length) return
    needsBackfill.forEach(async h => {
      const etfKey  = resolveEtf(h.symbol)
      const etfMeta = etfKey ? ETF_DATA[etfKey] : null
      if (!etfMeta) return
      const freshHoldings = etfMeta.holdings.slice(0, 50)
      const freshSectors  = etfMeta.sectors
      const freshCountries= etfMeta.countries || null
      const freshFee      = etfMeta.ter
      const topSec        = Object.entries(etfMeta.sectors).sort((a, b) => b[1] - a[1])[0]?.[0]
      await sb.from('holdings').update({
        etf_holdings:      freshHoldings,
        sector_breakdown:  freshSectors,
        country_breakdown: freshCountries,
        annual_fee:        freshFee,
        sector:            topSec || h.sector,
      }).eq('id', h.id)
      setHoldings(hs => hs.map(x => x.id !== h.id ? x : {
        ...x,
        etfHoldings:      freshHoldings,
        sectorBreakdown:  freshSectors,
        countryBreakdown: freshCountries,
        annualFee:        freshFee,
        sector:           topSec || x.sector,
      }))
    })
  }, [holdings.length])

  const loadData = async () => {
    const [{ data: h, error: he }, { data: t, error: te }] = await Promise.all([
      sb.from('holdings').select('*').order('created_at'),
      sb.from('transactions').select('*').order('date', { ascending: false }),
    ])
    if (he) console.error('Holdings load error:', he)
    if (te) console.error('Transactions load error:', te)
    if (h) setHoldings(h.map(r => ({
      id: r.id, symbol: r.symbol, name: r.name, type: r.type,
      qty: +r.qty, avgCost: +r.avg_cost, currentPrice: +r.current_price,
      sector: r.sector, annualFee: +r.annual_fee, dividendYield: +r.dividend_yield,
      etfHoldings:      r.etf_holdings      || null,
      sectorBreakdown:  r.sector_breakdown  || null,
      countryBreakdown:  r.country_breakdown || null,
      country:           r.country           || '',
      dist:              r.dist ?? null,  // true=distributing, false=acc, null=unknown
    })))
    if (t) setTxns(t.map(r => ({
      id: r.id, date: r.date, symbol: r.symbol, type: r.type,
      qty: +r.qty, price: +r.price, fee: +r.fee, note: r.note
    })))
  }

  // ── Refresh all live data ──────────────────────────────────────────────
  const refreshAll = async () => {
    setFetchStatus('loading'); setFetchLog([])
    const addLog = msg => setFetchLog(l => [...l, msg])

    // Step 1: fetch FX rates — store in local var AND state
    addLog('Fetching live FX rates…')
    const freshRates = await fetchAllFxRates()
    let activeFxRates = fxRates  // fallback to current state
    if (freshRates) {
      setFxRates(freshRates)
      setLiveEur(true)
      activeFxRates = freshRates  // Fix #1: use fresh rates immediately, not stale state
      addLog(`✓ 1 EUR = ${freshRates.USD?.toFixed(4)} USD · GBP ${(freshRates.GBP ? (1/freshRates.GBP).toFixed(4) : '?')} · CHF ${(freshRates.CHF ? (1/freshRates.CHF).toFixed(4) : '?')}`)
    } else {
      addLog('⚠ FX fetch failed — using fallback rates')
    }

    // Step 2: fetch prices for all holdings
    // Fix #13: batch up to 3 concurrent fetches instead of strict sequential
    const updated = []
    const chunks = []
    for (let i = 0; i < holdings.length; i += 3) chunks.push(holdings.slice(i, i + 3))

    for (const chunk of chunks) {
      const results = await Promise.all(chunk.map(async h => {
        addLog(`Fetching ${h.symbol}…`)
        const data = await fetchPriceAndYield(h.symbol, h.type, activeFxRates)

        // ── Resolve ETF metadata first (independent of price fetch) ──
        const etfKey  = h.type === 'etf' ? resolveEtf(h.symbol) : null
        const etfMeta = etfKey ? ETF_DATA[etfKey] : null

        // ── Static data from ETF_DATA — always applied for known ETFs ──
        let freshSector          = h.sector || ''
        let freshEtfHoldings     = h.etfHoldings || null
        let freshSectorBreakdown = h.sectorBreakdown || null
        let freshCountryBreakdown= h.countryBreakdown || null
        let freshCountry         = h.type !== 'etf' ? (h.country || stockCountry(h.symbol)) : null

        if (h.type === 'etf') {
          // Fetch live composition from Yahoo quoteSummary (catches % changes, new holdings)
          // Curated ETF_DATA takes priority for sectors/countries (Yahoo names are inconsistent)
          // but live holdings override curated when available — that way composition stays current
          const liveData = data  // fetchPriceAndYield already called mode=etf for ETFs
          if (liveData?.holdings?.length > 0) {
            // Use live holdings — they reflect current composition
            freshEtfHoldings = liveData.holdings
            addLog(`  ${h.symbol}: ${liveData.holdings.length} holdings fetched live`)
          } else if (etfMeta) {
            freshEtfHoldings = etfMeta.holdings.slice(0, 50)
          }
          if (etfMeta) {
            // Curated sectors/countries are more reliable than Yahoo's naming
            freshSectorBreakdown  = etfMeta.sectors
            freshCountryBreakdown = etfMeta.countries || null
            const topSec = Object.entries(etfMeta.sectors).sort((a, b) => b[1] - a[1])[0]?.[0]
            if (topSec) freshSector = topSec
          } else if (liveData?.sectors && Object.keys(liveData.sectors).length) {
            freshSectorBreakdown = liveData.sectors
            const topSec = Object.entries(liveData.sectors).sort((a,b) => b[1]-a[1])[0]?.[0]
            if (topSec) freshSector = topSec
          }
        } else if (h.type === 'stock' && !h.sector) {
          try {
            const pr = await fetch(`${FINNHUB}/stock/profile2&symbol=${h.symbol}`)
            const pd = await pr.json()
            if (pd.finnhubIndustry) freshSector = pd.finnhubIndustry
          } catch {}
        }

        // ── TER: always from ETF_DATA for known ETFs, regardless of Yahoo ──
        const annualFee = etfMeta ? etfMeta.ter : (data?.annualFee ?? h.annualFee)

        // ── Price ──
        if (!data?.price) {
          // No price, but still save static ETF metadata and TER to DB
          const { error } = await sb.from('holdings')
            .update({
              annual_fee:        annualFee,
              sector:            freshSector || h.sector,
              etf_holdings:      freshEtfHoldings,
              sector_breakdown:  freshSectorBreakdown,
              country_breakdown: freshCountryBreakdown,
              country:           freshCountry,
              updated_at:        new Date().toISOString()
            })
            .eq('id', h.id)
          addLog(`⚠ ${h.symbol}: no price found${etfMeta ? ` · TER ${annualFee}%` : ''}`)
          return { ...h, annualFee, sector: freshSector || h.sector, etfHoldings: freshEtfHoldings, sectorBreakdown: freshSectorBreakdown, countryBreakdown: freshCountryBreakdown, country: freshCountry }
        }

        const price = data.price

        // ── Dividend yield ──
        let divYield = data.dividendYield ?? null
        if (divYield == null) {
          // Try Finnhub dividend history for both stocks AND distributing ETFs
          const divs = await fetchDividends(h.symbol, activeFxRates)
          if (divs.length > 0) {
            const annualEUR = divs.reduce((s, d) => s + (d.amountEUR || 0), 0)
            divYield = parseFloat(((annualEUR / price) * 100).toFixed(2))
          }
        }
        // Fall back to existing value if nothing found
        if (divYield == null) divYield = h.dividendYield

        const parts = [`€${price.toFixed(2)}`]
        if (divYield > 0) parts.push(`div ${divYield.toFixed(2)}%`)
        else parts.push(`div —`)
        parts.push(`TER ${annualFee ?? '?'}%`)
        if (freshEtfHoldings?.length) parts.push(`${freshEtfHoldings.length} holdings`)
        addLog(`✓ ${h.symbol}: ${parts.join(' · ')}`)

        const { error } = await sb.from('holdings')
          .update({
            current_price:     price,
            dividend_yield:    divYield,
            annual_fee:        annualFee,
            sector:            freshSector || h.sector,
            etf_holdings:      freshEtfHoldings,
            sector_breakdown:  freshSectorBreakdown,
            country_breakdown: freshCountryBreakdown,
            country:           freshCountry,
            dist:              etfMeta?.dist ?? data?.dist ?? h.dist ?? null,
            updated_at:        new Date().toISOString()
          })
          .eq('id', h.id)
        if (error) addLog(`⚠ ${h.symbol}: DB update failed`)
        return {
          ...h,
          currentPrice:     price,
          dividendYield:    divYield,
          annualFee,
          sector:           freshSector || h.sector,
          etfHoldings:      freshEtfHoldings,
          sectorBreakdown:  freshSectorBreakdown,
          countryBreakdown: freshCountryBreakdown,
          country:          freshCountry,
          dist:             etfMeta?.dist ?? data?.dist ?? h.dist ?? null,
        }
      }))
      updated.push(...results)
      await delay(300)
    }
    setHoldings(updated)

    // Step 3: build portfolio history from transactions
    // Fix #6: add clear label that this uses current prices as approximation
    if (txns.length > 0) {
      addLog('Building portfolio history (using current prices as approximation)…')
      const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date))
      const months = []
      const cur = new Date(sorted[sorted.length - 1].date); cur.setDate(1)
      while (cur <= new Date()) {
        months.push(cur.toISOString().slice(0, 10))
        cur.setMonth(cur.getMonth() + 1)
      }
      const newPerf = months.slice(-12).map(md => {
        const snap = {}
        txns.forEach(t => {
          if (t.date <= md) {
            if (!snap[t.symbol]) snap[t.symbol] = 0
            snap[t.symbol] += t.type === 'buy' ? +t.qty : -+t.qty
          }
        })
        let val = 0
        Object.entries(snap).forEach(([sym, qty]) => {
          if (qty <= 0) return
          const h = updated.find(x => x.symbol === sym)
          if (h) val += qty * h.currentPrice
        })
        return val > 0
          ? { month: new Date(md).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), value: val }
          : null
      }).filter(Boolean)
      if (newPerf.length >= 2) {
        setPerfData(newPerf)
        try { localStorage.setItem('folio_perf', JSON.stringify(newPerf)) } catch {}
        addLog(`✓ History: ${newPerf.length} months`)
      }
    }

    setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    setFetchStatus('done'); addLog('✓ All done!')
  }

  // ── Add Holding ───────────────────────────────────────────────────────
  const emptyNh = {
    isin: '', symbol: '', name: '', type: 'stock',
    qty: '', avgCostEur: '',
    // Enriched by lookup — user never types these:
    currentPrice: '', currency: 'EUR', sector: '',
    annualFee: '', dividendYield: '',
    etfHoldings: null,   // top holdings array for ETFs
    sectors: null,       // sector breakdown object
    enriched: false,     // true once lookup completed successfully
  }
  const [nh, setNh] = useState(emptyNh)

  const resetAddHolding = () => {
    setNh(emptyNh)
    setIsinLookup('idle')
    setIsinResults([])  // Fix #4: always clear results
  }

  const enrichSymbol = async (sym, type, name, isin = '') => {
    // 1. ETF_DATA lookup — try symbol first, then ISIN directly
    const etfKey  = type === 'etf' ? (resolveEtf(sym) || resolveEtf(isin)) : null
    const etfMeta = etfKey ? ETF_DATA[etfKey] : null

    // 2. Finnhub stock profile for sector (stocks only)
    let sector = ''
    if (type === 'stock') {
      try {
        const pr = await fetch(`${FINNHUB}/stock/profile2&symbol=${sym}`)
        const pd = await pr.json()
        if (pd.finnhubIndustry) sector = pd.finnhubIndustry
      } catch {}
    }

    // For ETFs: primary sector from curated data
    if (type === 'etf' && etfMeta) {
      sector = Object.entries(etfMeta.sectors).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    }

    // 3. Live price + dividend yield + ETF data from Yahoo (and ETF_DATA curated)
    // fetchPriceAndYield now returns holdings/sectors/countries for ETFs
    const priceData = await fetchPriceAndYield(sym, type, fxRates)

    // 4. Assemble enriched holding
    // Holdings/sectors/countries: prefer curated ETF_DATA, fall back to Yahoo live data
    const etfHoldings = (etfMeta?.holdings ?? priceData?.holdings ?? null)?.slice(0, 50)
    const sectors     = etfMeta?.sectors   ?? priceData?.sectors   ?? null
    const countries   = etfMeta?.countries ?? priceData?.countries ?? null

    // Primary sector for display (highest weighted)
    if (type === 'etf' && sectors && !sector) {
      sector = Object.entries(sectors).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    }

    return {
      symbol:       sym,
      name:         name || sym,
      type,
      sector,
      currency:     priceData?.currency || 'EUR',
      currentPrice: priceData?.price    ? String(priceData.price.toFixed(2)) : '',
      dividendYield:priceData?.dividendYield != null ? String(priceData.dividendYield) : '',
      annualFee:    priceData?.annualFee != null ? String(priceData.annualFee)
                  : etfMeta             ? String(etfMeta.ter)
                  : '',
      etfHoldings,
      sectors,
      countries,
      country:      type !== 'etf' ? stockCountry(sym) : null,
      dist:         priceData?.dist ?? etfMeta?.dist ?? null,
      enriched:     true,
    }
  }

  const lookupISIN = async () => {
    if (!nh.isin || nh.isin.length < 10) return
    setIsinLookup('loading')
    try {
      // Check US stock ISIN map first — Finnhub is unreliable for US ISINs
      const usTicker = US_ISIN_TO_TICKER[nh.isin.toUpperCase()]
      if (usTicker) {
        const enriched = await enrichSymbol(usTicker, 'stock', '', nh.isin)
        setNh(h => ({ ...h, ...enriched }))
        setIsinResults([])
        setIsinLookup('found')
        return
      }

      const r = await fetch(`${FINNHUB}/search&q=${nh.isin.toUpperCase()}`)
      const d = await r.json()
      const results = d?.result || []
      const countryCode = nh.isin.slice(0, 2).toUpperCase()

      const prefExchange = {
        NL: ['AS', 'AMS', 'XAMS'],
        DE: ['DE', 'XETR', 'GR'],
        FR: ['PA', 'XPAR'],
        BE: ['BR', 'XBRU'], IT: ['MI', 'XMIL'], ES: ['MC', 'XMAD'],
        GB: ['L', 'LSE', 'XLON'],
        // IE/LU = fund domicile, not listing exchange — prefer Xetra then Amsterdam
        IE: ['DE', 'XETR', 'AS', 'AMS', 'L', 'ISE'],
        LU: ['DE', 'XETR', 'AS', 'AMS', 'LU'],
        SE: ['ST', 'XSTO'], NO: ['OL', 'XOSL'], DK: ['CO', 'XCSE'],
        FI: ['HE', 'XHEL'], CH: ['SW', 'XSWX'], US: ['US', 'XNYS', 'XNAS'],
      }
      const preferred = prefExchange[countryCode] || []

      let best = null
      for (const ex of preferred) {
        best = results.find(r => r.symbol?.includes(ex) || r.displaySymbol?.includes('.' + ex))
        if (best) break
      }
      if (!best) best = results[0]

      if (best || ISIN_TO_ETF[nh.isin.toUpperCase()]) {
        // If we have a canonical ticker for this ISIN, use it directly
        // (avoids wrong symbols from Finnhub e.g. SXRT.ISE instead of SXRT.DE)
        const canonicalKey = ISIN_TO_ETF[nh.isin.toUpperCase()]
        const canonicalSym = canonicalKey || best?.symbol || best?.displaySymbol || ''
        const sym  = canonicalSym
        const name = best?.description || (ETF_DATA[canonicalKey]?.name) || sym
        const fType = (best?.type || '').toUpperCase()
        const type = canonicalKey
          ? 'etf'
          : (['ETF','ETP','FUND','MUTUALFUND','BOND'].some(t => fType.includes(t)) ? 'etf' : fType === 'CRYPTO' ? 'crypto' : 'stock')
        const enriched = await enrichSymbol(sym, type, name, nh.isin || '')
        setNh(h => ({ ...h, ...enriched }))
        setIsinResults(results.slice(0, 6))
        setIsinLookup('found')
      } else {
        // For US ISINs not in our map, show a helpful message with the country code
        setIsinLookup(countryCode === 'US' ? 'us_manual' : 'notfound')
      }
    } catch (e) {
      console.error('ISIN lookup error:', e)
      setIsinLookup('notfound')
    }
  }

  const selectIsinResult = async result => {
    const sym  = result.symbol || result.displaySymbol || ''
    const name = result.description || ''
    const ft = (result.type || '').toUpperCase()
    const type = ['ETF','ETP','FUND','MUTUALFUND'].some(t => ft.includes(t)) ? 'etf' : ft === 'CRYPTO' ? 'crypto' : 'stock'
    setIsinLookup('loading')
    const enriched = await enrichSymbol(sym, type, name)
    setNh(h => ({ ...h, ...enriched }))
    setIsinLookup('found')
  }

  const addHolding = async () => {
    if ((!nh.symbol && !nh.isin) || !nh.qty || !nh.avgCostEur) return
    const sym = nh.symbol.trim().toUpperCase()
    if (!sym) { alert('Voer een ticker symbool in of gebruik ISIN opzoeken'); return }

    // If not yet enriched via ISIN lookup, enrich now
    let enriched = nh
    if (!nh.enriched) {
      enriched = { ...nh, ...(await enrichSymbol(sym, nh.type || 'stock', nh.name)) }
    }

    const avgCostEUR = +enriched.avgCostEur
    const price      = enriched.currentPrice ? +enriched.currentPrice : await fetchPrice(sym, enriched.type, fxRates) || 0
    const finalFee   = enriched.annualFee !== '' ? +enriched.annualFee : 0
    const finalDiv   = enriched.dividendYield !== '' ? +enriched.dividendYield : 0
    const finalSec   = enriched.sector || 'Other'

    const row = {
      user_id: user.id, symbol: sym, name: enriched.name || sym, type: enriched.type,
      qty: +enriched.qty, avg_cost: avgCostEUR, current_price: price,
      sector: finalSec, annual_fee: finalFee, dividend_yield: finalDiv,
      etf_holdings:      enriched.etfHoldings      || null,
      sector_breakdown:  enriched.sectors          || null,
      country_breakdown: enriched.countries        || null,
      country:           enriched.country          || null,
      dist:           enriched.dist ?? null,
    }
    // Check if holding already exists — merge instead of creating duplicate
    const existing = holdings.find(h => h.symbol === sym)
    if (existing) {
      const addQty    = +enriched.qty
      const newQty    = existing.qty + addQty
      const newAvg    = (existing.qty * existing.avgCost + addQty * avgCostEUR) / newQty
      const mergedFee = finalFee || existing.annualFee
      const mergedDiv = finalDiv || existing.dividendYield
      const { error } = await sb.from('holdings')
        .update({ qty: newQty, avg_cost: newAvg, annual_fee: mergedFee, dividend_yield: mergedDiv, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) { alert(`Opslaan mislukt: ${error.message}`); return }
      setHoldings(hs => hs.map(h => h.id === existing.id
        ? { ...h, qty: newQty, avgCost: newAvg, annualFee: mergedFee, dividendYield: mergedDiv }
        : h
      ))
      resetAddHolding()
      setShowAddH(false)
      return
    }

    const { data, error } = await sb.from('holdings').insert(row).select().single()
    if (error) { alert(`Opslaan mislukt: ${error.message}`); return }
    setHoldings(hs => [...hs, {
      id: data.id, symbol: sym, name: enriched.name || sym, type: enriched.type,
      qty: +enriched.qty, avgCost: avgCostEUR, currentPrice: price,
      sector: finalSec, annualFee: finalFee, dividendYield: finalDiv,
      etfHoldings:      enriched.etfHoldings  || null,
      sectorBreakdown:  enriched.sectors      || null,
      countryBreakdown: enriched.countries    || null,
      country:          enriched.country      || '',
      dist:             enriched.dist         ?? null,
    }])
    resetAddHolding()
    setShowAddH(false)
  }

  const deleteHolding = async id => {
    const { error } = await sb.from('holdings').delete().eq('id', id)
    if (!error) setHoldings(hs => hs.filter(h => h.id !== id))
  }


  const exportCSV = () => {
    const now = new Date().toISOString().slice(0, 10)
    const headers = ['symbol','name','type','dist','qty','avgCost','currentPrice','value','gain','gainPct','annualFee','dividendYield','annCost','annDiv','netPA','sector','country']
    const rows = C.rows.map(r => {
      const net = r.annDiv - r.annCost
      const distStr = r.dist === true ? 'dist' : r.dist === false ? 'acc' : ''
      return [
        r.symbol, `"${(r.name||'').replace(/"/g,'""')}"`, r.type, distStr,
        r.qty, r.avgCost.toFixed(4), r.currentPrice.toFixed(4),
        r.value.toFixed(2), r.gain.toFixed(2), r.gainPct.toFixed(2),
        r.annualFee, r.dividendYield, r.annCost.toFixed(2), r.annDiv.toFixed(2),
        net.toFixed(2), `"${(r.sector||'').replace(/"/g,'""')}"`,
        `"${(r.country||'').replace(/"/g,'""')}"`
      ].join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `folio-${now}.csv` })
    a.click(); URL.revokeObjectURL(url)
  }

  const exportTransactionsCSV = () => {
    const now = new Date().toISOString().slice(0, 10)
    const headers = ['date','symbol','type','qty','price','fee','total','note']
    const rows = C.txnRows.map(r => [
      r.date, r.symbol, r.type, r.qty,
      r.price.toFixed(4), r.fee.toFixed(4), r.totalCostTxn.toFixed(2),
      `"${(r.note||'').replace(/"/g,'""')}"`
    ].join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `folio-transactions-${now}.csv` })
    a.click(); URL.revokeObjectURL(url)
  }

  const saveFieldEdit = async (id, field, value) => {
    const numVal = parseFloat(value) || 0
    const dbField = field === 'dividendYield' ? 'dividend_yield' : 'annual_fee'
    const { error } = await sb.from('holdings').update({ [dbField]: numVal, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) {
      setHoldings(hs => hs.map(h => h.id === id ? { ...h, [field]: numVal } : h))
    }
    setEditingField(null)
  }

  // ── Holding detail modal ─────────────────────────────────────────────
  const openDetail = (holding) => {
    setHoldingDetail(holding)
    setDetailEdit({
      name:          holding.name,
      sector:        holding.sector || '',
      avgCost:       holding.avgCost.toFixed(4),
      qty:           holding.qty.toString(),
      dividendYield: holding.dividendYield.toString(),
      annualFee:     holding.annualFee.toString(),
    })
    setDetailTxn({ type: 'buy', qty: '', price: '', fee: '0', date: new Date().toISOString().slice(0,10), note: '' })
  }

  const saveDetail = async () => {
    if (!holdingDetail) return
    setDetailSaving(true)
    const updates = {
      name:          detailEdit.name         || holdingDetail.name,
      sector:        detailEdit.sector       || holdingDetail.sector,
      avg_cost:      parseFloat(detailEdit.avgCost)       || holdingDetail.avgCost,
      qty:           parseFloat(detailEdit.qty)           || holdingDetail.qty,
      dividend_yield:parseFloat(detailEdit.dividendYield) || 0,
      annual_fee:    parseFloat(detailEdit.annualFee)     || 0,
      updated_at:    new Date().toISOString(),
    }
    const { error } = await sb.from('holdings').update(updates).eq('id', holdingDetail.id)
    if (!error) {
      setHoldings(hs => hs.map(h => h.id === holdingDetail.id ? {
        ...h,
        name:          updates.name,
        sector:        updates.sector,
        avgCost:       updates.avg_cost,
        qty:           updates.qty,
        dividendYield: updates.dividend_yield,
        annualFee:     updates.annual_fee,
      } : h))
      setHoldingDetail(h => ({ ...h, name: updates.name, sector: updates.sector, avgCost: updates.avg_cost, qty: updates.qty, dividendYield: updates.dividend_yield, annualFee: updates.annual_fee }))
    }
    setDetailSaving(false)
  }

  const addDetailTxn = async () => {
    if (!holdingDetail || !detailTxn.qty || !detailTxn.price) return
    setDetailSaving(true)
    const price  = parseFloat(detailTxn.price)
    const qty    = parseFloat(detailTxn.qty)
    const fee    = parseFloat(detailTxn.fee) || 0
    const { data, error } = await sb.from('transactions')
      .insert({ user_id: user.id, date: detailTxn.date, symbol: holdingDetail.symbol, type: detailTxn.type, qty, price, fee, note: detailTxn.note || '' })
      .select().single()
    if (!error) {
      // Update holding qty and avg cost
      const h = holdingDetail
      const newQty = detailTxn.type === 'buy' ? h.qty + qty : Math.max(0, h.qty - qty)
      const newAvg = detailTxn.type === 'buy' ? (h.qty * h.avgCost + qty * price) / (h.qty + qty) : h.avgCost
      await sb.from('holdings').update({ qty: newQty, avg_cost: newAvg, updated_at: new Date().toISOString() }).eq('id', h.id)
      setHoldings(hs => hs.map(x => x.id === h.id ? { ...x, qty: newQty, avgCost: newAvg } : x))
      setHoldingDetail(x => ({ ...x, qty: newQty, avgCost: newAvg }))
      setDetailEdit(e => ({ ...e, qty: newQty.toString(), avgCost: newAvg.toFixed(4) }))
      setTxns(ts => [{ id: data.id, date: detailTxn.date, symbol: holdingDetail.symbol, type: detailTxn.type, qty, price, fee, note: detailTxn.note || '' }, ...ts])
      setDetailTxn(t => ({ ...t, qty: '', price: '', fee: '0', note: '' }))
    }
    setDetailSaving(false)
  }

  const useCurrentPrice = async () => {
    if (!holdingDetail) return
    const p = await fetchPrice(holdingDetail.symbol, holdingDetail.type, fxRates)
    if (p) setDetailTxn(t => ({ ...t, price: p.toFixed(2) }))
  }

  // ── CSV Export ─────────────────────────────────────────────────────────
  const downloadCSV = (rows, filename) => {
    const csv = rows.map(r => r.map(v => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const exportHoldings = () => {
    const headers = ['Symbol','Name','Type','Dist/Acc','Qty','Avg Cost (€)','Current Price (€)','Value (€)','Gain (€)','Gain %','Sector','Country','TER %','Div Yield %','Ann Cost (€)','Ann Div (€)','Net Income p.a. (€)','Holdings Count']
    const rows = C.rows.map(r => [
      r.symbol, r.name, r.type,
      r.dist === true ? 'Distributing' : r.dist === false ? 'Accumulating' : '',
      r.qty.toFixed(4),
      r.avgCost.toFixed(4),
      r.currentPrice.toFixed(4),
      r.value.toFixed(2),
      r.gain.toFixed(2),
      r.gainPct.toFixed(2),
      r.sector || '',
      r.country || '',
      r.annualFee,
      r.dividendYield,
      r.annCost.toFixed(2),
      r.annDiv.toFixed(2),
      (r.annDiv - r.annCost).toFixed(2),
      r.etfHoldings?.length ?? '',
    ])
    downloadCSV([headers, ...rows], `folio-holdings-${new Date().toISOString().slice(0,10)}.csv`)
  }

  const exportTransactions = () => {
    const headers = ['Date','Symbol','Type','Qty','Price (€)','Fee (€)','Total (€)','Current Value (€)','P&L (€)','Note']
    const rows = C.txnRows.map(t => [
      t.date, t.symbol, t.type, t.qty,
      t.price.toFixed(4),
      t.fee.toFixed(2),
      t.totalCostTxn.toFixed(2),
      t.currentVal.toFixed(2),
      t.pnl.toFixed(2),
      t.note || '',
    ])
    downloadCSV([headers, ...rows], `folio-transactions-${new Date().toISOString().slice(0,10)}.csv`)
  }

  const exportETFs = () => {
    const headers = ['Symbol','Name','Type','Dist/Acc','Qty','Avg Cost (€)','Current Price (€)','Value (€)','Gain (€)','Gain %','TER %','Dist Yield %','Ann Cost (€)','Ann Div (€)','Net p.a. (€)','Holdings Count','Top 5 Holdings']
    const eRows = C.rows.filter(r => r.type === 'etf')
    const rows = eRows.map(r => [
      r.symbol, r.name, 'ETF',
      r.dist === true ? 'Distributing' : r.dist === false ? 'Accumulating' : '',
      r.qty.toFixed(4),
      r.avgCost.toFixed(4),
      r.currentPrice.toFixed(4),
      r.value.toFixed(2),
      r.gain.toFixed(2),
      r.gainPct.toFixed(2),
      r.annualFee,
      r.dividendYield,
      r.annCost.toFixed(2),
      r.annDiv.toFixed(2),
      (r.annDiv - r.annCost).toFixed(2),
      r.etfHoldings?.length ?? '',
      r.etfHoldings?.slice(0,5).map(h => `${h.symbol} ${h.weight}%`).join('; ') ?? '',
    ])
    downloadCSV([headers, ...rows], `folio-etfs-${new Date().toISOString().slice(0,10)}.csv`)
  }

  const exportStocks = () => {
    const headers = ['Symbol','Name','Qty','Avg Cost (€)','Current Price (€)','Value (€)','Gain (€)','Gain %','Sector','Country','Div Yield %','Ann Div (€)']
    const sRows = C.rows.filter(r => r.type === 'stock' || r.type === 'crypto')
    const rows = sRows.map(r => [
      r.symbol, r.name,
      r.qty.toFixed(4),
      r.avgCost.toFixed(4),
      r.currentPrice.toFixed(4),
      r.value.toFixed(2),
      r.gain.toFixed(2),
      r.gainPct.toFixed(2),
      r.sector || '',
      r.country || '',
      r.dividendYield,
      r.annDiv.toFixed(2),
    ])
    downloadCSV([headers, ...rows], `folio-stocks-${new Date().toISOString().slice(0,10)}.csv`)
  }

  // ── Add Transaction ───────────────────────────────────────────────────
  const emptyNt = { date: new Date().toISOString().slice(0, 10), symbol: '', type: 'buy', qty: '', priceEur: '', fee: '0', note: '' }
  const [nt, setNt] = useState(emptyNt)

  const addTxn = async () => {
    if (!nt.symbol || !nt.qty || !nt.priceEur) return
    // Price and fee entered and stored in EUR
    const t = { ...nt, qty: +nt.qty, price: +nt.priceEur, fee: +nt.fee, symbol: nt.symbol.toUpperCase() }
    // Fix #12: check for DB error before updating state
    const { data, error } = await sb.from('transactions')
      .insert({ user_id: user.id, date: t.date, symbol: t.symbol, type: t.type, qty: t.qty, price: t.price, fee: t.fee, note: t.note || '' })
      .select().single()
    if (error) { alert(`Failed to save transaction: ${error.message}`); return }

    setTxns(ts => [{ ...t, id: data.id }, ...ts].sort((a, b) => b.date.localeCompare(a.date)))
    setHoldings(hs => hs.map(h => {
      if (h.symbol !== t.symbol) return h
      const newQty = t.type === 'buy' ? h.qty + t.qty : Math.max(0, h.qty - t.qty)
      const newAvg = t.type === 'buy' ? (h.qty * h.avgCost + t.qty * t.price) / (h.qty + t.qty) : h.avgCost
      sb.from('holdings').update({ qty: newQty, avg_cost: newAvg, updated_at: new Date().toISOString() }).eq('id', h.id)
      return { ...h, qty: newQty, avgCost: newAvg }
    }))
    setNt(emptyNt)
    setShowAddT(false)
  }

  const deleteTxn = async id => {
    const { error } = await sb.from('transactions').delete().eq('id', id)
    if (!error) setTxns(ts => ts.filter(t => t.id !== id))
  }

  // ── CSV Import ────────────────────────────────────────────────────────
  const handleCSV = e => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const lines   = ev.target.result.trim().split('\n')
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        let count = 0, errors = 0
        for (const line of lines.slice(1)) {
          const vals = line.split(',').map(v => v.trim())
          const row  = {}; headers.forEach((h, i) => row[h] = vals[i])
          if (!row.symbol || !row.qty) continue
          // CSV avg cost is in EUR — store directly
          const rec = {
            user_id: user.id, symbol: row.symbol.toUpperCase(), name: row.name || row.symbol,
            type: row.type || 'stock', qty: +row.qty || 0, avg_cost: +row.avgcost || 0,
            current_price: +row.currentprice || 0, sector: row.sector || 'Other',
            annual_fee: +row.annualfee || 0, dividend_yield: +row.dividendyield || 0
          }
          const { data, error } = await sb.from('holdings').insert(rec).select().single()
          if (error) { errors++; continue }
          setHoldings(hs => [...hs, {
            id: data.id, symbol: rec.symbol, name: rec.name, type: rec.type,
            qty: rec.qty, avgCost: rec.avg_cost, currentPrice: rec.current_price,
            sector: rec.sector, annualFee: rec.annual_fee, dividendYield: rec.dividend_yield
          }])
          count++
        }
        const msg = errors > 0
          ? `✓ Imported ${count}, ⚠ ${errors} failed`
          : `✓ Imported ${count} holdings`
        setCsvMsg(msg); setTimeout(() => setCsvMsg(''), 4000)
        // Auto-refresh prices for newly imported holdings
        if (count > 0) setTimeout(() => refreshAll(), 500)
      } catch { setCsvMsg('✗ CSV parse error — check format') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  // ── Computed values ───────────────────────────────────────────────────
  const C = useMemo(() => {
    const empty = {
      rows: [], totalValue: 0, totalCost: 0, totalGain: 0, totalGainPct: 0,
      totalAnnCost: 0, totalAnnDiv: 0, netAnnIncome: 0,
      allocationData: [], typeData: [], winners: [], losers: [],
      avgVol: 0, concentration: 0, txnRows: [], totalTxnFees: 0,
      exposureRows: [], etfSymbols: [], countryData: [], etfSectorData: []
    }
    if (!holdings.length) return empty

    const rows = holdings.map(h => {
      const value   = h.qty * h.currentPrice
      const cost    = h.qty * h.avgCost
      const gain    = value - cost
      const gainPct = cost ? (gain / cost) * 100 : 0
      return { ...h, value, cost, gain, gainPct, annCost: value * (h.annualFee / 100), annDiv: value * (h.dividendYield / 100) }
    })

    const tv  = rows.reduce((s, r) => s + r.value, 0)
    const tc  = rows.reduce((s, r) => s + r.cost, 0)
    const tg  = tv - tc
    const tac = rows.reduce((s, r) => s + r.annCost, 0)
    const tad = rows.reduce((s, r) => s + r.annDiv, 0)

    // For sector allocation: ETFs with curated data contribute their actual sector breakdown
    // Direct stocks contribute their assigned sector
    const bySec = {}
    rows.forEach(r => {
      if (r.type === 'etf') {
        // Use DB-stored sector breakdown first, fall back to ETF_DATA
        const etfSectors = r.sectorBreakdown
          || (() => { const k = resolveEtf(r.symbol); return k ? ETF_DATA[k]?.sectors : null })()
        if (etfSectors) {
          // Distribute ETF value across its sectors
          Object.entries(etfSectors).forEach(([sector, pct]) => {
            bySec[sector] = (bySec[sector] || 0) + r.value * (pct / 100)
          })
        } else {
          // Unknown ETF — bucket as 'ETF (Mixed)'
          bySec['ETF (Mixed)'] = (bySec['ETF (Mixed)'] || 0) + r.value
        }
      } else {
        // Stock or crypto — use assigned sector, fallback to type label
        const sec = r.sector && r.sector !== '' ? r.sector : (r.type === 'crypto' ? 'Crypto' : 'Other')
        bySec[sec] = (bySec[sec] || 0) + r.value
      }
    })
    const alloc = Object.entries(bySec)
      .map(([name, value]) => ({ name, value, pct: (value / tv * 100).toFixed(1) }))
      .sort((a, b) => b.value - a.value)

    const byType = { Stocks: 0, ETFs: 0, Crypto: 0 }
    rows.forEach(r => {
      if (r.type === 'stock') byType.Stocks += r.value
      else if (r.type === 'etf') byType.ETFs += r.value
      else byType.Crypto += r.value
    })

    const txnRows = txns.map(t => {
      const h = holdings.find(x => x.symbol === t.symbol)
      const totalCostTxn = t.qty * t.price + t.fee
      const currentVal   = h ? t.qty * h.currentPrice : 0
      return { ...t, totalCostTxn, currentVal, pnl: t.type === 'buy' ? currentVal - totalCostTxn : (t.qty * t.price) - t.fee }
    })

    // ETF exposure look-through
    // Priority: 1) DB-stored etfHoldings (from add/refresh), 2) ETF_DATA curated table
    const expMap = {}
    rows.filter(r => r.type === 'stock').forEach(r => {
      if (!expMap[r.symbol]) expMap[r.symbol] = { name: r.name, directEUR: 0, etfBreakdown: {} }
      expMap[r.symbol].directEUR += r.value
    })
    rows.filter(r => r.type === 'etf').forEach(r => {
      // Use DB-stored holdings first, fall back to curated ETF_DATA
      const comp = r.etfHoldings
        || (() => { const k = resolveEtf(r.symbol); return k ? ETF_DATA[k]?.holdings : null })()
      if (!comp || comp.length === 0) return
      comp.forEach(({ symbol, name, weight }) => {
        const imp = r.value * (weight / 100)
        if (!expMap[symbol]) expMap[symbol] = { name, directEUR: 0, etfBreakdown: {} }
        expMap[symbol].etfBreakdown[r.symbol] = (expMap[symbol].etfBreakdown[r.symbol] || 0) + imp
      })
    })
    const exposureRows = Object.entries(expMap).map(([symbol, d]) => {
      const etfT = Object.values(d.etfBreakdown).reduce((s, v) => s + v, 0)
      const tot  = d.directEUR + etfT
      return { symbol, name: d.name, directEUR: d.directEUR, etfBreakdown: d.etfBreakdown, etfTotalEUR: etfT, totalEUR: tot, totalPct: tv ? (tot / tv) * 100 : 0, directPct: tv ? (d.directEUR / tv) * 100 : 0 }
    }).sort((a, b) => b.totalEUR - a.totalEUR)

    // Country breakdown — ETFs use country_breakdown, direct stocks use .country
    const countryMap = {}
    rows.forEach(r => {
      if (r.type === 'etf') {
        const cb = r.countryBreakdown
          || (() => { const k = resolveEtf(r.symbol); return k ? ETF_DATA[k]?.countries : null })()
        if (cb) {
          Object.entries(cb).forEach(([country, pct]) => {
            countryMap[country] = (countryMap[country] || 0) + r.value * (pct / 100)
          })
        }
      } else {
        const ctry = r.country || stockCountry(r.symbol) || 'Unknown'
        countryMap[ctry] = (countryMap[ctry] || 0) + r.value
      }
    })
    const countryData = Object.entries(countryMap)
      .map(([name, value]) => ({ name, value, pct: tv ? (value / tv * 100).toFixed(1) : '0' }))
      .sort((a, b) => b.value - a.value)

    // ETF sector breakdown
    const etfSectorMap = {}
    rows.filter(r => r.type === 'etf').forEach(r => {
      const sectors = r.sectorBreakdown
        || (() => { const k = resolveEtf(r.symbol); return k ? ETF_DATA[k]?.sectors : null })()
      if (!sectors) return
      Object.entries(sectors).forEach(([sector, pct]) => {
        const impliedEUR = r.value * (pct / 100)
        etfSectorMap[sector] = (etfSectorMap[sector] || 0) + impliedEUR
      })
    })
    const etfSectorData = Object.entries(etfSectorMap)
      .map(([name, value]) => ({ name, value, pct: tv ? (value / tv * 100).toFixed(1) : '0' }))
      .sort((a, b) => b.value - a.value)

    return {
      rows, totalValue: tv, totalCost: tc, totalGain: tg, totalGainPct: tc ? (tg / tc) * 100 : 0,
      totalAnnCost: tac, totalAnnDiv: tad, netAnnIncome: tad - tac,
      allocationData: alloc,
      typeData: Object.entries(byType).map(([name, value]) => ({ name, value })),
      winners: [...rows].sort((a, b) => b.gainPct - a.gainPct).slice(0, 3),
      losers:  [...rows].sort((a, b) => a.gainPct - b.gainPct).slice(0, 3),
      avgVol:  rows.reduce((s, r) => s + Math.abs(r.gainPct), 0) / rows.length,
      concentration: alloc.length ? Math.max(...alloc.map(a => parseFloat(a.pct))) : 0,
      txnRows, totalTxnFees: txns.reduce((s, t) => s + (t.fee || 0), 0),
      exposureRows, etfSectorData, countryData,
      // Include any ETF that has holdings data — either from DB or curated ETF_DATA
      etfSymbols: rows.filter(r => r.type === 'etf' && (r.etfHoldings?.length > 0 || resolveEtf(r.symbol))).map(r => r.symbol)
    }
  }, [holdings, txns])

  // ── Auth guards ───────────────────────────────────────────────────────
  if (!authChecked) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--muted)', fontFamily: 'DM Mono', fontSize: 13 }}>
      Loading…
    </div>
  )
  if (!user) return <AuthScreen onAuth={() => sb.auth.getSession().then(({ data: { session } }) => setUser(session?.user))} />

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '11px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 50, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#00d4aa,#4ea8de)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⬡</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1 }}>Folio</div>
            <div style={{ fontSize: 8, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>PORTFOLIO INTELLIGENCE · EUR</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', paddingRight: 8, borderRight: '1px solid var(--border)' }}>
            1 EUR = {usdPerEur.toFixed(4)} USD
            {fxRates.GBP && <span style={{ marginLeft: 6, opacity: 0.6 }}>· GBP {(1/fxRates.GBP).toFixed(4)}</span>}
            {liveEur
              ? <span style={{ color: 'var(--accent)', marginLeft: 4 }}>● live</span>
              : <span style={{ color: 'var(--yellow)', marginLeft: 4 }}>● fallback</span>}
            {lastUpdated && <span style={{ marginLeft: 6, opacity: 0.5 }}>{lastUpdated}</span>}
          </div>
          <button onClick={refreshAll} disabled={fetchStatus === 'loading'} style={{ background: '#0d2a1f', border: '1px solid #00d4aa55', color: 'var(--accent)', borderRadius: 8, padding: '7px 13px', cursor: fetchStatus === 'loading' ? 'not-allowed' : 'pointer', fontFamily: 'Syne', fontSize: 12, fontWeight: 600, opacity: fetchStatus === 'loading' ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', animation: fetchStatus === 'loading' ? 'spin 1s linear infinite' : 'none', fontSize: 14 }}>⟳</span>
            {fetchStatus === 'loading' ? 'Fetching…' : 'Refresh'}
          </button>
          <Btn label="↑ CSV" onClick={() => fileRef.current.click()} style={{ padding: '7px 11px', fontSize: 11 }} />
          <Btn label="↓ Export" onClick={exportCSV} style={{ padding: '7px 11px', fontSize: 11, color: 'var(--accent)', borderColor: 'var(--accent)' }} />
          <Btn label="+ Transaction" onClick={() => setShowAddT(true)} style={{ padding: '7px 11px', fontSize: 11, color: 'var(--accent)', borderColor: 'var(--accent)' }} />
          <Btn label="+ Holding" variant="accent" onClick={() => setShowAddH(true)} style={{ padding: '7px 11px', fontSize: 11 }} />
          <button onClick={() => setShowProfile(true)} title={user.email} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSV} />
        </div>
      </div>

      {/* Fetch log */}
      {(fetchStatus === 'loading' || fetchStatus === 'done') && (
        <div style={{ background: '#040709', borderBottom: '1px solid var(--border)', padding: '6px 20px', maxHeight: 90, overflowY: 'auto' }}>
          {fetchLog.map((line, i) => (
            <div key={i} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', lineHeight: 1.8, color: line.startsWith('✓') ? 'var(--accent)' : line.startsWith('⚠') ? 'var(--yellow)' : 'var(--muted)' }}>{line}</div>
          ))}
        </div>
      )}
      {csvMsg && <div style={{ background: '#0d2a1f', color: 'var(--accent)', padding: '5px 20px', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{csvMsg}</div>}

      {/* ── Nav ── */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 20px', display: 'flex', background: 'var(--surface)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '9px 13px', background: 'none', border: 'none', color: tab === t ? 'var(--accent)' : 'var(--muted)', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', letterSpacing: '0.4px', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', whiteSpace: 'nowrap' }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: '18px 20px', maxWidth: 1440, margin: '0 auto' }}>

        {/* ── Empty state ── */}
        {holdings.length === 0 && (
          <div className="fade-in" style={{ textAlign: 'center', padding: '70px 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>⬡</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text)', marginBottom: 8 }}>Welcome to Folio</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', marginBottom: 24 }}>Add your first holding or import a CSV to get started</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Btn label="+ Add Holding" variant="accent" onClick={() => setShowAddH(true)} style={{ fontSize: 13, padding: '10px 22px' }} />
              <Btn label="↑ Import CSV" onClick={() => fileRef.current.click()} style={{ fontSize: 13, padding: '10px 22px' }} />
            </div>
          </div>
        )}

        {holdings.length > 0 && <>

          {/* ── KPI strip ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 9, marginBottom: 18 }}>
            {[
              { l: 'Portfolio Value',  v: fmtE(C.totalValue),    s: null,                c: false },
              { l: 'Total Return',     v: fmtE(C.totalGain),     s: pct(C.totalGainPct), c: C.totalGain >= 0 ? 'var(--green)' : 'var(--red)' },
              { l: 'Annual Costs',     v: fmtE(C.totalAnnCost),  s: 'fees & TER p.a.',   c: 'var(--yellow)' },
              { l: 'Annual Dividends', v: fmtE(C.totalAnnDiv),   s: 'est. p.a.',         c: 'var(--accent)' },
              { l: 'Net Income p.a.',  v: fmtE(C.netAnnIncome),  s: 'divs − fees',       c: C.netAnnIncome >= 0 ? 'var(--green)' : 'var(--red)' },
              { l: 'Positions',        v: `${holdings.length}`,        s: `${txns.length} trades`, c: false },
            ].map((k, i) => (
              <Card key={i} style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 8, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 5 }}>{k.l}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: k.c || 'var(--text)', lineHeight: 1.1 }}>{k.v}</div>
                {k.s && <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>{k.s}</div>}
              </Card>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 12 }}>
              <Card>
                <SLabel text="Portfolio Value Over Time (EUR)" />
                {/* Fix #6: note that chart uses current prices */}
                {perfData.length >= 2 ? (
                  <>
                    <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'DM Mono', marginBottom: 8 }}>
                      ℹ Based on current prices applied to historical quantities
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={perfData.map(d => ({ ...d, eur: d.value }))}>
                        <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00d4aa" stopOpacity={0.2} /><stop offset="95%" stopColor="#00d4aa" stopOpacity={0} /></linearGradient></defs>
                        <XAxis dataKey="month" tick={{ fill: '#5a7a96', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#5a7a96', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={v => '€' + Math.round(v / 1000) + 'k'} />
                        <Tooltip contentStyle={{ background: '#0d1218', border: '1px solid #1e2d3d', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 11 }} formatter={v => [fmtE(v), 'Value']} />
                        <Area type="monotone" dataKey="eur" stroke="#00d4aa" strokeWidth={2} fill="url(#g1)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <div style={{ height: 190, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Chart builds after first Refresh</div>
                    <button onClick={refreshAll} style={{ background: '#0d2a1f', border: '1px solid #00d4aa55', color: 'var(--accent)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Syne', fontSize: 12, fontWeight: 600 }}>⟳ Refresh Now</button>
                  </div>
                )}
              </Card>
              <Card>
                <SLabel text="Asset Mix" />
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={C.typeData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value">
                      {C.typeData.map((_, i) => <Cell key={i} fill={COLORS[i]} strokeWidth={0} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0d1218', border: '1px solid #1e2d3d', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 11 }} formatter={v => [fmtE(v)]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {C.typeData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 7, height: 7, borderRadius: 2, background: COLORS[i] }} /><span style={{ fontSize: 11, color: 'var(--muted)' }}>{d.name}</span></div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{C.totalValue ? (d.value / C.totalValue * 100).toFixed(1) : 0}%</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card style={{ gridColumn: '1/-1' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {[{ title: '🏆 Top Performers', data: C.winners }, { title: '📉 Underperformers', data: C.losers }].map(({ title, data }) => (
                    <div key={title}>
                      <SLabel text={title} />
                      {data.map(r => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                          <div><span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 }}>{r.symbol}</span><span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>{r.name}</span></div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: r.gainPct >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{pct(r.gainPct)}</div>
                            <div style={{ color: 'var(--muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>{fmtE(r.gain)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── HOLDINGS ── */}
          {tab === 'holdings' && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                <Btn label="↓ Export CSV" onClick={exportHoldings} style={{ fontSize: 11, padding: '5px 12px' }} />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border2)' }}>
                    <SortTh label="Symbol"   tabKey="holdings" col="symbol" />
                    <SortTh label="Name"     tabKey="holdings" col="name" />
                    <th style={thS}>Type</th>
                    <SortTh label="Qty"      tabKey="holdings" col="qty" />
                    <SortTh label="Avg Cost" tabKey="holdings" col="avgCost" />
                    <SortTh label="Current"  tabKey="holdings" col="currentPrice" />
                    <SortTh label="Value (€)"tabKey="holdings" col="value" />
                    <SortTh label="Gain (€)" tabKey="holdings" col="gain" />
                    <SortTh label="%"        tabKey="holdings" col="gainPct" />
                    <SortTh label="Fee%"     tabKey="holdings" col="annualFee" />
                    <SortTh label="Div%"     tabKey="holdings" col="dividendYield" />
                    <SortTh label="Ann.Cost" tabKey="holdings" col="annCost" />
                    <SortTh label="Ann.Div"  tabKey="holdings" col="annDiv" />
                    <SortTh label="Net p.a." tabKey="holdings" col="netIncome" />
                    <th style={thS}></th>
                  </tr></thead>
                  <tbody>
                    {sortRows(C.rows.map(r => ({...r, netIncome: r.annDiv - r.annCost})), 'holdings').map(r => { const net = r.annDiv - r.annCost; return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={e => e.currentTarget.style.background = '#0d1218'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <Td style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--accent)' }} onClick={() => openDetail(r)} title="Click to edit">{r.symbol}</Td>
                        <Td style={{ color: 'var(--muted)', fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</Td>
                        <Td><span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 3, background: r.type === 'crypto' ? '#1a1000' : r.type === 'etf' ? '#001a2e' : '#0d1f0d', color: r.type === 'crypto' ? 'var(--accent2)' : r.type === 'etf' ? 'var(--blue)' : 'var(--green)', fontFamily: 'DM Mono', textTransform: 'uppercase' }}>{r.type}</span></Td>
                        <Td style={{ fontSize: 11 }}>{fmtN(r.qty, r.type === 'crypto' ? 4 : 2)}</Td>
                        <Td style={{ fontSize: 11 }}>{fmtE(r.avgCost)}</Td>
                        <Td style={{ fontSize: 11 }}>{fmtE(r.currentPrice)}</Td>
                        <Td style={{ fontWeight: 500 }}>{fmtE(r.value)}</Td>
                        <Td style={{ color: r.gain >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 11 }}>{fmtE(r.gain)}</Td>
                        <Td style={{ color: r.gainPct >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 11 }}>{pct(r.gainPct)}</Td>
                        <Td style={{ fontSize: 11 }}>
                          {editingField?.id === r.id && editingField?.field === 'annualFee' ? (
                            <input autoFocus type="number" defaultValue={r.annualFee}
                              style={{ width: 52, background: 'var(--surface2)', border: '1px solid var(--accent)', borderRadius: 3, color: 'var(--yellow)', fontFamily: 'DM Mono', fontSize: 11, padding: '1px 4px', outline: 'none' }}
                              onBlur={e => saveFieldEdit(r.id, 'annualFee', e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveFieldEdit(r.id, 'annualFee', e.target.value); if (e.key === 'Escape') setEditingField(null) }}
                            />
                          ) : (
                            <span onClick={() => setEditingField({ id: r.id, field: 'annualFee' })}
                              style={{ color: 'var(--yellow)', cursor: 'pointer', borderBottom: '1px dashed var(--border2)' }}
                              title="Click to edit">
                              {r.annualFee > 0 ? `${r.annualFee}%` : <span style={{ color: 'var(--muted)' }}>— %</span>}
                            </span>
                          )}
                        </Td>
                        <Td style={{ fontSize: 11 }}>
                          {editingField?.id === r.id && editingField?.field === 'dividendYield' ? (
                            <input autoFocus type="number" defaultValue={r.dividendYield}
                              style={{ width: 52, background: 'var(--surface2)', border: '1px solid var(--accent)', borderRadius: 3, color: 'var(--accent)', fontFamily: 'DM Mono', fontSize: 11, padding: '1px 4px', outline: 'none' }}
                              onBlur={e => saveFieldEdit(r.id, 'dividendYield', e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveFieldEdit(r.id, 'dividendYield', e.target.value); if (e.key === 'Escape') setEditingField(null) }}
                            />
                          ) : (
                            <span onClick={() => setEditingField({ id: r.id, field: 'dividendYield' })}
                              style={{ color: 'var(--accent)', cursor: 'pointer', borderBottom: '1px dashed var(--border2)' }}
                              title="Click to edit">
                              {r.dividendYield > 0 ? `${r.dividendYield}%` : <span style={{ color: 'var(--muted)' }}>— %</span>}
                            </span>
                          )}
                        </Td>
                        <Td style={{ color: 'var(--yellow)', fontSize: 11 }}>{fmtE(r.annCost)}</Td>
                        <Td style={{ color: 'var(--accent)', fontSize: 11 }}>{fmtE(r.annDiv)}</Td>
                        <Td style={{ color: net >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500, fontSize: 11 }}>{fmtE(net)}</Td>
                        <Td><button onClick={() => deleteHolding(r.id)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', borderRadius: 3, padding: '2px 5px', fontSize: 10 }}>✕</button></Td>
                      </tr>
                    )})}
                  </tbody>
                  <tfoot><tr style={{ borderTop: '2px solid var(--border2)' }}>
                    <td colSpan={6} style={{ padding: '8px', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--muted)' }}>TOTAL</td>
                    <Td style={{ fontWeight: 500 }}>{fmtE(C.totalValue)}</Td>
                    <Td style={{ color: C.totalGain >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtE(C.totalGain)}</Td>
                    <Td style={{ color: C.totalGainPct >= 0 ? 'var(--green)' : 'var(--red)' }}>{pct(C.totalGainPct)}</Td>
                    <td colSpan={2} />
                    <Td style={{ color: 'var(--yellow)' }}>{fmtE(C.totalAnnCost)}</Td>
                    <Td style={{ color: 'var(--accent)' }}>{fmtE(C.totalAnnDiv)}</Td>
                    <Td style={{ color: C.netAnnIncome >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>{fmtE(C.netAnnIncome)}</Td>
                    <td />
                  </tr></tfoot>
                </table>
              </div>
            </Card>
          )}

          {/* ── STOCKS ── */}
          {tab === 'stocks' && (() => {
            const sRows = C.rows.filter(r => r.type === 'stock' || r.type === 'crypto')
            const sv = sRows.reduce((s, r) => s + r.value, 0)
            const sc = sRows.reduce((s, r) => s + r.cost, 0)
            const sg = sv - sc
            const sad = sRows.reduce((s, r) => s + r.annDiv, 0)
            return (
              <Card>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                  <Btn label="↓ Export CSV" onClick={exportStocks} style={{ fontSize: 11, padding: '5px 12px' }} />
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                    <thead><tr style={{ borderBottom: '1px solid var(--border2)' }}>
                      <SortTh label="Symbol"   tabKey="stocks" col="symbol" />
                      <SortTh label="Name"     tabKey="stocks" col="name" />
                      <SortTh label="Sector"   tabKey="stocks" col="sector" />
                      <SortTh label="Qty"      tabKey="stocks" col="qty" />
                      <SortTh label="Avg Cost" tabKey="stocks" col="avgCost" />
                      <SortTh label="Current"  tabKey="stocks" col="currentPrice" />
                      <SortTh label="Value (€)"tabKey="stocks" col="value" />
                      <SortTh label="Gain (€)" tabKey="stocks" col="gain" />
                      <SortTh label="%"        tabKey="stocks" col="gainPct" />
                      <SortTh label="Div %"    tabKey="stocks" col="dividendYield" />
                      <SortTh label="Ann.Div"  tabKey="stocks" col="annDiv" />
                      <th style={thS}></th>
                    </tr></thead>
                    <tbody>
                      {sortRows(sRows, 'stocks').map(r => { const net = r.annDiv; return (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={e => e.currentTarget.style.background = '#0d1218'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <Td style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--accent)' }} onClick={() => openDetail(r)} title="Click to edit">{r.symbol}</Td>
                          <Td style={{ color: 'var(--muted)', fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</Td>
                          <Td style={{ fontSize: 10, color: 'var(--muted)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sector || '—'}</Td>
                          <Td style={{ fontSize: 11 }}>{fmtN(r.qty, r.type === 'crypto' ? 4 : 2)}</Td>
                          <Td style={{ fontSize: 11 }}>{fmtE(r.avgCost)}</Td>
                          <Td style={{ fontSize: 11 }}>{fmtE(r.currentPrice)}</Td>
                          <Td style={{ fontWeight: 500 }}>{fmtE(r.value)}</Td>
                          <Td style={{ color: r.gain >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 11 }}>{fmtE(r.gain)}</Td>
                          <Td style={{ color: r.gainPct >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 11 }}>{pct(r.gainPct)}</Td>
                          <Td style={{ fontSize: 11 }}>
                            {editingField?.id === r.id && editingField?.field === 'dividendYield' ? (
                              <input autoFocus type="number" defaultValue={r.dividendYield}
                                style={{ width: 52, background: 'var(--surface2)', border: '1px solid var(--accent)', borderRadius: 3, color: 'var(--accent)', fontFamily: 'DM Mono', fontSize: 11, padding: '1px 4px', outline: 'none' }}
                                onBlur={e => saveFieldEdit(r.id, 'dividendYield', e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveFieldEdit(r.id, 'dividendYield', e.target.value); if (e.key === 'Escape') setEditingField(null) }}
                              />
                            ) : (
                              <span onClick={() => setEditingField({ id: r.id, field: 'dividendYield' })}
                                style={{ color: 'var(--accent)', cursor: 'pointer', borderBottom: '1px dashed var(--border2)' }} title="Click to edit">
                                {r.dividendYield > 0 ? `${r.dividendYield}%` : <span style={{ color: 'var(--muted)' }}>— %</span>}
                              </span>
                            )}
                          </Td>
                          <Td style={{ color: 'var(--accent)', fontSize: 11 }}>{fmtE(r.annDiv)}</Td>
                          <Td><button onClick={() => deleteHolding(r.id)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', borderRadius: 3, padding: '2px 5px', fontSize: 10 }}>✕</button></Td>
                        </tr>
                      )})}
                    </tbody>
                    <tfoot><tr style={{ borderTop: '2px solid var(--border2)' }}>
                      <td colSpan={6} style={{ padding: '8px', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--muted)' }}>TOTAL · {sRows.length} positions</td>
                      <Td style={{ fontWeight: 500 }}>{fmtE(sv)}</Td>
                      <Td style={{ color: sg >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtE(sg)}</Td>
                      <Td style={{ color: sg >= 0 ? 'var(--green)' : 'var(--red)' }}>{sc ? pct((sg/sc)*100) : '—'}</Td>
                      <td /><Td style={{ color: 'var(--accent)' }}>{fmtE(sad)}</Td><td />
                    </tr></tfoot>
                  </table>
                </div>
              </Card>
            )
          })()}

          {/* ── ETFS ── */}
          {tab === 'etfs' && (() => {
            const eRows = C.rows.filter(r => r.type === 'etf')
            const ev  = eRows.reduce((s, r) => s + r.value, 0)
            const ec  = eRows.reduce((s, r) => s + r.cost, 0)
            const eg  = ev - ec
            const eac = eRows.reduce((s, r) => s + r.annCost, 0)
            const ead = eRows.reduce((s, r) => s + r.annDiv, 0)
            return (
              <Card>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                  <Btn label="↓ Export CSV" onClick={exportETFs} style={{ fontSize: 11, padding: '5px 12px' }} />
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                    <thead><tr style={{ borderBottom: '1px solid var(--border2)' }}>
                      <SortTh label="Symbol"   tabKey="etfs" col="symbol" />
                      <SortTh label="Name"     tabKey="etfs" col="name" />
                      <SortTh label="Type"     tabKey="etfs" col="dist" />
                      <SortTh label="Qty"      tabKey="etfs" col="qty" />
                      <SortTh label="Avg Cost" tabKey="etfs" col="avgCost" />
                      <SortTh label="Current"  tabKey="etfs" col="currentPrice" />
                      <SortTh label="Value (€)"tabKey="etfs" col="value" />
                      <SortTh label="Gain (€)" tabKey="etfs" col="gain" />
                      <SortTh label="%"        tabKey="etfs" col="gainPct" />
                      <SortTh label="TER %"    tabKey="etfs" col="annualFee" />
                      <SortTh label="Dist %"   tabKey="etfs" col="dividendYield" />
                      <SortTh label="Ann.Cost" tabKey="etfs" col="annCost" />
                      <SortTh label="Ann.Div"  tabKey="etfs" col="annDiv" />
                      <SortTh label="Net p.a." tabKey="etfs" col="netIncome" />
                      <th style={thS}>Holdings</th>
                      <th style={thS}></th>
                    </tr></thead>
                    <tbody>
                      {sortRows(eRows.map(r => ({...r, netIncome: r.annDiv - r.annCost})), 'etfs').map(r => { const net = r.annDiv - r.annCost; return (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={e => e.currentTarget.style.background = '#0d1218'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <Td style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--accent)' }} onClick={() => openDetail(r)} title="Click to edit">{r.symbol}</Td>
                          <Td style={{ color: 'var(--muted)', fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</Td>
                          <Td>
                            {r.dist === true  && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#0d2a1f', color: 'var(--accent)', fontFamily: 'DM Mono' }}>DIST</span>}
                            {r.dist === false && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#0d1a2a', color: 'var(--blue)',   fontFamily: 'DM Mono' }}>ACC</span>}
                            {r.dist == null   && <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'DM Mono' }}>—</span>}
                          </Td>
                          <Td style={{ fontSize: 11 }}>{fmtN(r.qty, 2)}</Td>
                          <Td style={{ fontSize: 11 }}>{fmtE(r.avgCost)}</Td>
                          <Td style={{ fontSize: 11 }}>{fmtE(r.currentPrice)}</Td>
                          <Td style={{ fontWeight: 500 }}>{fmtE(r.value)}</Td>
                          <Td style={{ color: r.gain >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 11 }}>{fmtE(r.gain)}</Td>
                          <Td style={{ color: r.gainPct >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 11 }}>{pct(r.gainPct)}</Td>
                          <Td style={{ fontSize: 11 }}>
                            {editingField?.id === r.id && editingField?.field === 'annualFee' ? (
                              <input autoFocus type="number" defaultValue={r.annualFee}
                                style={{ width: 52, background: 'var(--surface2)', border: '1px solid var(--accent)', borderRadius: 3, color: 'var(--yellow)', fontFamily: 'DM Mono', fontSize: 11, padding: '1px 4px', outline: 'none' }}
                                onBlur={e => saveFieldEdit(r.id, 'annualFee', e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveFieldEdit(r.id, 'annualFee', e.target.value); if (e.key === 'Escape') setEditingField(null) }}
                              />
                            ) : (
                              <span onClick={() => setEditingField({ id: r.id, field: 'annualFee' })}
                                style={{ color: 'var(--yellow)', cursor: 'pointer', borderBottom: '1px dashed var(--border2)' }} title="Click to edit">
                                {r.annualFee > 0 ? `${r.annualFee}%` : <span style={{ color: 'var(--muted)' }}>— %</span>}
                              </span>
                            )}
                          </Td>
                          <Td style={{ fontSize: 11 }}>
                            {editingField?.id === r.id && editingField?.field === 'dividendYield' ? (
                              <input autoFocus type="number" defaultValue={r.dividendYield}
                                style={{ width: 52, background: 'var(--surface2)', border: '1px solid var(--accent)', borderRadius: 3, color: 'var(--accent)', fontFamily: 'DM Mono', fontSize: 11, padding: '1px 4px', outline: 'none' }}
                                onBlur={e => saveFieldEdit(r.id, 'dividendYield', e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveFieldEdit(r.id, 'dividendYield', e.target.value); if (e.key === 'Escape') setEditingField(null) }}
                              />
                            ) : (
                              <span onClick={() => setEditingField({ id: r.id, field: 'dividendYield' })}
                                style={{ color: 'var(--accent)', cursor: 'pointer', borderBottom: '1px dashed var(--border2)' }} title="Click to edit">
                                {r.dividendYield > 0 ? `${r.dividendYield}%` : <span style={{ color: 'var(--muted)' }}>— %</span>}
                              </span>
                            )}
                          </Td>
                          <Td style={{ color: 'var(--yellow)', fontSize: 11 }}>{fmtE(r.annCost)}</Td>
                          <Td style={{ color: 'var(--accent)', fontSize: 11 }}>{fmtE(r.annDiv)}</Td>
                          <Td style={{ color: net >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500, fontSize: 11 }}>{fmtE(net)}</Td>
                          <Td style={{ fontSize: 10, color: 'var(--muted)' }}>
                            {r.etfHoldings?.length
                              ? <span style={{ color: 'var(--blue)' }}>{r.etfHoldings.length} stocks</span>
                              : <span>—</span>}
                          </Td>
                          <Td><button onClick={() => deleteHolding(r.id)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', borderRadius: 3, padding: '2px 5px', fontSize: 10 }}>✕</button></Td>
                        </tr>
                      )})}
                    </tbody>
                    <tfoot><tr style={{ borderTop: '2px solid var(--border2)' }}>
                      <td colSpan={6} style={{ padding: '8px', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--muted)' }}>TOTAL · {eRows.length} ETFs</td>
                      <Td style={{ fontWeight: 500 }}>{fmtE(ev)}</Td>
                      <Td style={{ color: eg >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtE(eg)}</Td>
                      <Td style={{ color: eg >= 0 ? 'var(--green)' : 'var(--red)' }}>{ec ? pct((eg/ec)*100) : '—'}</Td>
                      <td /><td />
                      <Td style={{ color: 'var(--yellow)' }}>{fmtE(eac)}</Td>
                      <Td style={{ color: 'var(--accent)' }}>{fmtE(ead)}</Td>
                      <Td style={{ color: (ead-eac) >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>{fmtE(ead-eac)}</Td>
                      <td /><td />
                    </tr></tfoot>
                  </table>
                </div>
              </Card>
            )
          })()}

          {/* ── INCOME ── */}
          {tab === 'income' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 9 }}>
                {[
                  { l: 'Annual Dividends', v: fmtE(C.totalAnnDiv),       c: 'var(--accent)',  s: 'est. gross' },
                  { l: 'Annual Fees',      v: fmtE(C.totalAnnCost),      c: 'var(--yellow)',  s: 'TER drag' },
                  { l: 'Net Annual',       v: fmtE(C.netAnnIncome),      c: C.netAnnIncome >= 0 ? 'var(--green)' : 'var(--red)', s: 'divs − fees' },
                  { l: 'Monthly Net',      v: fmtE(C.netAnnIncome / 12), c: C.netAnnIncome >= 0 ? 'var(--green)' : 'var(--red)', s: 'avg per month' },
                ].map((k, i) => (
                  <Card key={i} style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 8, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>{k.l}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: k.c }}>{k.v}</div>
                    <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>{k.s}</div>
                  </Card>
                ))}
              </div>
              <Card>
                <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'DM Mono', marginBottom: 10 }}>
                  💡 TER (annual fee) for known ETFs is auto-filled from curated data · Dividend yield fetched live from Yahoo Finance
                </div>
                <SLabel text="Per Holding Income" />
                <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border2)' }}>
                    <SortTh label="Symbol"       tabKey="income" col="symbol" />
                    <SortTh label="Value (€)"    tabKey="income" col="value" />
                    <SortTh label="Fee %"        tabKey="income" col="annualFee" />
                    <SortTh label="Ann.Cost (€)" tabKey="income" col="annCost" />
                    <SortTh label="Div %"        tabKey="income" col="dividendYield" />
                    <SortTh label="Ann.Div (€)"  tabKey="income" col="annDiv" />
                    <SortTh label="Net p.a. (€)" tabKey="income" col="netIncome" />
                    <SortTh label="Monthly (€)"  tabKey="income" col="netIncome" />
                  </tr></thead>
                  <tbody>
                    {sortRows(C.rows.map(r => ({...r, netIncome: r.annDiv - r.annCost})), 'income').map(r => { const net = r.annDiv - r.annCost; return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={e => e.currentTarget.style.background = '#0d1218'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <Td style={{ fontWeight: 600 }}>{r.symbol}</Td>
                        <Td>{fmtE(r.value)}</Td>
                        <Td style={{ color: 'var(--yellow)' }}>{r.annualFee}%</Td>
                        <Td style={{ color: 'var(--yellow)' }}>{fmtE(r.annCost)}</Td>
                        <Td style={{ color: 'var(--accent)' }}>{r.dividendYield}%</Td>
                        <Td style={{ color: 'var(--accent)' }}>{fmtE(r.annDiv)}</Td>
                        <Td style={{ color: net >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>{fmtE(net)}</Td>
                        <Td style={{ color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtE(net / 12)}</Td>
                      </tr>
                    )})}
                  </tbody>
                </table></div>
              </Card>
            </div>
          )}

          {/* ── TRANSACTIONS ── */}
          {tab === 'transactions' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 9 }}>
                {[
                  { l: 'Total Transactions', v: txns.length,                                  s: 'all time' },
                  { l: 'Buy Orders',         v: txns.filter(t => t.type === 'buy').length,    s: 'purchases', c: 'var(--green)' },
                  { l: 'Sell Orders',        v: txns.filter(t => t.type === 'sell').length,   s: 'exits',     c: 'var(--red)' },
                  { l: 'Total Fees',         v: fmtE(C.totalTxnFees),                    s: 'brokerage', c: 'var(--yellow)' },
                ].map((k, i) => (
                  <Card key={i} style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 8, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 5 }}>{k.l}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: k.c || 'var(--text)' }}>{k.v}</div>
                    <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>{k.s}</div>
                  </Card>
                ))}
              </div>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <SLabel text="Ledger" />
                  <button onClick={exportTransactionsCSV} style={{ fontSize: 10, fontFamily: 'DM Mono', background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--muted)', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>↓ Export CSV</button>
                </div>
                <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border2)' }}>
                    <SortTh label="Date"        tabKey="txns" col="date" />
                    <SortTh label="Symbol"      tabKey="txns" col="symbol" />
                    <th style={thS}>Action</th>
                    <SortTh label="Qty"         tabKey="txns" col="qty" />
                    <SortTh label="Price (€)"   tabKey="txns" col="price" />
                    <SortTh label="Fee (€)"     tabKey="txns" col="fee" />
                    <SortTh label="Total (€)"   tabKey="txns" col="totalCostTxn" />
                    <SortTh label="Current (€)" tabKey="txns" col="currentVal" />
                    <SortTh label="P&L (€)"     tabKey="txns" col="pnl" />
                    <th style={thS}>Note</th>
                    <th style={thS}></th>
                  </tr></thead>
                  <tbody>
                    {sortRows(C.txnRows, 'txns').map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={e => e.currentTarget.style.background = '#0d1218'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <Td style={{ color: 'var(--muted)', fontSize: 10, whiteSpace: 'nowrap' }}>{r.date}</Td>
                        <Td style={{ fontWeight: 600 }}>{r.symbol}</Td>
                        <Td><span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, fontFamily: 'DM Mono', textTransform: 'uppercase', background: r.type === 'buy' ? '#0d2a1f' : '#2d0a12', color: r.type === 'buy' ? 'var(--green)' : 'var(--red)' }}>{r.type}</span></Td>
                        <Td style={{ fontSize: 11 }}>{r.qty}</Td>
                        <Td style={{ fontSize: 11 }}>{fmtE(r.price)}</Td>
                        <Td style={{ fontSize: 11, color: 'var(--yellow)' }}>{fmtE(r.fee)}</Td>
                        <Td style={{ fontSize: 11 }}>{fmtE(r.totalCostTxn)}</Td>
                        <Td style={{ fontSize: 11 }}>{r.currentVal ? fmtE(r.currentVal) : '—'}</Td>
                        <Td style={{ fontWeight: 500, color: r.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtE(r.pnl)}</Td>
                        <Td style={{ fontSize: 10, color: 'var(--muted)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.note || '—'}</Td>
                        <Td><button onClick={() => deleteTxn(r.id)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', borderRadius: 3, padding: '2px 5px', fontSize: 10 }}>✕</button></Td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </Card>
            </div>
          )}

          {/* ── ALLOCATION ── */}
          {tab === 'allocation' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12, alignItems: 'start' }}>
              <Card>
                <SLabel text="Sector Allocation" />
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={C.allocationData} cx="50%" cy="50%" outerRadius={90} paddingAngle={2} dataKey="value">
                      {C.allocationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0d1218', border: '1px solid #1e2d3d', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 11 }} formatter={v => [fmtE(v)]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                  {C.allocationData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{d.name} {d.pct}%</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <SLabel text="Holdings by Value (€)" />
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[...C.rows].sort((a, b) => b.value - a.value).slice(0, 8).map(r => ({ symbol: r.symbol, eur: r.value }))} layout="vertical" margin={{ left: 6, right: 18 }}>
                    <XAxis type="number" tick={{ fill: '#5a7a96', fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={v => '€' + Math.round(v / 1000) + 'k'} />
                    <YAxis type="category" dataKey="symbol" tick={{ fill: '#e8edf2', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip contentStyle={{ background: '#0d1218', border: '1px solid #1e2d3d', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 11 }} formatter={v => [fmtE(v)]} />
                    <Bar dataKey="eur" radius={[0, 4, 4, 0]}>
                      {[...C.rows].sort((a, b) => b.value - a.value).slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Country breakdown */}
              {C.countryData && C.countryData.length > 0 && (
                <Card style={{ gridColumn: '1 / -1' }}>
                  <SLabel text="Country Exposure" />
                  <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'DM Mono', marginBottom: 12 }}>
                    ETFs distributed by country composition · Direct stocks by country of incorporation
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
                    {/* Bar list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {C.countryData.map((d, i) => (
                        <div key={d.name}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 11, fontFamily: 'DM Mono' }}>{d.name}</span>
                            <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: COLORS[i % COLORS.length] }}>{d.pct}%</span>
                          </div>
                          <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(parseFloat(d.pct), 100)}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: 3, transition: 'width 0.4s ease' }} />
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'DM Mono', marginTop: 2 }}>{fmtE(d.value)}</div>
                        </div>
                      ))}
                    </div>
                    {/* Pie chart */}
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={C.countryData} cx="50%" cy="50%" outerRadius={90} paddingAngle={2} dataKey="value">
                          {C.countryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#0d1218', border: '1px solid #1e2d3d', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 11 }} formatter={(v, name) => [fmtE(v), name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── EXPOSURE ── */}
          {tab === 'exposure' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ padding: '9px 13px', background: '#0d1a2a', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 11, color: '#7ab3d4', fontFamily: 'DM Mono' }}>
                ℹ ETF look-through for {C.etfSymbols.join(', ') || 'your ETFs'} using curated top-holdings & sector data.
              {C.etfSymbols.length === 0 && ' Add ETFs to see exposure analysis.'}
              </div>
              <Card>
                <SLabel text="Top 12 Stock Exposures — Total Portfolio Weight" />
                {C.exposureRows.length === 0 ? (
                  <div style={{ padding: '20px', color: 'var(--muted)', fontFamily: 'DM Mono', fontSize: 12 }}>
                    No exposure data — add ETFs from the curated list (VWRL, IWDA, CSPX, VOO, QQQ etc.)
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={Math.max(220, C.exposureRows.slice(0,12).length * 28)}>
                      <BarChart
                        data={C.exposureRows.slice(0, 12).map(r => ({
                          symbol: r.symbol,
                          Direct: parseFloat(r.directPct.toFixed(2)),
                          ...Object.fromEntries(
                            Object.entries(r.etfBreakdown).map(([etf, v]) => [
                              'via ' + etf,
                              parseFloat((v / C.totalValue * 100).toFixed(2))
                            ])
                          )
                        }))}
                        layout="vertical" margin={{ left: 8, right: 36 }}>
                        <XAxis type="number" tick={{ fill: '#5a7a96', fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={v => v + '%'} />
                        <YAxis type="category" dataKey="symbol" tick={{ fill: '#e8edf2', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} width={50} />
                        <Tooltip contentStyle={{ background: '#0d1218', border: '1px solid #1e2d3d', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 11 }} formatter={(v, name) => [v + '%', name]} />
                        <Bar dataKey="Direct" stackId="a" fill="#00d4aa" />
                        {C.etfSymbols.map((etf, i) => (
                          <Bar key={etf} dataKey={"via " + etf} stackId="a" fill={COLORS[(i + 1) % COLORS.length]}
                            radius={i === C.etfSymbols.length - 1 ? [0, 4, 4, 0] : [0,0,0,0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                      {[{ c: '#00d4aa', l: 'Direct' }, ...C.etfSymbols.map((etf, i) => ({ c: COLORS[(i+1) % COLORS.length], l: 'via ' + etf }))].map(({ c, l }) => (
                        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'DM Mono' }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
              <Card>
                <SLabel text="Full Exposure Breakdown" />
                <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border2)' }}>
                    <th style={thS}>#</th><th style={thS}>Symbol</th><th style={thS}>Name</th>
                    <th style={thS}>Total (€)</th><th style={thS}>Total %</th><th style={thS}>Flag</th>
                    <th style={thS}>Direct (€)</th><th style={thS}>Direct%</th>
                    {C.etfSymbols.map(e => <th key={e} style={thS}>via {e} (€)</th>)}
                  </tr></thead>
                  <tbody>
                    {C.exposureRows.map((r, i) => {
                      const multi = (r.directEUR > 0 ? 1 : 0) + Object.keys(r.etfBreakdown).length > 1
                      return (
                        <tr key={r.symbol} style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={e => e.currentTarget.style.background = '#0d1218'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <Td style={{ color: 'var(--muted)', fontSize: 10 }}>{i + 1}</Td>
                          <Td style={{ fontWeight: 600, color: r.totalPct > 5 ? 'var(--yellow)' : 'var(--text)' }}>{r.symbol}</Td>
                          <Td style={{ color: 'var(--muted)', fontSize: 11, whiteSpace: 'nowrap' }}>{r.name}</Td>
                          <Td style={{ fontWeight: 600 }}>{fmtE(r.totalEUR)}</Td>
                          <Td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <div style={{ width: 38, height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(r.totalPct / 10 * 100, 100)}%`, height: '100%', background: r.totalPct > 7 ? 'var(--red)' : r.totalPct > 4 ? 'var(--yellow)' : 'var(--accent)', borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: r.totalPct > 7 ? 'var(--red)' : r.totalPct > 4 ? 'var(--yellow)' : 'var(--text)' }}>{fmtN(r.totalPct)}%</span>
                            </div>
                          </Td>
                          <Td>{multi ? <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#2d2000', color: 'var(--yellow)', fontFamily: 'DM Mono' }}>OVERLAP</span> : <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'DM Mono' }}>—</span>}</Td>
                          <Td style={{ color: r.directEUR > 0 ? 'var(--accent)' : 'var(--border2)' }}>{r.directEUR > 0 ? fmtE(r.directEUR) : '—'}</Td>
                          <Td style={{ color: r.directPct > 0 ? 'var(--accent)' : 'var(--border2)' }}>{r.directPct > 0 ? fmtN(r.directPct) + '%' : '—'}</Td>
                          {C.etfSymbols.map(etf => <Td key={etf} style={{ color: r.etfBreakdown[etf] ? 'var(--blue)' : 'var(--border2)' }}>{r.etfBreakdown[etf] ? fmtE(r.etfBreakdown[etf]) : '—'}</Td>)}
                        </tr>
                      )
                    })}
                  </tbody>
                </table></div>
              </Card>

            {/* ETF sector breakdown */}
            {C.etfSectorData.length > 0 && (
              <Card>
                <SLabel text="ETF Sector Exposure (implied by ETF holdings)" />
                <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'DM Mono', marginBottom: 10 }}>
                  Estimated sector weights based on known ETF compositions · Direct stocks shown separately
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8 }}>
                  {C.etfSectorData.map((s, i) => (
                    <div key={s.name} style={{ padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{s.name}</span>
                      </div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 15, color: COLORS[i % COLORS.length] }}>{fmtE(s.value)}</div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{s.pct}% of portfolio</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            </div>
          )}

          {/* ── RISK ── */}
          {tab === 'risk' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
                {[
                  { l: 'Avg Volatility',  v: fmtN(C.avgVol) + '%',        c: 'var(--yellow)',  desc: 'Avg unrealised gain/loss', r: C.avgVol > 30 ? 'High' : C.avgVol > 15 ? 'Medium' : 'Low' },
                  { l: 'Concentration',   v: fmtN(C.concentration) + '%',  c: C.concentration > 40 ? 'var(--red)' : 'var(--yellow)', desc: 'Largest single sector', r: C.concentration > 50 ? 'High' : C.concentration > 30 ? 'Medium' : 'Low' },
                  { l: 'Crypto Exposure', v: fmtN(C.typeData.find(t => t.name === 'Crypto')?.value / C.totalValue * 100 || 0) + '%', c: 'var(--accent2)', desc: '% in crypto assets', r: (C.typeData.find(t => t.name === 'Crypto')?.value / C.totalValue * 100 || 0) > 30 ? 'High' : 'Moderate' },
                ].map((m, i) => (
                  <Card key={i}>
                    <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'DM Mono', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>{m.l}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: m.c, marginBottom: 4 }}>{m.v}</div>
                    <div style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, background: m.r === 'High' ? '#2d0a12' : m.r === 'Medium' ? '#2d2000' : '#0d2a1f', color: m.r === 'High' ? 'var(--red)' : m.r === 'Medium' ? 'var(--yellow)' : 'var(--green)', fontSize: 10, fontFamily: 'DM Mono', fontWeight: 500, marginBottom: 8 }}>{m.r} Risk</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>{m.desc}</div>
                  </Card>
                ))}
              </div>
              <Card>
                <SLabel text="Position Heatmap" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 7 }}>
                  {C.rows.map(r => {
                    const risk = Math.abs(r.gainPct), bg = risk > 40 ? '#2d0a12' : risk > 20 ? '#2d2000' : risk > 10 ? '#0d2a1f' : '#0d1218'
                    const color = risk > 40 ? 'var(--red)' : risk > 20 ? 'var(--yellow)' : risk > 10 ? 'var(--green)' : 'var(--muted)'
                    return (
                      <div key={r.id} style={{ padding: '9px 11px', background: bg, borderRadius: 7, border: `1px solid ${color}22` }}>
                        <div style={{ fontFamily: 'DM Mono', fontSize: 11, fontWeight: 500 }}>{r.symbol}</div>
                        <div style={{ fontFamily: 'DM Mono', fontSize: 15, color, marginTop: 2 }}>{pct(r.gainPct)}</div>
                        <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>{fmtE(r.value)}</div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          )}
        </>}
      </div>

      {/* ── Add Holding Modal ── */}
      {showAddH && (
        <Modal title="Holding toevoegen" onClose={() => { setShowAddH(false); resetAddHolding() }} width={540}>

          {/* Phase 1: ISIN / symbol entry */}
          <div style={{ marginBottom: 16 }}>
            <FLabel>ISIN of ticker symbool</FLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              <Inp
                value={nh.isin}
                onChange={e => { setNh(h => ({ ...h, isin: e.target.value.toUpperCase() })); setIsinLookup('idle'); setIsinResults([]) }}
                placeholder="bv. NL0010273215 of ASML.AS"
                style={{ flex: 1, letterSpacing: '0.5px' }}
              />
              <button
                onClick={lookupISIN}
                disabled={isinLookup === 'loading' || nh.isin.length < 4}
                style={{ padding: '8px 14px', background: isinLookup === 'loading' ? 'var(--surface2)' : '#0d2a1f', border: '1px solid #00d4aa55', color: 'var(--accent)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Syne', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', opacity: nh.isin.length < 4 ? 0.4 : 1 }}>
                {isinLookup === 'loading' ? '⟳ Zoeken…' : '🔍 Opzoeken'}
              </button>
            </div>
            {isinLookup === 'notfound' && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--yellow)', fontFamily: 'DM Mono' }}>⚠ Niet gevonden — controleer ISIN of voer ticker direct in</div>
            )}
          </div>

          {/* Exchange switcher */}
          {isinResults.length > 1 && isinLookup === 'found' && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'DM Mono', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 5 }}>Beurs wisselen:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {isinResults.map((r, i) => (
                  <button key={i} onClick={() => selectIsinResult(r)} style={{ padding: '3px 10px', borderRadius: 4, border: `1px solid ${nh.symbol === r.symbol ? 'var(--accent)' : 'var(--border2)'}`, background: nh.symbol === r.symbol ? '#0d2a1f' : 'var(--surface2)', color: nh.symbol === r.symbol ? 'var(--accent)' : 'var(--muted)', fontFamily: 'DM Mono', fontSize: 10, cursor: 'pointer', transition: 'all 0.1s' }}>
                    {r.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Phase 2: Enriched preview — shown after successful lookup */}
          {nh.enriched && (
            <div style={{ marginBottom: 16, padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border2)' }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{nh.name}</div>
                  <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {nh.symbol}
                    {nh.currency && nh.currency !== 'EUR' && <span style={{ marginLeft: 6, color: 'var(--yellow)' }}>{nh.currency}</span>}
                    <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 3, background: nh.type === 'etf' ? '#001a2e' : nh.type === 'crypto' ? '#1a1000' : '#0d1f0d', color: nh.type === 'etf' ? 'var(--blue)' : nh.type === 'crypto' ? 'var(--accent2)' : 'var(--green)', fontSize: 9, textTransform: 'uppercase' }}>{nh.type}</span>
                  </div>
                </div>
                {nh.currentPrice && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'DM Mono', fontSize: 20, color: 'var(--accent)' }}>€{(+nh.currentPrice).toFixed(2)}</div>
                    <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'DM Mono' }}>live koers</div>
                  </div>
                )}
              </div>

              {/* Data grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 10 }}>
                {[
                  { l: 'Sector',         v: nh.sector || '—' },
                  { l: nh.type === 'etf' ? 'Largest country' : 'Land',
                    v: nh.type === 'etf'
                      ? (nh.countries ? Object.entries(nh.countries).sort((a,b)=>b[1]-a[1])[0]?.[0] : '—')
                      : (nh.country || '—') },
                  { l: 'Dividend (12m)', v: nh.dividendYield ? `${nh.dividendYield}%` : '—', c: nh.dividendYield ? 'var(--accent)' : 'var(--muted)', editable: 'dividendYield' },
                  { l: 'TER / Kosten',   v: nh.annualFee    ? `${nh.annualFee}%`     : '—', c: nh.annualFee    ? 'var(--yellow)' : 'var(--muted)', editable: 'annualFee' },
                ].map(({ l, v, c, editable }) => (
                  <div key={l} style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: 6 }}>
                    <div style={{ fontSize: 8, color: 'var(--muted)', fontFamily: 'DM Mono', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 3 }}>{l}</div>
                    {editable ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number"
                          value={nh[editable] || ''}
                          onChange={e => setNh(h => ({ ...h, [editable]: e.target.value }))}
                          placeholder="—"
                          style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border2)', color: c || 'var(--accent)', fontFamily: 'DM Mono', fontSize: 13, fontWeight: 500, outline: 'none', padding: '2px 0' }}
                        />
                        <span style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'DM Mono' }}>%</span>
                      </div>
                    ) : (
                      <div style={{ fontFamily: 'DM Mono', fontSize: 12, color: c || 'var(--text)', fontWeight: 500 }}>{v}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* ETF top holdings */}
              {nh.etfHoldings && nh.etfHoldings.length > 0 && (
                <div>
                  <div style={{ fontSize: 8, color: 'var(--muted)', fontFamily: 'DM Mono', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>Top holdings ({nh.etfHoldings.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {nh.etfHoldings.slice(0, 15).map(h => (
                      <div key={h.symbol} style={{ padding: '2px 8px', background: '#0d1f2d', border: '1px solid #1e3a5f', borderRadius: 4, fontFamily: 'DM Mono', fontSize: 10, color: 'var(--blue)' }}>
                        {h.symbol} <span style={{ opacity: 0.6 }}>{h.weight}%</span>
                      </div>
                    ))}
                    {nh.etfHoldings.length > 15 && (
                      <div style={{ padding: '2px 8px', fontSize: 10, color: 'var(--muted)', fontFamily: 'DM Mono' }}>+{nh.etfHoldings.length - 15} meer</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Phase 3: Only ask what user knows */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* If not enriched yet, show manual symbol entry */}
            {!nh.enriched && (
              <>
                <div>
                  <FLabel>Ticker symbool</FLabel>
                  <Inp value={nh.symbol} onChange={e => setNh(h => ({ ...h, symbol: e.target.value.toUpperCase() }))} placeholder="ASML.AS" />
                </div>
                <div>
                  <FLabel>Type</FLabel>
                  <Sel value={nh.type} onChange={e => setNh(h => ({ ...h, type: e.target.value }))}>
                    <option value="stock">Aandeel</option>
                    <option value="etf">ETF</option>
                    <option value="crypto">Crypto</option>
                  </Sel>
                </div>
              </>
            )}

            <div>
              <FLabel>Aantal aandelen</FLabel>
              <Inp value={nh.qty} onChange={e => setNh(h => ({ ...h, qty: e.target.value }))} placeholder="10" type="number" />
            </div>
            <div>
              <FLabel>Gemiddelde aankoopprijs (€)</FLabel>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontFamily: 'DM Mono', fontSize: 12, pointerEvents: 'none' }}>€</span>
                <Inp value={nh.avgCostEur} onChange={e => setNh(h => ({ ...h, avgCostEur: e.target.value }))} placeholder="155.00" type="number" style={{ paddingLeft: 22 }} />
              </div>
            </div>
          </div>

          {nh.qty && nh.avgCostEur && nh.currentPrice && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'DM Mono' }}>
              <span style={{ color: 'var(--muted)' }}>Totale investering</span>
              <span>{fmtE(+nh.qty * +nh.avgCostEur)}</span>
              <span style={{ color: 'var(--muted)' }}>Huidige waarde</span>
              <span style={{ color: +nh.currentPrice * +nh.qty >= +nh.qty * +nh.avgCostEur ? 'var(--green)' : 'var(--red)' }}>{fmtE(+nh.qty * +nh.currentPrice)}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <Btn label="Annuleer" onClick={() => { setShowAddH(false); resetAddHolding() }} style={{ flex: 1 }} />
            <Btn label="Toevoegen" variant="accent" onClick={addHolding} disabled={!nh.qty || !nh.avgCostEur || (!nh.symbol && !nh.isin)} style={{ flex: 1 }} />
          </div>
        </Modal>
      )}

      {/* ── Add Transaction Modal ── Fix #2: price & fee in EUR ── */}
      {showAddT && (
        <Modal title="Log Transaction" onClose={() => setShowAddT(false)}>
          <div style={{ marginBottom: 12 }}><FLabel>Action</FLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              {['buy', 'sell'].map(v => (
                <button key={v} onClick={() => setNt(h => ({ ...h, type: v }))} style={{ flex: 1, padding: '9px', border: `1px solid ${nt.type === v ? (v === 'buy' ? 'var(--green)' : 'var(--red)') : 'var(--border)'}`, borderRadius: 6, background: nt.type === v ? (v === 'buy' ? '#0d2a1f' : '#2d0a12') : 'var(--surface2)', color: nt.type === v ? (v === 'buy' ? 'var(--green)' : 'var(--red)') : 'var(--muted)', cursor: 'pointer', fontFamily: 'Syne', fontSize: 13, fontWeight: 700, transition: 'all 0.15s' }}>
                  {v === 'buy' ? '▲ Buy' : '▼ Sell'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { k: 'date',     l: 'Date',                       t: 'date' },
              { k: 'symbol',   l: 'Symbol',                     ph: 'ASML.AS' },
              { k: 'qty',      l: 'Aantal (Quantity)',           ph: '5',  t: 'number' },
              { k: 'priceEur', l: 'Prijs per stuk (€)',         ph: '189', t: 'number' },
              { k: 'fee',      l: 'Transactiekosten (€)',        ph: '5',  t: 'number' },
              { k: 'note',     l: 'Notitie (optioneel)',         ph: 'Rebalance' },
            ].map(f => <div key={f.k}><FLabel>{f.l}</FLabel><Inp value={nt[f.k]} onChange={e => setNt(h => ({ ...h, [f.k]: e.target.value }))} placeholder={f.ph || ''} type={f.t || 'text'} /></div>)}
          </div>
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '1px' }}>Totaal (incl. kosten)</span>
            <span style={{ fontFamily: 'DM Mono', fontSize: 14 }}>{fmtE((+nt.qty || 0) * (+nt.priceEur || 0) + (+nt.fee || 0))}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <Btn label="Annuleer" onClick={() => setShowAddT(false)} style={{ flex: 1 }} />
            <Btn label={`${nt.type === 'buy' ? 'Aankoop' : 'Verkoop'} registreren`} variant="accent" onClick={addTxn} style={{ flex: 1 }} />
          </div>
        </Modal>
      )}

      {/* ── Profile Modal ── */}
      {showProfile && (
        <Modal title="Account" onClose={() => setShowProfile(false)} width={340}>
          <div style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Ingelogd als</div>
          <div style={{ fontFamily: 'DM Mono', fontSize: 13, color: 'var(--text)', marginBottom: 20, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6 }}>{user.email}</div>
          <Btn label="Uitloggen" variant="danger" onClick={async () => { await sb.auth.signOut(); setShowProfile(false) }} style={{ width: '100%' }} />
        </Modal>
      )}

      {/* ── Holding Detail Modal ── */}
      {holdingDetail && (() => {
        const h = holdingDetail
        const currentVal = h.qty * h.currentPrice
        const gain       = currentVal - h.qty * h.avgCost
        const gainPct    = h.avgCost ? (gain / (h.qty * h.avgCost)) * 100 : 0
        const holdingTxns = txns.filter(t => t.symbol === h.symbol).slice(0, 20)
        return (
          <Modal title={h.symbol} onClose={() => setHoldingDetail(null)} width={560}>
            {/* Header summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 18 }}>
              {[
                { l: 'Waarde',    v: fmtE(currentVal),        c: 'var(--text)' },
                { l: 'Winst/V',   v: fmtE(gain),             c: gain >= 0 ? 'var(--green)' : 'var(--red)' },
                { l: '%',         v: pct(gainPct),            c: gain >= 0 ? 'var(--green)' : 'var(--red)' },
                { l: 'Koers',     v: fmtE(h.currentPrice),   c: 'var(--muted)' },
              ].map(k => (
                <div key={k.l} style={{ padding: '8px 10px', background: 'var(--surface2)', borderRadius: 7 }}>
                  <div style={{ fontSize: 8, color: 'var(--muted)', fontFamily: 'DM Mono', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 3 }}>{k.l}</div>
                  <div style={{ fontFamily: 'DM Mono', fontSize: 14, color: k.c, fontWeight: 500 }}>{k.v}</div>
                </div>
              ))}
            </div>

            {/* Editable fields */}
            <SLabel text="Positie bewerken" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div><FLabel>Naam</FLabel>
                <Inp value={detailEdit.name || ''} onChange={e => setDetailEdit(d => ({ ...d, name: e.target.value }))} /></div>
              <div><FLabel>Sector</FLabel>
                <Inp value={detailEdit.sector || ''} onChange={e => setDetailEdit(d => ({ ...d, sector: e.target.value }))} placeholder="Technology" /></div>
              <div><FLabel>Aantal aandelen</FLabel>
                <Inp type="number" value={detailEdit.qty || ''} onChange={e => setDetailEdit(d => ({ ...d, qty: e.target.value }))} /></div>
              <div><FLabel>Gem. aankoopprijs (€)</FLabel>
                <Inp type="number" value={detailEdit.avgCost || ''} onChange={e => setDetailEdit(d => ({ ...d, avgCost: e.target.value }))} /></div>
              <div><FLabel>Dividend % (12m)</FLabel>
                <Inp type="number" value={detailEdit.dividendYield || ''} onChange={e => setDetailEdit(d => ({ ...d, dividendYield: e.target.value }))} placeholder="0" /></div>
              <div><FLabel>{h.type === 'etf' ? 'TER %' : 'Kosten %'}</FLabel>
                <Inp type="number" value={detailEdit.annualFee || ''} onChange={e => setDetailEdit(d => ({ ...d, annualFee: e.target.value }))} placeholder="0" /></div>
            </div>
            <Btn label={detailSaving ? 'Opslaan…' : 'Wijzigingen opslaan'} variant="accent" onClick={saveDetail} disabled={detailSaving} style={{ width: '100%', marginBottom: 20 }} />

            {/* Add transaction */}
            <SLabel text="Transactie toevoegen" />
            <div style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {['buy','sell'].map(v => (
                  <button key={v} onClick={() => setDetailTxn(t => ({ ...t, type: v }))}
                    style={{ flex: 1, padding: '7px', border: `1px solid ${detailTxn.type === v ? (v === 'buy' ? 'var(--green)' : 'var(--red)') : 'var(--border)'}`, borderRadius: 6, background: detailTxn.type === v ? (v === 'buy' ? '#0d2a1f' : '#2d0a12') : 'var(--surface)', color: detailTxn.type === v ? (v === 'buy' ? 'var(--green)' : 'var(--red)') : 'var(--muted)', cursor: 'pointer', fontFamily: 'Syne', fontSize: 13, fontWeight: 700 }}>
                    {v === 'buy' ? '▲ Koop' : '▼ Verkoop'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div><FLabel>Datum</FLabel>
                  <Inp type="date" value={detailTxn.date} onChange={e => setDetailTxn(t => ({ ...t, date: e.target.value }))} /></div>
                <div><FLabel>Aantal</FLabel>
                  <Inp type="number" value={detailTxn.qty} onChange={e => setDetailTxn(t => ({ ...t, qty: e.target.value }))} placeholder="10" /></div>
                <div>
                  <FLabel>Prijs per stuk (€)</FLabel>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Inp type="number" value={detailTxn.price} onChange={e => setDetailTxn(t => ({ ...t, price: e.target.value }))} placeholder={h.currentPrice.toFixed(2)} style={{ flex: 1 }} />
                    <button onClick={useCurrentPrice} title="Gebruik huidige koers"
                      style={{ padding: '0 10px', background: '#0d2a1f', border: '1px solid #00d4aa44', borderRadius: 6, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'DM Mono', fontSize: 10, whiteSpace: 'nowrap' }}>
                      ↗ Huidig
                    </button>
                  </div>
                </div>
                <div><FLabel>Transactiekosten (€)</FLabel>
                  <Inp type="number" value={detailTxn.fee} onChange={e => setDetailTxn(t => ({ ...t, fee: e.target.value }))} placeholder="0" /></div>
              </div>
              {detailTxn.qty && detailTxn.price && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface)', borderRadius: 5, marginBottom: 10, fontFamily: 'DM Mono', fontSize: 11 }}>
                  <span style={{ color: 'var(--muted)' }}>Totaal</span>
                  <span>{fmtE((+detailTxn.qty * +detailTxn.price) + (+detailTxn.fee || 0))}</span>
                </div>
              )}
              <Btn
                label={detailSaving ? 'Verwerken…' : `${detailTxn.type === 'buy' ? 'Aankoop' : 'Verkoop'} registreren`}
                variant={detailTxn.type === 'buy' ? 'accent' : 'danger'}
                onClick={addDetailTxn}
                disabled={detailSaving || !detailTxn.qty || !detailTxn.price}
                style={{ width: '100%' }} />
            </div>

            {/* Transaction history for this holding */}
            {holdingTxns.length > 0 && (
              <div>
                <SLabel text={`Transacties (${holdingTxns.length})`} />
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ borderBottom: '1px solid var(--border2)' }}>
                      {['Datum','Type','Aantal','Prijs','Kosten','Totaal'].map(h => <th key={h} style={thS}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {holdingTxns.map(t => (
                        <tr key={t.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                          <Td style={{ fontSize: 10, color: 'var(--muted)' }}>{t.date}</Td>
                          <Td><span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, fontFamily: 'DM Mono', textTransform: 'uppercase', background: t.type === 'buy' ? '#0d2a1f' : '#2d0a12', color: t.type === 'buy' ? 'var(--green)' : 'var(--red)' }}>{t.type}</span></Td>
                          <Td style={{ fontSize: 11 }}>{t.qty}</Td>
                          <Td style={{ fontSize: 11 }}>{fmtE(t.price)}</Td>
                          <Td style={{ fontSize: 11, color: 'var(--yellow)' }}>{fmtE(t.fee)}</Td>
                          <Td style={{ fontSize: 11, fontWeight: 500 }}>{fmtE(t.qty * t.price + t.fee)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Modal>
        )
      })()}
    </div>
  )
}
