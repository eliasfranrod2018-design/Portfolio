'use client'

import { Fragment } from 'react'
import { SCENARIOS, type Metrics, type Position, type ScenarioId } from '@/lib/portfolio'
import { money, pct, useTip, useWidth } from './bits'

export const AI = 'var(--pp-ai)'
export const OTHER = 'var(--pp-other)'
export const CASH = 'var(--pp-chart-muted)'

export function Legend() {
  return (
    <div className="pp-legend">
      <span><i className="pp-sw" style={{ background: AI }} />AI data center chain</span>
      <span><i className="pp-sw" style={{ background: OTHER }} />Everything else</span>
      <span><i className="pp-sw" style={{ background: CASH }} />Cash</span>
    </div>
  )
}

/** One stacked bar per scenario: AI chain, everything else, cash. The picked one is solid. */
export function ChainSplit({ metrics, picked }: { metrics: Record<ScenarioId, Metrics>; picked: ScenarioId }) {
  const { box, show, hide, node } = useTip()
  const [ref, width] = useWidth<HTMLDivElement>()
  /* Roughly the bar's width: the chart less its label column. */
  const barW = Math.max(0, width - 130)
  return (
    <div className="pp-chart" ref={box}>
      <div className="pp-split" ref={ref}>
        {SCENARIOS.map((s) => {
          const m = metrics[s.id]
          const outside = Math.max(0, 1 - m.aiShare - m.cashShare)
          const parts = [
            { name: 'AI data center chain', v: m.aiShare, c: AI, text: 'var(--pp-pop)' },
            { name: 'Everything else', v: outside, c: OTHER, text: 'var(--pp-pop)' },
            { name: 'Cash', v: m.cashShare, c: CASH, text: 'var(--pp-fg)' },
          ].filter((p) => p.v > 0)
          return (
            <Fragment key={s.id}>
              <span className={`pp-lab ${s.id === picked ? 'pp-strong' : ''}`}>{s.label}</span>
              <div className={`pp-split-row ${s.id === picked ? '' : 'pp-dim'}`}>
                {parts.map((p) => {
                  const label = pct(p.v)
                  const fits = p.v * barW >= label.length * 7 + 12
                  return (
                    <span
                      key={p.name}
                      className="pp-part"
                      style={{ flexGrow: p.v, background: p.c, color: p.text }}
                      onMouseMove={show([s.label, `${p.name}: ${label}`])}
                      onMouseLeave={hide}
                    >
                      {fits ? label : ''}
                    </span>
                  )
                })}
              </div>
            </Fragment>
          )
        })}
      </div>
      {node}
    </div>
  )
}

interface BarRow {
  label: string
  value: number
  color: string
  ref?: number | null
  tip: string[]
}

/** Horizontal bars, labels right-aligned on the left, value just past the bar (or the dashed mark). */
export function HBars({ rows }: { rows: BarRow[] }) {
  const { box, show, hide, node } = useTip()
  const max = Math.max(...rows.map((r) => Math.max(r.value, r.ref ?? 0)), 0.0001)
  const at = (v: number) => `${(v / max) * 100}%`
  return (
    <div className="pp-chart" ref={box}>
      <div className="pp-hbars">
        {rows.map((r) => (
          <Fragment key={r.label}>
            <span className="pp-lab pp-hit" onMouseMove={show(r.tip)} onMouseLeave={hide}>{r.label}</span>
            <div className="pp-track pp-hit" onMouseMove={show(r.tip)} onMouseLeave={hide}>
              {r.value > 0 && <span className="pp-hbar" style={{ width: at(r.value), minWidth: 2, background: r.color }} />}
              {r.ref != null && r.ref > 0 && <span className="pp-ref" style={{ left: `calc(${at(r.ref)} - 1px)` }} />}
              {(r.value > 0 || (r.ref ?? 0) > 0) && (
                <span className="pp-hval" style={{ left: `calc(${at(Math.max(r.value, r.ref ?? 0))} + 2px)` }}>
                  {pct(r.value)}
                </span>
              )}
            </div>
          </Fragment>
        ))}
      </div>
      {node}
    </div>
  )
}

export function SectorBars({ m, today, scenario }: { m: Metrics; today: Metrics; scenario: ScenarioId }) {
  const ref = new Map(today.sectorShares.map((s) => [s.sector, s.share]))
  const name = SCENARIOS.find((s) => s.id === scenario)!.label
  return (
    <HBars
      rows={m.sectorShares.map((s) => ({
        label: s.sector,
        value: s.share,
        ref: scenario === 'today' ? null : (ref.get(s.sector) ?? 0),
        color: s.sector === 'Cash' ? CASH : AI,
        tip: [s.sector, `${name}: ${pct(s.share)}`, ...(scenario === 'today' ? [] : [`Today: ${pct(ref.get(s.sector) ?? 0)}`])],
      }))}
    />
  )
}

export function PositionBars({ positions, account, cash }: { positions: Position[]; account: number; cash: number }) {
  const share = (v: number) => (account > 0 ? v / account : 0)
  return (
    <HBars
      rows={[
        ...positions.map((p) => ({
          label: p.ticker,
          value: share(p.value),
          color: p.ai ? AI : OTHER,
          tip: [p.ticker, p.role || p.sector, `${money(p.value)} · ${pct(share(p.value))} of account`],
        })),
        { label: 'Cash', value: share(cash), color: CASH, tip: ['Cash', `${money(cash)} · ${pct(share(cash))} of account`] },
      ]}
    />
  )
}

/** Correlation of daily returns: blue reads independent, amber reads moves together. */
export function CorrMatrix({ tickers, m }: { tickers: string[]; m: (number | null)[][] }) {
  const bg = (r: number | null) => {
    if (r === null) return 'transparent'
    const a = Math.min(1, Math.max(0, r))
    return a >= 0.5
      ? `color-mix(in srgb, var(--pp-high) ${Math.round(15 + 65 * (a - 0.5) * 2)}%, transparent)`
      : `color-mix(in srgb, var(--pp-ai) ${Math.round(15 + 45 * (0.5 - a) * 2)}%, transparent)`
  }
  return (
    <div className="pp-tw">
      <table className="pp-matrix">
        <thead>
          <tr>
            <th />
            {tickers.map((t) => <th key={t}>{t}</th>)}
          </tr>
        </thead>
        <tbody>
          {tickers.map((a, i) => (
            <tr key={a}>
              <th className="pp-rowh">{a}</th>
              {tickers.map((b, j) => (
                <td
                  key={b}
                  title={i === j || m[i][j] === null ? undefined : `${a} and ${b}: ${m[i][j]!.toFixed(2)}`}
                  style={{ background: i === j ? 'var(--pp-bg)' : bg(m[i][j]) }}
                >
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
