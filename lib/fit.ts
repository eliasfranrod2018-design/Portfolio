/**
 * How stocks move together, and what that means for the portfolio: daily
 * return correlations over the last year, portfolio volatility, each
 * holding's share of the risk, and a one-line note per ticker saying whether
 * it helps or overlaps. With no price history it falls back to what the plan
 * knows (sector and AI-chain link) and says so.
 */
import type { Series } from './marketData'
import { SECTORS, type Holding, type Plan, type Position, norm } from './portfolio'

export type Returns = Map<string, number>

/** Simple daily returns keyed by the later day's date. */
export function returnsOf(s: Series | undefined): Returns | null {
  if (!s || s.closes.length < 2) return null
  const r: Returns = new Map()
  for (let i = 1; i < s.closes.length; i++) {
    const a = s.closes[i - 1]
    const b = s.closes[i]
    if (a > 0 && b > 0) r.set(s.dates[i], b / a - 1)
  }
  return r.size ? r : null
}

/** Fewer overlapping days than this and a correlation is mostly noise. */
export const MIN_DAYS = 40

export function correlation(a: Returns, b: Returns): { r: number; n: number } | null {
  const xs: number[] = []
  const ys: number[] = []
  for (const [d, x] of a) {
    const y = b.get(d)
    if (y !== undefined) {
      xs.push(x)
      ys.push(y)
    }
  }
  const n = xs.length
  if (n < MIN_DAYS) return null
  const mx = xs.reduce((t, v) => t + v, 0) / n
  const my = ys.reduce((t, v) => t + v, 0) / n
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my)
    sxx += (xs[i] - mx) ** 2
    syy += (ys[i] - my) ** 2
  }
  if (!(sxx > 0 && syy > 0)) return null
  return { r: sxy / Math.sqrt(sxx * syy), n }
}

function variance(xs: number[]): number {
  const n = xs.length
  if (n < 2) return 0
  const m = xs.reduce((t, v) => t + v, 0) / n
  return xs.reduce((t, v) => t + (v - m) ** 2, 0) / (n - 1)
}

const annualize = (dailyVar: number) => Math.sqrt(dailyVar * 252)

/**
 * A value-weighted daily return series for a set of positions, over the days
 * every position with history has a return. Positions without history are
 * left out and reported through `covered` (the share of dollars included).
 */
export function blend(
  parts: { ticker: string; value: number }[],
  rets: Record<string, Returns | null>
): { series: Returns; covered: number; vol: number } | null {
  const total = parts.reduce((t, p) => t + p.value, 0)
  const withData = parts.filter((p) => p.value > 0 && rets[norm(p.ticker)])
  const value = withData.reduce((t, p) => t + p.value, 0)
  if (!withData.length || !(value > 0)) return null
  const maps = withData.map((p) => rets[norm(p.ticker)] as Returns)
  /* Start from the shortest history: the common days are a subset of it. */
  const shortest = maps.reduce((a, b) => (b.size < a.size ? b : a))
  const series: Returns = new Map()
  for (const d of shortest.keys()) {
    let r = 0
    let ok = true
    for (let i = 0; i < maps.length; i++) {
      const x = maps[i].get(d)
      if (x === undefined) {
        ok = false
        break
      }
      r += (withData[i].value / value) * x
    }
    if (ok) series.set(d, r)
  }
  if (series.size < MIN_DAYS) return null
  return { series, covered: total > 0 ? value / total : 0, vol: annualize(variance([...series.values()])) }
}

export interface PairCorr {
  ticker: string
  r: number
}

export type Verdict = 'helps' | 'neutral' | 'overlaps' | 'unknown'

export interface FitNote {
  verdict: Verdict
  /** A short label for the chip: "Diversifier", "Overlaps", … */
  label: string
  text: string
  /** Correlation with the portfolio (the rest of it, for a holding). */
  corr?: number
  closest?: PairCorr
}

export interface FitContext {
  plan: Plan
  /** Today's stock positions. */
  positions: Position[]
  rets: Record<string, Returns | null>
  portfolio: ReturnType<typeof blend>
}

export function fitContext(plan: Plan, positions: Position[], series: Record<string, Series>): FitContext {
  const rets: Record<string, Returns | null> = {}
  const tickers = new Set([...positions.map((p) => p.ticker), ...plan.watchlist.map((w) => norm(w.ticker))])
  plan.holdings.forEach((h) => h.swapFor && tickers.add(norm(h.swapFor)))
  for (const t of tickers) rets[t] = returnsOf(series[t])
  return { plan, positions, rets, portfolio: blend(positions, rets) }
}

const f2 = (x: number) => x.toFixed(2)
const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`

export function corrWord(r: number): string {
  if (r >= 0.75) return 'Very high'
  if (r >= 0.55) return 'High'
  if (r >= 0.3) return 'Moderate'
  if (r >= 0.1) return 'Low'
  return 'Little or no'
}

function closestHolding(ctx: FitContext, ticker: string, exclude: string[] = []): PairCorr | undefined {
  const mine = ctx.rets[ticker]
  if (!mine) return undefined
  let best: PairCorr | undefined
  for (const p of ctx.positions) {
    if (p.ticker === ticker || exclude.includes(p.ticker)) continue
    const other = ctx.rets[p.ticker]
    const c = other && correlation(mine, other)
    if (c && (!best || c.r > best.r)) best = { ticker: p.ticker, r: c.r }
  }
  return best
}

function sameChainCount(ctx: FitContext, ai: boolean, exclude: string) {
  return ctx.positions.filter((p) => p.ai === ai && p.ticker !== exclude).length
}

/** Vol of today's stocks with `delta` dollars moved: negative values remove, positive add. */
function volWith(ctx: FitContext, delta: { ticker: string; value: number }[]) {
  const book = new Map(ctx.positions.map((p) => [p.ticker, p.value]))
  for (const d of delta) book.set(d.ticker, Math.max(0, (book.get(d.ticker) ?? 0) + d.value))
  return blend(
    [...book.entries()].map(([ticker, value]) => ({ ticker, value })),
    ctx.rets
  )
}

/** For a stock you hold: does it move with the rest of the portfolio, and how much of the risk does it carry? */
export function holdingNote(ctx: FitContext, h: Holding): FitNote {
  const t = norm(h.ticker)
  const mine = ctx.rets[t]
  const rest = blend(
    ctx.positions.filter((p) => p.ticker !== t),
    ctx.rets
  )
  const peers = sameChainCount(ctx, h.ai, t)
  if (!mine || !rest || !ctx.portfolio) {
    return {
      verdict: 'unknown',
      label: 'No price history',
      text: h.ai
        ? `Rides AI data center spending, like ${peers} of your other holdings: expect it to move with them.`
        : `Outside the AI data center chain, so it should move more on its own than your AI names do.`,
    }
  }
  const c = correlation(mine, rest.series)
  const closest = closestHolding(ctx, t)
  const total = ctx.positions.reduce((s, p) => s + p.value, 0)
  const pos = ctx.positions.find((p) => p.ticker === t)
  const weight = pos && total > 0 ? pos.value / total : 0
  /* Risk contribution: w · cov(r_i, r_p) / var(r_p). */
  let riskShare: number | null = null
  const port = ctx.portfolio.series
  const xs: number[] = []
  const ps: number[] = []
  for (const [d, rp] of port) {
    const x = mine.get(d)
    if (x !== undefined) {
      xs.push(x)
      ps.push(rp)
    }
  }
  if (xs.length >= MIN_DAYS) {
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length
    const mp = ps.reduce((a, b) => a + b, 0) / ps.length
    const cov = xs.reduce((a, x, i) => a + (x - mx) * (ps[i] - mp), 0) / (xs.length - 1)
    const vp = variance(ps)
    if (vp > 0) riskShare = (weight * cov) / vp
  }
  if (!c) return { verdict: 'unknown', label: 'Too little history', text: 'Not enough overlapping trading days to measure.' }

  const parts = [`${corrWord(c.r)} correlation with the rest of your portfolio (${f2(c.r)})`]
  if (closest) parts.push(`moves most like ${closest.ticker} (${f2(closest.r)})`)
  let text = parts.join('; ') + '.'
  if (riskShare !== null) text += ` Carries ${pct1(riskShare)} of the portfolio's risk on ${pct1(weight)} of its money.`

  const heavy = riskShare !== null && riskShare > weight * 1.3
  if (c.r >= 0.7 || (heavy && c.r >= 0.5)) return { verdict: 'overlaps', label: 'Concentrates risk', text, corr: c.r, closest }
  if (c.r < 0.4) return { verdict: 'helps', label: 'Diversifier', text, corr: c.r, closest }
  return { verdict: 'neutral', label: 'Middle of the pack', text, corr: c.r, closest }
}

/** For a stock you might buy with `amount` new dollars. */
export function candidateNote(
  ctx: FitContext,
  c: { ticker: string; sector: string; ai: boolean; amount: number }
): FitNote {
  const t = norm(c.ticker)
  const held = ctx.positions.some((p) => p.ticker === t)
  const newSector = (SECTORS as readonly string[]).includes(c.sector) && !ctx.positions.some((p) => p.sector === c.sector)
  const extras: string[] = []
  if (held) extras.push('You already own it, so this adds to the position.')
  if (newSector) extras.push(`Fills an empty sector (${c.sector}).`)
  if (c.ai) extras.push(`Another AI data center bet, like ${sameChainCount(ctx, true, t)} of your holdings.`)

  const mine = ctx.rets[t]
  if (!mine || !ctx.portfolio) {
    const text = [
      'No price history yet, so this is judged on sector and AI link only.',
      ...extras,
      !c.ai && !extras.length ? 'Outside the AI data center chain, which most of your money rides on.' : '',
    ]
      .filter(Boolean)
      .join(' ')
    const verdict: Verdict = c.ai ? 'overlaps' : newSector ? 'helps' : 'unknown'
    return { verdict, label: verdict === 'helps' ? 'Likely diversifies' : verdict === 'overlaps' ? 'Likely overlaps' : 'Unmeasured', text }
  }
  const corr = correlation(mine, ctx.portfolio.series)
  if (!corr) return { verdict: 'unknown', label: 'Too little history', text: ['Not enough overlapping trading days to measure.', ...extras].join(' ') }
  const closest = closestHolding(ctx, t)
  const amount = c.amount > 0 ? c.amount : 250
  const after = volWith(ctx, [{ ticker: t, value: amount }])
  const before = ctx.portfolio.vol

  let text = `${corrWord(corr.r)} correlation with your portfolio (${f2(corr.r)})`
  if (closest) text += `; moves most like ${closest.ticker} (${f2(closest.r)})`
  text += '.'
  if (after) text += ` Adding $${Math.round(amount)} takes portfolio volatility from ${pct1(before)} to ${pct1(after.vol)}.`
  if (extras.length) text += ' ' + extras.join(' ')

  const lowers = after ? after.vol < before - 0.0005 : false
  if (corr.r >= 0.7 || (closest && closest.r >= 0.8)) {
    return { verdict: 'overlaps', label: 'Overlaps what you own', text, corr: corr.r, closest }
  }
  if (corr.r < 0.5 && (lowers || newSector)) return { verdict: 'helps', label: 'Good diversifier', text, corr: corr.r, closest }
  return { verdict: 'neutral', label: lowers ? 'Mild diversifier' : 'Neutral fit', text, corr: corr.r, closest }
}

/** For "swap / considering swap for X": the same dollars moved from one stock to the other. */
export function swapNote(ctx: FitContext, h: Holding, value: number): FitNote | null {
  const from = norm(h.ticker)
  const to = norm(h.swapFor)
  if (!to) return null
  const target = ctx.plan.watchlist.find((w) => norm(w.ticker) === to) ?? ctx.plan.holdings.find((x) => norm(x.ticker) === to)
  const facts: string[] = []
  if (target) {
    if (target.ai !== h.ai) facts.push(target.ai ? `Moves $${Math.round(value)} into the AI data center chain.` : `Moves $${Math.round(value)} out of the AI data center chain.`)
    else facts.push(h.ai ? 'Same AI data center bet, so the AI share does not change.' : 'Both sit outside the AI data center chain.')
    if (target.sector !== h.sector) facts.push(`Sector changes from ${h.sector} to ${target.sector}.`)
  } else {
    facts.push(`${to} is not on your watchlist yet: add it there to set its sector and AI link.`)
  }

  const a = ctx.rets[from]
  const b = ctx.rets[to]
  const pair = a && b ? correlation(a, b) : null
  const after = ctx.portfolio ? volWith(ctx, [{ ticker: from, value: -value }, { ticker: to, value }]) : null
  if (!pair || !after || !ctx.portfolio) {
    const verdict: Verdict = target && target.ai === false && h.ai ? 'helps' : 'unknown'
    return { verdict, label: verdict === 'helps' ? 'Likely diversifies' : 'Unmeasured', text: [`${from} → ${to}:`, ...facts].join(' ') }
  }
  const before = ctx.portfolio.vol
  const text =
    `${from} → ${to}: ${corrWord(pair.r).toLowerCase()} correlation between them (${f2(pair.r)}). ` +
    `Portfolio volatility ${pct1(before)} → ${pct1(after.vol)}. ` +
    facts.join(' ')
  if (after.vol < before - 0.002) return { verdict: 'helps', label: 'Swap lowers risk', text, corr: pair.r }
  if (after.vol > before + 0.002) return { verdict: 'overlaps', label: 'Swap adds risk', text, corr: pair.r }
  return { verdict: 'neutral', label: 'Swap is risk-neutral', text, corr: pair.r }
}

/** Pairwise correlations among a set of tickers, for the matrix. */
export function matrix(tickers: string[], rets: Record<string, Returns | null>): (number | null)[][] {
  return tickers.map((a) =>
    tickers.map((b) => {
      if (a === b) return rets[a] ? 1 : null
      const ra = rets[a]
      const rb = rets[b]
      const c = ra && rb ? correlation(ra, rb) : null
      return c ? c.r : null
    })
  )
}
