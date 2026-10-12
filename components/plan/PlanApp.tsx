'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Copy, Download, RefreshCw, RotateCcw, Upload } from 'lucide-react'
import {
  SCENARIOS,
  allTickers,
  buildScenario,
  hydratePlan,
  metricsOf,
  norm,
  seedPlan,
  type Plan,
  type ScenarioId,
} from '@/lib/portfolio'
import {
  EMPTY_FEED,
  TWELVE_DATA_BATCH,
  fetchTwelveData,
  loadFeed,
  readApiKey,
  readCache,
  writeApiKey,
  type Feed,
  type Series,
} from '@/lib/marketData'
import { blend, fitContext, matrix } from '@/lib/fit'
import { AddHolding, AddWatch, HoldingsTable, WatchlistTable } from './Tables'
import { ChainSplit, CorrMatrix, Legend, PositionBars, SectorBars } from './Charts'
import { Seg, money, pct, signed } from './bits'

const PLAN_KEY = 'portfolio_plan_v1'
const noopSubscribe = () => () => {}

export default function PlanPage() {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  return (
    <div className="pp">
      <div className="pp-wrap">{mounted ? <PlanApp /> : <p className="pp-sub">Loading plan…</p>}</div>
    </div>
  )
}

function readPlan(): Plan {
  try {
    const raw = window.localStorage.getItem(PLAN_KEY)
    return raw ? hydratePlan(JSON.parse(raw)) : seedPlan()
  } catch {
    return seedPlan()
  }
}

function ago(iso: string | null) {
  if (!iso) return 'never'
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.round(mins / 60)
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`
}

const f1 = (v: number) => v.toFixed(1)

function PlanApp() {
  const [plan, setPlanState] = useState<Plan>(readPlan)
  const [feed, setFeed] = useState<Feed>(EMPTY_FEED)
  const [feedError, setFeedError] = useState('')
  const [extra, setExtra] = useState<Record<string, Series>>(readCache)
  const [apiKey, setApiKey] = useState(readApiKey)
  const [scenario, setScenario] = useState<ScenarioId>('full')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const setPlan = useCallback((fn: (p: Plan) => Plan) => setPlanState(fn), [])

  useEffect(() => {
    try {
      window.localStorage.setItem(PLAN_KEY, JSON.stringify(plan))
    } catch {
      /* private mode: the plan works, it just will not persist */
    }
  }, [plan])

  const refreshFeed = useCallback(async () => {
    try {
      setFeed(await loadFeed())
      setFeedError('')
    } catch (e) {
      setFeedError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    let live = true
    loadFeed().then(
      (f) => live && setFeed(f),
      (e) => live && setFeedError(e instanceof Error ? e.message : String(e))
    )
    return () => {
      live = false
    }
  }, [])

  /* The build-time feed wins; Twelve Data fills only what it lacks. */
  const series = useMemo(() => ({ ...extra, ...feed.series }), [extra, feed.series])
  const live = useMemo(() => {
    const out: Record<string, number | undefined> = {}
    for (const [t, s] of Object.entries(series)) out[t] = s.price
    return out
  }, [series])

  const tickers = useMemo(() => allTickers(plan), [plan])
  const missing = tickers.filter((t) => !series[t])

  const scenarios = useMemo(() => {
    const out = {} as Record<ScenarioId, ReturnType<typeof buildScenario>>
    SCENARIOS.forEach((s) => (out[s.id] = buildScenario(plan, s.id, live)))
    return out
  }, [plan, live])
  const metrics = useMemo(() => {
    const out = {} as Record<ScenarioId, ReturnType<typeof metricsOf>>
    SCENARIOS.forEach((s) => (out[s.id] = metricsOf(scenarios[s.id])))
    return out
  }, [scenarios])

  const ctx = useMemo(() => fitContext(plan, scenarios.today.positions, series), [plan, scenarios.today.positions, series])
  const vols = useMemo(() => {
    const out = {} as Record<ScenarioId, ReturnType<typeof blend>>
    SCENARIOS.forEach((s) => {
      const rets = { ...ctx.rets }
      scenarios[s.id].positions.forEach((p) => {
        if (!(p.ticker in rets)) rets[p.ticker] = null
      })
      out[s.id] = blend(scenarios[s.id].positions, rets)
    })
    return out
  }, [scenarios, ctx.rets])

  const picked = metrics[scenario]
  const pickedLabel = SCENARIOS.find((s) => s.id === scenario)!.label
  const pickedPositions = scenarios[scenario].positions
  const { matrixTickers, corr } = useMemo(() => {
    const ts = pickedPositions.slice(0, 16).map((p) => p.ticker)
    const rets = { ...ctx.rets }
    ts.forEach((t) => {
      if (!(t in rets)) rets[t] = null
    })
    return { matrixTickers: ts, corr: matrix(ts, rets) }
  }, [pickedPositions, ctx.rets])

  async function loadMissing() {
    if (!apiKey) {
      setNote('Paste a Twelve Data API key first.')
      return
    }
    setBusy(true)
    try {
      const { loaded, errors } = await fetchTwelveData(missing, apiKey)
      setExtra((e) => ({ ...e, ...loaded }))
      const left = missing.length - Object.keys(loaded).length - errors.length
      setNote(
        `Loaded ${Object.keys(loaded).length} from Twelve Data.` +
          (errors.length ? ` Failed: ${errors.join('; ')}.` : '') +
          (left > 0 ? ` ${left} more to go: the free tier allows ${TWELVE_DATA_BATCH} a minute, so press again in a minute.` : '')
      )
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function exportPlan() {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'portfolio-plan.json'
    a.click()
    URL.revokeObjectURL(url)
    setNote('Plan downloaded.')
  }

  async function importPlan(file: File) {
    try {
      setPlanState(hydratePlan(JSON.parse(await file.text())))
      setNote(`Loaded ${file.name}.`)
    } catch {
      setNote('That file is not a plan export.')
    }
  }

  async function copyTickers() {
    const json = JSON.stringify(tickers, null, 2)
    try {
      await navigator.clipboard.writeText(json)
      setNote('Ticker list copied. Paste it over data/tickers.json and push, and the next build fetches them all.')
    } catch {
      setNote(json)
    }
  }

  const today = metrics.today
  const stocksToday = today.invested
  const costToday = plan.holdings.reduce((t, h) => t + h.costBasis, 0)
  const gainToday = stocksToday - costToday
  const liveCount = plan.holdings.filter((h) => h.priceMode === 'live' && live[norm(h.ticker)]).length
  const volText = (id: ScenarioId) => (vols[id] ? pct(vols[id]!.vol) : '—')

  return (
    <>
      <header className="pp-hd" id="summary">
        <div>
          <h1>Portfolio plan</h1>
          <p className="pp-take">
            Planned moves take the share of your account tied to AI data center spending from <b>{pct(today.aiShare)}</b> to{' '}
            <b>{pct(metrics.moves.aiShare)}</b>. The full plan brings it to <b>{pct(metrics.full.aiShare)}</b> across{' '}
            <b>{metrics.full.sectors}</b> of 11 sectors.
          </p>
          <p className="pp-sub">
            Stocks today: {money(stocksToday)}, {gainToday >= 0 ? 'up' : 'down'} {signed(gainToday, money)} (
            {costToday > 0 ? signed(gainToday / costToday, pct) : '—'}) on {money(costToday)} invested.{' '}
            {feed.generatedAt
              ? `Prices from ${feed.source}, ${ago(feed.generatedAt)}; ${liveCount} of ${plan.holdings.length} holdings live.`
              : feedError
                ? 'No price feed on this build, so values use the prices you entered.'
                : 'Loading prices…'}
          </p>
        </div>
        <div className="pp-bar">
          <button type="button" className="pp-btn" onClick={() => { void refreshFeed(); setExtra(readCache()) }}>
            <RefreshCw size={12} />Refresh
          </button>
          <button type="button" className="pp-btn" onClick={exportPlan}><Download size={12} />Export</button>
          <button type="button" className="pp-btn" onClick={() => fileRef.current?.click()}><Upload size={12} />Import</button>
          <button
            type="button"
            className="pp-btn"
            onClick={() => {
              if (window.confirm('Replace your plan with the starting plan? Export first if you want to keep it.')) setPlanState(seedPlan())
            }}
          >
            <RotateCcw size={12} />Reset
          </button>
          <Link href="/" className="pp-btn">Valuation workbench</Link>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importPlan(f)
              e.target.value = ''
            }}
          />
        </div>
      </header>

      {note && (
        <div className="pp-msg" role="status">
          <span>{note}</span>
          <button type="button" className="pp-icon" aria-label="Dismiss" onClick={() => setNote('')}>×</button>
        </div>
      )}

      <Seg label="Scenario" value={scenario} options={SCENARIOS.map((s) => ({ value: s.id, label: s.label }))} onChange={setScenario} />

      <section className="pp-tiles" id="headline">
        <Tile label="Tied to AI buildout" value={pct(picked.aiShare)} sub={`Today ${pct(today.aiShare)}`} />
        <Tile label="Independent bets" value={f1(picked.independentBets)} sub={`Today ${f1(today.independentBets)}`} />
        <Tile label="Acts like (equal stocks)" value={f1(picked.effectiveHoldings)} sub={`Today ${f1(today.effectiveHoldings)}`} />
        <Tile label="Volatility, last year" value={volText(scenario)} sub={vols.today ? `Today ${volText('today')}` : 'Needs price history'} />
        <Tile label="Sectors covered, of 11" value={String(picked.sectors)} sub={`Today ${today.sectors}`} />
        <Tile label="Stocks held" value={String(picked.stocks)} sub={`Today ${today.stocks}`} />
        <Tile label="New money needed" value={money(picked.newMoney)} sub={picked.top ? `Biggest: ${picked.top.ticker} ${pct(picked.topShare)}` : ''} />
      </section>

      <section className="pp-card" id="chain-split-card">
        <h2>Where the money sits</h2>
        <p className="pp-note">Share of the whole account in the AI data center chain, everything else, and cash. The scenario you picked is solid.</p>
        <Legend />
        <ChainSplit metrics={metrics} picked={scenario} />
      </section>

      <div className="pp-grid">
        <section className="pp-card" id="sector-card">
          <h2>Sector mix</h2>
          <p className="pp-note">
            {scenario === 'today'
              ? 'Share of the account in each of the 11 sectors, plus cash.'
              : 'Share of the account in each sector, plus cash. The dashed mark is today.'}
          </p>
          <SectorBars m={picked} today={today} scenario={scenario} />
        </section>
        <section className="pp-card" id="positions-card">
          <h2>Positions</h2>
          <p className="pp-note">Every position in the picked scenario, colored by whether it rides AI data center spending.</p>
          <PositionBars positions={pickedPositions} account={picked.account} cash={scenarios[scenario].cash} />
        </section>
      </div>

      <section className="pp-card" id="compare-card">
        <h2>Scenarios side by side</h2>
        <p className="pp-note">{SCENARIOS.map((s) => `${s.label}: ${s.blurb}`).join(' ')}</p>
        <div className="pp-tw">
          <table>
            <thead>
              <tr>
                <th>Scenario</th>
                <th className="pp-num">AI chain</th>
                <th className="pp-num">Bets</th>
                <th className="pp-num">Acts like</th>
                <th className="pp-num">Volatility</th>
                <th className="pp-num">Sectors</th>
                <th className="pp-num">Stocks</th>
                <th className="pp-num pp-opt">Biggest</th>
                <th className="pp-num">New money</th>
              </tr>
            </thead>
            <tbody>
              {SCENARIOS.map((s) => {
                const m = metrics[s.id]
                return (
                  <tr key={s.id} className={s.id === scenario ? 'pp-sel' : ''}>
                    <td>{s.label}</td>
                    <td className="pp-num">{pct(m.aiShare)}</td>
                    <td className="pp-num">{f1(m.independentBets)}</td>
                    <td className="pp-num">{f1(m.effectiveHoldings)}</td>
                    <td className="pp-num">{volText(s.id)}</td>
                    <td className="pp-num">{m.sectors}</td>
                    <td className="pp-num">{m.stocks}</td>
                    <td className="pp-num pp-opt">{m.top?.ticker ?? '—'}</td>
                    <td className="pp-num">{money(m.newMoney)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pp-card" id="holdings-card">
        <h2>Current holdings and planned moves</h2>
        <p className="pp-note">
          Edit shares, cost, cash and the rest in place. Highlighted rows have a planned change. The note over each ticker is how it moves
          with the rest of your portfolio over the last year; set Plan to “Considering swap for…” and type a ticker to see what the swap
          would do.
        </p>
        <HoldingsTable plan={plan} setPlan={setPlan} series={series} live={live} ctx={ctx} />
        <AddHolding plan={plan} setPlan={setPlan} series={series} />
      </section>

      <section className="pp-card" id="possibles-card">
        <h2>Possibles</h2>
        <p className="pp-note">
          Every stock you are looking at, grouped by the job it would do in your portfolio. The note over each ticker says how it correlates
          with what you hold today and whether adding the amount shown would lower your portfolio’s volatility.
        </p>
        <WatchlistTable plan={plan} setPlan={setPlan} series={series} live={live} ctx={ctx} />
        <AddWatch plan={plan} setPlan={setPlan} series={series} />
      </section>

      <section className="pp-card" id="correlation-card">
        <h2>How your positions move together</h2>
        <p className="pp-note">
          Correlation of daily returns over the last year, {pickedLabel.toLowerCase()}. Near 1 they rise and fall together; near 0 they go
          their own way. Amber is high, blue is low.
        </p>
        {matrixTickers.some((t) => ctx.rets[t]) ? (
          <CorrMatrix tickers={matrixTickers} m={corr} />
        ) : (
          <p className="pp-note">Appears once price history has loaded.</p>
        )}
      </section>

      <section className="pp-card pp-data" id="market-data">
        <h2>Market data</h2>
        <p className="pp-note">Where the live numbers come from, and how to cover a ticker you just added.</p>
        <p>
          <b>Daily feed.</b>{' '}
          {feed.generatedAt
            ? `${Object.keys(feed.series).length} tickers from ${feed.source}, fetched ${ago(feed.generatedAt)} (${new Date(feed.generatedAt).toLocaleString()}).`
            : feedError
              ? `Not available on this build (${feedError}). GitHub Actions writes it each time the site is built.`
              : 'Loading…'}{' '}
          The site rebuilds hourly through the trading day, so prices run at most about an hour behind.
          {feed.failed.length > 0 && ` Did not load: ${feed.failed.join(', ')}.`}
        </p>
        <p>
          <b>Not in the feed:</b> {missing.length ? missing.join(', ') : 'nothing. Every ticker in your plan is covered.'}
        </p>
        <div className="pp-row">
          <button type="button" className="pp-btn" onClick={() => void copyTickers()}><Copy size={12} />Copy ticker list for data/tickers.json</button>
          <span className="pp-sub">Paste it into the repository and push; from the next build on, the feed carries them.</span>
        </div>
        <p>
          <b>Right now, from your browser (optional).</b> A free{' '}
          <a href="https://twelvedata.com/pricing" target="_blank" rel="noreferrer">Twelve Data</a> key loads prices and a year of history for
          the missing tickers, {TWELVE_DATA_BATCH} a minute. The key stays in this browser.
        </p>
        <div className="pp-row">
          <input
            type="password"
            className="pp-search"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value.trim())
              writeApiKey(e.target.value.trim())
            }}
            placeholder="Twelve Data API key"
            aria-label="Twelve Data API key"
          />
          <button type="button" className="pp-btn pp-btn-primary" onClick={() => void loadMissing()}>
            {busy ? 'Loading…' : `Load ${Math.min(missing.length, TWELVE_DATA_BATCH)} missing`}
          </button>
        </div>
        <p className="pp-sub" style={{ margin: 0 }}>
          Each ticker links to its stockanalysis.com page for research. stockanalysis.com has no public data API, so the prices come from the
          feed above.
        </p>
      </section>

      <section className="pp-card" id="definitions">
        <h2>How to read the numbers</h2>
        <div className="pp-defs">
          <Def term="Acts like (effective number of holdings)" tech="1 divided by the sum of each stock's squared weight, the inverse of the Herfindahl-Hirschman Index." plain="how many equal-sized stocks your portfolio behaves like." />
          <Def term="Independent bets" tech="the same formula, after grouping every stock in the AI data center chain into one position." plain="how many things that move on their own you really own." />
          <Def term="AI data center chain" tech="companies whose revenue depends on cloud and AI infrastructure spending, from chip tools to the cloud giants." plain="stocks that would likely fall together if AI spending slowed." />
          <Def term="Correlation" tech="Pearson correlation of daily returns over the last year, from −1 to 1." plain="how closely two stocks rise and fall together. Below 0.4 they mostly go their own way; above 0.7 they move as one." />
          <Def term="Volatility" tech="standard deviation of the portfolio's daily returns, times √252 to annualize." plain="how much the account typically swings in a year. A good diversifier lowers it." />
          <Def term="Share of risk" tech="weight × covariance with the portfolio ÷ portfolio variance." plain="how much of the swings one stock is responsible for. More risk than money means it concentrates risk." />
        </div>
        <p className="pp-foot">
          Correlations look back one year and change over time: they say how stocks moved, not how they will. Your plan is saved in this
          browser only; export it to keep a copy or move it to another device. This is a planning tool, not financial advice.
        </p>
      </section>
    </>
  )
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="pp-tile">
      <div className="pp-tl">{label}</div>
      <div className="pp-tv">{value}</div>
      <div className="pp-tc">{sub}</div>
    </div>
  )
}

function Def({ term, tech, plain }: { term: string; tech: string; plain: string }) {
  return (
    <div>
      <p className="pp-dt">{term}</p>
      <p>Technical: {tech}</p>
      <p>Plain English: {plain}</p>
    </div>
  )
}
