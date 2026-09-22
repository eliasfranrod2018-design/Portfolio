'use client'

import type { CompanyInputs } from '@/lib/valuation'
import { fmtMoney, fmtPct, fmtX } from '@/lib/valuation'
import { Card, Explainer, NumField, Stat, TextField } from './Ui'
import type { TabProps } from './types'

type NumKey = {
  [K in keyof CompanyInputs]: CompanyInputs[K] extends number ? K : never
}[keyof CompanyInputs]

interface FieldDef {
  key: NumKey
  label: string
  hint: string
  percent?: boolean
}

const MARKET: FieldDef[] = [
  { key: 'price', label: 'Share price', hint: 'Today, per share (not millions).' },
  { key: 'dilutedShares', label: 'Diluted shares (M)', hint: 'Diluted, never basic. Income statement, bottom.' },
  { key: 'sharesPrior', label: 'Diluted shares last year (M)', hint: 'To measure dilution or buybacks.' },
]

const INCOME: FieldDef[] = [
  { key: 'revenue', label: 'Revenue (M)', hint: 'Most recent fiscal year.' },
  { key: 'revenuePrior', label: 'Revenue last year (M)', hint: 'Used for the red-flag comparisons.' },
  { key: 'revenueBack', label: 'Revenue N years ago (M)', hint: 'Starting point for the growth CAGR.' },
  { key: 'yearsBack', label: 'N (years)', hint: 'How many years back that figure is. 5 or 10 is usual.' },
  { key: 'grossProfit', label: 'Gross profit (M)', hint: 'Revenue minus cost of revenue.' },
  { key: 'ebit', label: 'EBIT / operating income (M)', hint: 'Before interest and tax. The core profit.' },
  { key: 'netIncome', label: 'Net income (M)', hint: 'Attributable to common shareholders.' },
  { key: 'interestExpense', label: 'Interest expense (M)', hint: 'Gross interest paid, for the coverage ratio.' },
  { key: 'da', label: 'D&A (M)', hint: 'Depreciation and amortisation, from the cash flow statement.' },
  { key: 'taxRate', label: 'Effective tax rate', hint: 'Tax expense / pre-tax income. Use the statutory rate if this year is distorted.', percent: true },
  { key: 'sbc', label: 'Stock-based comp (M)', hint: 'A real expense, paid in your ownership.' },
  { key: 'epsGrowth', label: 'Expected EPS growth', hint: 'Forward growth, for the PEG ratio only.', percent: true },
]

const CASHFLOW: FieldDef[] = [
  { key: 'operatingCashFlow', label: 'Operating cash flow (M)', hint: 'Cash flow statement, bottom of section 1.' },
  { key: 'capex', label: 'CapEx (M)', hint: 'Purchases of property, plant and equipment. Enter as a positive number.' },
  { key: 'changeInWC', label: 'Change in working capital (M)', hint: 'Positive means working capital consumed cash.' },
]

const BALANCE: FieldDef[] = [
  { key: 'totalDebt', label: 'Total debt (M)', hint: 'Short-term plus long-term borrowings, including finance leases.' },
  { key: 'cash', label: 'Cash and equivalents (M)', hint: 'Include short-term investments if they are truly liquid.' },
  { key: 'bookEquity', label: 'Shareholders equity (M)', hint: "Book value. Used for ROE and invested capital." },
  { key: 'goodwill', label: 'Goodwill (M)', hint: 'Large goodwill relative to equity marks a serial acquirer.' },
  { key: 'receivables', label: 'Receivables (M)', hint: 'Accounts receivable, current year.' },
  { key: 'receivablesPrior', label: 'Receivables last year (M)', hint: 'Growing faster than revenue is a warning sign.' },
  { key: 'inventory', label: 'Inventory (M)', hint: 'Current year.' },
  { key: 'inventoryPrior', label: 'Inventory last year (M)', hint: 'Growing faster than revenue is a warning sign.' },
  { key: 'preferred', label: 'Preferred stock (M)', hint: 'Stands ahead of common shareholders. Subtracted in the bridge.' },
  { key: 'minorityInterest', label: 'Minority interest (M)', hint: 'The part of consolidated subsidiaries you do not own.' },
]

function Group({
  title,
  note,
  fields,
  ws,
  set,
}: {
  title: string
  note: string
  fields: FieldDef[]
} & Pick<TabProps, 'ws' | 'set'>) {
  return (
    <Card title={title} subtitle={note}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map((f) => (
          <NumField
            key={f.key}
            label={f.label}
            hint={f.hint}
            percent={f.percent}
            value={ws.company[f.key]}
            onChange={(v) => set('company', { [f.key]: v } as Partial<CompanyInputs>)}
          />
        ))}
      </div>
    </Card>
  )
}

export default function InputsTab({ ws, calc, set }: TabProps) {
  const d = calc.derived
  return (
    <div className="space-y-4">
      <Card
        title="Step 2 — Enter the raw financials"
        subtitle="Everything else on this page is computed from these numbers. Type them once, from the filings."
      >
        <Explainer title="Units, and the mistake that costs you a factor of 1000" defaultOpen>
          <p>
            Every money figure here is in <span className="text-white font-medium">millions</span>, and the share count
            is in <span className="text-white font-medium">millions</span> too, so equity value divided by shares comes
            out as a real per-share price. The share price itself is the only figure entered per share.
          </p>
          <p>
            After you fill this in, check the market cap in the panel below against the real one. If it is off by 1000x,
            a units mistake is the reason.
          </p>
        </Explainer>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <TextField label="Company" value={ws.company.name} onChange={(v) => set('company', { name: v })} placeholder="Company name" />
          <TextField label="Ticker" value={ws.company.ticker} onChange={(v) => set('company', { ticker: v })} placeholder="ABC" />
          <TextField label="Figures as of" value={ws.company.asOf} onChange={(v) => set('company', { asOf: v })} placeholder="FY2025 10-K" />
        </div>
      </Card>

      <Card title="Sanity check" subtitle="Derived straight from your inputs. If any of these look wrong, the inputs are wrong.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat label="Market cap" value={fmtMoney(d.marketCap)} hint="Price x diluted shares" />
          <Stat label="Net debt" value={fmtMoney(d.netDebt)} hint="Debt - cash" />
          <Stat label="Enterprise value" value={fmtMoney(d.enterpriseValue)} hint="Mkt cap + net debt + pref + minority" />
          <Stat label="EBITDA" value={fmtMoney(d.ebitda)} hint="EBIT + D&A" />
          <Stat label="NOPAT" value={fmtMoney(d.nopat)} hint="EBIT x (1 - tax rate)" />
          <Stat label="Invested capital" value={fmtMoney(d.investedCapital)} hint="Debt + equity - cash" />
          <Stat label="Free cash flow" value={fmtMoney(d.fcf)} hint="OCF - CapEx" />
          <Stat label="EPS" value={d.eps === null ? '—' : `$${d.eps.toFixed(2)}`} hint="Net income / diluted shares" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
          <Stat label="P/E" value={fmtX(d.eps && d.eps > 0 ? ws.company.price / d.eps : null)} />
          <Stat label="EV/EBITDA" value={fmtX(d.ebitda > 0 ? d.enterpriseValue / d.ebitda : null)} />
          <Stat
            label="FCF yield"
            value={fmtPct(d.fcfPerShare !== null && ws.company.price > 0 ? d.fcfPerShare / ws.company.price : null)}
          />
          <Stat label="EBIT margin" value={fmtPct(ws.company.revenue > 0 ? ws.company.ebit / ws.company.revenue : null)} />
        </div>
      </Card>

      <Group title="Market data" note="What the market says today." fields={MARKET} ws={ws} set={set} />
      <Group
        title="Income statement"
        note="Most recent fiscal year, plus the comparatives used for growth and red flags."
        fields={INCOME}
        ws={ws}
        set={set}
      />
      <Group
        title="Cash flow statement"
        note="Where reported profit meets reality."
        fields={CASHFLOW}
        ws={ws}
        set={set}
      />
      <Group
        title="Balance sheet"
        note="Leverage, other claims on the business, and the working-capital red flags."
        fields={BALANCE}
        ws={ws}
        set={set}
      />
    </div>
  )
}
