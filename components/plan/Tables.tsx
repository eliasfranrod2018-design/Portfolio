'use client'

import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  ALL_SECTORS,
  HOLDING_PLANS,
  WATCH_STATUSES,
  norm,
  priceOf,
  uid,
  type Holding,
  type Plan,
  type WatchItem,
} from '@/lib/portfolio'
import { candidateNote, holdingNote, swapNote, type FitContext } from '@/lib/fit'
import type { Series } from '@/lib/marketData'
import { CHAIN_OPTS, FitLine, Num, Select, Seg, Txt, money, pct, researchUrl, signed, tone } from './bits'

const SECTOR_OPTS = ALL_SECTORS.map((s) => ({ value: s, label: s }))
const chainOpts = CHAIN_OPTS.map((o) => ({ ...o }))

export interface TableProps {
  plan: Plan
  setPlan: (fn: (p: Plan) => Plan) => void
  series: Record<string, Series>
  live: Record<string, number | undefined>
  ctx: FitContext
}

function Ticker({ ticker, sector }: { ticker: string; sector: string }) {
  return (
    <a className="pp-tkr" href={researchUrl(ticker, sector)} target="_blank" rel="noreferrer" title={`${ticker} on stockanalysis.com`}>
      {ticker}
    </a>
  )
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

/* ======================= holdings ======================= */

const H_COLS = 13

export function HoldingsTable({ plan, setPlan, series, live, ctx }: TableProps) {
  const rows = plan.holdings
    .map((h) => {
      const { price, live: isLive } = priceOf(h, live)
      return { h, price, isLive, value: h.shares * price }
    })
    .sort((a, b) => b.value - a.value)
  const stocks = rows.reduce((t, r) => t + r.value, 0)
  const cost = plan.holdings.reduce((t, h) => t + h.costBasis, 0)
  const account = stocks + plan.cash

  const patch = (id: string, part: Partial<Holding>) =>
    setPlan((p) => ({ ...p, holdings: p.holdings.map((h) => (h.id === id ? { ...h, ...part } : h)) }))
  const remove = (id: string) => setPlan((p) => ({ ...p, holdings: p.holdings.filter((h) => h.id !== id) }))

  return (
    <div className="pp-tw">
      <table>
        <thead>
          <tr>
            <th>Ticker</th>
            <th className="pp-num">Shares</th>
            <th className="pp-num">Price</th>
            <th className="pp-num">Value</th>
            <th className="pp-num pp-opt">Cost</th>
            <th className="pp-num">Gain</th>
            <th className="pp-num">Return</th>
            <th className="pp-num">Of account</th>
            <th className="pp-opt">Role</th>
            <th className="pp-opt">Sector · AI link</th>
            <th>Plan</th>
            <th className="pp-num pp-opt">Rating</th>
            <th aria-label="Remove" />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ h, price, isLive, value }) => {
            const t = norm(h.ticker)
            const q = series[t]
            const day = isLive && q?.prevClose ? price / q.prevClose - 1 : null
            const gain = value - h.costBasis
            const swapping = h.plan === 'swap' || h.plan === 'considering'
            const sw = swapping ? swapNote(ctx, h, value) : null
            const sel = h.plan !== 'keep' ? 'pp-sel' : ''
            return [
              <tr key={`${h.id}-fit`} className={`pp-fitrow ${sel}`}>
                <td colSpan={H_COLS}>
                  <FitLine note={holdingNote(ctx, h)} />
                  {sw && <FitLine note={sw} prefix={h.plan === 'considering' ? 'Considering swap' : 'Swap'} />}
                </td>
              </tr>,
              <tr key={h.id} className={sel}>
                <td>
                  <Ticker ticker={t} sector={h.sector} />
                  <div className="pp-small">{h.name}</div>
                </td>
                <td className="pp-num"><Num label={`${t} shares`} value={h.shares} onChange={(v) => patch(h.id, { shares: v })} width="3.75rem" /></td>
                <td className="pp-num">
                  {h.priceMode === 'live' && isLive ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {money(price)}
                      <button type="button" className="pp-icon" title="Type your own price" onClick={() => patch(h.id, { priceMode: 'manual', price })}>
                        <Pencil size={11} />
                      </button>
                    </span>
                  ) : (
                    <Num money label={`${t} price`} value={h.price} onChange={(v) => patch(h.id, { price: v, priceMode: 'manual' })} width="5.5rem" />
                  )}
                  <div className="pp-small">
                    {isLive ? (
                      day !== null && <span className={tone(day)}>{signed(day, (x) => pct(x, 2))} today</span>
                    ) : live[t] ? (
                      <button type="button" className="pp-link" onClick={() => patch(h.id, { priceMode: 'live' })}>use live {money(live[t]!)}</button>
                    ) : (
                      'no live quote'
                    )}
                  </div>
                </td>
                <td className="pp-num">{money(value)}</td>
                <td className="pp-num pp-opt"><Num money label={`${t} cost basis`} value={h.costBasis} onChange={(v) => patch(h.id, { costBasis: v })} width="5rem" /></td>
                <td className={`pp-num ${tone(gain)}`}>{signed(gain, money)}</td>
                <td className={`pp-num ${tone(gain)}`}>{h.costBasis > 0 ? signed(gain / h.costBasis, pct) : '—'}</td>
                <td className="pp-num">{account > 0 ? pct(value / account) : '—'}</td>
                <td className="pp-opt"><Txt label={`${t} role`} value={h.role} onCommit={(v) => patch(h.id, { role: v })} width="7.5rem" /></td>
                <td className="pp-opt">
                  <div className="pp-stack">
                    <Select label={`${t} sector`} value={h.sector} options={SECTOR_OPTS} onChange={(v) => patch(h.id, { sector: v })} />
                    <Select label={`${t} AI link`} value={h.ai ? 'ai' : 'other'} options={chainOpts} onChange={(v) => patch(h.id, { ai: v === 'ai' })} />
                  </div>
                </td>
                <td>
                  <div className="pp-stack">
                    <Select
                      label={`${t} plan`}
                      value={h.plan}
                      options={HOLDING_PLANS}
                      onChange={(v) => patch(h.id, { plan: v })}
                      className={h.plan !== 'keep' ? 'pp-act' : ''}
                    />
                    {swapping && (
                      <Txt
                        label={`${t} swap target`}
                        upper
                        value={h.swapFor}
                        placeholder="Ticker"
                        width="5rem"
                        onCommit={(v) =>
                          setPlan((p) => ensureWatched({ ...p, holdings: p.holdings.map((x) => (x.id === h.id ? { ...x, swapFor: v } : x)) }, v, series))
                        }
                      />
                    )}
                  </div>
                </td>
                <td className="pp-num pp-opt"><Txt label={`${t} rating`} value={h.rating} onCommit={(v) => patch(h.id, { rating: v.toUpperCase() })} width="2.25rem" /></td>
                <td>
                  <button type="button" className="pp-icon" aria-label={`Remove ${t}`} onClick={() => remove(h.id)}><Trash2 size={13} /></button>
                </td>
              </tr>,
            ]
          })}
          <tr>
            <td>Cash</td>
            <td />
            <td />
            <td className="pp-num"><Num money label="Cash" value={plan.cash} onChange={(v) => setPlan((p) => ({ ...p, cash: v }))} width="5.5rem" /></td>
            <td className="pp-opt" />
            <td />
            <td />
            <td className="pp-num">{account > 0 ? pct(plan.cash / account) : '—'}</td>
            <td colSpan={5} />
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td className="pp-strong" style={{ fontWeight: 500 }}>Account</td>
            <td />
            <td />
            <td className="pp-num pp-strong" style={{ fontWeight: 500 }}>{money(account)}</td>
            <td className="pp-num pp-opt pp-dimtext">{money(cost)}</td>
            <td className={`pp-num ${tone(stocks - cost)}`}>{signed(stocks - cost, money)}</td>
            <td className={`pp-num ${tone(stocks - cost)}`}>{cost > 0 ? signed((stocks - cost) / cost, pct) : '—'}</td>
            <td colSpan={6} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export function AddHolding({ setPlan, series, plan }: Pick<TableProps, 'setPlan' | 'series' | 'plan'>) {
  const [ticker, setTicker] = useState('')
  const [shares, setShares] = useState(1)
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
      id: uid(), ticker: t, name: known?.name ?? q?.name ?? t, shares, costBasis: cost || shares * (q?.price ?? price),
      price: price || q?.price || 0, priceMode: 'live', sector: known?.sector ?? sector, ai: known?.ai ?? ai,
      role: known?.role ?? '', plan: 'keep', swapFor: '', rating: '', note: '',
    }
    setPlan((p) => ({ ...p, holdings: [...p.holdings, h] }))
    setTicker('')
    setCost(0)
    setPrice(0)
  }

  return (
    <div className="pp-add">
      <label>
        Ticker
        <input
          className="pp-in"
          style={{ width: '5rem' }}
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="e.g. JPM"
        />
      </label>
      <label>Shares<Num label="New holding shares" value={shares} onChange={setShares} width="4rem" /></label>
      <label>Total cost<Num money label="New holding cost" value={cost} onChange={setCost} width="6rem" /></label>
      {!q && <label>Price<Num money label="New holding price" value={price} onChange={setPrice} width="6rem" /></label>}
      {!known && (
        <>
          <label>Sector<Select label="New holding sector" value={sector} options={SECTOR_OPTS} onChange={setSector} /></label>
          <label className="pp-check"><input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} />AI data center chain</label>
        </>
      )}
      <button type="button" className="pp-btn pp-btn-primary" onClick={add}><Plus size={12} />Add holding</button>
      {t && (
        <span style={{ paddingBottom: 5 }}>
          {q ? `Live price ${money(q.price)}` : 'Not in the price feed yet: see Market data below.'}
          {known ? ` · sector and AI link from your watchlist` : ''}
        </span>
      )}
    </div>
  )
}

/* ======================= watchlist ======================= */

const W_COLS = 9

export function WatchlistTable({ plan, setPlan, series, live, ctx }: TableProps) {
  const groups = useMemo(() => ['All', ...new Set(plan.watchlist.map((w) => w.group))], [plan.watchlist])
  const [group, setGroup] = useState('All')
  const [query, setQuery] = useState('')
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
        <input type="search" className="pp-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ticker, sector or note" aria-label="Search the watchlist" />
      </div>
      <div className="pp-tw pp-tall">
        <table>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Name</th>
              <th className="pp-num">Price</th>
              <th className="pp-opt">Group</th>
              <th className="pp-opt">Sector · AI link</th>
              <th>Status</th>
              <th className="pp-num">Amount</th>
              <th className="pp-opt">Note</th>
              <th aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => {
              const t = norm(w.ticker)
              const s = series[t]
              const price = live[t]
              const day = price && s?.prevClose ? price / s.prevClose - 1 : null
              const swapFrom = swapTargets.get(t)
              const active = w.status === 'buy' || w.status === 'full' || !!swapFrom
              return [
                <tr key={`${w.id}-fit`} className="pp-fitrow">
                  <td colSpan={W_COLS}>
                    <FitLine note={candidateNote(ctx, { ticker: t, sector: w.sector, ai: w.ai, amount: w.amount })} />
                  </td>
                </tr>,
                <tr key={w.id}>
                  <td><Ticker ticker={t} sector={w.sector} /></td>
                  <td>{w.name}</td>
                  <td className="pp-num">
                    {price ? money(price) : <span className="pp-dimtext">—</span>}
                    {day !== null && <div className={`pp-small ${tone(day)}`}>{signed(day, (x) => pct(x, 2))}</div>}
                  </td>
                  <td className="pp-opt">{w.group}</td>
                  <td className="pp-opt">
                    <div className="pp-stack">
                      <Select label={`${t} sector`} value={w.sector} options={SECTOR_OPTS} onChange={(v) => patch(w.id, { sector: v })} />
                      <Select label={`${t} AI link`} value={w.ai ? 'ai' : 'other'} options={chainOpts} onChange={(v) => patch(w.id, { ai: v === 'ai' })} />
                    </div>
                  </td>
                  <td>
                    <Select label={`${t} status`} value={w.status} options={WATCH_STATUSES} onChange={(v) => patch(w.id, { status: v })} className={active ? 'pp-act' : ''} />
                    {swapFrom && (
                      <div className="pp-small pp-act">{swapFrom.plan === 'considering' ? 'Considering, swap for' : 'Swap for'} {norm(swapFrom.ticker)}</div>
                    )}
                  </td>
                  <td className="pp-num">
                    <Num money label={`${t} amount`} value={w.amount} onChange={(v) => patch(w.id, { amount: v })} width="5rem" />
                    {price ? <div className="pp-small">{(w.amount / price).toFixed(3)} sh</div> : null}
                  </td>
                  <td className="pp-opt" style={{ minWidth: '14rem' }}><Txt label={`${t} note`} value={w.note} onCommit={(v) => patch(w.id, { note: v })} width="100%" /></td>
                  <td>
                    <button type="button" className="pp-icon" aria-label={`Remove ${t}`} onClick={() => remove(w.id)}><Trash2 size={13} /></button>
                  </td>
                </tr>,
              ]
            })}
          </tbody>
        </table>
        {!rows.length && <p className="pp-note" style={{ marginTop: 12 }}>Nothing matches.</p>}
      </div>
    </>
  )
}

export function AddWatch({ setPlan, series, plan }: Pick<TableProps, 'setPlan' | 'series' | 'plan'>) {
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
    <div className="pp-add">
      <label>
        Ticker
        <input
          className="pp-in"
          style={{ width: '5rem' }}
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="e.g. UNH"
        />
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
      <button type="button" className="pp-btn pp-btn-primary" onClick={add}><Plus size={12} />Add to watchlist</button>
      {dup && <span className="pp-act" style={{ paddingBottom: 5 }}>{t} is already on the watchlist.</span>}
    </div>
  )
}
