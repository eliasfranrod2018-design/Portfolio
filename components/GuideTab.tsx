'use client'

import { ArrowRight } from 'lucide-react'
import { WALKTHROUGH, CASHFLOW_MATCH, MISTAKES } from '@/lib/guide'
import { Card, Explainer, Formula } from './Ui'
import type { TabId, TabProps } from './types'

export default function GuideTab({ goTo }: Pick<TabProps, 'goTo'>) {
  return (
    <div className="space-y-4">
      <Card
        title="How to value a company, in order"
        subtitle="Ten steps. Do them in this order — each one feeds the next. Open any step to see exactly what to do."
      >
        <div className="space-y-2">
          {WALKTHROUGH.map((s) => (
            <div key={s.n} className="border border-zinc-800 rounded-xl overflow-hidden">
              <details className="group">
                <summary className="flex items-center gap-3 px-3 py-3 cursor-pointer list-none hover:bg-zinc-950/60 transition-colors">
                  <span className="w-7 h-7 shrink-0 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-bold grid place-items-center">
                    {s.n}
                  </span>
                  <span className="flex-1 text-white text-sm font-semibold">{s.title}</span>
                  <span className="text-zinc-600 text-[11px] group-open:hidden">open</span>
                </summary>
                <div className="px-3 pb-4 pt-1 space-y-3">
                  <p className="text-sm text-zinc-300 leading-relaxed">{s.purpose}</p>
                  <ul className="space-y-1.5">
                    {s.how.map((h, i) => (
                      <li key={i} className="text-sm text-zinc-400 flex gap-2 leading-relaxed">
                        <span className="text-blue-500 shrink-0">{i + 1}.</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-yellow-300/90 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-3 py-2 leading-relaxed">
                    <span className="font-semibold">Watch out: </span>
                    {s.watchOut}
                  </p>
                  <button
                    type="button"
                    onClick={() => goTo(s.tab as TabId)}
                    className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    Go to this step <ArrowRight size={14} />
                  </button>
                </div>
              </details>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="The one rule that prevents most valuation errors"
        subtitle="Match the discount rate to whose cash flow you are discounting."
      >
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-zinc-500 text-xs uppercase tracking-wide">
                <th className="text-left font-medium py-2">Cash flow you forecast</th>
                <th className="text-left font-medium py-2">Who it belongs to</th>
                <th className="text-left font-medium py-2">Discount it at</th>
                <th className="text-left font-medium py-2">What you get</th>
              </tr>
            </thead>
            <tbody>
              {CASHFLOW_MATCH.map((r) => (
                <tr key={r.flow} className="border-t border-zinc-800">
                  <td className="py-2.5 pr-3 text-white">{r.flow}</td>
                  <td className="py-2.5 pr-3 text-zinc-400">{r.owner}</td>
                  <td className="py-2.5 pr-3 text-blue-400 font-medium">{r.rate}</td>
                  <td className="py-2.5 text-zinc-400">{r.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
          This workbench forecasts FCFF and discounts it at WACC, which is the standard method for non-financial
          companies. For banks and insurers, skip WACC entirely: debt is their raw material, not their financing. Value
          them on cost of equity with a dividend discount model, or compare P/B against ROE.
        </p>
        <div className="mt-3">
          <Explainer title="The dividend discount model, for when you need it">
            <p>Use it for banks, insurers, utilities and any mature payer whose dividend is the real cash you receive.</p>
            <Formula>Price = D1 / (Ke - g)</Formula>
            <p>
              D1 is next year dividend per share, Ke the cost of equity, g the long-run dividend growth rate. It is the
              same perpetuity formula as the DCF terminal value, applied to dividends instead of firm cash flow.
            </p>
          </Explainer>
        </div>
      </Card>

      <Card title="Mistakes that quietly ruin a valuation" subtitle="Check this list before you trust an answer.">
        <div className="grid md:grid-cols-2 gap-2">
          {MISTAKES.map((m) => (
            <div key={m.title} className="border border-zinc-800 rounded-xl p-3 bg-zinc-950/60">
              <p className="text-red-400 text-sm font-semibold mb-1">{m.title}</p>
              <p className="text-zinc-400 text-xs leading-relaxed">{m.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Where the numbers come from">
        <ul className="text-sm text-zinc-400 space-y-2 leading-relaxed">
          <li>
            <span className="text-white font-medium">10-K and 10-Q</span> — free on SEC EDGAR. The income statement,
            balance sheet and cash flow statement give you every input on the Inputs tab. Read Risk Factors and MD&A too.
          </li>
          <li>
            <span className="text-white font-medium">DEF 14A (proxy)</span> — insider ownership and how management is
            paid.
          </li>
          <li>
            <span className="text-white font-medium">Earnings call transcripts</span> — where management explains the
            drivers, and where you can hear what they avoid answering.
          </li>
          <li>
            <span className="text-white font-medium">Damodaran online data</span> — free industry unlevered betas,
            implied equity risk premiums and country risk premiums, updated regularly.
          </li>
          <li>
            <span className="text-white font-medium">Treasury yield curve</span> — the 10-year yield is your risk-free
            rate. Use the current one, not a remembered one.
          </li>
        </ul>
      </Card>
    </div>
  )
}
