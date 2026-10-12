'use client'

import { useMemo, useState } from 'react'
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { Button } from '@/components/Ui'
import { FitLine, Num, Select, Seg, Txt, money, pct, researchUrl, signed, tone } from './bits'

const SECTOR_OPTS = ALL_SECTORS.map((s) => ({ value: s, label: s }))
const th = 'text-left text-[11px] font-medium text-zinc-500 px-1.5 py-1.5 whitespace-nowrap'
const td = 'px-1.5 py-1.5 align-middle'

export interface TableProps {
  plan: Plan
  setPlan: (fn: (p: Plan) => Plan) => void
  series: Record<string, Series>
  live: Record<string, number | undefined>
  ctx: FitContext
}

function TickerCell({ ticker, sector, name, sub }: { ticker: string; sector: string; name: string; sub?: string }) {
  return (
    <div className="min-w-[7rem]">
      <a
        href={researchUrl(ticker, sector)}
        target="_blank"
        rel="noreferrer"
        className="text-white font-semibold hover:text-blue-300 inline-flex items-center gap-1"
        title={`Open ${ticker} on stockanalysis.com`}
      >
        {ticker}
        <ExternalLink size={10} className="text-zinc-600" />
      </a>
      <div className="text-zinc-500 text-[11px] truncate max-w-[10rem]">{name}</div>
      {sub && <div className="text-zinc-600 text-[10px]">{sub}</div>}
    </div>
  )
}

/** Make sure a ticker you mention as a swap target exists on the watchlist, so it has a sector and AI link. */
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

export function HoldingsTable({ plan, setPlan, series, live, ctx }: TableProps) {
  const rows = plan.holdings.map((h) => {
    const { price, live: isLive } = priceOf(h, live)
    const value = h.shares * price
    return { h, price, isLive, value }
  })
  const stocks = rows.reduce((t, r) => t + r.value, 0)
  const account = stocks + plan.cash

  const patch = (id: string, part: Partial<Holding>) =>
    setPlan((p) => ({ ...p, holdings: p.holdings.map((h) => (h.id === id ? { ...h, ...part } : h)) }))
  const remove = (id: string) => setPlan((p) => ({ ...p, holdings: p.holdings.filter((h) => h.id !== id) }))

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className={th}>Ticker</th>
            <th className={`${th} text-right`}>Shares</th>
            <th className={`${th} text-right`}>Price</th>
            <th className={`${th} text-right`}>Value</th>
            <th className={`${th} text-right`}>Cost basis</th>
            <th className={`${th} text-right`}>Gain</th>
            <th className={`${th} text-right`}>Of acct</th>
            <th className={th}>Sector</th>
            <th className={th} title="Rides AI data center spending">AI</th>
            <th className={th}>Plan</th>
            <th className={th} />
          </tr>
        </thead>
        {rows.map(({ h, price, isLive, value }) => {
          const q = series[norm(h.ticker)]
          const day = isLive && q?.prevClose ? price / q.prevClose - 1 : null
          const gain = value - h.costBasis
          const fit = holdingNote(ctx, h)
          const swapping = h.plan === 'swap' || h.plan === 'considering'
          const sw = swapping ? swapNote(ctx, h, value) : null
          const highlighted = h.plan !== 'keep'
          return (
            <tbody key={h.id} className={`border-b border-zinc-800/70 ${highlighted ? 'bg-blue-500/[0.04]' : ''}`}>
              <tr>
                <td colSpan={11} className="px-1.5 pt-2.5 pb-0.5 space-y-1">
                  <FitLine note={fit} />
                  {sw && <FitLine note={sw} prefix={h.plan === 'considering' ? 'Considering swap' : 'Swap'} />}
                </td>
              </tr>
              <tr>
                <td className={td}>
                  <TickerCell ticker={h.ticker} sector={h.sector} name={h.name} sub={h.role} />
                </td>
                <td className={`${td} text-right`}>
                  <Num label={`${h.ticker} shares`} value={h.shares} onChange={(v) => patch(h.id, { shares: v })} width="w-16" />
                </td>
                <td className={`${td} text-right whitespace-nowrap`}>
                  {h.priceMode === 'live' && isLive ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="tabular-nums text-white">{money(price)}</span>
                      <button
                        type="button"
                        title="Type your own price instead"
                        onClick={() => patch(h.id, { priceMode: 'manual', price })}
                        className="text-zinc-600 hover:text-white"
                      >
                        <Pencil size={11} />
                      </button>
                    </span>
                  ) : (
                    <Num label={`${h.ticker} price`} value={h.price} prefix="$" onChange={(v) => patch(h.id, { price: v, priceMode: 'manual' })} width="w-24" />
                  )}
                  <div className="text-[10px]">
                    {isLive ? (
                      day !== null && <span className={tone(day)}>{signed(day, (x) => pct(x, 2))} today</span>
                    ) : live[norm(h.ticker)] ? (
                      <button type="button" className="text-blue-400 hover:underline" onClick={() => patch(h.id, { priceMode: 'live' })}>
                        use live {money(live[norm(h.ticker)]!)}
                      </button>
                    ) : (
                      <span className="text-zinc-600">no live quote</span>
                    )}
                  </div>
                </td>
                <td className={`${td} text-right tabular-nums text-white`}>{money(value)}</td>
                <td className={`${td} text-right`}>
                  <Num label={`${h.ticker} cost basis`} value={h.costBasis} prefix="$" onChange={(v) => patch(h.id, { costBasis: v })} width="w-24" />
                </td>
                <td className={`${td} text-right tabular-nums whitespace-nowrap ${tone(gain)}`}>
                  {signed(gain, money)}
                  <div className="text-[10px]">{h.costBasis > 0 ? signed(gain / h.costBasis, pct) : ''}</div>
                </td>
                <td className={`${td} text-right tabular-nums text-zinc-300`}>{account > 0 ? pct(value / account) : '—'}</td>
                <td className={td}>
                  <Select label={`${h.ticker} sector`} value={h.sector} options={SECTOR_OPTS} onChange={(v) => patch(h.id, { sector: v })} />
                </td>
                <td className={td}>
                  <input
                    type="checkbox"
                    aria-label={`${h.ticker} rides AI data center spending`}
                    checked={h.ai}
                    onChange={(e) => patch(h.id, { ai: e.target.checked })}
                    className="w-4 h-4 accent-blue-600"
                  />
                </td>
                <td className={td}>
                  <div className="flex items-center gap-1">
                    <Select label={`${h.ticker} plan`} value={h.plan} options={HOLDING_PLANS} onChange={(v) => patch(h.id, { plan: v })} width="w-32" />
                    {swapping && (
                      <Txt
                        label={`${h.ticker} swap target`}
                        upper
                        value={h.swapFor}
                        placeholder="Ticker"
                        width="w-16"
                        onCommit={(v) => setPlan((p) => ensureWatched({ ...p, holdings: p.holdings.map((x) => (x.id === h.id ? { ...x, swapFor: v } : x)) }, v, series))}
                      />
                    )}
                  </div>
                </td>
                <td className={td}>
                  <button type="button" aria-label={`Remove ${h.ticker}`} onClick={() => remove(h.id)} className="text-zinc-600 hover:text-red-400 p-1">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            </tbody>
          )
        })}
        <tbody>
          <tr>
            <td className={`${td} text-zinc-400`} colSpan={3}>Cash</td>
            <td className={`${td} text-right`}>
              <Num label="Cash" value={plan.cash} prefix="$" onChange={(v) => setPlan((p) => ({ ...p, cash: v }))} width="w-24" />
            </td>
            <td colSpan={2} />
            <td className={`${td} text-right tabular-nums text-zinc-300`}>{account > 0 ? pct(plan.cash / account) : '—'}</td>
            <td colSpan={4} />
          </tr>
          <tr className="border-t border-zinc-800">
            <td className={`${td} text-zinc-300 font-medium`} colSpan={3}>Account</td>
            <td className={`${td} text-right tabular-nums text-white font-semibold`}>{money(account)}</td>
            <td className={`${td} text-right tabular-nums text-zinc-400`}>{money(plan.holdings.reduce((t, h) => t + h.costBasis, 0))}</td>
            <td className={`${td} text-right tabular-nums ${tone(stocks - plan.holdings.reduce((t, h) => t + h.costBasis, 0))}`}>
              {signed(stocks - plan.holdings.reduce((t, h) => t + h.costBasis, 0), money)}
            </td>
            <td colSpan={5} />
          </tr>
        </tbody>
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
      role: known?.role ?? '', plan: 'keep', swapFor: '', note: '',
    }
    setPlan((p) => ({ ...p, holdings: [...p.holdings, h] }))
    setTicker('')
    setCost(0)
    setPrice(0)
  }

  return (
    <div className="flex flex-wrap items-end gap-2 mt-3 text-xs text-zinc-400">
      <label className="space-y-1">
        <span className="block">Ticker</span>
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="e.g. JPM"
          className="w-20 bg-zinc-950 text-white rounded-lg border border-zinc-700 focus:outline-none focus:border-blue-500 px-1.5 py-1 text-sm"
        />
      </label>
      <label className="space-y-1"><span className="block">Shares</span><Num label="New holding shares" value={shares} onChange={setShares} width="w-16" /></label>
      <label className="space-y-1"><span className="block">Total cost</span><Num label="New holding cost" value={cost} onChange={setCost} prefix="$" width="w-24" /></label>
      {!q && (
        <label className="space-y-1"><span className="block">Price</span><Num label="New holding price" value={price} onChange={setPrice} prefix="$" width="w-24" /></label>
      )}
      {!known && (
        <>
          <label className="space-y-1"><span className="block">Sector</span><Select label="New holding sector" value={sector} options={SECTOR_OPTS} onChange={setSector} /></label>
          <label className="flex items-center gap-1.5 pb-1.5"><input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} className="w-4 h-4 accent-blue-600" />AI chain</label>
        </>
      )}
      <Button size="sm" variant="primary" onClick={add}><Plus size={13} className="inline mr-1" />Add holding</Button>
      {t && (
        <span className="pb-1.5">
          {q ? `Live: ${money(q.price)}` : 'Not in the price feed yet; see Market data below.'}
          {known ? ` · from your watchlist (${known.sector})` : ''}
        </span>
      )}
    </div>
  )
}

/* ======================= watchlist ======================= */

export function WatchlistTable({ plan, setPlan, series, live, ctx }: TableProps) {
  const groups = useMemo(() => ['All', ...new Set(plan.watchlist.map((w) => w.group))], [plan.watchlist])
  const [group, setGroup] = useState('All')
  const [query, setQuery] = useState('')
  const swapTargets = new Map(
    plan.holdings
      .filter((h) => (h.plan === 'swap' || h.plan === 'considering') && h.swapFor)
      .map((h) => [norm(h.swapFor), h])
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
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Seg label="Group" value={group} options={groups.map((g) => ({ value: g, label: g }))} onChange={setGroup} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ticker, sector or note"
          aria-label="Search the watchlist"
          className="ml-auto w-full sm:w-56 bg-zinc-950 text-white rounded-xl border border-zinc-700 focus:outline-none focus:border-blue-500 px-2.5 py-1.5 text-sm"
        />
      </div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className={th}>Ticker</th>
              <th className={`${th} text-right`}>Price</th>
              <th className={th}>Sector</th>
              <th className={th}>AI</th>
              <th className={th}>Status</th>
              <th className={`${th} text-right`}>Amount</th>
              <th className={th}>Your note</th>
              <th className={th} />
            </tr>
          </thead>
          {rows.map((w) => {
            const t = norm(w.ticker)
            const s = series[t]
            const price = live[t]
            const day = price && s?.prevClose ? price / s.prevClose - 1 : null
            const fit = candidateNote(ctx, { ticker: t, sector: w.sector, ai: w.ai, amount: w.amount })
            const swapFrom = swapTargets.get(t)
            return (
              <tbody key={w.id} className="border-b border-zinc-800/70">
                <tr>
                  <td colSpan={8} className="px-1.5 pt-2.5 pb-0.5">
                    <FitLine note={fit} />
                  </td>
                </tr>
                <tr>
                  <td className={td}>
                    <TickerCell
                      ticker={t}
                      sector={w.sector}
                      name={w.name}
                      sub={swapFrom ? `${swapFrom.plan === 'considering' ? 'Considering swap' : 'Swap'} for ${swapFrom.ticker}` : w.group}
                    />
                  </td>
                  <td className={`${td} text-right tabular-nums whitespace-nowrap`}>
                    {price ? <span className="text-white">{money(price)}</span> : <span className="text-zinc-600">—</span>}
                    {day !== null && <div className={`text-[10px] ${tone(day)}`}>{signed(day, (x) => pct(x, 2))}</div>}
                  </td>
                  <td className={td}>
                    <Select label={`${t} sector`} value={w.sector} options={SECTOR_OPTS} onChange={(v) => patch(w.id, { sector: v })} />
                  </td>
                  <td className={td}>
                    <input
                      type="checkbox"
                      aria-label={`${t} rides AI data center spending`}
                      checked={w.ai}
                      onChange={(e) => patch(w.id, { ai: e.target.checked })}
                      className="w-4 h-4 accent-blue-600"
                    />
                  </td>
                  <td className={td}>
                    <Select label={`${t} status`} value={w.status} options={WATCH_STATUSES} onChange={(v) => patch(w.id, { status: v })} />
                  </td>
                  <td className={`${td} text-right`}>
                    <Num label={`${t} amount`} value={w.amount} prefix="$" onChange={(v) => patch(w.id, { amount: v })} width="w-20" />
                    {price ? <div className="text-[10px] text-zinc-600">{(w.amount / price).toFixed(3)} sh</div> : null}
                  </td>
                  <td className={`${td} min-w-[12rem]`}>
                    <Txt label={`${t} note`} value={w.note} onCommit={(v) => patch(w.id, { note: v })} width="w-full" />
                  </td>
                  <td className={td}>
                    <button type="button" aria-label={`Remove ${t}`} onClick={() => remove(w.id)} className="text-zinc-600 hover:text-red-400 p-1">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              </tbody>
            )
          })}
        </table>
        {!rows.length && <p className="text-zinc-600 text-sm py-3">Nothing matches.</p>}
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
    <div className="flex flex-wrap items-end gap-2 mt-3 text-xs text-zinc-400">
      <label className="space-y-1">
        <span className="block">Ticker</span>
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="e.g. UNH"
          className="w-20 bg-zinc-950 text-white rounded-lg border border-zinc-700 focus:outline-none focus:border-blue-500 px-1.5 py-1 text-sm"
        />
      </label>
      <label className="space-y-1"><span className="block">Sector</span><Select label="New idea sector" value={sector} options={SECTOR_OPTS} onChange={setSector} /></label>
      <label className="flex items-center gap-1.5 pb-1.5"><input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} className="w-4 h-4 accent-blue-600" />AI chain</label>
      <label className="space-y-1">
        <span className="block">Group</span>
        <input
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          list="plan-groups"
          className="w-36 bg-zinc-950 text-white rounded-lg border border-zinc-700 focus:outline-none focus:border-blue-500 px-1.5 py-1 text-sm"
        />
        <datalist id="plan-groups">
          {[...new Set(plan.watchlist.map((w) => w.group))].map((g) => <option key={g} value={g} />)}
        </datalist>
      </label>
      <Button size="sm" variant="primary" onClick={add}><Plus size={13} className="inline mr-1" />Add to watchlist</Button>
      {dup && <span className="pb-1.5 text-amber-300">{t} is already on the watchlist.</span>}
    </div>
  )
}
