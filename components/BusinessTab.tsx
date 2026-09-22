'use client'

import { QUALITY_CHECKLIST, WALKTHROUGH } from '@/lib/guide'
import { Card, CheckRow, Explainer, TextArea } from './Ui'
import type { TabProps } from './types'

const GROUPS = ['Business model', 'Moat', 'Management', 'Industry', 'Thesis risk']

const NOTE_FIELDS: { key: string; label: string; placeholder: string }[] = [
  {
    key: 'howItMakesMoney',
    label: 'How does it make money?',
    placeholder: 'Who pays, what they pay for, and whether the revenue repeats or happens once.',
  },
  {
    key: 'moat',
    label: 'What is the moat, and what is the evidence?',
    placeholder:
      'Switching costs / network effects / cost advantage / brand or patents / efficient scale — and the returns on capital that prove it.',
  },
  {
    key: 'management',
    label: 'Management as capital allocators',
    placeholder: 'Past acquisitions, buyback prices, insider ownership, what the incentive plan actually rewards.',
  },
  {
    key: 'industry',
    label: 'Industry structure',
    placeholder: 'Growth, cyclicality, pricing power, competitors. Rivalry, new entrants, substitutes, supplier and buyer power.',
  },
  {
    key: 'thesis',
    label: 'The thesis in three sentences',
    placeholder: 'What must be true over the next five years for the base case to happen.',
  },
  {
    key: 'breaks',
    label: 'What would break the thesis (and make me sell)',
    placeholder: 'A specific metric crossing a specific level — not a feeling.',
  },
]

export default function BusinessTab({ ws, set }: TabProps) {
  const checked = QUALITY_CHECKLIST.filter((i) => ws.quality[i.key]).length
  const total = QUALITY_CHECKLIST.length
  const pct = Math.round((checked / total) * 100)
  const step = WALKTHROUGH[0]

  return (
    <div className="space-y-4">
      <Card
        title="Step 1 — Understand the business before using any formula"
        subtitle={step.purpose}
        right={
          <span
            className={`shrink-0 px-2.5 py-1 rounded-xl border text-sm font-bold ${
              pct >= 75
                ? 'bg-green-500/15 text-green-400 border-green-500/30'
                : pct >= 50
                  ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                  : 'bg-red-500/15 text-red-400 border-red-500/30'
            }`}
          >
            {checked}/{total}
          </span>
        }
      >
        <Explainer title="Why this comes before the spreadsheet" defaultOpen>
          <p>
            A discounted cash flow model is an opinion about a business dressed up as arithmetic. Every growth rate and
            margin you will type on the DCF tab is a claim about competition, pricing power and management. The
            checklist below is how you earn the right to make those claims.
          </p>
          <p>
            The test for a moat is not a good story: it is high returns on capital sustained for years without
            competitors wearing them down. You will verify that on the Metrics tab with ROIC.
          </p>
        </Explainer>

        <div className="mt-4 space-y-4">
          {GROUPS.map((g) => (
            <div key={g}>
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">{g}</p>
              <div className="divide-y divide-zinc-800/60">
                {QUALITY_CHECKLIST.filter((i) => i.group === g).map((item) => (
                  <CheckRow
                    key={item.key}
                    checked={!!ws.quality[item.key]}
                    onChange={(v) => set('quality', { [item.key]: v })}
                    label={item.label}
                    hint={item.hint}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Write it down"
        subtitle="Written assumptions are falsifiable; remembered ones are not. This is what lets you tell a broken thesis from a falling price."
      >
        <div className="space-y-3">
          {NOTE_FIELDS.map((f) => (
            <TextArea
              key={f.key}
              label={f.label}
              placeholder={f.placeholder}
              value={ws.notes[f.key] ?? ''}
              onChange={(v) => set('notes', { [f.key]: v })}
            />
          ))}
        </div>
      </Card>
    </div>
  )
}
