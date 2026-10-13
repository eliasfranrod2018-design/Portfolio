'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  ALL_SECTORS,
  HOLDING_PLANS,
  WATCH_STATUSES,
  norm,
  priceOf,
  uid,
  type Holding,
  type HoldingPlan,
  type Plan,
  type WatchItem,
} from '@/lib/portfolio'
import { candidateNote, holdingNote, swapNote, type FitContext } from '@/lib/fit'
import type { Series } from '@/lib/marketData'
import {
  CHAIN_OPTS,
  EditNum,
  EditText,
  Num,
  Select,
  SelText,
  Seg,
  TickerNote,
  money,
  money0,
  pct,
  researchUrl,
  signed,
  tone,
} from './bits'

const SECTOR_OPTS = ALL_SECTORS.map((s) => ({ value: s, label: s }))
const chainOpts = CHAIN_OPTS.map((o) => ({ ...o }))
const shares = (v: number) => String(Math.round(v * 10000) / 10000)

export interface TableProps {
  plan: Plan
  setPlan: (fn: (p: Plan) => Plan) => void
  series: Record<string, Series>
  live: Record<string, number | undefined>
  ctx: FitContext
}

/** Make sure a ticker you name as a swap target is on the watchlist, so it has a sector and AI link. */
export function ensureWatched(p: Plan, ticker: string, series: Record<string, Series>): Plan {
  const t = norm(ticker)
  if (!t || p.watchlist.some((w) => norm(w.ticker) === t) || p.holdings.some((h) => norm(h.ticker) === t)) return p
  const item: WatchItem = {
    id: uid(), ticker: t, name: series[t]?.name ?? t, group: 'Swap candidates', sector: 'Unknown', ai: false,
    role: '', status: 'watching', amount: 250, note: 'Added as a swap target: set its sector and AI link.',
  }
  return { ...p, watchlist: [...p.watchlist, item] }
}

/** The plan as the original table worded it: "Keep", "Sell, buy C", "Considering swap for DELL". */
const PLAN_WORDS: Record<HoldingPlan, string> = {
  keep: 'Keep',
  sell: 'Sell',
  swap: 'Sell, buy',
  considering: 'Considering swap for',
}

/** Sector-slot names as the original table wrote them: "Option for health care slot". */
const SLOT_WORDS: Record<string, string> = {
  'Health care': 'health care',
  'Consumer staples': 'staples',
  Utilities: 'utilities',
  'Real estate': 'real estate',
  Materials: 'materials',
}

/** "Watching" said the way the original did, from the group the stock sits in. */
function watchingWords(w: WatchItem) {
  if (w.group === 'Sector gap ideas' && SLOT_WORDS[w.sector]) return `Option for ${SLOT_WORDS[w.sector]} slot`
  if (w.group === 'Compared') return 'Compared, no decision'
  if (w.group === 'Skip if diversifying') return 'Acts like AI'
  return undefined
}

function dayText(price: number | undefined, s: Series | undefined) {
  const day = price && s?.prevClose ? price / s.prevClose - 1 : null
  return day === null ? '' : `${signed(day, (x) => pct(x, 2))} today`
}

/* ======================= holdings ======================= */

export function HoldingsTable({ plan, setPlan, series, live, ctx }: TableProps) {
  const rows = plan.holdings
    .map((h) => {
      const { price, live: isLive } = priceOf(h, live)
      return { h, price, isLive, value: h.shares * price }
    })
    .sort((a, b) => b.value - a.value)
  const account = rows.reduce((t, r) => t + r.value, 0) + plan.cash

  const patch = (id: string, part: Partial<Holding>) =>
    setPlan((p) => ({ ...p, holdings: p.holdings.map((h) => (h.id === id ? { ...h, ...part } : h)) }))
  const remove = (id: string) => setPlan((p) => ({ ...p, holdings: p.holdings.filter((h) => h.id !== id) }))

  return (
    <div className="pp-tw">
      <table id="holdings-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th className="pp-opt">Name</th>
            <th className="pp-num">Value</th>
            <th className="pp-num pp-opt">Cost</th>
            <th className="pp-num">Gain</th>
            <th className="pp-num">Return</th>
            <th className="pp-num">Of account</th>
            <th className="pp-opt">Role</th>
            <th>Plan</th>
            <th className="pp-num pp-opt">Rating</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ h, price, isLive, value }) => {
            const t = norm(h.ticker)
            const gain = value - h.costBasis
            const swapping = h.plan === 'swap' || h.plan === 'considering'
            const sw = swapping ? swapNote(ctx, h, value) : null
            const quote = live[t]
            return (
              <tr key={h.id} className={h.plan !== 'keep' ? 'pp-sel' : ''}>
                <td>
                  <TickerNote
                    ticker={t}
                    href={researchUrl(t, h.sector)}
                    notes={[
                      { note: holdingNote(ctx, h) },
                      ...(sw ? [{ note: sw, prefix: h.plan === 'considering' ? 'Considering swap' : 'Swap' }] : []),
                    ]}
                  >
                    <span className="pp-pop-row">
                      <span className="pp-pop-k">Shares</span>
                      <EditNum label={`${t} shares`} value={h.shares} format={shares} onCommit={(v) => patch(h.id, { shares: v })} />
                    </span>
                    <span className="pp-pop-row">
                      <span className="pp-pop-k">Price</span>
                      <EditNum label={`${t} price`} value={price} format={money} onCommit={(v) => patch(h.id, { price: v, priceMode: 'manual' })} />
                      <span className="pp-pop-extra">
                        {isLive ? `live, ${dayText(price, series[t]) || 'no change yet'}` : quote ? 'your price' : 'no live price yet'}
                      </span>
                      {!isLive && quote ? (
                        <button type="button" className="pp-link" onClick={() => patch(h.id, { priceMode: 'live' })}>
                          use live {money(quote)}
                        </button>
                      ) : null}
                    </span>
                    <span className="pp-pop-row">
                      <span className="pp-pop-k">Sector</span>
                      <SelText label={`${t} sector`} value={h.sector} options={SECTOR_OPTS} onChange={(v) => patch(h.id, { sector: v })} />
                    </span>
                    <span className="pp-pop-row">
                      <span className="pp-pop-k">AI link</span>
                      <SelText label={`${t} AI link`} value={h.ai ? 'ai' : 'other'} options={chainOpts} onChange={(v) => patch(h.id, { ai: v === 'ai' })} />
                    </span>
                    <button type="button" className="pp-pop-rm" onClick={() => remove(h.id)}>Remove {t} from holdings</button>
                  </TickerNote>
                </td>
                <td className="pp-opt"><EditText label={`${t} name`} value={h.name} onCommit={(v) => patch(h.id, { name: v })} /></td>
                <td className="pp-num">{money(value)}</td>
                <td className="pp-num pp-opt"><EditNum label={`${t} cost`} value={h.costBasis} format={money} onCommit={(v) => patch(h.id, { costBasis: v })} /></td>
                <td className={`pp-num ${tone(gain)}`}>{signed(gain, money)}</td>
                <td className={`pp-num ${tone(gain)}`}>{h.costBasis > 0 ? signed(gain / h.costBasis, pct) : '—'}</td>
                <td className="pp-num">{account > 0 ? pct(value / account) : '—'}</td>
                <td className="pp-opt"><EditText label={`${t} role`} value={h.role} onCommit={(v) => patch(h.id, { role: v })} /></td>
                <td className={h.plan !== 'keep' ? 'pp-act' : ''}>
                  <SelText label={`${t} plan`} value={h.plan} options={HOLDING_PLANS} shown={PLAN_WORDS[h.plan]} onChange={(v) => patch(h.id, { plan: v })} />
                  {swapping && (
                    <>
                      {' '}
                      <EditText
                        label={`${t} swap target`}
                        upper
                        placeholder="ticker"
                        value={h.swapFor}
                        onCommit={(v) =>
                          setPlan((p) => ensureWatched({ ...p, holdings: p.holdings.map((x) => (x.id === h.id ? { ...x, swapFor: v } : x)) }, v, series))
                        }
                      />
                    </>
                  )}
                </td>
                <td className="pp-num pp-opt"><EditText label={`${t} rating`} upper value={h.rating} onCommit={(v) => patch(h.id, { rating: v })} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function AddHolding({ setPlan, series, plan, onDone }: Pick<TableProps, 'setPlan' | 'series' | 'plan'> & { onDone: () => void }) {
  const [ticker, setTicker] = useState('')
  const [count, setCount] = useState(1)
  const [cost, setCost] = useState(0)
  const [price, setPrice] = useState(0)
  const [sector, setSector] = useState('Unknown')
  const [ai, setAi] = useState(false)
  const t = norm(ticker)
  const q = series[t]
  const known = plan.watchlist.find((w) => norm(w.ticker) === t)

  function add() {
    if (!t) return
    const h: Holding = {
      id: uid(), ticker: t, name: known?.name ?? q?.name ?? t, shares: count, costBasis: cost || count * (q?.price ?? price),
      price: price || q?.price || 0, priceMode: 'live', sector: known?.sector ?? sector, ai: known?.ai ?? ai,
      role: known?.role ?? '', plan: 'keep', swapFor: '', rating: '', note: '',
    }
    setPlan((p) => ({ ...p, holdings: [...p.holdings, h] }))
    setTicker('')
    setCost(0)
    setPrice(0)
  }

  return (
    <div className="pp-add pp-add-top">
      <label>
        Ticker
        <input className="pp-in" style={{ width: '5rem' }} value={ticker} autoFocus onChange={(e) => setTicker(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="e.g. JPM" />
      </label>
      <label>Shares<Num label="New holding shares" value={count} onChange={setCount} width="4rem" /></label>
      <label>Total cost<Num money label="New holding cost" value={cost} onChange={setCost} width="6rem" /></label>
      {!q && <label>Price<Num money label="New holding price" value={price} onChange={setPrice} width="6rem" /></label>}
      {!known && (
        <>
          <label>Sector<Select label="New holding sector" value={sector} options={SECTOR_OPTS} onChange={setSector} /></label>
          <label className="pp-check"><input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} />AI data center chain</label>
        </>
      )}
      <button type="button" className="pp-btn pp-btn-on" onClick={add}><Plus size={12} />Add</button>
      <button type="button" className="pp-btn" onClick={onDone}>Done</button>
      {t && (
        <span className="pp-addhint">
          {q ? `Live price ${money(q.price)}` : 'Not in the price feed yet: see Prices and your plan below.'}
          {known ? ' · sector and AI link from Possibles' : ''}
        </span>
      )}
    </div>
  )
}

/* ======================= possibles ======================= */

export function WatchlistTable({ plan, setPlan, series, live, ctx }: TableProps) {
  const groups = useMemo(() => ['All', ...new Set(plan.watchlist.map((w) => w.group))], [plan.watchlist])
  const [group, setGroup] = useState('All')
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const swapTargets = new Map(
    plan.holdings.filter((h) => (h.plan === 'swap' || h.plan === 'considering') && h.swapFor).map((h) => [norm(h.swapFor), h])
  )

  const q = query.trim().toLowerCase()
  const rows = plan.watchlist.filter(
    (w) =>
      (group === 'All' || w.group === group) &&
      (!q || [w.ticker, w.name, w.sector, w.note, w.group].some((x) => x.toLowerCase().includes(q)))
  )
  const patch = (id: string, part: Partial<WatchItem>) =>
    setPlan((p) => ({ ...p, watchlist: p.watchlist.map((w) => (w.id === id ? { ...w, ...part } : w)) }))
  const remove = (id: string) => setPlan((p) => ({ ...p, watchlist: p.watchlist.filter((w) => w.id !== id) }))

  return (
    <>
      <div className="pp-tools">
        <Seg label="Group" value={group} options={groups.map((g) => ({ value: g, label: g }))} onChange={setGroup} />
        <input type="search" className="pp-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ticker, sector or note" aria-label="Search possibles" />
        <button type="button" className="pp-chip-btn" aria-pressed={adding} onClick={() => setAdding((a) => !a)}>
          <Plus size={11} />Add
        </button>
      </div>
      {adding && <AddWatch plan={plan} setPlan={setPlan} series={series} onDone={() => setAdding(false)} />}
      <div className="pp-tw">
        <table id="possibles-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Name</th>
              <th className="pp-opt">Group</th>
              <th className="pp-opt">Sector</th>
              <th className="pp-opt">AI link</th>
              <th>Status</th>
              <th className="pp-opt">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => {
              const t = norm(w.ticker)
              const from = swapTargets.get(t)
              const inPlan = w.status === 'buy' || w.status === 'full'
              /* A swap target reads the way the original table worded it. */
              const derived =
                w.status !== 'watching'
                  ? undefined
                  : from
                    ? from.plan === 'considering'
                      ? `Considering, swap for ${norm(from.ticker)}`
                      : `Buy with ${norm(from.ticker)} proceeds`
                    : watchingWords(w)
              const price = live[t]
              const day = dayText(price, series[t])
              return (
                <tr key={w.id}>
                  <td>
                    <TickerNote
                      ticker={t}
                      href={researchUrl(t, w.sector)}
                      notes={[{ note: candidateNote(ctx, { ticker: t, sector: w.sector, ai: w.ai, amount: w.amount }) }]}
                      extra={[price ? `Price ${money(price)}${day ? `, ${day}` : ''}.` : 'No live price yet.']}
                    >
                      <span className="pp-pop-row">
                        <span className="pp-pop-k">Amount</span>
                        <EditNum label={`${t} amount`} value={w.amount} format={money0} onCommit={(v) => patch(w.id, { amount: v })} />
                        <span className="pp-pop-extra">{price ? `${(w.amount / price).toFixed(3)} shares` : ''}</span>
                      </span>
                      <button type="button" className="pp-pop-rm" onClick={() => remove(w.id)}>Remove {t} from possibles</button>
                    </TickerNote>
                  </td>
                  <td><EditText label={`${t} name`} value={w.name} onCommit={(v) => patch(w.id, { name: v })} /></td>
                  <td className="pp-opt"><EditText label={`${t} group`} value={w.group} onCommit={(v) => patch(w.id, { group: v || 'Ideas' })} /></td>
                  <td className="pp-opt"><SelText label={`${t} sector`} value={w.sector} options={SECTOR_OPTS} onChange={(v) => patch(w.id, { sector: v })} /></td>
                  <td className="pp-opt">
                    <SelText label={`${t} AI link`} value={w.ai ? 'ai' : 'other'} options={chainOpts} onChange={(v) => patch(w.id, { ai: v === 'ai' })} />
                  </td>
                  <td className={inPlan || from ? 'pp-act' : ''}>
                    <SelText label={`${t} status`} value={w.status} options={WATCH_STATUSES} shown={derived} onChange={(v) => patch(w.id, { status: v })} />
                  </td>
                  <td className="pp-opt"><EditText label={`${t} note`} value={w.note} onCommit={(v) => patch(w.id, { note: v })} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!rows.length && <p className="pp-note" style={{ marginTop: 12 }}>Nothing matches.</p>}
      </div>
    </>
  )
}

function AddWatch({ setPlan, series, plan, onDone }: Pick<TableProps, 'setPlan' | 'series' | 'plan'> & { onDone: () => void }) {
  const [ticker, setTicker] = useState('')
  const [sector, setSector] = useState('Unknown')
  const [ai, setAi] = useState(false)
  const [group, setGroup] = useState('Ideas')
  const t = norm(ticker)
  const dup = plan.watchlist.some((w) => norm(w.ticker) === t)

  function add() {
    if (!t || dup) return
    const item: WatchItem = {
      id: uid(), ticker: t, name: series[t]?.name ?? t, group: group.trim() || 'Ideas', sector, ai, role: '',
      status: 'watching', amount: 250, note: '',
    }
    setPlan((p) => ({ ...p, watchlist: [item, ...p.watchlist] }))
    setTicker('')
  }

  return (
    <div className="pp-add pp-add-top">
      <label>
        Ticker
        <input className="pp-in" style={{ width: '5rem' }} value={ticker} autoFocus onChange={(e) => setTicker(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="e.g. UNH" />
      </label>
      <label>Sector<Select label="New idea sector" value={sector} options={SECTOR_OPTS} onChange={setSector} /></label>
      <label className="pp-check"><input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} />AI data center chain</label>
      <label>
        Group
        <input className="pp-in" style={{ width: '9rem' }} value={group} onChange={(e) => setGroup(e.target.value)} list="pp-groups" />
        <datalist id="pp-groups">
          {[...new Set(plan.watchlist.map((w) => w.group))].map((g) => <option key={g} value={g} />)}
        </datalist>
      </label>
      <button type="button" className="pp-btn pp-btn-on" onClick={add}><Plus size={12} />Add</button>
      <button type="button" className="pp-btn" onClick={onDone}>Done</button>
      {dup && <span className="pp-addhint pp-act">{t} is already on the list.</span>}
    </div>
  )
}
