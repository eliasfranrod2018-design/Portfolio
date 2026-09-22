'use client'

import { Plus, Trash2 } from 'lucide-react'
import { fmtPct, fmtShare, fmtX, isNum } from '@/lib/valuation'
import { GLOSSARY } from '@/lib/guide'
import { Button, Card, Definition, Explainer, Formula, NumField, Stat, TextField, Toggle } from './Ui'
import type { TabProps } from './types'

const DEFS = ['Fair value', 'Margin of safety']

export default function CompsTab({ ws, calc, set, setWs }: TabProps) {
  const dec = ws.decision
  const comps = calc.comps
  const d = calc.decision
  const price = ws.company.price

  function addPeer() {
    setWs((prev) => ({
      ...prev,
      peers: [
        ...prev.peers,
        { id: `p${Date.now()}`, name: '', evEbitda: 0, pe: 0, evSales: 0, pb: 0 },
      ],
    }))
  }

  function editPeer(id: string, part: Partial<{ name: string; evEbitda: number; pe: number; evSales: number; pb: number }>) {
    setWs((prev) => ({ ...prev, peers: prev.peers.map((p) => (p.id === id ? { ...p, ...part } : p)) }))
  }

  function removePeer(id: string) {
    setWs((prev) => ({ ...prev, peers: prev.peers.filter((p) => p.id !== id) }))
  }

  const baseValue = dec.autoBase ? (d.dcfValue ?? dec.base) : dec.base

  const verdictStyle =
    d.verdict === 'buy'
      ? 'bg-green-500/10 border-green-500/30 text-green-400'
      : d.verdict === 'watch'
        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
        : d.verdict === 'expensive'
          ? 'bg-red-500/10 border-red-500/30 text-red-400'
          : 'bg-zinc-800 border-zinc-700 text-zinc-400'

  const verdictText =
    d.verdict === 'buy'
      ? 'Below your maximum buy price — cheap enough to act on, if the business checklist holds up.'
      : d.verdict === 'watch'
        ? 'Below fair value but inside your margin of safety. Fairly valued, not cheap. Put it on the watchlist with a price alert.'
        : d.verdict === 'expensive'
          ? 'Above your fair value estimate. Either the market knows something you do not, or you are looking at a good business at a bad price.'
          : 'Fill in a price and the valuation inputs to get a verdict.'

  return (
    <div className="space-y-4">
      <Card
        title="Step 8 — Cross-check with multiples"
        subtitle="Comps tell you what the market pays for similar businesses today. They catch DCF mistakes and anchor the answer to reality."
      >
        <Explainer title="How to pick peers, and which multiple to use" defaultOpen>
          <p>
            Pick 5 to 8 peers with a similar industry, size, growth and margins, and take the{' '}
            <span className="text-white font-medium">median</span> multiple — one outlier ruins an average.
          </p>
          <p>
            Use EV/EBITDA and P/E for profitable companies, EV/Sales for unprofitable ones, and P/B for banks.
            EV/EBITDA is the fairest comparison between peers with different debt levels, because it values the whole
            business rather than just the equity slice.
          </p>
          <p className="text-yellow-300/90">
            Comps inherit the market mood. If the whole sector is overpriced, a median multiple will tell you an
            overpriced stock is fairly valued. That is why the DCF comes first.
          </p>
        </Explainer>

        <div className="mt-4 overflow-x-auto -mx-1 px-1">
          <table className="w-full text-sm min-w-[620px]">
            <thead>
              <tr className="text-zinc-500 text-xs uppercase tracking-wide">
                <th className="text-left font-medium py-2">Peer</th>
                <th className="text-left font-medium py-2 w-28">EV/EBITDA</th>
                <th className="text-left font-medium py-2 w-28">P/E</th>
                <th className="text-left font-medium py-2 w-28">EV/Sales</th>
                <th className="text-left font-medium py-2 w-28">P/B</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {ws.peers.map((p) => (
                <tr key={p.id} className="border-t border-zinc-800">
                  <td className="py-1.5 pr-2">
                    <TextField compact value={p.name} onChange={(v) => editPeer(p.id, { name: v })} placeholder="Ticker" />
                  </td>
                  <td className="py-1.5 pr-2"><NumField compact value={p.evEbitda} onChange={(v) => editPeer(p.id, { evEbitda: v })} /></td>
                  <td className="py-1.5 pr-2"><NumField compact value={p.pe} onChange={(v) => editPeer(p.id, { pe: v })} /></td>
                  <td className="py-1.5 pr-2"><NumField compact value={p.evSales} onChange={(v) => editPeer(p.id, { evSales: v })} /></td>
                  <td className="py-1.5 pr-2"><NumField compact value={p.pb} onChange={(v) => editPeer(p.id, { pb: v })} /></td>
                  <td className="py-1.5 text-right">
                    <button type="button" onClick={() => removePeer(p.id)} className="text-zinc-500 hover:text-red-400 p-1">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {ws.peers.length === 0 && (
                <tr className="border-t border-zinc-800">
                  <td colSpan={6} className="py-4 text-center text-zinc-600 text-sm">No peers yet. Leave a multiple at 0 to exclude it from the median.</td>
                </tr>
              )}
              <tr className="border-t border-zinc-700">
                <td className="py-2 text-white font-semibold">Median</td>
                <td className="py-2 text-blue-400 font-medium">{fmtX(comps.medEvEbitda)}</td>
                <td className="py-2 text-blue-400 font-medium">{fmtX(comps.medPe)}</td>
                <td className="py-2 text-blue-400 font-medium">{fmtX(comps.medEvSales, 2)}</td>
                <td className="py-2 text-blue-400 font-medium">{fmtX(comps.medPb, 2)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-end gap-3 mt-3">
          <Button onClick={addPeer}><Plus size={13} className="inline mr-1" />Add peer</Button>
          <div className="w-52">
            <NumField
              label="Premium / discount vs peers"
              percent
              value={dec.compsPremium}
              onChange={(v) => set('decision', { compsPremium: v })}
              hint="Positive if it grows faster or earns a higher ROIC than the peer set."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          <Stat label="From EV/EBITDA" value={fmtShare(comps.fromEvEbitda)} hint="EV = multiple x EBITDA, then bridge" />
          <Stat label="From P/E" value={fmtShare(comps.fromPe)} hint="Price = multiple x EPS" />
          <Stat label="From EV/Sales" value={fmtShare(comps.fromEvSales)} hint="For unprofitable companies" />
          <Stat label="From P/B" value={fmtShare(comps.fromPb)} hint="For banks and insurers" />
        </div>
      </Card>

      <Card title="Fair value" subtitle="Your best estimate of the right price, triangulated from more than one method.">
        <div className="grid sm:grid-cols-3 gap-2">
          <Stat label="DCF (intrinsic)" value={fmtShare(d.dcfValue)} />
          <Stat label="Comps (average of methods)" value={fmtShare(d.compsValue)} />
          <Stat label="Blended fair value" value={fmtShare(d.blended)} tone="accent" />
        </div>
        <div className="mt-3 max-w-xs">
          <NumField
            label="Weight on the DCF"
            percent
            value={dec.blendDcf}
            onChange={(v) => set('decision', { blendDcf: Math.min(Math.max(v, 0), 1) })}
            hint="The rest goes to comps. 50/50 is a reasonable default."
          />
        </div>
      </Card>

      <Card
        title="Step 9 — Scenarios"
        subtitle="You will be wrong about something. Weight the outcomes instead of pretending you are not."
      >
        <Formula>Expected value = (p_bear x V_bear) + (p_base x V_base) + (p_bull x V_bull)</Formula>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <div className="space-y-2">
            <NumField label="Bear value / share" value={dec.bear} onChange={(v) => set('decision', { bear: v })} />
            <NumField label="Probability" percent value={dec.pBear} onChange={(v) => set('decision', { pBear: v })} />
          </div>
          <div className="space-y-2">
            <NumField label="Base value / share" value={baseValue} onChange={(v) => set('decision', { base: v, autoBase: false })} hint={dec.autoBase ? 'Auto-filled from the DCF' : 'Manual'} />
            <NumField label="Probability" percent value={dec.pBase} onChange={(v) => set('decision', { pBase: v })} />
          </div>
          <div className="space-y-2">
            <NumField label="Bull value / share" value={dec.bull} onChange={(v) => set('decision', { bull: v })} />
            <NumField label="Probability" percent value={dec.pBull} onChange={(v) => set('decision', { pBull: v })} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <Toggle
            value={dec.autoBase ? 'auto' : 'manual'}
            onChange={(v) => set('decision', { autoBase: v === 'auto' })}
            options={[
              { value: 'auto', label: 'Base = DCF output' },
              { value: 'manual', label: 'Base entered by hand' },
            ]}
          />
          {Math.abs(d.probabilitySum - 1) > 0.001 && (
            <span className="text-yellow-400 text-xs">
              Probabilities sum to {fmtPct(d.probabilitySum, 0)} — the expected value below is normalised to 100%.
            </span>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-2 mt-4">
          <Stat label="Probability-weighted value" value={fmtShare(d.expectedValue)} />
          <Stat label="Market price" value={fmtShare(price || null)} />
        </div>
        <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
          Make the buy decision on the base case, not the expected value and never the bull case. Treat the bull case as
          upside you get for free. The expected value is a sanity check on whether the downside is survivable.
        </p>
      </Card>

      <Card title="Step 9b — Margin of safety and the verdict" subtitle="The buffer that keeps being wrong from costing you money.">
        <Formula>Maximum buy price = Fair value x (1 - margin of safety)</Formula>
        <div className="max-w-xs mt-3">
          <NumField
            label="Margin of safety"
            percent
            value={dec.mos}
            onChange={(v) => set('decision', { mos: v })}
            hint="20-30% is typical. Demand more when the business is harder to forecast."
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          <Stat label="Fair value" value={fmtShare(d.anchor)} tone="accent" />
          <Stat label="Maximum buy price" value={fmtShare(d.maxBuyPrice)} />
          <Stat label="Market price" value={fmtShare(price || null)} />
          <Stat
            label="Upside to fair value"
            value={fmtPct(d.upside)}
            tone={isNum(d.upside) ? (d.upside > 0 ? 'good' : 'bad') : 'default'}
          />
        </div>
        <div className={`mt-4 border rounded-xl p-4 ${verdictStyle}`}>
          <p className="font-bold text-lg mb-1">
            {d.verdict === 'buy' ? 'Cheap enough' : d.verdict === 'watch' ? 'Fairly valued' : d.verdict === 'expensive' ? 'Expensive' : 'Incomplete'}
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">{verdictText}</p>
        </div>
        <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
          A margin of safety is not a substitute for understanding: a 40% discount on a business you cannot forecast is
          still a guess. And if you already raised the discount rate and forecast conservatively, a large margin of
          safety on top is the third charge for the same risk.
        </p>
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
