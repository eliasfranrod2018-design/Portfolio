/**
 * Teaching content for the valuation workbench: the order of operations,
 * the definitions behind every input, and the checklists.
 * Kept separate from lib/valuation.ts so the math stays readable.
 */

export interface GuideStep {
  n: number
  title: string
  tab: string
  purpose: string
  how: string[]
  watchOut: string
}

export const WALKTHROUGH: GuideStep[] = [
  {
    n: 1,
    title: 'Understand the business',
    tab: 'business',
    purpose:
      "A valuation is only as good as your understanding of how the company makes money. Every number you type later is a claim about the business, so earn the right to make those claims first.",
    how: [
      "Answer, in your own words: who pays, what they pay for, and does the revenue repeat (subscriptions, contracts) or happen once?",
      "Look for a moat: switching costs, network effects, cost advantages, brands and patents, or efficient scale. The test is high returns on capital sustained for years without competitors wearing them down.",
      "Judge management as capital allocators: how past acquisitions turned out, whether buybacks happened at sensible prices, insider ownership, and whether pay is tied to per-share value or ROIC rather than size.",
      "Map the industry: growth rate, cyclicality, pricing power, number of strong competitors (Porter's Five Forces is the textbook tool).",
      "Write down what would break the thesis: customer concentration, regulation, disruption, heavy debt.",
      "Sources: the 10-K and 10-Q on SEC EDGAR (free), earnings call transcripts, investor presentations. Read Risk Factors and MD&A, not only the statements.",
    ],
    watchOut:
      "If you cannot explain the business to someone else in five sentences, no spreadsheet will save you. Stop here and keep reading.",
  },
  {
    n: 2,
    title: 'Enter the raw financials',
    tab: 'inputs',
    purpose:
      "Everything downstream — metrics, WACC, DCF, comps — is computed from one small set of numbers, so they are entered once, in one place.",
    how: [
      "Take the figures straight from the latest 10-K (and the prior year for the growth and red-flag checks).",
      "Keep every money figure in millions and every share count in millions. Price is the actual price per share.",
      "Use the diluted share count, not basic.",
      "Use the effective tax rate (tax expense / pre-tax income) unless it is distorted by one-offs, in which case use the statutory rate.",
    ],
    watchOut:
      "Mixing units (a revenue in millions with a share count in thousands) is the single most common way to get an answer that is off by 1000x. Sanity-check market cap against the real one.",
  },
  {
    n: 3,
    title: 'Read the quality metrics',
    tab: 'metrics',
    purpose:
      "Before valuing anything, find out whether this is a good business at all. Growth, margins, ROIC, cash conversion and leverage tell you that in about two minutes.",
    how: [
      "Work down the table. Each row shows the formula, what it means in plain English, and what a healthy reading looks like.",
      "ROIC is the one to stare at: it decides whether growth creates or destroys value.",
      "Then check the red-flag panel, which compares receivables, inventory, cash conversion, dilution and leverage against revenue.",
    ],
    watchOut:
      "A single year proves nothing. Pull the same numbers for 5–10 years and look at the trend and the volatility, not the level.",
  },
  {
    n: 4,
    title: 'Set your required rate of return',
    tab: 'rate',
    purpose:
      "The discount rate is what turns future cash into today's money. It is your price for taking risk, and it decides the answer more than almost anything else.",
    how: [
      "Start with CAPM: Ke = Rf + beta x ERP.",
      "Prefer a bottom-up beta: take the average unlevered beta for the industry and relever it to this company's debt level.",
      "Add a country risk premium weighted by the share of revenue from emerging markets — country risk follows where a company earns money, not where it is incorporated.",
      "Add a size or company-specific premium (typically 1–3%) for small caps, customer concentration, key-person dependence or an unproven model — and write down why.",
      "Compare the result to your personal hurdle: if the stock cannot beat what you would reasonably expect from an index fund, buy the index.",
      "Sanity check with the rearranged Gordon model: expected return is roughly FCF yield + long-term growth.",
    ],
    watchOut:
      "Do not double-count risk. Raising the discount rate AND forecasting conservatively AND demanding a 30% margin of safety penalises the same risk three times, and nothing will ever look cheap. Pick where the conservatism goes.",
  },
  {
    n: 5,
    title: 'Build the WACC',
    tab: 'rate',
    purpose:
      "If you forecast cash flow to the whole firm (FCFF), you must discount it at the blended cost of all the capital that funds the firm.",
    how: [
      "WACC = (E/V) x Ke + (D/V) x Kd x (1 - t), where V = E + D.",
      "Use market values for the weights: market cap for E, market value of debt for D (book debt is fine if it trades near par).",
      "Kd is what the company would pay to borrow today — the yield on its bonds, or Rf plus the credit spread for its rating — not the coupon on old debt.",
      "The (1 - t) term exists because interest is tax-deductible.",
      "If today's debt level is unusual, use the long-run target mix instead.",
    ],
    watchOut:
      "Skip WACC for banks and insurers: there debt is raw material, not financing. Value them on cost of equity with a dividend discount model, or compare P/B against ROE.",
  },
  {
    n: 6,
    title: 'Run the DCF',
    tab: 'dcf',
    purpose:
      "Intrinsic value is the present value of the cash the business will produce. This is the one method that values the company rather than comparing it to other prices.",
    how: [
      "Forecast 5 years for a stable company, 10 for a fast grower so growth has time to slow.",
      "Set each year's revenue growth and EBIT margin. Phase improvements in gradually rather than jumping in year 1.",
      "Fund the growth: reinvestment = NOPAT x (g / ROIC). More growth requires more reinvestment, which lowers near-term FCFF.",
      "Pick a terminal value method: growing perpetuity (default) or an exit multiple as a cross-check.",
      "Discount everything at the WACC, sum it, then bridge from enterprise value to equity value to value per share.",
    ],
    watchOut:
      "Terminal growth must not exceed the risk-free rate or long-run nominal GDP growth (2–3%). Terminal value is usually 60–80% of the total; if yours is higher, the answer is mostly your terminal assumption.",
  },
  {
    n: 7,
    title: 'Stress-test it',
    tab: 'dcf',
    purpose:
      "A single number is false precision. A range tells you how much of your answer is knowledge and how much is assumption.",
    how: [
      "Read the WACC x terminal growth grid: one percentage point of WACC typically moves the value 20–25%.",
      "Run the reverse DCF to see the growth and margin the market is already paying for.",
      "If the market already prices in the improvement you expect, you have no edge even if the improvement happens.",
    ],
    watchOut:
      "Growth only creates value when ROIC is above WACC. If ROIC equals WACC, growing faster adds nothing, because every reinvested dollar earns exactly its cost.",
  },
  {
    n: 8,
    title: 'Cross-check with multiples',
    tab: 'comps',
    purpose:
      "Comps tell you what the market pays for similar businesses today. They catch DCF mistakes and anchor your answer to reality.",
    how: [
      "Pick 5–8 peers with similar industry, size, growth and margins, and take the median multiple (the median, not the mean — one outlier ruins an average).",
      "Use EV/EBITDA and P/E for profitable companies, EV/Sales for unprofitable ones, P/B for banks.",
      "Adjust up or down if your company grows faster or earns a higher ROIC than the peer set.",
      "Blend the DCF and comps values into one fair-value estimate.",
    ],
    watchOut:
      "Comps inherit the market's mood. If the whole sector is overpriced, a median multiple will tell you an overpriced stock is fairly valued.",
  },
  {
    n: 9,
    title: 'Scenarios and margin of safety',
    tab: 'comps',
    purpose:
      "You will be wrong about something. The margin of safety is the buffer that keeps being wrong from costing you money.",
    how: [
      "Build bear, base and bull values and weight them by probability: EV = p_bear x V_bear + p_base x V_base + p_bull x V_bull.",
      "Make the buy decision on the base case. Treat the bull case as upside you get for free.",
      "Maximum buy price = fair value x (1 - margin of safety). 20–30% is typical; demand more when the business is harder to predict.",
    ],
    watchOut:
      "A margin of safety is not a substitute for understanding. A 40% discount on a business you cannot forecast is still a guess.",
  },
  {
    n: 10,
    title: 'Write the thesis down',
    tab: 'business',
    purpose:
      "Written assumptions are falsifiable; remembered ones are not. This is what lets you tell a broken thesis from a falling price.",
    how: [
      "Record the two or three things that must be true for the base case to happen.",
      "Record what would make you sell: a specific metric crossing a specific level, not a feeling.",
      "Revisit after each 10-Q and mark whether reality is tracking your forecast.",
    ],
    watchOut:
      "If you find yourself changing the assumptions to keep the conclusion, the conclusion was the input all along.",
  },
]

export interface GlossaryEntry {
  term: string
  textbook: string
  plain: string
  formula?: string
  purpose: string
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'Intrinsic value',
    textbook:
      'The present value of all future cash flows a business is expected to generate, discounted at a rate that reflects their risk.',
    plain: "What the business is actually worth based on the cash it will make, regardless of today's stock price.",
    purpose: 'It is the anchor. Price is what the market says; intrinsic value is what you conclude, and the gap between them is your opportunity.',
  },
  {
    term: 'Fair value',
    textbook:
      'An analyst’s estimate of what a security should be worth, usually triangulated from intrinsic (DCF) and relative (comparable company) valuation.',
    plain: 'Your best estimate of the "right" price, checked in more than one way.',
    purpose: 'Blending methods protects you from the blind spot of any single one. (Note: in accounting under ASC 820, "fair value" means the exit price between market participants — a different concept.)',
  },
  {
    term: 'Required rate of return (cost of equity)',
    textbook:
      'The minimum return investors demand as compensation for the risk of holding a company’s equity; the opportunity cost of capital.',
    plain: 'The return you need to make owning this stock worth it instead of something safer.',
    formula: 'Ke = Rf + beta x ERP (+ country, size and specific premiums)',
    purpose: 'It converts future dollars into present dollars. A higher required return means you pay less today for the same future cash.',
  },
  {
    term: 'Beta',
    textbook:
      'A stock’s sensitivity to market movements: the covariance of its returns with the market divided by the variance of the market.',
    plain: 'How much the stock swings when the market swings. Beta 1.3 means it tends to move about 30% more than the market.',
    formula: 'Levered beta = Unlevered beta x [1 + (1 - t) x (D/E)]',
    purpose: 'It scales the equity risk premium to this particular company. A single-stock regression beta is noisy, so the industry average relevered to your company is usually better.',
  },
  {
    term: 'Equity risk premium (ERP)',
    textbook: 'The expected return on the overall stock market above the risk-free rate.',
    plain: 'The extra return people demand for owning stocks instead of Treasuries.',
    purpose: 'It is the price of risk in the whole market. Most practitioners use Damodaran’s implied ERP, updated monthly, rather than a historical average.',
  },
  {
    term: 'WACC',
    textbook:
      'The blended required return of all capital providers (debt and equity), weighted by their market-value proportions, with the cost of debt adjusted for the tax deductibility of interest.',
    plain: 'The average "interest rate" the company pays for all of its money, counting both lenders and shareholders.',
    formula: 'WACC = (E/V) x Ke + (D/V) x Kd x (1 - t)',
    purpose: 'It is the right discount rate for cash flow that belongs to everyone who funded the firm (FCFF). Match the rate to whose cash flow you are discounting.',
  },
  {
    term: 'NOPAT',
    textbook: 'Net operating profit after tax: operating profit taxed as if the company had no debt.',
    plain: 'The profit the operations make, after tax, ignoring how the company is financed.',
    formula: 'NOPAT = EBIT x (1 - tax rate)',
    purpose: 'It strips out financing so you can value the business itself, then handle debt separately in the bridge to equity value.',
  },
  {
    term: 'Free cash flow to the firm (FCFF)',
    textbook:
      'Cash generated by operations after taxes and all reinvestment needs, available to all capital providers before any debt payments.',
    plain: 'The cash the business throws off after paying its bills and investing in itself.',
    formula: 'FCFF = NOPAT + D&A - CapEx - Change in working capital = NOPAT - Net reinvestment',
    purpose: 'It is what you actually discount in a firm-level DCF. Discount it at WACC to get enterprise value.',
  },
  {
    term: 'Free cash flow to equity (FCFE)',
    textbook: 'Cash flow available to shareholders after interest, debt repayments and reinvestment.',
    plain: 'What is left for shareholders after the lenders have been paid.',
    purpose: 'Discount it at the cost of equity (not WACC) to get equity value directly. Discounting FCFE at WACC is a classic error that double-counts the benefit of debt.',
  },
  {
    term: 'ROIC',
    textbook: 'Net operating profit after tax divided by the capital invested in operations.',
    plain: 'Profit per $1 actually invested in the business.',
    formula: 'ROIC = NOPAT / (Debt + Equity - Cash)',
    purpose: 'It is the clearest evidence of a moat, and it sets the price of growth: g = Reinvestment rate x ROIC. Growth adds value only when ROIC exceeds WACC.',
  },
  {
    term: 'Reinvestment rate',
    textbook: 'The share of NOPAT put back into the business as net capital expenditure and working capital.',
    plain: 'How much of the profit has to be spent to keep the growth coming.',
    formula: 'Reinvestment rate = g / ROIC',
    purpose: 'It keeps a forecast honest. Growth without reinvestment behind it is a free lunch that does not exist.',
  },
  {
    term: 'Terminal value',
    textbook:
      'The value of all cash flows beyond the explicit forecast period, calculated as a growing perpetuity or with an exit multiple.',
    plain: 'What the business is worth from the last forecast year onward, rolled into one number.',
    formula: 'TV = FCFF(n+1) / (WACC - g)   or   TV = EBITDA(n) x peer EV/EBITDA',
    purpose: 'It captures the fact that the business does not stop. It is usually 60–80% of the total, which is why terminal assumptions deserve the most scrutiny.',
  },
  {
    term: 'Enterprise value / Equity value',
    textbook:
      'Enterprise value is the value of the operating business to all capital providers; equity value is what remains for shareholders after other claims.',
    plain: 'Enterprise value is the whole house; equity value is the house minus the mortgage.',
    formula: 'Equity value = EV - Debt + Cash - Preferred - Minority interest (- unaccounted leases)',
    purpose: 'The bridge is where careless valuations leak value. Forgetting preferred stock, minority interest or leases overstates what shareholders own.',
  },
  {
    term: 'Margin of safety',
    textbook:
      'The discount between a security’s estimated intrinsic value and its purchase price, used to protect against estimation error.',
    plain: 'A buffer so you do not lose money when your estimate turns out to be wrong.',
    formula: 'Maximum buy price = Intrinsic value x (1 - MOS)',
    purpose: 'It converts an uncertain valuation into a decision rule you can actually follow when the price moves.',
  },
  {
    term: 'Reverse DCF',
    textbook: 'Solving a DCF backward for the growth and margin assumptions implied by the current market price.',
    plain: 'Figuring out what the market already expects, so you can tell whether you actually disagree with it.',
    purpose: 'It reframes the question from "what is it worth?" to "what would have to be true?", which is a much harder thing to fool yourself about.',
  },
  {
    term: 'PEG ratio',
    textbook: 'The price/earnings ratio divided by the expected earnings growth rate in percent.',
    plain: 'P/E adjusted for growth.',
    formula: 'PEG = P/E / EPS growth (%)',
    purpose: 'A rough screen for whether a high multiple is justified by growth. Around 1 or below is the usual rule of thumb; it ignores risk and capital intensity, so never decide on it alone.',
  },
]

export interface ChecklistItem {
  key: string
  group: string
  label: string
  hint: string
}

export const QUALITY_CHECKLIST: ChecklistItem[] = [
  { key: 'q1', group: 'Business model', label: 'I can explain who pays, for what, and why they keep paying', hint: 'Write it in one sentence. If it takes a paragraph, you do not have it yet.' },
  { key: 'q2', group: 'Business model', label: 'Revenue is recurring or highly repeatable', hint: 'Subscriptions and contracts beat one-off project sales.' },
  { key: 'q3', group: 'Moat', label: 'There is an identifiable moat', hint: 'Switching costs, network effects, cost advantage, brand/patents, or efficient scale.' },
  { key: 'q4', group: 'Moat', label: 'Returns on capital have stayed high for 5+ years', hint: 'The evidence that the moat is real rather than a story.' },
  { key: 'q5', group: 'Moat', label: 'Pricing power is visible in the gross margin trend', hint: 'Prices rise with inflation without volumes falling.' },
  { key: 'q6', group: 'Management', label: 'Past acquisitions earned their cost of capital', hint: 'Check goodwill write-offs and segment returns after the deals.' },
  { key: 'q7', group: 'Management', label: 'Buybacks happened at sensible prices', hint: 'Buying back stock above intrinsic value destroys value just as surely as a bad acquisition.' },
  { key: 'q8', group: 'Management', label: 'Insiders own a meaningful stake', hint: 'Found in the proxy statement (DEF 14A).' },
  { key: 'q9', group: 'Management', label: 'Pay is tied to per-share value or ROIC, not size', hint: 'Compensation tied to revenue or EPS growth invites empire-building and buyback games.' },
  { key: 'q10', group: 'Industry', label: 'The industry is growing, or stable and rational', hint: 'Porter’s Five Forces: rivalry, new entrants, substitutes, supplier power, buyer power.' },
  { key: 'q11', group: 'Industry', label: 'Competition is not primarily on price', hint: 'Commodity price wars cap returns on capital no matter how good the operator is.' },
  { key: 'q12', group: 'Thesis risk', label: 'No single customer is more than ~10% of revenue', hint: 'Customer concentration is disclosed in the 10-K.' },
  { key: 'q13', group: 'Thesis risk', label: 'Regulation is not an existential threat', hint: 'Read Risk Factors, then discount the boilerplate and keep what is specific.' },
  { key: 'q14', group: 'Thesis risk', label: 'Debt is manageable through a downturn', hint: 'Check maturities against cash flow in a bad year, not this year.' },
  { key: 'q15', group: 'Thesis risk', label: 'I have written down what would make me sell', hint: 'A specific metric crossing a specific level.' },
]

export const MANUAL_FLAGS: ChecklistItem[] = [
  { key: 'f1', group: 'Reporting', label: 'Heavy reliance on "adjusted" metrics', hint: 'Compare adjusted EPS with GAAP EPS over five years. A persistent gap is a choice, not an accident.' },
  { key: 'f2', group: 'Reporting', label: '"One-time" charges that appear every year', hint: 'Restructuring every year is just the cost of doing business.' },
  { key: 'f3', group: 'Reporting', label: 'Auditor change, restatement or late filing', hint: 'Disclosed on Form 8-K and NT 10-K.' },
  { key: 'f4', group: 'Business', label: 'Customer concentration', hint: 'One customer leaving would change the thesis.' },
  { key: 'f5', group: 'Business', label: 'Key-person dependence', hint: 'The business is one founder’s relationships.' },
  { key: 'f6', group: 'Business', label: 'Serial acquirer with no organic growth', hint: 'Strip out acquisitions and see what is left.' },
  { key: 'f7', group: 'Balance sheet', label: 'Large debt maturities within 24 months', hint: 'Refinancing risk shows up in the debt footnote.' },
  { key: 'f8', group: 'Balance sheet', label: 'Off-balance-sheet or lease obligations not counted', hint: 'Add them to the bridge from enterprise value to equity value.' },
]

export const MISTAKES: { title: string; detail: string }[] = [
  {
    title: 'Terminal growth above the risk-free rate',
    detail: 'A company growing faster than the economy forever eventually becomes the economy. Keep terminal growth at or below long-run nominal GDP growth (2–3%).',
  },
  {
    title: 'Growth with no reinvestment behind it',
    detail: 'If you forecast 10% growth, the model must spend what 10% growth costs: reinvestment = g / ROIC.',
  },
  {
    title: 'Mismatching cash flows and discount rates',
    detail: 'FCFF goes with WACC, FCFE and dividends go with the cost of equity. Discounting FCFE at WACC counts the benefit of debt twice.',
  },
  {
    title: 'Book values in the WACC weights',
    detail: 'Use market cap for equity and market value of debt. Book equity is an accounting artifact, often decades out of date.',
  },
  {
    title: 'Forgetting other claims on the business',
    detail: 'Preferred stock, minority interest and leases all stand ahead of you. Subtract them, and use diluted shares, not basic.',
  },
  {
    title: 'Falling in love with one precise number',
    detail: '$16.97 is not more accurate than "$14–20", it is just more confident. Present and decide on a range.',
  },
  {
    title: 'Double-counting risk',
    detail: 'A high discount rate plus conservative forecasts plus a large margin of safety penalises the same risk three times, and nothing ever looks cheap.',
  },
]

export const CASHFLOW_MATCH: { flow: string; owner: string; rate: string; result: string }[] = [
  { flow: 'FCFF (before interest)', owner: 'Lenders and shareholders', rate: 'WACC', result: 'Enterprise value — subtract net debt to get equity value' },
  { flow: 'FCFE (after interest and debt payments)', owner: 'Shareholders only', rate: 'Cost of equity', result: 'Equity value directly' },
  { flow: 'Dividends', owner: 'Shareholders only', rate: 'Cost of equity', result: 'Equity value (Dividend Discount Model)' },
]
