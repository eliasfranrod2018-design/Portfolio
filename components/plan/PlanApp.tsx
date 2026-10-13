'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
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
import { fitContext, matrix } from '@/lib/fit'
import { AddHolding, HoldingsTable, WatchlistTable } from './Tables'
import { ChainSplit, CorrMatrix, Legend, PositionBars, SectorBars } from './Charts'
import { EditNum, Seg, TextPop, money, pct, signed } from './bits'

const PLAN_KEY = 'portfolio_plan_v1'
const SLOT_NAMES: Record<string, string> = {
  'Health care': 'Health care',
  'Consumer staples': 'Staples',
  Utilities: 'Utilities',
  'Real estate': 'Real estate',
  Materials: 'Materials',
}
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
  const [addingHolding, setAddingHolding] = useState(false)
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
  /* The original full plan called its sector stand-ins "Health care pick" and so on. */
  const slotLabels = new Map(
    plan.watchlist
      .filter((w) => w.group === 'Sector gap ideas' && w.status === 'full' && SLOT_NAMES[w.sector])
      .map((w) => [norm(w.ticker), `${SLOT_NAMES[w.sector]} pick`])
  )
  const planned = plan.holdings
    .filter((h) => h.plan === 'sell' || (h.plan === 'swap' && h.swapFor))
    .map((h) => (h.plan === 'sell' ? `sell ${norm(h.ticker)}` : `sell ${norm(h.ticker)} for ${norm(h.swapFor)}`))
  const considered = plan.holdings
    .filter((h) => h.plan === 'considering' && h.swapFor)
    .map((h) => `swap ${norm(h.ticker)} for ${norm(h.swapFor)}`)
  const compareNote =
    `Today is what you hold now. Planned moves: ${planned.length ? planned.join(', ') : 'none yet'}. ` +
    `Full plan: planned moves${considered.length ? `, ${considered.join(', ')},` : ''} plus every name marked "In full plan" below.`
  const stocksToday = today.invested
  const costToday = plan.holdings.reduce((t, h) => t + h.costBasis, 0)
  const gainToday = stocksToday - costToday
  const liveCount = plan.holdings.filter((h) => h.priceMode === 'live' && live[norm(h.ticker)]).length

  return (
    <>
      <header className="pp-hd" id="summary">
        <h1>Portfolio plan</h1>
        <p className="pp-take">
          Planned moves take the share of your account tied to AI data center spending from <b>{pct(today.aiShare)}</b> to{' '}
          <b>{pct(metrics.moves.aiShare)}</b>. The full plan brings it to <b>{pct(metrics.full.aiShare)}</b> across{' '}
          <b>{metrics.full.sectors}</b> of 11 sectors.
        </p>
        <p className="pp-sub">
          Stocks today: {money(stocksToday)}, {gainToday >= 0 ? 'up' : 'down'} {signed(gainToday, money)} (
          {costToday > 0 ? signed(gainToday / costToday, pct) : '—'}) on {money(costToday)} invested, plus{' '}
          <EditNum label="Cash" value={plan.cash} format={money} onCommit={(v) => setPlan((p) => ({ ...p, cash: v }))} /> in cash.{' '}
          <TextPop
            label={feed.generatedAt ? `Live prices, ${ago(feed.generatedAt)}.` : feedError ? 'Prices are the ones you entered.' : 'Loading prices…'}
            title="Prices, and saving or moving your plan"
          >
            <span className="pp-pop-head">Prices</span>
            <span className="pp-pop-line">
              {feed.generatedAt
                ? `From ${feed.source}, fetched ${ago(feed.generatedAt)}; ${liveCount} of ${plan.holdings.length} holdings priced live. The site refreshes them hourly through the trading day.`
                : feedError
                  ? 'This build has no price feed, so values use the prices you entered.'
                  : 'Loading…'}
              {missing.length ? ` Not in the feed yet: ${missing.join(', ')}.` : ''}
            </span>
            <span className="pp-pop-acts">
              <button type="button" className="pp-textbtn" onClick={() => { void refreshFeed(); setExtra(readCache()) }}>Refresh prices</button>
              <button type="button" className="pp-textbtn" onClick={() => void copyTickers()}>Copy ticker list for data/tickers.json</button>
            </span>
            <span className="pp-pop-row">
              <input
                type="password"
                className="pp-in"
                style={{ flex: 1, minWidth: 0 }}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value.trim())
                  writeApiKey(e.target.value.trim())
                }}
                placeholder="Twelve Data key, for tickers not in the feed"
                aria-label="Twelve Data API key"
              />
              <button type="button" className="pp-textbtn" onClick={() => void loadMissing()}>
                {busy ? 'Loading…' : `Load ${Math.min(missing.length, TWELVE_DATA_BATCH)}`}
              </button>
            </span>
            <span className="pp-pop-head pp-pop-sep">Your plan</span>
            <span className="pp-pop-line">Saved in this browser. Export it to keep a copy or open it on another device.</span>
            <span className="pp-pop-acts">
              <button type="button" className="pp-textbtn" onClick={exportPlan}>Export</button>
              <button type="button" className="pp-textbtn" onClick={() => fileRef.current?.click()}>Import</button>
              <button
                type="button"
                className="pp-textbtn"
                onClick={() => {
                  if (window.confirm('Replace your plan with the starting plan? Export first if you want to keep it.')) setPlanState(seedPlan())
                }}
              >
                Start over
              </button>
            </span>
            {note && <span className="pp-pop-msg" role="status">{note}</span>}
          </TextPop>
        </p>
      </header>
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

      <Seg id="scenario-picker" label="Scenario" value={scenario} options={SCENARIOS.map((s) => ({ value: s.id, label: s.label }))} onChange={setScenario} />

      <section className="pp-tiles" id="headline">
        <Tile label="Tied to AI buildout" value={pct(picked.aiShare)} sub={`Today ${pct(today.aiShare)}`} hideSub={scenario === 'today'} />
        <Tile label="Independent bets" value={f1(picked.independentBets)} sub={`Today ${f1(today.independentBets)}`} hideSub={scenario === 'today'} />
        <Tile label="Acts like (equal stocks)" value={f1(picked.effectiveHoldings)} sub={`Today ${f1(today.effectiveHoldings)}`} hideSub={scenario === 'today'} />
        <Tile label="Sectors covered, of 11" value={String(picked.sectors)} sub={`Today ${today.sectors}`} hideSub={scenario === 'today'} />
        <Tile label="Stocks held" value={String(picked.stocks)} sub={`Today ${today.stocks}`} hideSub={scenario === 'today'} />
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
          <PositionBars positions={pickedPositions} account={picked.account} cash={scenarios[scenario].cash} labels={slotLabels} />
        </section>
      </div>

      <section className="pp-card" id="compare-card">
        <h2>Scenarios side by side</h2>
        <p className="pp-note">{compareNote}</p>
        <div className="pp-tw">
          <table>
            <thead>
              <tr>
                <th>Scenario</th>
                <th className="pp-num">AI chain</th>
                <th className="pp-num">Bets</th>
                <th className="pp-num">Acts like</th>
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
        <h2 className="pp-h2row">
          Current holdings and planned moves
          <button type="button" className="pp-addlink" aria-expanded={addingHolding} onClick={() => setAddingHolding((a) => !a)}>
            + Add
          </button>
        </h2>
        <p className="pp-note">Highlighted rows have a planned change. Click a value to change it, or a ticker to see how it fits.</p>
        {addingHolding && <AddHolding plan={plan} setPlan={setPlan} series={series} onDone={() => setAddingHolding(false)} />}
        <HoldingsTable plan={plan} setPlan={setPlan} series={series} live={live} ctx={ctx} />
      </section>

      <section className="pp-card" id="possibles-card">
        <h2>Possibles</h2>
        <p className="pp-note">Every stock we looked at, grouped by the job it would do in your portfolio.</p>
        <WatchlistTable plan={plan} setPlan={setPlan} series={series} live={live} ctx={ctx} />
      </section>

      <section className="pp-card" id="definitions">
        <h2>How to read the numbers</h2>
        <div className="pp-defs">
          <Def term="Acts like (effective number of holdings)" tech="1 divided by the sum of each stock's squared weight, the inverse of the Herfindahl-Hirschman Index." plain="how many equal-sized stocks your portfolio behaves like." />
          <Def term="Independent bets" tech="the same formula, after grouping every stock in the AI data center chain into one position." plain="how many things that move on their own you really own." />
          <Def term="AI data center chain" tech="companies whose revenue depends on cloud and AI infrastructure spending, from chip tools to the cloud giants." plain="stocks that would likely fall together if AI spending slowed." />
        </div>
        <p className="pp-foot">
          Prices come from Yahoo Finance, refreshed hourly through the trading day; correlations use a year of daily returns. Possibles are
          sized equally. This is a planning tool, not financial advice. <Link href="/" className="pp-footlink">Valuation workbench</Link>
        </p>
        <details className="pp-more">
          <summary>How your positions move together</summary>
          <p className="pp-note">
            Correlation of daily returns over the last year, {pickedLabel.toLowerCase()}. Near 1 they rise and fall together; near 0 they go
            their own way.
          </p>
          {matrixTickers.some((t) => ctx.rets[t]) ? <CorrMatrix tickers={matrixTickers} m={corr} /> : <p className="pp-note">Appears once price history has loaded.</p>}
        </details>
      </section>
    </>
  )
}

function Tile({ label, value, sub, hideSub = false }: { label: string; value: string; sub: string; hideSub?: boolean }) {
  return (
    <div className="pp-tile">
      <div className="pp-tl">{label}</div>
      <div className="pp-tv">{value}</div>
      <div className="pp-tc" style={hideSub ? { visibility: 'hidden' } : undefined}>{sub}</div>
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
