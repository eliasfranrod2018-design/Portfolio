/**
 * Stock valuation engine.
 *
 * Conventions used everywhere in this file:
 *  - Money figures are in MILLIONS of the reporting currency (revenue, EBIT, debt...).
 *  - Share counts are in MILLIONS, so `equityValue / dilutedShares` is a per-share number.
 *  - Rates (growth, margins, WACC, tax...) are DECIMALS: 0.08 means 8%.
 */

export type Health = 'good' | 'ok' | 'bad' | 'na'

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

export const isNum = (x: number | null | undefined): x is number =>
  typeof x === 'number' && Number.isFinite(x)

export function safeDiv(a: number, b: number): number | null {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null
  const r = a / b
  return Number.isFinite(r) ? r : null
}

export const fmtPct = (x: number | null, d = 1) => (isNum(x) ? `${(x * 100).toFixed(d)}%` : '—')
export const fmtX = (x: number | null, d = 1) => (isNum(x) ? `${x.toFixed(d)}x` : '—')
export const fmtNum = (x: number | null, d = 1) => (isNum(x) ? x.toFixed(d) : '—')
export const fmtMoney = (x: number | null, d = 0) =>
  isNum(x)
    ? `${x < 0 ? '-' : ''}$${Math.abs(x).toLocaleString('en-US', {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      })}`
    : '—'
export const fmtShare = (x: number | null) => (isNum(x) ? `$${x.toFixed(2)}` : '—')

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

export interface CompanyInputs {
  name: string
  ticker: string
  asOf: string
  /** Market data */
  price: number
  dilutedShares: number
  sharesPrior: number
  /** Income statement, most recent fiscal year */
  revenue: number
  revenuePrior: number
  revenueBack: number
  yearsBack: number
  grossProfit: number
  ebit: number
  netIncome: number
  interestExpense: number
  da: number
  taxRate: number
  sbc: number
  epsGrowth: number
  /** Cash flow statement */
  operatingCashFlow: number
  capex: number
  changeInWC: number
  /** Balance sheet */
  totalDebt: number
  cash: number
  bookEquity: number
  goodwill: number
  receivables: number
  receivablesPrior: number
  inventory: number
  inventoryPrior: number
  preferred: number
  minorityInterest: number
}

export interface RiskInputs {
  riskFree: number
  erp: number
  betaMode: 'regression' | 'bottomUp'
  regressionBeta: number
  unleveredBeta: number
  countryRiskPremium: number
  emergingRevenueShare: number
  sizePremium: number
  specificPremium: number
  personalHurdle: number
  indexExpectedReturn: number
}

export interface WaccInputs {
  marketDebt: number
  preTaxKd: number
  useTargetMix: boolean
  targetEquityWeight: number
}

export interface ForecastRow {
  growth: number
  margin: number
}

export interface DcfInputs {
  years: number
  rows: ForecastRow[]
  reinvestMode: 'roic' | 'explicit'
  marginalRoic: number
  terminalRoic: number
  daPct: number
  capexPct: number
  wcPct: number
  terminalGrowth: number
  tvMode: 'perpetuity' | 'exit'
  exitMultiple: number
  discountRate: number
  taxRate: number
  midYear: boolean
}

export interface Peer {
  id: string
  name: string
  evEbitda: number
  pe: number
  evSales: number
  pb: number
}

export interface DecisionInputs {
  compsPremium: number
  blendDcf: number
  mos: number
  autoBase: boolean
  bear: number
  base: number
  bull: number
  pBear: number
  pBase: number
  pBull: number
}

export interface Worksheet {
  v: 1
  company: CompanyInputs
  risk: RiskInputs
  wacc: WaccInputs
  dcf: DcfInputs
  peers: Peer[]
  decision: DecisionInputs
  quality: Record<string, boolean>
  flags: Record<string, boolean>
  notes: Record<string, string>
}

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

export function fadeSchedule(
  years: number,
  startGrowth: number,
  endGrowth: number,
  startMargin: number,
  endMargin: number
): ForecastRow[] {
  const rows: ForecastRow[] = []
  for (let i = 0; i < years; i++) {
    const k = years === 1 ? 1 : i / (years - 1)
    rows.push({
      growth: startGrowth + (endGrowth - startGrowth) * k,
      margin: startMargin + (endMargin - startMargin) * k,
    })
  }
  return rows
}

export const BLANK_COMPANY: CompanyInputs = {
  name: '',
  ticker: '',
  asOf: '',
  price: 0,
  dilutedShares: 0,
  sharesPrior: 0,
  revenue: 0,
  revenuePrior: 0,
  revenueBack: 0,
  yearsBack: 5,
  grossProfit: 0,
  ebit: 0,
  netIncome: 0,
  interestExpense: 0,
  da: 0,
  taxRate: 0.21,
  sbc: 0,
  epsGrowth: 0,
  operatingCashFlow: 0,
  capex: 0,
  changeInWC: 0,
  totalDebt: 0,
  cash: 0,
  bookEquity: 0,
  goodwill: 0,
  receivables: 0,
  receivablesPrior: 0,
  inventory: 0,
  inventoryPrior: 0,
  preferred: 0,
  minorityInterest: 0,
}

export const BLANK_RISK: RiskInputs = {
  riskFree: 0.05,
  erp: 0.042,
  betaMode: 'bottomUp',
  regressionBeta: 1.2,
  unleveredBeta: 1.0,
  countryRiskPremium: 0,
  emergingRevenueShare: 0,
  sizePremium: 0,
  specificPremium: 0,
  personalHurdle: 0.1,
  indexExpectedReturn: 0.08,
}

export const BLANK_WACC: WaccInputs = {
  marketDebt: 0,
  preTaxKd: 0.065,
  useTargetMix: false,
  targetEquityWeight: 0.8,
}

export const BLANK_DCF: DcfInputs = {
  years: 5,
  rows: fadeSchedule(5, 0.08, 0.04, 0.15, 0.15),
  reinvestMode: 'roic',
  marginalRoic: 0.2,
  terminalRoic: 0.2,
  daPct: 0.04,
  capexPct: 0.06,
  wcPct: 0.05,
  terminalGrowth: 0.03,
  tvMode: 'perpetuity',
  exitMultiple: 11,
  discountRate: 0.09,
  taxRate: 0.21,
  midYear: false,
}

export const BLANK_DECISION: DecisionInputs = {
  compsPremium: 0,
  blendDcf: 0.5,
  mos: 0.25,
  autoBase: true,
  bear: 0,
  base: 0,
  bull: 0,
  pBear: 0.25,
  pBase: 0.5,
  pBull: 0.25,
}

export function blankWorksheet(): Worksheet {
  return {
    v: 1,
    company: { ...BLANK_COMPANY },
    risk: { ...BLANK_RISK },
    wacc: { ...BLANK_WACC },
    dcf: { ...BLANK_DCF, rows: BLANK_DCF.rows.map((r) => ({ ...r })) },
    peers: [],
    decision: { ...BLANK_DECISION },
    quality: {},
    flags: {},
    notes: {},
  }
}

/** The Company XYZ worked example. Reproduces an intrinsic value of $16.97/share. */
export function exampleWorksheet(): Worksheet {
  const ws = blankWorksheet()
  ws.company = {
    ...BLANK_COMPANY,
    name: 'Company XYZ (worked example)',
    ticker: 'XYZ',
    asOf: 'FY0',
    price: 16,
    dilutedShares: 100,
    sharesPrior: 100,
    revenue: 1000,
    revenuePrior: 926,
    revenueBack: 681,
    yearsBack: 5,
    grossProfit: 400,
    ebit: 150,
    netIncome: 98,
    interestExpense: 26,
    da: 40,
    taxRate: 0.21,
    sbc: 20,
    epsGrowth: 0.1,
    operatingCashFlow: 128,
    capex: 81,
    changeInWC: 10,
    totalDebt: 400,
    cash: 100,
    bookEquity: 292.5,
    goodwill: 50,
    receivables: 120,
    receivablesPrior: 111,
    inventory: 150,
    inventoryPrior: 139,
    preferred: 0,
    minorityInterest: 0,
  }
  ws.risk = { ...BLANK_RISK, betaMode: 'regression', regressionBeta: 1.2, unleveredBeta: 1.04 }
  ws.wacc = { ...BLANK_WACC, marketDebt: 400, preTaxKd: 0.065, useTargetMix: true, targetEquityWeight: 0.8 }
  ws.dcf = {
    ...BLANK_DCF,
    years: 5,
    rows: fadeSchedule(5, 0.08, 0.08, 0.15, 0.15),
    marginalRoic: 0.2,
    terminalRoic: 0.2,
    daPct: 0.04,
    terminalGrowth: 0.03,
    discountRate: 0.09,
    taxRate: 0.21,
  }
  ws.peers = [
    { id: 'p1', name: 'Peer A', evEbitda: 10.5, pe: 17, evSales: 2.1, pb: 3 },
    { id: 'p2', name: 'Peer B', evEbitda: 11, pe: 18.5, evSales: 2.3, pb: 3.4 },
    { id: 'p3', name: 'Peer C', evEbitda: 11.5, pe: 19, evSales: 2.4, pb: 3.6 },
  ]
  ws.decision = { ...BLANK_DECISION, autoBase: true, bear: 11, bull: 24 }
  return ws
}

/* ------------------------------------------------------------------ */
/* Section 2 — metrics                                                 */
/* ------------------------------------------------------------------ */

export interface MetricResult {
  key: string
  label: string
  formula: string
  plain: string
  healthy: string
  value: number | null
  display: string
  health: Health
  note?: string
}

function grade(v: number | null, good: (x: number) => boolean, ok: (x: number) => boolean): Health {
  if (!isNum(v)) return 'na'
  if (good(v)) return 'good'
  if (ok(v)) return 'ok'
  return 'bad'
}

export interface DerivedCompany {
  ebitda: number
  nopat: number
  investedCapital: number
  fcf: number
  netDebt: number
  marketCap: number
  enterpriseValue: number
  eps: number | null
  bookValuePerShare: number | null
  fcfPerShare: number | null
}

export function deriveCompany(c: CompanyInputs): DerivedCompany {
  const ebitda = c.ebit + c.da
  const nopat = c.ebit * (1 - c.taxRate)
  const investedCapital = c.totalDebt + c.bookEquity - c.cash
  const fcf = c.operatingCashFlow - c.capex
  const netDebt = c.totalDebt - c.cash
  const marketCap = c.price * c.dilutedShares
  const enterpriseValue = marketCap + netDebt + c.preferred + c.minorityInterest
  return {
    ebitda,
    nopat,
    investedCapital,
    fcf,
    netDebt,
    marketCap,
    enterpriseValue,
    eps: safeDiv(c.netIncome, c.dilutedShares),
    bookValuePerShare: safeDiv(c.bookEquity, c.dilutedShares),
    fcfPerShare: safeDiv(fcf, c.dilutedShares),
  }
}

export function computeMetrics(c: CompanyInputs, d: DerivedCompany): MetricResult[] {
  const cagr =
    c.revenueBack > 0 && c.revenue > 0 && c.yearsBack > 0
      ? Math.pow(c.revenue / c.revenueBack, 1 / c.yearsBack) - 1
      : null
  const grossMargin = safeDiv(c.grossProfit, c.revenue)
  const opMargin = safeDiv(c.ebit, c.revenue)
  const roic = safeDiv(d.nopat, d.investedCapital)
  const roe = safeDiv(c.netIncome, c.bookEquity)
  const fcfConv = safeDiv(d.fcf, c.netIncome)
  const netDebtEbitda = safeDiv(d.netDebt, d.ebitda)
  const coverage = safeDiv(c.ebit, c.interestExpense)
  const shareChange = safeDiv(c.dilutedShares - c.sharesPrior, c.sharesPrior)
  const pe = isNum(d.eps) && d.eps > 0 ? safeDiv(c.price, d.eps) : null
  const evEbitda = safeDiv(d.enterpriseValue, d.ebitda)
  const fcfYield = isNum(d.fcfPerShare) ? safeDiv(d.fcfPerShare, c.price) : null
  const peg = isNum(pe) && c.epsGrowth > 0 ? safeDiv(pe, c.epsGrowth * 100) : null

  return [
    {
      key: 'cagr',
      label: 'Revenue CAGR',
      formula: '(Ending revenue / Starting revenue)^(1 / years) − 1',
      plain: 'Average yearly growth over the period, smoothing out good and bad years.',
      healthy: 'Consistent and above inflation.',
      value: cagr,
      display: fmtPct(cagr),
      health: grade(cagr, (x) => x >= 0.07, (x) => x >= 0.03),
    },
    {
      key: 'gm',
      label: 'Gross margin',
      formula: 'Gross profit / Revenue',
      plain: "What's left after the direct cost of making the product.",
      healthy: 'Stable or rising. A high, stable gross margin usually means pricing power.',
      value: grossMargin,
      display: fmtPct(grossMargin),
      health: grade(grossMargin, (x) => x >= 0.4, (x) => x >= 0.2),
    },
    {
      key: 'om',
      label: 'Operating margin',
      formula: 'EBIT / Revenue',
      plain: 'Core profit per $1 of sales, before financing and one-offs.',
      healthy: 'Stable or rising, at or above peers.',
      value: opMargin,
      display: fmtPct(opMargin),
      health: grade(opMargin, (x) => x >= 0.15, (x) => x >= 0.07),
    },
    {
      key: 'roic',
      label: 'ROIC',
      formula: 'NOPAT / (Debt + Equity − Cash), NOPAT = EBIT × (1 − tax rate)',
      plain: 'Profit per $1 actually invested in the business. The single best quality metric.',
      healthy: 'Above WACC for years. 15%+ is strong.',
      value: roic,
      display: fmtPct(roic),
      health: grade(roic, (x) => x >= 0.15, (x) => x >= 0.08),
      note: 'Growth only creates value when ROIC is above WACC.',
    },
    {
      key: 'roe',
      label: 'ROE',
      formula: "Net income / Shareholders' equity",
      plain: "Profit per $1 of the owners' money.",
      healthy: 'High — but check it is not high only because of heavy debt.',
      value: roe,
      display: fmtPct(roe),
      health: grade(roe, (x) => x >= 0.15, (x) => x >= 0.08),
    },
    {
      key: 'fcf',
      label: 'Free cash flow',
      formula: 'Operating cash flow − CapEx',
      plain: 'Cash left after running the business and maintaining it.',
      healthy: 'Positive and growing.',
      value: d.fcf,
      display: fmtMoney(d.fcf),
      health: grade(d.fcf, (x) => x > 0, (x) => x === 0),
    },
    {
      key: 'fcfconv',
      label: 'FCF conversion',
      formula: 'Free cash flow / Net income',
      plain: 'How much of the reported profit shows up as real cash.',
      healthy: 'Around 80% or more.',
      value: fcfConv,
      display: fmtPct(fcfConv),
      health: grade(fcfConv, (x) => x >= 0.8, (x) => x >= 0.6),
    },
    {
      key: 'leverage',
      label: 'Net debt / EBITDA',
      formula: '(Debt − Cash) / EBITDA',
      plain: 'Years of cash profit it would take to repay the debt.',
      healthy: 'Under 2–3x for most industries.',
      value: netDebtEbitda,
      display: fmtX(netDebtEbitda),
      health: grade(netDebtEbitda, (x) => x <= 2, (x) => x <= 3),
    },
    {
      key: 'coverage',
      label: 'Interest coverage',
      formula: 'EBIT / Interest expense',
      plain: 'How easily operating profit covers the interest bill.',
      healthy: 'Above 5x is comfortable.',
      value: coverage,
      display: fmtX(coverage),
      health: grade(coverage, (x) => x >= 5, (x) => x >= 3),
    },
    {
      key: 'shares',
      label: 'Diluted share count change',
      formula: '(Shares this year − Shares last year) / Shares last year',
      plain: 'Is your slice of the company shrinking or growing?',
      healthy: 'Flat or falling.',
      value: shareChange,
      display: fmtPct(shareChange, 2),
      health: grade(shareChange, (x) => x <= 0, (x) => x <= 0.01),
    },
    {
      key: 'pe',
      label: 'P/E',
      formula: 'Price / EPS',
      plain: 'Years of current earnings you are paying for.',
      healthy: 'Compare to peers and to its own history — there is no universal number.',
      value: pe,
      display: fmtX(pe),
      health: grade(pe, (x) => x > 0 && x <= 18, (x) => x > 0 && x <= 28),
    },
    {
      key: 'evebitda',
      label: 'EV / EBITDA',
      formula: '(Market cap + Debt − Cash) / EBITDA',
      plain: 'Price of the whole business versus its cash profit.',
      healthy: 'Best for comparing peers with different debt levels.',
      value: evEbitda,
      display: fmtX(evEbitda),
      health: grade(evEbitda, (x) => x > 0 && x <= 10, (x) => x > 0 && x <= 15),
    },
    {
      key: 'fcfyield',
      label: 'FCF yield',
      formula: 'FCF per share / Price',
      plain: 'The cash return you get at today’s price.',
      healthy: 'Compare it with the 10-year Treasury yield.',
      value: fcfYield,
      display: fmtPct(fcfYield),
      health: grade(fcfYield, (x) => x >= 0.05, (x) => x >= 0.03),
    },
    {
      key: 'peg',
      label: 'PEG',
      formula: 'P/E ÷ EPS growth rate (in %)',
      plain: 'P/E adjusted for how fast earnings grow.',
      healthy: 'Around 1 or below.',
      value: peg,
      display: fmtX(peg, 2),
      health: grade(peg, (x) => x > 0 && x <= 1, (x) => x > 0 && x <= 1.5),
    },
  ]
}

/* ------------------------------------------------------------------ */
/* Section 3 — required rate of return                                 */
/* ------------------------------------------------------------------ */

export interface RateResult {
  leveredBeta: number
  betaUsed: number
  debtToEquity: number | null
  capm: number
  countryAdd: number
  ke: number
  gordonExpectedReturn: number | null
  hurdleGap: number | null
}

export function computeRate(
  c: CompanyInputs,
  r: RiskInputs,
  w: WaccInputs,
  d: DerivedCompany,
  dcf: DcfInputs
): RateResult {
  const debt = w.marketDebt > 0 ? w.marketDebt : c.totalDebt
  const de = safeDiv(debt, d.marketCap)
  const leveredBeta = r.unleveredBeta * (1 + (1 - c.taxRate) * (de ?? 0))
  const betaUsed = r.betaMode === 'regression' ? r.regressionBeta : leveredBeta
  const capm = r.riskFree + betaUsed * r.erp
  const countryAdd = r.countryRiskPremium * r.emergingRevenueShare
  const ke = capm + countryAdd + r.sizePremium + r.specificPremium
  const fcfYield = isNum(d.fcfPerShare) ? safeDiv(d.fcfPerShare, c.price) : null
  const gordon = isNum(fcfYield) ? fcfYield + dcf.terminalGrowth : null
  return {
    leveredBeta,
    betaUsed,
    debtToEquity: de,
    capm,
    countryAdd,
    ke,
    gordonExpectedReturn: gordon,
    hurdleGap: isNum(gordon) ? gordon - Math.max(ke, r.personalHurdle) : null,
  }
}

export interface WaccResult {
  equityWeight: number
  debtWeight: number
  afterTaxKd: number
  wacc: number
  usingTarget: boolean
}

export function computeWacc(c: CompanyInputs, w: WaccInputs, d: DerivedCompany, ke: number): WaccResult {
  const debt = w.marketDebt > 0 ? w.marketDebt : c.totalDebt
  const v = d.marketCap + debt
  let we = w.useTargetMix ? w.targetEquityWeight : (safeDiv(d.marketCap, v) ?? 1)
  if (!isNum(we)) we = 1
  we = Math.min(Math.max(we, 0), 1)
  const wd = 1 - we
  const afterTaxKd = w.preTaxKd * (1 - c.taxRate)
  return {
    equityWeight: we,
    debtWeight: wd,
    afterTaxKd,
    wacc: we * ke + wd * afterTaxKd,
    usingTarget: w.useTargetMix,
  }
}

/* ------------------------------------------------------------------ */
/* Section 5 — the DCF                                                 */
/* ------------------------------------------------------------------ */

export interface DcfYear {
  t: number
  revenue: number
  growth: number
  margin: number
  ebit: number
  nopat: number
  da: number
  capex: number
  dwc: number
  reinvestment: number
  fcff: number
  factor: number
  pv: number
}

export interface DcfResult {
  rows: DcfYear[]
  sumPv: number
  terminalFcff: number | null
  terminalValue: number
  pvTerminal: number
  enterpriseValue: number
  equityValue: number
  perShare: number | null
  tvShareOfEv: number | null
  impliedExitMultiple: number | null
  warnings: string[]
}

export function runDcf(c: CompanyInputs, dcf: DcfInputs): DcfResult {
  const warnings: string[] = []
  const rows: DcfYear[] = []
  const n = Math.max(1, Math.min(15, Math.round(dcf.years)))
  let prevRevenue = c.revenue
  let sumPv = 0

  for (let i = 0; i < n; i++) {
    const cfg = dcf.rows[i] ?? dcf.rows[dcf.rows.length - 1] ?? { growth: 0, margin: 0 }
    const t = i + 1
    const revenue = prevRevenue * (1 + cfg.growth)
    const ebit = revenue * cfg.margin
    const nopat = ebit * (1 - dcf.taxRate)
    const da = revenue * dcf.daPct
    const capex = revenue * dcf.capexPct
    const dwc = (revenue - prevRevenue) * dcf.wcPct
    const reinvestment =
      dcf.reinvestMode === 'roic'
        ? dcf.marginalRoic > 0
          ? nopat * (cfg.growth / dcf.marginalRoic)
          : 0
        : capex - da + dwc
    const fcff = nopat - reinvestment
    const exp = dcf.midYear ? t - 0.5 : t
    const factor = 1 / Math.pow(1 + dcf.discountRate, exp)
    const pv = fcff * factor
    sumPv += pv
    rows.push({ t, revenue, growth: cfg.growth, margin: cfg.margin, ebit, nopat, da, capex, dwc, reinvestment, fcff, factor, pv })
    prevRevenue = revenue
  }

  const last = rows[rows.length - 1]
  const tvFactor = 1 / Math.pow(1 + dcf.discountRate, n)
  let terminalValue = 0
  let terminalFcff: number | null = null

  if (dcf.tvMode === 'perpetuity') {
    if (dcf.discountRate <= dcf.terminalGrowth) {
      warnings.push(
        'The discount rate must be higher than the terminal growth rate, otherwise the perpetuity formula breaks (it would imply infinite value).'
      )
    } else {
      const revN1 = last.revenue * (1 + dcf.terminalGrowth)
      const nopatN1 = revN1 * last.margin * (1 - dcf.taxRate)
      const reinvestRate = dcf.terminalRoic > 0 ? dcf.terminalGrowth / dcf.terminalRoic : 0
      terminalFcff = nopatN1 * (1 - reinvestRate)
      terminalValue = terminalFcff / (dcf.discountRate - dcf.terminalGrowth)
    }
  } else {
    const ebitdaN = last.ebit + last.revenue * dcf.daPct
    terminalValue = ebitdaN * dcf.exitMultiple
  }

  const pvTerminal = terminalValue * tvFactor
  const enterpriseValue = sumPv + pvTerminal
  const equityValue = enterpriseValue - c.totalDebt + c.cash - c.preferred - c.minorityInterest
  const perShare = safeDiv(equityValue, c.dilutedShares)
  const tvShareOfEv = safeDiv(pvTerminal, enterpriseValue)
  const ebitdaN = last.ebit + last.revenue * dcf.daPct
  const impliedExitMultiple = safeDiv(terminalValue, ebitdaN)

  if (dcf.terminalGrowth > 0.04)
    warnings.push(
      'Terminal growth above ~4% assumes the company outgrows the economy forever. Keep it at or below long-run nominal GDP growth and the risk-free rate (2–3% is standard).'
    )
  if (isNum(tvShareOfEv) && tvShareOfEv > 0.85)
    warnings.push(
      `Terminal value is ${fmtPct(tvShareOfEv, 0)} of enterprise value. Above ~80% your answer is mostly an assumption about year 6 onward — stress-test it.`
    )
  if (dcf.reinvestMode === 'roic' && dcf.marginalRoic <= 0)
    warnings.push('Marginal ROIC must be above zero, otherwise growth needs infinite reinvestment.')

  return {
    rows,
    sumPv,
    terminalFcff,
    terminalValue,
    pvTerminal,
    enterpriseValue,
    equityValue,
    perShare,
    tvShareOfEv,
    impliedExitMultiple,
    warnings,
  }
}

/* ------------------------------------------------------------------ */
/* Sensitivity                                                         */
/* ------------------------------------------------------------------ */

export interface SensitivityGrid {
  rowLabels: string[]
  colLabels: string[]
  values: (number | null)[][]
}

export function sensitivity(c: CompanyInputs, dcf: DcfInputs): SensitivityGrid {
  const waccSteps = [-0.01, -0.005, 0, 0.005, 0.01]
  const growthSteps = [-0.01, -0.005, 0, 0.005, 0.01]
  const values: (number | null)[][] = []
  for (const g of growthSteps) {
    const row: (number | null)[] = []
    for (const w of waccSteps) {
      const res = runDcf(c, {
        ...dcf,
        discountRate: dcf.discountRate + w,
        terminalGrowth: dcf.terminalGrowth + g,
      })
      row.push(res.perShare)
    }
    values.push(row)
  }
  return {
    rowLabels: growthSteps.map((g) => fmtPct(dcf.terminalGrowth + g, 1)),
    colLabels: waccSteps.map((w) => fmtPct(dcf.discountRate + w, 1)),
    values,
  }
}

/* ------------------------------------------------------------------ */
/* Reverse DCF                                                         */
/* ------------------------------------------------------------------ */

function bisect(f: (x: number) => number | null, target: number, lo: number, hi: number): number | null {
  const fLo = f(lo)
  const fHi = f(hi)
  if (!isNum(fLo) || !isNum(fHi)) return null
  const increasing = fHi > fLo
  if ((target < Math.min(fLo, fHi)) || (target > Math.max(fLo, fHi))) return null
  let a = lo
  let b = hi
  for (let i = 0; i < 90; i++) {
    const m = (a + b) / 2
    const fm = f(m)
    if (!isNum(fm)) return null
    const tooLow = increasing ? fm < target : fm > target
    if (tooLow) a = m
    else b = m
  }
  return (a + b) / 2
}

export interface ReverseResult {
  impliedStartGrowth: number | null
  impliedGrowthShift: number | null
  impliedStartMargin: number | null
  impliedMarginShift: number | null
  currentStartGrowth: number
  currentStartMargin: number
}

/**
 * Solves the model backward for the price. Both solves shift the whole path
 * you entered up or down rather than replacing it, so the shape of your
 * forecast (the fade, the phased margin) is preserved and the implied year-1
 * number is directly comparable with your own.
 */
export function reverseDcf(c: CompanyInputs, dcf: DcfInputs): ReverseResult {
  const currentStartGrowth = dcf.rows[0]?.growth ?? 0
  const currentStartMargin = dcf.rows[0]?.margin ?? 0

  const growthFn = (shift: number) =>
    runDcf(c, { ...dcf, rows: dcf.rows.map((r) => ({ ...r, growth: r.growth + shift })) }).perShare
  const marginFn = (shift: number) =>
    runDcf(c, { ...dcf, rows: dcf.rows.map((r) => ({ ...r, margin: Math.max(r.margin + shift, 0) })) }).perShare

  const gShift = c.price > 0 ? bisect(growthFn, c.price, -0.5, 0.5) : null
  const mShift = c.price > 0 ? bisect(marginFn, c.price, -currentStartMargin + 0.001, 0.4) : null

  return {
    impliedStartGrowth: isNum(gShift) ? currentStartGrowth + gShift : null,
    impliedGrowthShift: gShift,
    impliedStartMargin: isNum(mShift) ? currentStartMargin + mShift : null,
    impliedMarginShift: mShift,
    currentStartGrowth,
    currentStartMargin,
  }
}

/* ------------------------------------------------------------------ */
/* Section 7 — comps                                                   */
/* ------------------------------------------------------------------ */

export function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b)
  if (!v.length) return null
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

export interface CompsResult {
  medEvEbitda: number | null
  medPe: number | null
  medEvSales: number | null
  medPb: number | null
  fromEvEbitda: number | null
  fromPe: number | null
  fromEvSales: number | null
  fromPb: number | null
  average: number | null
}

export function computeComps(
  c: CompanyInputs,
  d: DerivedCompany,
  peers: Peer[],
  premium: number
): CompsResult {
  const medEvEbitda = median(peers.map((p) => p.evEbitda))
  const medPe = median(peers.map((p) => p.pe))
  const medEvSales = median(peers.map((p) => p.evSales))
  const medPb = median(peers.map((p) => p.pb))
  const adj = 1 + premium
  const bridge = (ev: number) =>
    safeDiv(ev - c.totalDebt + c.cash - c.preferred - c.minorityInterest, c.dilutedShares)

  const fromEvEbitda = isNum(medEvEbitda) && d.ebitda > 0 ? bridge(medEvEbitda * adj * d.ebitda) : null
  const fromPe = isNum(medPe) && isNum(d.eps) && d.eps > 0 ? medPe * adj * d.eps : null
  const fromEvSales = isNum(medEvSales) && c.revenue > 0 ? bridge(medEvSales * adj * c.revenue) : null
  const fromPb =
    isNum(medPb) && isNum(d.bookValuePerShare) && d.bookValuePerShare > 0
      ? medPb * adj * d.bookValuePerShare
      : null

  const all = [fromEvEbitda, fromPe, fromEvSales, fromPb].filter(isNum)
  return {
    medEvEbitda,
    medPe,
    medEvSales,
    medPb,
    fromEvEbitda,
    fromPe,
    fromEvSales,
    fromPb,
    average: all.length ? all.reduce((s, x) => s + x, 0) / all.length : null,
  }
}

/* ------------------------------------------------------------------ */
/* Section 8 — decision                                                */
/* ------------------------------------------------------------------ */

export interface DecisionResult {
  dcfValue: number | null
  compsValue: number | null
  blended: number | null
  probabilitySum: number
  expectedValue: number | null
  anchor: number | null
  maxBuyPrice: number | null
  upside: number | null
  verdict: 'buy' | 'watch' | 'expensive' | 'na'
}

export function computeDecision(
  c: CompanyInputs,
  dcf: DcfResult,
  comps: CompsResult,
  dec: DecisionInputs
): DecisionResult {
  const dcfValue = dcf.perShare
  const compsValue = comps.average
  let blended: number | null = null
  if (isNum(dcfValue) && isNum(compsValue)) blended = dec.blendDcf * dcfValue + (1 - dec.blendDcf) * compsValue
  else if (isNum(dcfValue)) blended = dcfValue
  else if (isNum(compsValue)) blended = compsValue

  const base = dec.autoBase ? (dcfValue ?? dec.base) : dec.base
  const probabilitySum = dec.pBear + dec.pBase + dec.pBull
  const expectedValue =
    probabilitySum > 0 ? (dec.pBear * dec.bear + dec.pBase * base + dec.pBull * dec.bull) / probabilitySum : null

  const anchor = isNum(blended) ? blended : null
  const maxBuyPrice = isNum(anchor) ? anchor * (1 - dec.mos) : null
  const upside = isNum(anchor) && c.price > 0 ? anchor / c.price - 1 : null

  let verdict: DecisionResult['verdict'] = 'na'
  if (isNum(maxBuyPrice) && c.price > 0) {
    if (c.price <= maxBuyPrice) verdict = 'buy'
    else if (isNum(anchor) && c.price <= anchor) verdict = 'watch'
    else verdict = 'expensive'
  }

  return { dcfValue, compsValue, blended, probabilitySum, expectedValue, anchor, maxBuyPrice, upside, verdict }
}

/* ------------------------------------------------------------------ */
/* Red flags                                                           */
/* ------------------------------------------------------------------ */

export interface FlagResult {
  key: string
  label: string
  detail: string
  why: string
  status: Health
}

export function computeFlags(c: CompanyInputs, d: DerivedCompany): FlagResult[] {
  const revGrowth = safeDiv(c.revenue - c.revenuePrior, c.revenuePrior)
  const arGrowth = safeDiv(c.receivables - c.receivablesPrior, c.receivablesPrior)
  const invGrowth = safeDiv(c.inventory - c.inventoryPrior, c.inventoryPrior)
  const out: FlagResult[] = []

  const gap = (g: number | null) => (isNum(g) && isNum(revGrowth) ? g - revGrowth : null)

  const arGap = gap(arGrowth)
  out.push({
    key: 'ar',
    label: 'Receivables vs revenue',
    detail: `Receivables ${fmtPct(arGrowth)} vs revenue ${fmtPct(revGrowth)}`,
    why: 'Receivables growing much faster than revenue can mean sales are being booked that customers have not paid for — revenue pulled forward, or looser credit terms.',
    status: !isNum(arGap) ? 'na' : arGap > 0.1 ? 'bad' : arGap > 0.05 ? 'ok' : 'good',
  })

  const invGap = gap(invGrowth)
  out.push({
    key: 'inv',
    label: 'Inventory vs revenue',
    detail: `Inventory ${fmtPct(invGrowth)} vs revenue ${fmtPct(revGrowth)}`,
    why: 'Inventory piling up faster than sales usually means the product is not moving, and a write-down may be coming.',
    status: !isNum(invGap) ? 'na' : invGap > 0.1 ? 'bad' : invGap > 0.05 ? 'ok' : 'good',
  })

  const cashGap = safeDiv(c.operatingCashFlow - c.netIncome, Math.abs(c.netIncome))
  out.push({
    key: 'accrual',
    label: 'Net income vs operating cash flow',
    detail: `Net income ${fmtMoney(c.netIncome)} vs OCF ${fmtMoney(c.operatingCashFlow)}`,
    why: 'Net income consistently above operating cash flow means the profit is accounting profit, not cash.',
    status: !isNum(cashGap) ? 'na' : cashGap >= 0 ? 'good' : cashGap > -0.15 ? 'ok' : 'bad',
  })

  const shareChange = safeDiv(c.dilutedShares - c.sharesPrior, c.sharesPrior)
  out.push({
    key: 'dilution',
    label: 'Dilution',
    detail: `Diluted shares ${fmtPct(shareChange, 2)} year over year`,
    why: 'A rising share count quietly shrinks your claim on the same business. Buybacks below intrinsic value do the opposite.',
    status: !isNum(shareChange) ? 'na' : shareChange <= 0 ? 'good' : shareChange < 0.02 ? 'ok' : 'bad',
  })

  const sbcPct = safeDiv(c.sbc, c.revenue)
  out.push({
    key: 'sbc',
    label: 'Stock-based compensation',
    detail: `SBC is ${fmtPct(sbcPct)} of revenue`,
    why: 'SBC is a real expense paid in your ownership. Companies that add it back to "adjusted" earnings are flattering the numbers.',
    status: !isNum(sbcPct) ? 'na' : sbcPct < 0.03 ? 'good' : sbcPct < 0.08 ? 'ok' : 'bad',
  })

  const leverage = safeDiv(d.netDebt, d.ebitda)
  out.push({
    key: 'leverage',
    label: 'Balance sheet risk',
    detail: `Net debt / EBITDA ${fmtX(leverage)}, interest coverage ${fmtX(safeDiv(c.ebit, c.interestExpense))}`,
    why: 'Large maturities coming due while cash flow is weak is how solvent-looking companies get wiped out.',
    status: !isNum(leverage) ? 'na' : leverage <= 2 ? 'good' : leverage <= 3.5 ? 'ok' : 'bad',
  })

  const gwPct = safeDiv(c.goodwill, c.bookEquity)
  out.push({
    key: 'goodwill',
    label: 'Goodwill vs equity',
    detail: `Goodwill is ${fmtPct(gwPct)} of book equity`,
    why: 'Goodwill that is large relative to equity marks a serial acquirer — check whether those acquisitions ever earned their cost of capital.',
    status: !isNum(gwPct) ? 'na' : gwPct < 0.3 ? 'good' : gwPct < 0.6 ? 'ok' : 'bad',
  })

  return out
}

/* ------------------------------------------------------------------ */
/* One call that computes the whole worksheet                          */
/* ------------------------------------------------------------------ */

export interface Calc {
  derived: DerivedCompany
  metrics: MetricResult[]
  rate: RateResult
  waccResult: WaccResult
  dcf: DcfResult
  grid: SensitivityGrid
  reverse: ReverseResult
  comps: CompsResult
  decision: DecisionResult
  flags: FlagResult[]
}

export function computeAll(ws: Worksheet): Calc {
  const derived = deriveCompany(ws.company)
  const metrics = computeMetrics(ws.company, derived)
  const rate = computeRate(ws.company, ws.risk, ws.wacc, derived, ws.dcf)
  const waccResult = computeWacc(ws.company, ws.wacc, derived, rate.ke)
  const dcf = runDcf(ws.company, ws.dcf)
  const grid = sensitivity(ws.company, ws.dcf)
  const reverse = reverseDcf(ws.company, ws.dcf)
  const comps = computeComps(ws.company, derived, ws.peers, ws.decision.compsPremium)
  const decision = computeDecision(ws.company, dcf, comps, ws.decision)
  const flags = computeFlags(ws.company, derived)
  return { derived, metrics, rate, waccResult, dcf, grid, reverse, comps, decision, flags }
}
