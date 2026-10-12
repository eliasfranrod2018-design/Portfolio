'use client'

import { SCENARIOS, type Metrics, type Position, type ScenarioId } from '@/lib/portfolio'
import { pct } from './bits'

const AI = 'bg-blue-500'
const OTHER = 'bg-teal-400'
const CASH = 'bg-zinc-600'

export function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400 mb-2">
      <span className="flex items-center gap-1.5"><i className={`w-2.5 h-2.5 rounded-sm ${AI}`} />AI data center chain</span>
      <span className="flex items-center gap-1.5"><i className={`w-2.5 h-2.5 rounded-sm ${OTHER}`} />Outside the chain</span>
      <span className="flex items-center gap-1.5"><i className={`w-2.5 h-2.5 rounded-sm ${CASH}`} />Cash</span>
    </div>
  )
}

/** One stacked bar per scenario: AI chain, everything else, cash. */
export function ChainSplit({ metrics, picked }: { metrics: Record<ScenarioId, Metrics>; picked: ScenarioId }) {
  return (
    <div className="space-y-2">
      {SCENARIOS.map((s) => {
        const m = metrics[s.id]
        const outside = Math.max(0, 1 - m.aiShare - m.cashShare)
        const segs = [
          { cls: AI, v: m.aiShare, label: 'AI chain' },
          { cls: OTHER, v: outside, label: 'Outside' },
          { cls: CASH, v: m.cashShare, label: 'Cash' },
        ]
        return (
          <div key={s.id} className={s.id === picked ? '' : 'opacity-50'}>
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span className={s.id === picked ? 'text-white font-medium' : ''}>{s.label}</span>
              <span className="tabular-nums">AI {pct(m.aiShare)} · outside {pct(outside)} · cash {pct(m.cashShare)}</span>
            </div>
            <div className="flex h-4 rounded-md overflow-hidden bg-zinc-950">
              {segs.map((g) =>
                g.v > 0 ? (
                  <div key={g.label} className={g.cls} style={{ width: `${g.v * 100}%` }} title={`${g.label}: ${pct(g.v)}`} />
                ) : null
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function Bars({ rows }: { rows: { label: string; value: number; cls: string; ref?: number; tip?: string }[] }) {
  const max = Math.max(...rows.map((r) => Math.max(r.value, r.ref ?? 0)), 0.0001)
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(4.5rem,auto)_1fr_3.2rem] items-center gap-2 text-xs" title={r.tip}>
          <span className="text-zinc-400 truncate">{r.label}</span>
          <span className="relative h-3 bg-zinc-950 rounded">
            <span className={`absolute inset-y-0 left-0 rounded ${r.cls}`} style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value > 0 ? 2 : 0 }} />
            {r.ref !== undefined && r.ref > 0 && (
              <span className="absolute -inset-y-0.5 border-l-2 border-dashed border-zinc-400" style={{ left: `${(r.ref / max) * 100}%` }} />
            )}
          </span>
          <span className="text-right tabular-nums text-zinc-300">{r.value > 0 ? pct(r.value) : '—'}</span>
        </div>
      ))}
    </div>
  )
}

export function SectorBars({ m, today }: { m: Metrics; today: Metrics }) {
  const ref = new Map(today.sectorShares.map((s) => [s.sector, s.share]))
  return (
    <Bars
      rows={m.sectorShares.map((s) => ({
        label: s.sector,
        value: s.share,
        ref: ref.get(s.sector) ?? 0,
        cls: s.sector === 'Cash' ? CASH : 'bg-violet-400',
        tip: `${s.sector}: ${pct(s.share)} (today ${pct(ref.get(s.sector) ?? 0)})`,
      }))}
    />
  )
}

export function PositionBars({ positions, account }: { positions: Position[]; account: number }) {
  return (
    <Bars
      rows={positions.map((p) => ({
        label: p.ticker,
        value: account > 0 ? p.value / account : 0,
        cls: p.ai ? AI : OTHER,
        tip: `${p.ticker} · ${p.role || p.sector}`,
      }))}
    />
  )
}

/** Correlation of daily returns, colored from blue (independent) to amber (moves together). */
export function CorrMatrix({ tickers, m }: { tickers: string[]; m: (number | null)[][] }) {
  const bg = (r: number | null) => {
    if (r === null) return 'transparent'
    const a = Math.min(1, Math.max(0, r))
    /* Low correlation reads cool, high reads warm. */
    return r >= 0.5 ? `rgba(245, 158, 11, ${0.15 + 0.6 * (a - 0.5) * 2})` : `rgba(59, 130, 246, ${0.15 + 0.5 * (0.5 - a) * 2})`
  }
  return (
    <div className="overflow-x-auto">
      <table className="text-[11px] tabular-nums border-separate border-spacing-0.5">
        <thead>
          <tr>
            <th />
            {tickers.map((t) => (
              <th key={t} className="text-zinc-400 font-medium px-1 py-1 whitespace-nowrap">{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tickers.map((a, i) => (
            <tr key={a}>
              <th className="text-zinc-400 font-medium text-right pr-1.5 whitespace-nowrap">{a}</th>
              {tickers.map((b, j) => (
                <td key={b} className="w-10 h-7 text-center rounded text-zinc-100" style={{ background: i === j ? 'rgb(39 39 42)' : bg(m[i][j]) }}>
                  {i === j ? '' : m[i][j] === null ? '·' : m[i][j]!.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
