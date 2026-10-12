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
import { Button, Card } from '@/components/Ui'
import { AddHolding, AddWatch, HoldingsTable, WatchlistTable } from './Tables'
import { ChainSplit, CorrMatrix, Legend, PositionBars, SectorBars } from './Charts'
import { Seg, money, money0, pct } from './bits'

const PLAN_KEY = 'portfolio_plan_v1'
const noopSubscribe = () => () => {}

export default function PlanPage() {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  if (!mounted) {
    return (
      <div className="min-h-screen grid place-items-center">
        <p className="text-zinc-600 text-sm">Loading plan…</p>
      </div>
    )
  }
  return <PlanApp />
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
  const liveCount = plan.holdings.filter((h) => h.priceMode === 'live' && live[norm(h.ticker)]).length

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-12">
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-20">
        <div className="px-4 py-3 max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-white font-bold text-lg">Portfolio plan</h1>
            <p className="text-zinc-500 text-xs">
              {feed.generatedAt
                ? `Prices from ${feed.source}, updated ${ago(feed.generatedAt)} · ${liveCount} of ${plan.holdings.length} holdings live`
                : feedError
                  ? 'No price feed on this build: values use the prices you entered.'
                  : 'Loading prices…'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl font-medium px-2.5 py-1.5 text-xs">
              Valuation workbench
            </Link>
            <Button size="sm" onClick={() => { void refreshFeed(); setExtra(readCache()) }}>
              <RefreshCw size={13} className="inline mr-1" />Refresh
            </Button>
            <Button size="sm" onClick={exportPlan}><Download size={13} className="inline mr-1" />Export</Button>
            <Button size="sm" onClick={() => fileRef.current?.click()}><Upload size={13} className="inline mr-1" />Import</Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                if (window.confirm('Replace your plan with the starting plan? Export first if you want to keep it.')) setPlanState(seedPlan())
              }}
            >
              <RotateCcw size={13} className="inline mr-1" />Reset
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importPlan(f)
                e.target.value = ''
              }}
            />
          </div>
        </div>
        {note && (
          <div className="px-4 pb-3 max-w-6xl mx-auto">
            <p className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2.5 py-1.5 flex justify-between gap-2">
              <span className="break-all">{note}</span>
              <button type="button" className="text-blue-400 hover:text-white" onClick={() => setNote('')}>×</button>
            </p>
          </div>
        )}
      </header>

      <main className="p-4 max-w-6xl mx-auto space-y-4">
        <section className="space-y-2">
          <p className="text-zinc-200 text-[15px] leading-relaxed max-w-3xl">
            Planned moves take the share of your account tied to AI data center spending from{' '}
            <b className="text-white">{pct(today.aiShare)}</b> to <b className="text-white">{pct(metrics.moves.aiShare)}</b>. The full
            plan brings it to <b className="text-white">{pct(metrics.full.aiShare)}</b> across{' '}
            <b className="text-white">{metrics.full.sectors}</b> of 11 sectors.
          </p>
          <p className="text-zinc-500 text-xs">
            Stocks today: {money(stocksToday)}, {stocksToday >= costToday ? 'up' : 'down'} {money(Math.abs(stocksToday - costToday))} (
            {costToday > 0 ? pct((stocksToday - costToday) / costToday) : '—'}) on {money(costToday)} invested.
          </p>
        </section>

        <Seg label="Scenario" value={scenario} options={SCENARIOS.map((s) => ({ value: s.id, label: s.label }))} onChange={setScenario} />

        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <Tile label="Tied to AI buildout" value={pct(picked.aiShare)} sub={`Today ${pct(today.aiShare)}`} />
          <Tile label="Independent bets" value={picked.independentBets.toFixed(1)} sub={`Today ${today.independentBets.toFixed(1)}`} />
          <Tile label="Acts like (equal stocks)" value={picked.effectiveHoldings.toFixed(1)} sub={`Today ${today.effectiveHoldings.toFixed(1)}`} />
          <Tile label="Volatility (1y)" value={vols[scenario] ? pct(vols[scenario]!.vol) : '—'} sub={vols.today ? `Today ${pct(vols.today.vol)}` : 'Needs price history'} />
          <Tile label="Sectors covered, of 11" value={String(picked.sectors)} sub={`Today ${today.sectors}`} />
          <Tile label="Stocks held" value={String(picked.stocks)} sub={`Today ${today.stocks}`} />
          <Tile
            label="New money needed"
            value={money0(picked.newMoney)}
            sub={picked.top ? `Biggest: ${picked.top.ticker} ${pct(picked.topShare)}` : ''}
          />
        </section>

        <Card title="Where the money sits" subtitle="Share of the whole account in the AI data center chain, everything else, and cash.">
          <Legend />
          <ChainSplit metrics={metrics} picked={scenario} />
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Sector mix" subtitle={`${SCENARIOS.find((s) => s.id === scenario)!.label}; the dashed mark is today.`}>
            <SectorBars m={picked} today={today} />
          </Card>
          <Card title="Positions" subtitle="Every position in the picked scenario, as a share of the account.">
            <Legend />
            <PositionBars positions={pickedPositions} account={picked.account} />
          </Card>
        </div>

        <Card title="Scenarios side by side" subtitle={SCENARIOS.map((s) => `${s.label}: ${s.blurb}`).join(' ')}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-[11px] text-zinc-500 border-b border-zinc-800">
                  {['Scenario', 'Account', 'AI chain', 'Bets', 'Acts like', 'Volatility', 'Sectors', 'Stocks', 'Biggest', 'New money'].map((h, i) => (
                    <th key={h} className={`py-1.5 px-1.5 font-medium ${i ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCENARIOS.map((s) => {
                  const m = metrics[s.id]
                  return (
                    <tr key={s.id} className={`border-b border-zinc-800/60 ${s.id === scenario ? 'text-white' : 'text-zinc-400'}`}>
                      <td className="py-1.5 px-1.5">{s.label}</td>
                      <td className="py-1.5 px-1.5 text-right">{money0(m.account)}</td>
                      <td className="py-1.5 px-1.5 text-right">{pct(m.aiShare)}</td>
                      <td className="py-1.5 px-1.5 text-right">{m.independentBets.toFixed(1)}</td>
                      <td className="py-1.5 px-1.5 text-right">{m.effectiveHoldings.toFixed(1)}</td>
                      <td className="py-1.5 px-1.5 text-right">{vols[s.id] ? pct(vols[s.id]!.vol) : '—'}</td>
                      <td className="py-1.5 px-1.5 text-right">{m.sectors}</td>
                      <td className="py-1.5 px-1.5 text-right">{m.stocks}</td>
                      <td className="py-1.5 px-1.5 text-right">{m.top ? `${m.top.ticker} ${pct(m.topShare)}` : '—'}</td>
                      <td className="py-1.5 px-1.5 text-right">{money0(m.newMoney)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Holdings and planned moves"
          subtitle="Edit shares, cost and cash directly. The note over each ticker is how it moves with the rest of your portfolio over the last year. Set Plan to “Considering swap for…” and type a ticker to see what the swap would do."
        >
          <HoldingsTable plan={plan} setPlan={setPlan} series={series} live={live} ctx={ctx} />
          <AddHolding plan={plan} setPlan={setPlan} series={series} />
        </Card>

        <Card
          title="Watchlist"
          subtitle="Every stock you are looking at. The note over each ticker says how it correlates with what you hold today and whether adding the amount shown would lower your portfolio's volatility."
        >
          <WatchlistTable plan={plan} setPlan={setPlan} series={series} live={live} ctx={ctx} />
          <AddWatch plan={plan} setPlan={setPlan} series={series} />
        </Card>

        <Card
          title="How your positions move together"
          subtitle={`Correlation of daily returns over the last year, ${SCENARIOS.find((s) => s.id === scenario)!.label.toLowerCase()}. Near 1: they rise and fall together. Near 0: independent. Amber is high, blue is low.`}
        >
          {matrixTickers.some((t) => ctx.rets[t]) ? (
            <CorrMatrix tickers={matrixTickers} m={corr} />
          ) : (
            <p className="text-zinc-500 text-sm">Needs price history: it appears once the feed has loaded.</p>
          )}
        </Card>

        <Card title="Market data" subtitle="Where the live numbers come from, and how to cover a ticker you just added.">
          <div className="space-y-3 text-sm text-zinc-400">
            <p>
              <b className="text-zinc-200">Daily feed.</b>{' '}
              {feed.generatedAt
                ? `${Object.keys(feed.series).length} tickers from ${feed.source}, fetched ${ago(feed.generatedAt)} (${new Date(feed.generatedAt).toLocaleString()}).`
                : feedError
                  ? `Not available (${feedError}). It is written when the site is built by GitHub Actions.`
                  : 'Loading…'}{' '}
              The site rebuilds hourly through the trading day, so these prices run about an hour behind at most.
              {feed.failed.length > 0 && ` Did not load: ${feed.failed.join(', ')}.`}
            </p>
            <p>
              <b className="text-zinc-200">Not in the feed: </b>
              {missing.length ? missing.join(', ') : 'nothing; every ticker in your plan is covered.'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => void copyTickers()}><Copy size={13} className="inline mr-1" />Copy ticker list for data/tickers.json</Button>
              <span className="text-xs text-zinc-500">Paste it into the repository and push: from then on the feed carries them.</span>
            </div>
            <div className="border-t border-zinc-800 pt-3 space-y-2">
              <p>
                <b className="text-zinc-200">Right now, from your browser (optional).</b> A free{' '}
                <a className="text-blue-400 hover:underline" href="https://twelvedata.com/pricing" target="_blank" rel="noreferrer">Twelve Data</a>{' '}
                key loads prices and a year of history for the missing tickers, {TWELVE_DATA_BATCH} a minute. The key stays in this browser.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value.trim())
                    writeApiKey(e.target.value.trim())
                  }}
                  placeholder="Twelve Data API key"
                  aria-label="Twelve Data API key"
                  className="w-64 bg-zinc-950 text-white rounded-lg border border-zinc-700 focus:outline-none focus:border-blue-500 px-2 py-1 text-sm"
                />
                <Button size="sm" variant="primary" onClick={() => void loadMissing()}>
                  {busy ? 'Loading…' : `Load ${Math.min(missing.length, TWELVE_DATA_BATCH)} missing`}
                </Button>
              </div>
            </div>
            <p className="text-xs text-zinc-500 border-t border-zinc-800 pt-3">
              Each ticker links to its stockanalysis.com page for research: financials, forecasts and news. stockanalysis.com offers no
              public data API, so prices come from the feed above instead.
            </p>
          </div>
        </Card>

        <Card title="How to read the numbers">
          <div className="grid gap-4 md:grid-cols-3 text-sm text-zinc-400">
            <Def term="Acts like (effective number of holdings)" tech="1 ÷ the sum of each stock's squared weight: the inverse Herfindahl-Hirschman Index." plain="How many equal-sized stocks your portfolio behaves like." />
            <Def term="Independent bets" tech="The same formula, after grouping every stock in the AI data center chain into one position." plain="How many things that move on their own you really own." />
            <Def term="Correlation" tech="Pearson correlation of daily returns over the last year, from −1 to 1." plain="How closely two stocks rise and fall together. Below 0.4 they mostly go their own way; above 0.7 they move as one." />
            <Def term="Volatility" tech="Standard deviation of the portfolio's daily returns, ×√252 to annualize." plain="How much the account typically swings in a year. A good diversifier lowers it." />
            <Def term="Share of risk" tech="Weight × covariance with the portfolio ÷ portfolio variance." plain="How much of the swings one stock is responsible for. More risk than money means it concentrates risk." />
            <Def term="AI data center chain" tech="Companies whose revenue depends on cloud and AI infrastructure spending, from chip tools to the cloud giants." plain="Stocks that would likely fall together if AI spending slowed." />
          </div>
          <p className="text-xs text-zinc-600 mt-4">
            Correlations look back one year and change over time; they say how stocks moved, not how they will. Your plan is stored in
            this browser only: export it to keep a copy or move it to another device. A planning tool, not financial advice.
          </p>
        </Card>
      </main>
    </div>
  )
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-3 py-2.5 min-w-0">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="text-white text-xl font-semibold tabular-nums my-0.5">{value}</div>
      <div className="text-[11px] text-zinc-500 truncate">{sub}</div>
    </div>
  )
}

function Def({ term, tech, plain }: { term: string; tech: string; plain: string }) {
  return (
    <div>
      <p className="text-zinc-200 font-medium mb-1">{term}</p>
      <p className="mb-1"><span className="text-zinc-500">Technical:</span> {tech}</p>
      <p><span className="text-zinc-500">Plain English:</span> {plain}</p>
    </div>
  )
}
