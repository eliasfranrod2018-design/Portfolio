'use client'

import { MANUAL_FLAGS } from '@/lib/guide'
import { fmtPct } from '@/lib/valuation'
import { Card, CheckRow, Explainer, Formula, HealthPill } from './Ui'
import type { TabProps } from './types'

const FLAG_GROUPS = ['Reporting', 'Business', 'Balance sheet']

export default function MetricsTab({ ws, calc, set }: TabProps) {
  const roic = calc.metrics.find((m) => m.key === 'roic')?.value ?? null
  const wacc = calc.waccResult.wacc
  const spread = roic !== null ? roic - wacc : null
  const raised = MANUAL_FLAGS.filter((f) => ws.flags[f.key]).length
  const autoBad = calc.flags.filter((f) => f.status === 'bad').length

  return (
    <div className="space-y-4">
      <Card
        title="Step 3 — Key metrics"
        subtitle="Is this a good business at all? Each row shows the formula, what it means, and what healthy looks like."
      >
        <Explainer title="How to read this table" defaultOpen>
          <p>
            The colour is a rule of thumb applied to a single year, not a verdict. A green row on one year of data
            proves nothing — pull the same figures for 5 to 10 years and look at the trend and the volatility.
          </p>
          <p>
            Compare valuation multiples (P/E, EV/EBITDA, PEG) against peers and against the company own history. There
            is no universal right number for them.
          </p>
        </Explainer>

        <div className="mt-4 space-y-2">
          {calc.metrics.map((m) => (
            <div key={m.key} className="border border-zinc-800 rounded-xl bg-zinc-950/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm">{m.label}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{m.plain}</p>
                </div>
                <HealthPill health={m.health}>{m.display}</HealthPill>
              </div>
              <div className="mt-2 space-y-1.5">
                <Formula>{m.formula}</Formula>
                <p className="text-[11px] text-zinc-500">
                  <span className="text-zinc-600 uppercase tracking-wide mr-1.5">Healthy</span>
                  {m.healthy}
                </p>
                {m.note && <p className="text-[11px] text-blue-300/80">{m.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="The test that decides whether growth is worth anything" subtitle="ROIC versus WACC.">
        <div className="grid sm:grid-cols-3 gap-2">
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2.5">
            <p className="text-zinc-500 text-[11px] uppercase tracking-wide">ROIC</p>
            <p className="text-white font-bold text-lg">{fmtPct(roic)}</p>
          </div>
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2.5">
            <p className="text-zinc-500 text-[11px] uppercase tracking-wide">WACC</p>
            <p className="text-white font-bold text-lg">{fmtPct(wacc)}</p>
          </div>
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2.5">
            <p className="text-zinc-500 text-[11px] uppercase tracking-wide">Spread</p>
            <p className={`font-bold text-lg ${spread === null ? 'text-zinc-500' : spread > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtPct(spread)}
            </p>
          </div>
        </div>
        <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
          {spread === null
            ? 'Fill in the inputs and the discount rate to see the spread.'
            : spread > 0
              ? 'ROIC is above the cost of capital, so every dollar reinvested creates value and faster growth is worth paying for.'
              : 'ROIC is at or below the cost of capital. Growth here destroys value: every reinvested dollar earns less than it costs. Do not pay a growth multiple for it.'}
        </p>
      </Card>

      <Card
        title="Red flags — computed from your inputs"
        subtitle={`${autoBad} of ${calc.flags.length} checks are flashing red.`}
      >
        <div className="space-y-2">
          {calc.flags.map((f) => (
            <div key={f.key} className="border border-zinc-800 rounded-xl bg-zinc-950/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-white text-sm font-semibold">{f.label}</p>
                <HealthPill health={f.status}>
                  {f.status === 'good' ? 'clear' : f.status === 'ok' ? 'watch' : f.status === 'bad' ? 'flag' : 'n/a'}
                </HealthPill>
              </div>
              <p className="text-zinc-400 text-xs mt-1">{f.detail}</p>
              <p className="text-zinc-600 text-xs mt-1.5 leading-relaxed">{f.why}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Red flags you have to check by reading"
        subtitle={`${raised} raised. These do not show up in the numbers you typed.`}
      >
        <div className="space-y-4">
          {FLAG_GROUPS.map((g) => (
            <div key={g}>
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">{g}</p>
              <div className="divide-y divide-zinc-800/60">
                {MANUAL_FLAGS.filter((f) => f.group === g).map((f) => (
                  <CheckRow
                    key={f.key}
                    checked={!!ws.flags[f.key]}
                    onChange={(v) => set('flags', { [f.key]: v })}
                    label={f.label}
                    hint={f.hint}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
