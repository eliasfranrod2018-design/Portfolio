'use client'

import { GLOSSARY, MISTAKES } from '@/lib/guide'
import { Card, Definition } from './Ui'

export default function GlossaryTab() {
  return (
    <div className="space-y-4">
      <Card
        title="Every term, in three registers"
        subtitle="The textbook definition for precision, plain English for understanding, and why it matters so you know when to care."
      >
        <div className="grid md:grid-cols-2 gap-2">
          {GLOSSARY.map((g) => (
            <Definition key={g.term} {...g} />
          ))}
        </div>
      </Card>

      <Card title="Formula sheet" subtitle="Everything this page computes, in one place.">
        <pre className="bg-black/50 border border-zinc-800 rounded-xl p-3 text-[12px] md:text-[13px] text-emerald-300 font-mono overflow-x-auto leading-relaxed">{`QUALITY
Revenue CAGR       = (Ending revenue / Starting revenue)^(1/years) - 1
Gross margin       = Gross profit / Revenue
Operating margin   = EBIT / Revenue
NOPAT              = EBIT x (1 - tax rate)
Invested capital   = Debt + Equity - Cash
ROIC               = NOPAT / Invested capital
ROE                = Net income / Shareholders equity
Free cash flow     = Operating cash flow - CapEx
FCF conversion     = FCF / Net income
Net debt / EBITDA  = (Debt - Cash) / EBITDA
Interest coverage  = EBIT / Interest expense

PRICE
Market cap         = Price x Diluted shares
Enterprise value   = Market cap + Debt - Cash + Preferred + Minority interest
P/E                = Price / EPS
EV/EBITDA          = Enterprise value / EBITDA
FCF yield          = FCF per share / Price
PEG                = P/E / EPS growth rate (%)

DISCOUNT RATE
Levered beta       = Unlevered beta x [1 + (1 - t) x (D/E)]
Cost of equity     = Rf + beta x ERP + country + size + specific
Country adder      = Country risk premium x share of revenue from those markets
WACC               = (E/V) x Ke + (D/V) x Kd x (1 - t)
Sanity check       = FCF yield + long-term growth ~ expected return

INTRINSIC VALUE
Reinvestment rate  = g / ROIC
FCFF               = NOPAT - Net reinvestment
                   = NOPAT + D&A - CapEx - Change in working capital
PV of a cash flow  = CF(t) / (1 + WACC)^t
TV (perpetuity)    = FCFF(n+1) / (WACC - g)
TV (exit multiple) = EBITDA(n) x peer EV/EBITDA
Enterprise value   = Sum of PV(FCFF) + PV(TV)
Equity value       = EV - Debt + Cash - Preferred - Minority interest
Value per share    = Equity value / Diluted shares

DECISION
Expected value     = p_bear x V_bear + p_base x V_base + p_bull x V_bull
Maximum buy price  = Fair value x (1 - margin of safety)
Dividend discount  = D1 / (Ke - g)          (banks, insurers, mature payers)`}</pre>
      </Card>

      <Card title="Valuation mistakes" subtitle="Read this list again before you act on any answer.">
        <div className="grid md:grid-cols-2 gap-2">
          {MISTAKES.map((m) => (
            <div key={m.title} className="border border-zinc-800 rounded-xl p-3 bg-zinc-950/60">
              <p className="text-red-400 text-sm font-semibold mb-1">{m.title}</p>
              <p className="text-zinc-400 text-xs leading-relaxed">{m.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="A note on what this page is">
        <p className="text-sm text-zinc-400 leading-relaxed">
          This is a workbench for doing the analysis yourself: it computes exactly what you type and nothing else. It
          does not fetch prices, it does not know the company, and it is not investment advice. Every number it shows is
          a consequence of an assumption you made, which is the point — the discipline is in making those assumptions
          explicit enough to argue with.
        </p>
      </Card>
    </div>
  )
}
