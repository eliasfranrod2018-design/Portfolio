'use client'

import { useState } from 'react'
import { AlertTriangle, Wand2 } from 'lucide-react'
import {
  fadeSchedule,
  fmtMoney,
  fmtNum,
  fmtPct,
  fmtShare,
  fmtX,
  isNum,
  type ForecastRow,
} from '@/lib/valuation'
import { GLOSSARY } from '@/lib/guide'
import { Button, Card, Definition, Explainer, Formula, NumField, Stat, Toggle } from './Ui'
import type { TabProps } from './types'

const DEFS = ['Intrinsic value', 'Free cash flow to the firm (FCFF)', 'NOPAT', 'Terminal value', 'Reinvestment rate', 'Enterprise value / Equity value', 'Reverse DCF']

export default function DcfTab({ ws, calc, set }: TabProps) {
  const dcf = ws.dcf
  const res = calc.dcf
  const rows = dcf.rows
  const price = ws.company.price

  const [fadeStartG, setFadeStartG] = useState(rows[0]?.growth ?? 0.08)
  const [fadeEndG, setFadeEndG] = useState(rows[rows.length - 1]?.growth ?? 0.04)
  const [fadeStartM, setFadeStartM] = useState(rows[0]?.margin ?? 0.15)
  const [fadeEndM, setFadeEndM] = useState(rows[rows.length - 1]?.margin ?? 0.15)

  function setYears(n: number) {
    const next: ForecastRow[] = []
    for (let i = 0; i < n; i++) next.push(rows[i] ? { ...rows[i] } : { ...rows[rows.length - 1] })
    set('dcf', { years: n, rows: next })
  }

  function editRow(i: number, part: Partial<ForecastRow>) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...part } : r))
    set('dcf', { rows: next })
  }

  function applyFade() {
    set('dcf', { rows: fadeSchedule(dcf.years, fadeStartG, fadeEndG, fadeStartM, fadeEndM) })
  }

  const gridTone = (v: number | null) => {
    if (!isNum(v) || price <= 0) return 'text-zinc-300'
    const up = v / price - 1
    if (up >= 0.25) return 'text-green-400 font-semibold'
    if (up >= 0) return 'text-green-500/80'
    if (up >= -0.2) return 'text-yellow-400/90'
    return 'text-red-400'
  }

  return (
    <div className="space-y-4">
      <Card
        title="Step 6 — Discounted cash flow"
        subtitle="The present value of the cash this business will produce. The only method that values the company rather than comparing it to other prices."
      >
        <Explainer title="What the model does, line by line" defaultOpen>
          <Formula>{`NOPAT            = EBIT x (1 - t)
FCFF             = NOPAT + D&A - CapEx - Change in working capital
                 = NOPAT - Net reinvestment
PV of cash flow  = CF(t) / (1 + WACC)^t
TV (perpetuity)  = FCFF(n+1) / (WACC - g)
TV (exit mult.)  = EBITDA(n) x peer EV/EBITDA
Enterprise value = Sum of PV(FCFF) + PV(TV)
Equity value     = EV - Debt + Cash - Preferred - Minority interest
Value per share  = Equity value / Diluted shares`}</Formula>
          <p>
            Forecast 5 years for a stable company, 10 for a fast grower so growth has time to slow. Build revenue,
            margins and taxes to get NOPAT, subtract reinvestment to get FCFF, add a terminal value, discount
            everything, and bridge to a per-share number.
          </p>
        </Explainer>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div>
            <span className="block text-zinc-400 text-xs mb-1">Forecast horizon</span>
            <Toggle
              value={String(dcf.years)}
              onChange={(v) => setYears(Number(v))}
              options={[
                { value: '5', label: '5 years' },
                { value: '10', label: '10 years' },
              ]}
            />
          </div>
          <NumField label="Discount rate (WACC)" percent value={dcf.discountRate} onChange={(v) => set('dcf', { discountRate: v })} hint={`Computed WACC: ${fmtPct(calc.waccResult.wacc, 2)}`} />
          <NumField label="Tax rate used in forecast" percent value={dcf.taxRate} onChange={(v) => set('dcf', { taxRate: v })} hint="Usually the statutory rate long term." />
          <div>
            <span className="block text-zinc-400 text-xs mb-1">Timing convention</span>
            <Toggle
              value={dcf.midYear ? 'mid' : 'end'}
              onChange={(v) => set('dcf', { midYear: v === 'mid' })}
              options={[
                { value: 'end', label: 'Year-end' },
                { value: 'mid', label: 'Mid-year' },
              ]}
            />
            <span className="block text-zinc-600 text-[11px] mt-1">Mid-year assumes cash arrives evenly through the year.</span>
          </div>
        </div>
      </Card>

      <Card
        title="Forecast assumptions"
        subtitle="Set each year by hand, or generate a fade and then adjust. Phase improvements in gradually — never jump to the target in year 1."
      >
        <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
          <p className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
            <Wand2 size={14} className="text-blue-400" /> Generate a fade
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 items-end">
            <NumField label="Year 1 growth" percent compact value={fadeStartG} onChange={setFadeStartG} />
            <NumField label="Final year growth" percent compact value={fadeEndG} onChange={setFadeEndG} />
            <NumField label="Year 1 EBIT margin" percent compact value={fadeStartM} onChange={setFadeStartM} />
            <NumField label="Final year EBIT margin" percent compact value={fadeEndM} onChange={setFadeEndM} />
            <Button variant="primary" onClick={applyFade}>Apply to all years</Button>
          </div>
          <p className="text-zinc-500 text-[11px] mt-2 leading-relaxed">
            Competition pushes high growth and high returns down over time, so the final forecast year should already
            look like a mature company. A margin going from 15% to 18% should arrive as 15.5, 16.3, 17.2, 18 — not in
            one step.
          </p>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <p className="text-white text-sm font-semibold">How growth gets funded</p>
            <Toggle
              value={dcf.reinvestMode}
              onChange={(v) => set('dcf', { reinvestMode: v as 'roic' | 'explicit' })}
              options={[
                { value: 'roic', label: 'From ROIC (g = RR x ROIC)' },
                { value: 'explicit', label: 'CapEx, D&A, working capital' },
              ]}
            />
          </div>
          {dcf.reinvestMode === 'roic' ? (
            <>
              <Formula>Reinvestment = NOPAT x (g / ROIC)</Formula>
              <div className="grid sm:grid-cols-3 gap-3 mt-3">
                <NumField label="Marginal ROIC (forecast years)" percent value={dcf.marginalRoic} onChange={(v) => set('dcf', { marginalRoic: v })} hint={`Company current ROIC: ${fmtPct(calc.metrics.find((m) => m.key === 'roic')?.value ?? null)}`} />
                <NumField label="Terminal ROIC" percent value={dcf.terminalRoic} onChange={(v) => set('dcf', { terminalRoic: v })} hint="Fade it toward the cost of capital for most businesses." />
                <NumField label="D&A as % of revenue" percent value={dcf.daPct} onChange={(v) => set('dcf', { daPct: v })} hint="Only used to forecast EBITDA for the exit multiple." />
              </div>
            </>
          ) : (
            <>
              <Formula>Reinvestment = CapEx - D&A + Change in working capital</Formula>
              <div className="grid sm:grid-cols-3 gap-3 mt-3">
                <NumField label="CapEx as % of revenue" percent value={dcf.capexPct} onChange={(v) => set('dcf', { capexPct: v })} hint={`History: ${fmtPct(ws.company.revenue > 0 ? ws.company.capex / ws.company.revenue : null)}`} />
                <NumField label="D&A as % of revenue" percent value={dcf.daPct} onChange={(v) => set('dcf', { daPct: v })} hint={`History: ${fmtPct(ws.company.revenue > 0 ? ws.company.da / ws.company.revenue : null)}`} />
                <NumField label="Working capital as % of revenue change" percent value={dcf.wcPct} onChange={(v) => set('dcf', { wcPct: v })} hint="Each extra dollar of sales ties up this much cash." />
              </div>
            </>
          )}
          <p className="text-zinc-500 text-xs mt-2 leading-relaxed">
            Growth is not free. More growth requires more reinvestment, which lowers free cash flow in the meantime — a
            forecast that raises growth without raising reinvestment is inventing value out of nothing.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto -mx-1 px-1">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-zinc-500 text-xs uppercase tracking-wide">
                <th className="text-left font-medium py-2 w-14">Year</th>
                <th className="text-left font-medium py-2 w-28">Growth</th>
                <th className="text-left font-medium py-2 w-28">EBIT margin</th>
                <th className="text-right font-medium py-2">Revenue</th>
                <th className="text-right font-medium py-2">NOPAT</th>
                <th className="text-right font-medium py-2">Reinvest</th>
                <th className="text-right font-medium py-2">FCFF</th>
                <th className="text-right font-medium py-2">Factor</th>
                <th className="text-right font-medium py-2">PV</th>
              </tr>
            </thead>
            <tbody>
              {res.rows.map((row, i) => (
                <tr key={row.t} className="border-t border-zinc-800">
                  <td className="py-1.5 text-zinc-400">{row.t}</td>
                  <td className="py-1.5 pr-2">
                    <NumField compact percent value={rows[i]?.growth ?? 0} onChange={(v) => editRow(i, { growth: v })} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <NumField compact percent value={rows[i]?.margin ?? 0} onChange={(v) => editRow(i, { margin: v })} />
                  </td>
                  <td className="py-1.5 text-right text-zinc-300 tabular-nums">{fmtMoney(row.revenue, 1)}</td>
                  <td className="py-1.5 text-right text-zinc-300 tabular-nums">{fmtMoney(row.nopat, 1)}</td>
                  <td className="py-1.5 text-right text-zinc-500 tabular-nums">{fmtMoney(row.reinvestment, 1)}</td>
                  <td className="py-1.5 text-right text-white font-medium tabular-nums">{fmtMoney(row.fcff, 1)}</td>
                  <td className="py-1.5 text-right text-zinc-500 tabular-nums">{fmtNum(row.factor, 4)}</td>
                  <td className="py-1.5 text-right text-blue-400 font-medium tabular-nums">{fmtMoney(row.pv, 1)}</td>
                </tr>
              ))}
              <tr className="border-t border-zinc-700">
                <td colSpan={8} className="py-2 text-zinc-400 text-right pr-3">Sum of PV of forecast years</td>
                <td className="py-2 text-right text-white font-bold tabular-nums">{fmtMoney(res.sumPv, 1)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Terminal value"
        subtitle="What the business is worth from the last forecast year onward, rolled into one number. Usually 60-80% of the total."
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <span className="block text-zinc-400 text-xs mb-1">Method</span>
            <Toggle
              value={dcf.tvMode}
              onChange={(v) => set('dcf', { tvMode: v as 'perpetuity' | 'exit' })}
              options={[
                { value: 'perpetuity', label: 'Growing perpetuity' },
                { value: 'exit', label: 'Exit multiple' },
              ]}
            />
          </div>
          {dcf.tvMode === 'perpetuity' ? (
            <div className="w-40">
              <NumField label="Terminal growth (g)" percent value={dcf.terminalGrowth} onChange={(v) => set('dcf', { terminalGrowth: v })} hint="2-3% is standard." />
            </div>
          ) : (
            <div className="w-40">
              <NumField label="Exit EV/EBITDA" value={dcf.exitMultiple} onChange={(v) => set('dcf', { exitMultiple: v })} hint="Peer median, or below it." />
            </div>
          )}
        </div>

        <div className="mt-3">
          <Formula>
            {dcf.tvMode === 'perpetuity'
              ? 'TV = FCFF(n+1) / (WACC - g),  where FCFF(n+1) = NOPAT(n+1) x (1 - g / terminal ROIC)'
              : 'TV = EBITDA(n) x exit multiple'}
          </Formula>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          {dcf.tvMode === 'perpetuity' && <Stat label="FCFF year n+1" value={fmtMoney(res.terminalFcff, 1)} />}
          <Stat label="Terminal value" value={fmtMoney(res.terminalValue, 1)} hint={`At end of year ${dcf.years}`} />
          <Stat label="PV of terminal value" value={fmtMoney(res.pvTerminal, 1)} />
          <Stat label="TV as % of EV" value={fmtPct(res.tvShareOfEv, 0)} tone={isNum(res.tvShareOfEv) && res.tvShareOfEv > 0.85 ? 'bad' : 'default'} hint="Above 80%: stress-test it" />
          <Stat label="Implied exit multiple" value={fmtX(res.impliedExitMultiple)} hint="Cross-check against peers" />
        </div>

        {res.warnings.length > 0 && (
          <div className="mt-3 space-y-2">
            {res.warnings.map((warn, i) => (
              <p key={i} className="text-sm text-yellow-300/90 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-3 py-2 flex gap-2 leading-relaxed">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{warn}</span>
              </p>
            ))}
          </div>
        )}

        <div className="mt-3">
          <Explainer title="Two rules for terminal value">
            <p>
              <span className="text-white font-medium">One.</span> Terminal growth must not exceed the risk-free rate or
              long-run nominal GDP growth. A company growing faster than the economy forever eventually becomes the
              economy. 2-3% is standard.
            </p>
            <p>
              <span className="text-white font-medium">Two.</span> Terminal value is usually 60-80% of the total. If
              yours is higher, your valuation is mostly a claim about a year you cannot see, so vary the terminal
              assumptions and present the range instead of the point.
            </p>
          </Explainer>
        </div>
      </Card>

      <Card title="Bridge to value per share" subtitle="Enterprise value belongs to everyone who funded the business. Equity value is what is left for you.">
        <div className="space-y-1.5 text-sm">
          <BridgeRow label={`PV of forecast FCFF (years 1-${dcf.years})`} value={fmtMoney(res.sumPv, 1)} />
          <BridgeRow label="PV of terminal value" value={fmtMoney(res.pvTerminal, 1)} />
          <BridgeRow label="Enterprise value" value={fmtMoney(res.enterpriseValue, 1)} bold />
          <BridgeRow label="Less: total debt" value={`(${fmtMoney(ws.company.totalDebt, 1)})`} />
          <BridgeRow label="Plus: cash" value={fmtMoney(ws.company.cash, 1)} />
          {ws.company.preferred > 0 && <BridgeRow label="Less: preferred stock" value={`(${fmtMoney(ws.company.preferred, 1)})`} />}
          {ws.company.minorityInterest > 0 && <BridgeRow label="Less: minority interest" value={`(${fmtMoney(ws.company.minorityInterest, 1)})`} />}
          <BridgeRow label="Equity value" value={fmtMoney(res.equityValue, 1)} bold />
          <BridgeRow label={`Diluted shares (M)`} value={fmtNum(ws.company.dilutedShares, 1)} />
        </div>
        <div className="grid sm:grid-cols-3 gap-2 mt-4">
          <Stat label="Intrinsic value per share" value={fmtShare(res.perShare)} tone="accent" />
          <Stat label="Market price" value={fmtShare(price || null)} />
          <Stat
            label="Upside vs price"
            value={fmtPct(isNum(res.perShare) && price > 0 ? res.perShare / price - 1 : null)}
            tone={isNum(res.perShare) && price > 0 ? (res.perShare > price ? 'good' : 'bad') : 'default'}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
          Also subtract anything else that stands ahead of common shareholders and is not already in the numbers:
          operating leases not capitalised, pension deficits, and any debt-like obligation hiding in the footnotes.
        </p>
      </Card>

      <Card
        title="Step 7 — Sensitivity"
        subtitle="Always do this. One percentage point of WACC typically moves the value 20-25%, which is why you present a range instead of one precise number."
      >
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr>
                <th className="text-left text-zinc-500 text-xs uppercase tracking-wide py-2">g \ WACC</th>
                {calc.grid.colLabels.map((c) => (
                  <th key={c} className="text-right text-zinc-500 text-xs uppercase tracking-wide py-2 px-2">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calc.grid.values.map((row, i) => (
                <tr key={calc.grid.rowLabels[i]} className="border-t border-zinc-800">
                  <td className="py-2 text-zinc-400 tabular-nums">{calc.grid.rowLabels[i]}</td>
                  {row.map((v, j) => (
                    <td key={j} className={`py-2 px-2 text-right tabular-nums ${gridTone(v)}`}>{fmtShare(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
          Green means the value is above today price. The centre cell is your base case. Growth only creates value when
          ROIC is above WACC: if this company ROIC equalled its WACC, moving growth up the grid would add nothing.
        </p>
      </Card>

      <Card
        title="Reverse DCF — what is the market already paying for?"
        subtitle="Solve the model backward for the assumptions that justify today price."
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
            <p className="text-zinc-500 text-[11px] uppercase tracking-wide">Implied year-1 revenue growth</p>
            <p className="text-white font-bold text-2xl">{fmtPct(calc.reverse.impliedStartGrowth)}</p>
            <p className="text-zinc-500 text-xs mt-1">
              Your whole growth path shifted by {fmtPct(calc.reverse.impliedGrowthShift, 2)} to land on today price.
              You are forecasting {fmtPct(calc.reverse.currentStartGrowth)} in year 1.
            </p>
          </div>
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
            <p className="text-zinc-500 text-[11px] uppercase tracking-wide">Implied year-1 EBIT margin</p>
            <p className="text-white font-bold text-2xl">{fmtPct(calc.reverse.impliedStartMargin)}</p>
            <p className="text-zinc-500 text-xs mt-1">
              Your margin path shifted by {fmtPct(calc.reverse.impliedMarginShift, 2)}, holding growth. You are
              forecasting {fmtPct(calc.reverse.currentStartMargin)} in year 1.
            </p>
          </div>
        </div>
        <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
          If the market already prices in the improvement you expect, you have no edge — even if the improvement
          happens. Your edge is the gap between these implied numbers and what you can defend.
        </p>
      </Card>

      <Card
        title="Step 8 — Should you forecast business improvements?"
        subtitle="Yes, but only improvements you can explain and support with evidence, and you should not pay full price for them."
      >
        <ol className="space-y-2.5 text-sm text-zinc-400 leading-relaxed list-decimal pl-4">
          <li>
            <span className="text-white font-medium">Start from history.</span> The base case should sit close to the
            last 5-10 years of growth, margins and ROIC, or close to consensus.
          </li>
          <li>
            <span className="text-white font-medium">Forecast by drivers.</span> Build revenue as volume x price, or
            market size x market share — not as a single growth rate you picked because it felt right.
          </li>
          <li>
            <span className="text-white font-medium">Name the mechanism.</span> Margin expansion needs a specific
            cause: operating leverage (SG&A growing slower than revenue), mix shift to higher-margin products, pricing
            power, or a named cost program. Check whether it already shows up in recent quarterly or segment data.
          </li>
          <li>
            <span className="text-white font-medium">Phase it in.</span> Take a margin from 15% to 18% over several
            years, not in year 1.
          </li>
          <li>
            <span className="text-white font-medium">Keep growth consistent with reinvestment.</span> g = reinvestment
            rate x ROIC. More growth costs more cash up front.
          </li>
          <li>
            <span className="text-white font-medium">Fade toward maturity.</span> By the terminal year, growth and ROIC
            should both look like a mature company.
          </li>
          <li>
            <span className="text-white font-medium">Weight scenarios by probability</span> on the Comps and verdict
            tab, and make the buy decision on the base case. Treat the bull case as upside you get for free.
          </li>
        </ol>
      </Card>

      <Card title="Definitions behind this tab">
        <div className="grid md:grid-cols-2 gap-2">
          {GLOSSARY.filter((g) => DEFS.includes(g.term)).map((g) => (
            <Definition key={g.term} {...g} />
          ))}
        </div>
      </Card>
    </div>
  )
}

function BridgeRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? 'border-t border-zinc-700 pt-2 mt-1' : ''}`}>
      <span className={bold ? 'text-white font-bold' : 'text-zinc-400'}>{label}</span>
      <span className={`tabular-nums ${bold ? 'text-white font-bold' : 'text-zinc-300'}`}>{value}</span>
    </div>
  )
}
