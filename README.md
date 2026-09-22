# Stock Valuation Workbench

A single-page tool for working through an equity valuation end to end: understand the
business, read the quality metrics, set a required rate of return, build a discounted
cash flow, cross-check it against peer multiples, and turn the result into a buy price
with a margin of safety.

It teaches while you use it. Every input carries a hint saying where to find the figure
in a 10-K, every formula is shown next to the number it produces, and every term has a
textbook definition, a plain-English translation and a note on why it matters.

Nothing is fetched and nothing is sent anywhere: the app computes exactly what you type,
in your browser. Worksheets are stored in `localStorage` and can be exported as JSON.

## The eight tabs

| Tab | What it covers |
| --- | --- |
| **Walkthrough** | The ten steps in order, each with its purpose, how to do it and what to watch out for. Plus the cash-flow/discount-rate matching table and the list of mistakes that quietly ruin a valuation. |
| **Business** (step 1) | A fifteen-item quality checklist — business model, moat, management as capital allocators, industry structure, thesis risk — and space to write the thesis and the sell triggers down. |
| **Inputs** (step 2) | Every raw figure from the filings, entered once. A derived panel (market cap, EV, EBITDA, NOPAT, invested capital, FCF) doubles as a units sanity check. |
| **Metrics** (step 3) | Revenue CAGR, margins, ROIC, ROE, FCF and its conversion, leverage, coverage, dilution, P/E, EV/EBITDA, FCF yield and PEG — each with formula, plain English, a healthy range and a colour verdict. Then the ROIC-vs-WACC spread and the red flags. |
| **Rate & WACC** (steps 4–5) | CAPM with a bottom-up relevered beta, a revenue-weighted country risk premium, size and company-specific premiums, your personal hurdle, the Gordon sanity check, and the WACC built from market or target weights. |
| **DCF** (steps 6–7) | An editable five- or ten-year forecast, reinvestment driven either by ROIC or by CapEx/D&A/working capital, terminal value as a growing perpetuity or an exit multiple, the full bridge to value per share, a WACC × terminal-growth sensitivity grid, and a reverse DCF. |
| **Comps & verdict** (steps 8–9) | Peer multiples with medians, four implied per-share values, a DCF/comps blend, probability-weighted scenarios, margin of safety and a buy / fairly valued / expensive verdict. |
| **Glossary** | Every term in three registers, plus a one-page formula sheet. |

## The worked example

The **Example** button in the header loads Company XYZ — the textbook case of a $1,000m
revenue business growing 8% for five years then 3% forever, at a 15% EBIT margin, 20%
ROIC and a 9% WACC. It reproduces the published answer exactly: **$16.97 per share**,
terminal value at 83% of enterprise value, and the same sensitivity grid ($21.30 at an 8%
WACC, $13.89 at 10%). That makes it a regression check on the engine as well as a way to
see how the pieces fit together.

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

```bash
npm run build   # production build
npm run lint    # eslint
npx tsc --noEmit   # typecheck
```

## How the code is laid out

```
lib/valuation.ts   the engine — every formula, with no UI in it
lib/guide.ts       the teaching content — walkthrough, glossary, checklists
components/        the eight tabs and the shared inputs
app/page.tsx       worksheet state, persistence, saved companies, export
```

`lib/valuation.ts` is deliberately free of React: it takes a `Worksheet` and returns a
`Calc`, so the maths can be tested or reused on its own.

Conventions used throughout: money figures are in **millions**, share counts are in
**millions**, and rates are decimals (`0.08` means 8%). Share price is the only per-share
input.

## A caveat on the defaults

The risk-free rate and equity risk premium shipped as defaults are starting points from
mid-2026, and the app flags them as such. Both move. Look up the current 10-year Treasury
yield and a current implied ERP before you trust any answer — every valuation here moves
with them.

## What this is not

This is a calculator for your own analysis, not investment advice, not a data feed and
not a substitute for reading the filings. Every number it shows is a consequence of an
assumption you made.
