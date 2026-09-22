'use client'

import { ArrowRight } from 'lucide-react'
import { fmtNum, fmtPct, isNum } from '@/lib/valuation'
import { GLOSSARY } from '@/lib/guide'
import { Button, Card, Definition, Explainer, Formula, NumField, Stat, Toggle } from './Ui'
import type { TabProps } from './types'

const DEFS = ['Required rate of return (cost of equity)', 'Beta', 'Equity risk premium (ERP)', 'WACC']

export default function RateTab({ ws, calc, set }: TabProps) {
  const r = ws.risk
  const rate = calc.rate
  const w = calc.waccResult
  const usedInDcf = ws.dcf.discountRate
  const gordon = rate.gordonExpectedReturn

  return (
    <div className="space-y-4">
      <Card
        title="Step 4 — Your required rate of return"
        subtitle="The minimum return that makes owning this stock worth it instead of something safer. It drives the answer more than almost anything else."
      >
        <Explainer title="Start with CAPM, then adjust it deliberately" defaultOpen>
          <Formula>Cost of equity (Ke) = Rf + beta x ERP + country + size + company-specific</Formula>
          <p>
            The risk-free rate is the current 10-year Treasury yield. For the equity risk premium most practitioners
            use Damodaran implied ERP rather than a long historical average.
          </p>
          <p className="text-yellow-300/90">
            The defaults loaded here are starting points only (roughly a 5% risk-free rate and a 4.2% ERP, the figures
            current around mid-2026). Look up today numbers before you trust an answer — the risk-free rate moves, and
            every valuation on this page moves with it.
          </p>
        </Explainer>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <NumField label="Risk-free rate (10-yr Treasury)" percent value={r.riskFree} onChange={(v) => set('risk', { riskFree: v })} hint="Current yield, not a remembered one." />
          <NumField label="Equity risk premium" percent value={r.erp} onChange={(v) => set('risk', { erp: v })} hint="Damodaran implied ERP is the usual source." />
          <NumField label="Country risk premium" percent value={r.countryRiskPremium} onChange={(v) => set('risk', { countryRiskPremium: v })} hint="For the emerging markets it operates in." />
          <NumField label="Revenue from those markets" percent value={r.emergingRevenueShare} onChange={(v) => set('risk', { emergingRevenueShare: v })} hint="Country risk follows revenue, not incorporation." />
        </div>

        <div className="mt-4 border-t border-zinc-800 pt-4">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <p className="text-white font-semibold text-sm">Beta</p>
            <Toggle
              value={r.betaMode}
              onChange={(v) => set('risk', { betaMode: v as 'regression' | 'bottomUp' })}
              options={[
                { value: 'bottomUp', label: 'Bottom-up (better)' },
                { value: 'regression', label: 'Regression' },
              ]}
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {r.betaMode === 'regression' ? (
              <NumField label="Regression beta" value={r.regressionBeta} onChange={(v) => set('risk', { regressionBeta: v })} hint="From your data provider. Noisy for a single stock." />
            ) : (
              <NumField label="Industry unlevered beta" value={r.unleveredBeta} onChange={(v) => set('risk', { unleveredBeta: v })} hint="Damodaran publishes these by industry, free." />
            )}
            <Stat label="D/E (market)" value={fmtPct(rate.debtToEquity)} hint="Market debt / market cap" />
            <Stat label="Beta used" value={fmtNum(rate.betaUsed, 2)} hint={r.betaMode === 'bottomUp' ? 'Relevered to this company' : 'As entered'} />
          </div>
          <div className="mt-3">
            <Formula>Levered beta = Unlevered beta x [1 + (1 - t) x (D/E)]</Formula>
            <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
              A single-stock regression beta is noisy. Taking the industry average unlevered beta and relevering it to
              this company debt level gives a steadier estimate of the same thing.
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-zinc-800 pt-4">
          <p className="text-white font-semibold text-sm mb-3">Judgement premiums</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <NumField label="Size premium" percent value={r.sizePremium} onChange={(v) => set('risk', { sizePremium: v })} hint="1-3% is typical for small caps." />
            <NumField label="Company-specific premium" percent value={r.specificPremium} onChange={(v) => set('risk', { specificPremium: v })} hint="Customer concentration, key person, unproven model." />
            <NumField label="Your personal hurdle" percent value={r.personalHurdle} onChange={(v) => set('risk', { personalHurdle: v })} hint="What an index fund would give you, at least." />
          </div>
          <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
            These are judgement, so write down why you added them in the notes on the Business tab. If a stock cannot
            beat what you would reasonably expect from an index fund, buy the index instead — that comparison is your
            floor.
          </p>
        </div>

        <div className="mt-4 border-t border-zinc-800 pt-4">
          <p className="text-white font-semibold text-sm mb-3">Cost of equity, built up</p>
          <div className="space-y-1.5 text-sm">
            <Row label="Risk-free rate" value={fmtPct(r.riskFree, 2)} />
            <Row label={`Beta ${fmtNum(rate.betaUsed, 2)} x ERP ${fmtPct(r.erp, 2)}`} value={fmtPct(rate.betaUsed * r.erp, 2)} />
            <Row label={`Country premium ${fmtPct(r.countryRiskPremium, 2)} x ${fmtPct(r.emergingRevenueShare, 0)} of revenue`} value={fmtPct(rate.countryAdd, 2)} />
            <Row label="Size premium" value={fmtPct(r.sizePremium, 2)} />
            <Row label="Company-specific premium" value={fmtPct(r.specificPremium, 2)} />
            <div className="flex justify-between border-t border-zinc-700 pt-2 mt-1">
              <span className="text-white font-bold">Cost of equity (Ke)</span>
              <span className="text-blue-400 font-bold">{fmtPct(rate.ke, 2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
          <p className="text-yellow-300 text-sm font-semibold mb-1">Do not double-count risk</p>
          <p className="text-zinc-400 text-xs leading-relaxed">
            If you raise the discount rate, forecast conservatively, and also demand a 30% margin of safety, you are
            penalising the same risk three times and nothing will ever look cheap. Choose where the conservatism goes
            and be deliberate about it.
          </p>
        </div>
      </Card>

      <Card
        title="Quick sanity check"
        subtitle="The Gordon growth model rearranged: expected return is roughly FCF yield plus long-term growth."
      >
        <Formula>Expected return = FCF yield + long-term growth rate</Formula>
        <div className="grid sm:grid-cols-3 gap-2 mt-3">
          <Stat label="Implied expected return" value={fmtPct(gordon)} hint={`FCF yield + terminal growth ${fmtPct(ws.dcf.terminalGrowth)}`} />
          <Stat label="You require" value={fmtPct(Math.max(rate.ke, r.personalHurdle))} hint="The higher of Ke and your hurdle" />
          <Stat
            label="Gap"
            value={fmtPct(rate.hurdleGap)}
            tone={isNum(rate.hurdleGap) ? (rate.hurdleGap >= 0 ? 'good' : 'bad') : 'default'}
            hint={isNum(rate.hurdleGap) && rate.hurdleGap < 0 ? 'Expensive at this price' : 'Clears the bar'}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
          A stock with a 4% FCF yield growing 6% a year implies roughly a 10% return. If that is below what you require,
          it is expensive at today price no matter what the DCF says — and if the DCF disagrees, find out which
          assumption is doing the work.
        </p>
      </Card>

      <Card
        title="Step 5 — WACC"
        subtitle="The blended cost of all the money the company uses. Use it when you discount FCFF, which is what this workbench forecasts."
        right={
          <Button variant="primary" size="sm" onClick={() => set('dcf', { discountRate: Math.round(w.wacc * 10000) / 10000 })}>
            Use in DCF <ArrowRight size={12} className="inline" />
          </Button>
        }
      >
        <Formula>WACC = (E/V) x Ke + (D/V) x Kd x (1 - t),  where V = E + D</Formula>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <NumField label="Market value of debt (M)" value={ws.wacc.marketDebt} onChange={(v) => set('wacc', { marketDebt: v })} hint="Book debt is fine if it trades near par. 0 falls back to book." />
          <NumField label="Pre-tax cost of debt (Kd)" percent value={ws.wacc.preTaxKd} onChange={(v) => set('wacc', { preTaxKd: v })} hint="What it would pay to borrow TODAY, not old coupons." />
          <NumField label="Tax rate" percent value={ws.company.taxRate} onChange={(v) => set('company', { taxRate: v })} hint="Interest is tax-deductible, hence (1 - t)." />
          <div>
            <span className="block text-zinc-400 text-xs mb-1">Capital structure</span>
            <Toggle
              value={ws.wacc.useTargetMix ? 'target' : 'market'}
              onChange={(v) => set('wacc', { useTargetMix: v === 'target' })}
              options={[
                { value: 'market', label: 'Market weights' },
                { value: 'target', label: 'Target mix' },
              ]}
            />
            {ws.wacc.useTargetMix && (
              <div className="mt-2">
                <NumField label="Target equity weight" percent compact value={ws.wacc.targetEquityWeight} onChange={(v) => set('wacc', { targetEquityWeight: v })} />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          <Stat label="Equity weight" value={fmtPct(w.equityWeight, 1)} hint={w.usingTarget ? 'Target mix' : 'Market cap / (E + D)'} />
          <Stat label="Debt weight" value={fmtPct(w.debtWeight, 1)} />
          <Stat label="After-tax Kd" value={fmtPct(w.afterTaxKd, 2)} hint="Kd x (1 - t)" />
          <Stat label="WACC" value={fmtPct(w.wacc, 2)} tone="accent" hint={`DCF is using ${fmtPct(usedInDcf, 2)}`} />
        </div>

        {Math.abs(usedInDcf - w.wacc) > 0.0005 && (
          <p className="text-xs text-yellow-300/90 mt-3">
            The DCF is discounting at {fmtPct(usedInDcf, 2)} while this WACC is {fmtPct(w.wacc, 2)}. That is fine if it
            is deliberate (rounding, or a deliberately higher hurdle) — otherwise press Use in DCF.
          </p>
        )}

        <div className="mt-4 space-y-2">
          <Explainer title="Four things to get right in a WACC">
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>Use market values for the weights: market cap for E, market value of debt for D.</li>
              <li>Kd is what the company would pay to borrow today — its bond yield, or Rf plus the credit spread for its rating.</li>
              <li>The (1 - t) term exists because interest is tax-deductible. Equity has no such shield.</li>
              <li>If today debt level is unusual, use the long-run target mix instead of the current one.</li>
            </ol>
          </Explainer>
          <Explainer title="When to skip WACC entirely">
            <p>
              For banks and insurers, debt is the raw material of the business, not financing. A WACC there is
              meaningless. Value them with the cost of equity: a dividend discount model (Price = D1 / (Ke - g)), or by
              comparing P/B against ROE.
            </p>
          </Explainer>
        </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-zinc-400">{label}</span>
      <span className="text-white font-medium tabular-nums">{value}</span>
    </div>
  )
}
