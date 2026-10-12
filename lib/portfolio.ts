/**
 * The portfolio plan: what you hold, what you are looking at, and what you
 * intend to do — plus the three scenarios built from it and the
 * diversification numbers for each. No React and no fetching in here.
 *
 * Money is in dollars (not millions, unlike the valuation engine), and shares
 * may be fractional. Rates are decimals.
 */

export const SECTORS = [
  'Information technology',
  'Industrials',
  'Communication services',
  'Financials',
  'Consumer discretionary',
  'Energy',
  'Health care',
  'Consumer staples',
  'Utilities',
  'Real estate',
  'Materials',
] as const
export const OTHER_SECTORS = ['ETF / fund', 'Unknown'] as const
export const ALL_SECTORS: string[] = [...SECTORS, ...OTHER_SECTORS]

/** What you plan to do with a stock you already own. */
export type HoldingPlan = 'keep' | 'sell' | 'swap' | 'considering'
export const HOLDING_PLANS: { value: HoldingPlan; label: string }[] = [
  { value: 'keep', label: 'Keep' },
  { value: 'sell', label: 'Sell' },
  { value: 'swap', label: 'Swap for…' },
  { value: 'considering', label: 'Considering swap for…' },
]

/** Where a stock on the watchlist stands. */
export type WatchStatus = 'watching' | 'buy' | 'full' | 'set-aside'
export const WATCH_STATUSES: { value: WatchStatus; label: string }[] = [
  { value: 'watching', label: 'Watching' },
  { value: 'buy', label: 'Buy (planned)' },
  { value: 'full', label: 'In full plan' },
  { value: 'set-aside', label: 'Set aside' },
]

export interface Holding {
  id: string
  ticker: string
  name: string
  shares: number
  /** Total dollars paid for the position, not per share. */
  costBasis: number
  /** Last known price: the fallback when there is no live quote, or your override. */
  price: number
  /** 'live' uses the market feed when it has the ticker; 'manual' always uses `price`. */
  priceMode: 'live' | 'manual'
  sector: string
  /** True when the stock rides AI data center spending. */
  ai: boolean
  role: string
  plan: HoldingPlan
  /** The ticker you would buy instead, for 'swap' and 'considering'. */
  swapFor: string
  /** Your broker's rating, as free text (Schwab's A–F). */
  rating: string
  note: string
}

export interface WatchItem {
  id: string
  ticker: string
  name: string
  group: string
  sector: string
  ai: boolean
  role: string
  status: WatchStatus
  /** Dollars you would put in, for 'buy' and 'full'. */
  amount: number
  note: string
}

export interface Plan {
  v: 1
  cash: number
  holdings: Holding[]
  watchlist: WatchItem[]
}

export type ScenarioId = 'today' | 'moves' | 'full'
export const SCENARIOS: { id: ScenarioId; label: string; blurb: string }[] = [
  { id: 'today', label: 'Today', blurb: 'What you hold now.' },
  {
    id: 'moves',
    label: 'After planned moves',
    blurb: 'Sells and swaps applied, plus every watchlist name marked "Buy (planned)".',
  },
  {
    id: 'full',
    label: 'Full plan',
    blurb: 'Planned moves plus every "Considering swap" and every name marked "In full plan".',
  },
]

export interface Position {
  ticker: string
  value: number
  sector: string
  ai: boolean
  role: string
}

export interface Scenario {
  id: ScenarioId
  positions: Position[]
  cash: number
  /** Dollars added on top of today's account to fund the buys. */
  newMoney: number
}

export interface Metrics {
  account: number
  invested: number
  aiShare: number
  effectiveHoldings: number
  independentBets: number
  sectors: number
  stocks: number
  top: Position | null
  topShare: number
  newMoney: number
  cashShare: number
  sectorShares: { sector: string; share: number }[]
}

export const norm = (t: string) => t.trim().toUpperCase()
export const uid = () => Math.random().toString(36).slice(2, 10)

/** The price a holding is valued at, given the live quotes available. */
export function priceOf(h: Holding, live: Record<string, number | undefined>): { price: number; live: boolean } {
  const q = live[norm(h.ticker)]
  if (h.priceMode === 'live' && q !== undefined && q > 0) return { price: q, live: true }
  return { price: h.price, live: false }
}

/** Look up what the plan knows about a ticker: a holding first, then the watchlist. */
export function describe(plan: Plan, ticker: string): { name: string; sector: string; ai: boolean; role: string } {
  const t = norm(ticker)
  const h = plan.holdings.find((x) => norm(x.ticker) === t)
  if (h) return h
  const w = plan.watchlist.find((x) => norm(x.ticker) === t)
  if (w) return w
  return { name: t, sector: 'Unknown', ai: false, role: '' }
}

export function buildScenario(plan: Plan, id: ScenarioId, live: Record<string, number | undefined>): Scenario {
  const book = new Map<string, Position>()
  const add = (ticker: string, value: number) => {
    const t = norm(ticker)
    if (!t || !(value > 0)) return
    const cur = book.get(t)
    if (cur) {
      cur.value += value
      return
    }
    const d = describe(plan, t)
    book.set(t, { ticker: t, value, sector: d.sector, ai: d.ai, role: d.role })
  }

  let cash = plan.cash
  let newMoney = 0
  for (const h of plan.holdings) {
    const value = h.shares * priceOf(h, live).price
    const target = norm(h.swapFor)
    const swaps =
      id !== 'today' && target && (h.plan === 'swap' || (h.plan === 'considering' && id === 'full'))
    if (id !== 'today' && h.plan === 'sell') cash += value
    else if (swaps) add(target, value)
    else add(h.ticker, value)
  }
  if (id !== 'today') {
    for (const w of plan.watchlist) {
      if (w.status === 'buy' || (w.status === 'full' && id === 'full')) {
        add(w.ticker, w.amount)
        newMoney += Math.max(0, w.amount)
      }
    }
  }
  const positions = [...book.values()].sort((a, b) => b.value - a.value)
  return { id, positions, cash, newMoney }
}

/** 1 / Σ w², the inverse Herfindahl index: how many equal positions this behaves like. */
function inverseHhi(values: number[]): number {
  const total = values.reduce((t, v) => t + v, 0)
  if (!(total > 0)) return 0
  return 1 / values.reduce((t, v) => t + (v / total) ** 2, 0)
}

export function metricsOf(s: Scenario): Metrics {
  const invested = s.positions.reduce((t, p) => t + p.value, 0)
  const account = invested + s.cash
  const ai = s.positions.filter((p) => p.ai).reduce((t, p) => t + p.value, 0)
  const bets = [ai, ...s.positions.filter((p) => !p.ai).map((p) => p.value)].filter((v) => v > 0)
  const top = s.positions[0] ?? null
  const bySector = new Map<string, number>()
  for (const p of s.positions) bySector.set(p.sector, (bySector.get(p.sector) ?? 0) + p.value)
  const sectorShares = [...ALL_SECTORS, 'Cash']
    .map((sector) => ({
      sector,
      share: account > 0 ? (sector === 'Cash' ? s.cash : (bySector.get(sector) ?? 0)) / account : 0,
    }))
    .filter((r) => r.share > 0 || (SECTORS as readonly string[]).includes(r.sector))
  return {
    account,
    invested,
    aiShare: account > 0 ? ai / account : 0,
    effectiveHoldings: inverseHhi(s.positions.map((p) => p.value)),
    independentBets: inverseHhi(bets),
    sectors: new Set(s.positions.map((p) => p.sector).filter((x) => (SECTORS as readonly string[]).includes(x))).size,
    stocks: s.positions.length,
    top,
    topShare: top && account > 0 ? top.value / account : 0,
    newMoney: s.newMoney,
    cashShare: account > 0 ? s.cash / account : 0,
    sectorShares,
  }
}

/** Every ticker the plan mentions, for the market data feed. */
export function allTickers(plan: Plan): string[] {
  const set = new Set<string>()
  plan.holdings.forEach((h) => {
    set.add(norm(h.ticker))
    if (h.swapFor) set.add(norm(h.swapFor))
  })
  plan.watchlist.forEach((w) => set.add(norm(w.ticker)))
  set.delete('')
  return [...set].sort()
}

/** Older saved plans may miss fields added later: fill them from the defaults. */
export function hydratePlan(raw: unknown): Plan {
  if (!raw || typeof raw !== 'object') return seedPlan()
  const p = raw as Partial<Plan>
  const blankH: Holding = {
    id: '', ticker: '', name: '', shares: 0, costBasis: 0, price: 0, priceMode: 'live',
    sector: 'Unknown', ai: false, role: '', plan: 'keep', swapFor: '', rating: '', note: '',
  }
  const blankW: WatchItem = {
    id: '', ticker: '', name: '', group: 'Ideas', sector: 'Unknown', ai: false, role: '',
    status: 'watching', amount: 250, note: '',
  }
  return {
    v: 1,
    cash: Number(p.cash) || 0,
    holdings: Array.isArray(p.holdings) ? p.holdings.map((h) => ({ ...blankH, ...h, id: h.id || uid() })) : [],
    watchlist: Array.isArray(p.watchlist) ? p.watchlist.map((w) => ({ ...blankW, ...w, id: w.id || uid() })) : [],
  }
}

/* ---------------- the starting plan ---------------- */

const IT = 'Information technology'
const IND = 'Industrials'
const COMM = 'Communication services'
const FIN = 'Financials'

type H = [string, string, number, number, number, string, boolean, string, string, HoldingPlan?, string?]
/** From the Schwab snapshot: ticker, name, shares, price, cost basis, sector, AI chain, role, Schwab rating, plan, swap target. */
const SEED_HOLDINGS: H[] = [
  ['MSFT', 'Microsoft', 1, 525.955, 515.27, IT, true, 'Cloud spender, software', 'A'],
  ['AVGO', 'Broadcom', 1, 362.175, 362.11, IT, true, 'AI chips', 'C'],
  ['MGNI', 'Magnite', 11, 25.12, 161.23, COMM, false, 'Ad tech', 'C'],
  ['VRT', 'Vertiv', 1, 256.2, 311.3, IND, true, 'Power and cooling', 'C', 'swap', 'C'],
  ['NVDA', 'Nvidia', 1, 237.14, 197.95, IT, true, 'AI chips', 'B'],
  ['ANET', 'Arista Networks', 1, 207.54, 152.24, IT, true, 'Networking', 'B', 'considering', 'DELL'],
  ['TEAM', 'Atlassian', 1, 195.27, 93.77, IT, false, 'Work software', 'C'],
  ['NVT', 'nVent Electric', 1, 169.78, 130.52, IND, true, 'Power and cooling', 'D'],
  ['BX', 'Blackstone', 1, 110.51, 113.03, FIN, false, 'Asset manager', 'C'],
]

type W = [string, string, string, string, boolean, string, WatchStatus, string]
/** Every stock discussed: ticker, name, group, sector, AI chain, role, status, note. */
const SEED_WATCH: W[] = [
  ['C', 'Citigroup', 'Planned moves', FIN, false, 'Global bank', 'watching', 'Most global big US bank; value stock with a dividend.'],
  ['DELL', 'Dell Technologies', 'Planned moves', IT, true, 'AI servers', 'watching', 'AI servers growing fast, but far thinner margins than ANET. Same AI bet.'],
  ['AMAT', 'Applied Materials', 'AI chain adds', IT, true, 'Chip-making tools', 'full', 'Chip-making equipment. Highly cyclical.'],
  ['MU', 'Micron', 'AI chain adds', IT, true, 'AI memory', 'full', 'Memory chips. Among the most cyclical stocks in semis.'],
  ['TSM', 'Taiwan Semiconductor', 'AI chain adds', IT, true, 'Chip foundry', 'full', 'Makes the most advanced chips. Adds Taiwan risk; an ADR, so check Stock Slices.'],
  ['GEV', 'GE Vernova', 'AI chain adds', IND, true, 'Power equipment', 'full', 'Turbines and grid gear riding data center power demand.'],
  ['META', 'Meta Platforms', 'AI chain adds', COMM, true, 'Ads, AI spender', 'full', 'Ad business plus heavy AI spending. Overlaps MGNI on ads.'],
  ['AMZN', 'Amazon', 'AI chain adds', 'Consumer discretionary', true, 'Cloud spender, retail', 'full', 'AWS and retail. A spender rather than a supplier.'],
  ['MA', 'Mastercard', 'Diversifiers', FIN, false, 'Card payments', 'full', 'Card network: consumer spending and international revenue, no credit risk.'],
  ['CAT', 'Caterpillar', 'Diversifiers', IND, false, 'Heavy machinery', 'full', 'Construction and mining cycles, with some data center power sales.'],
  ['COP', 'ConocoPhillips', 'Diversifiers', 'Energy', false, 'Oil and gas', 'full', 'Largest US independent oil producer. Your only energy name.'],
  ['LLY', 'Eli Lilly', 'Sector gap ideas', 'Health care', false, 'Drugs', 'watching', 'Obesity and diabetes drugs. Growth with a high valuation.'],
  ['ISRG', 'Intuitive Surgical', 'Sector gap ideas', 'Health care', false, 'Surgical robots', 'watching', 'Robotic surgery systems plus recurring instrument sales.'],
  ['JNJ', 'Johnson & Johnson', 'Sector gap ideas', 'Health care', false, 'Drugs and devices', 'watching', 'Medicines and devices. Defensive, pays a dividend.'],
  ['COST', 'Costco', 'Sector gap ideas', 'Consumer staples', false, 'Warehouse retail', 'watching', 'Membership warehouses. Steady grower, pricey valuation.'],
  ['PG', 'Procter & Gamble', 'Sector gap ideas', 'Consumer staples', false, 'Household brands', 'watching', 'Household brands. Defensive, pays a dividend.'],
  ['KO', 'Coca-Cola', 'Sector gap ideas', 'Consumer staples', false, 'Beverages', 'watching', 'Beverages sold worldwide. Defensive, pays a dividend.'],
  ['NEE', 'NextEra Energy', 'Sector gap ideas', 'Utilities', false, 'Utility, renewables', 'watching', "Florida utility and big wind and solar developer. Partly replaces FAN's wind exposure."],
  ['DUK', 'Duke Energy', 'Sector gap ideas', 'Utilities', false, 'Regulated utility', 'watching', 'Regulated Southeast utility. Income focused.'],
  ['O', 'Realty Income', 'Sector gap ideas', 'Real estate', false, 'Retail REIT', 'watching', 'Leases buildings to retailers; pays a monthly dividend.'],
  ['WELL', 'Welltower', 'Sector gap ideas', 'Real estate', false, 'Senior housing REIT', 'watching', 'Senior housing, helped by an aging population.'],
  ['LIN', 'Linde', 'Sector gap ideas', 'Materials', false, 'Industrial gases', 'watching', 'Industrial gases on long-term contracts. Very steady.'],
  ['SHW', 'Sherwin-Williams', 'Sector gap ideas', 'Materials', false, 'Paint and coatings', 'watching', 'Paint and coatings tied to housing. An industry you know firsthand.'],
  ['GOOGL', 'Alphabet', 'Set aside', COMM, true, 'Ads, AI spender', 'set-aside', 'Overlaps META on ads and AI spending.'],
  ['OXY', 'Occidental Petroleum', 'Set aside', 'Energy', false, 'Oil and gas', 'set-aside', 'Same oil-price bet as COP.'],
  ['PR', 'Permian Resources', 'Set aside', 'Energy', false, 'Oil and gas', 'set-aside', 'Same oil-price bet as COP.'],
  ['FAN', 'First Trust Global Wind ETF', 'Set aside', 'ETF / fund', false, 'Wind energy ETF', 'set-aside', 'Was your only utilities and European exposure, with low market correlation.'],
  ['JPM', 'JPMorgan Chase', 'Compared', FIN, false, 'Bank', 'watching', 'Strongest bank diversifier against the AI chain.'],
  ['V', 'Visa', 'Compared', FIN, false, 'Card payments', 'watching', 'Same business as MA. Own one, not both.'],
  ['GS', 'Goldman Sachs', 'Compared', FIN, false, 'Investment bank', 'watching', 'Overlaps BX on the deal cycle; one share would dominate.'],
  ['WDC', 'Western Digital', 'Compared', IT, true, 'Storage', 'watching', 'Same cloud customers as ANET. Cheap but cyclical.'],
  ['VST', 'Vistra', 'Skip if diversifying', 'Utilities', true, 'Power producer', 'watching', 'Utility whose stock trades on data center power deals.'],
  ['CEG', 'Constellation Energy', 'Skip if diversifying', 'Utilities', true, 'Nuclear power', 'watching', 'Nuclear power sold to data centers.'],
  ['EQIX', 'Equinix', 'Skip if diversifying', 'Real estate', true, 'Data center REIT', 'watching', 'REIT that owns data centers.'],
  ['DLR', 'Digital Realty', 'Skip if diversifying', 'Real estate', true, 'Data center REIT', 'watching', 'REIT that owns data centers.'],
  ['FCX', 'Freeport-McMoRan', 'Skip if diversifying', 'Materials', true, 'Copper', 'watching', 'Copper tied to electrification. Highly cyclical.'],
]

export function seedPlan(): Plan {
  return {
    v: 1,
    cash: 152.34,
    holdings: SEED_HOLDINGS.map(([ticker, name, shares, price, costBasis, sector, ai, role, rating, plan, swapFor]) => ({
      id: uid(), ticker, name, shares, price, priceMode: 'live', costBasis, sector, ai, role, rating,
      plan: plan ?? 'keep', swapFor: swapFor ?? '', note: '',
    })),
    watchlist: SEED_WATCH.map(([ticker, name, group, sector, ai, role, status, note]) => ({
      id: uid(), ticker, name, group, sector, ai, role, status, amount: 250, note,
    })),
  }
}
