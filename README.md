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

## Deploying

The app is a **static export**: `next build` writes plain HTML/CSS/JS to `out/`, with no
Node process in production. Anything that serves files can host it.

**GitHub Pages** is wired up already. Switch it on once in the repository: **Settings →
Pages → Build and deployment → Source: GitHub Actions** (the workflow's own token is not
allowed to do this). After that, pushing to `main` runs `.github/workflows/deploy.yml`,
which builds the export and publishes it, and the same workflow rebuilds on a schedule
through the trading day to refresh prices. The site lands at
`https://<user>.github.io/<repo>/`, and the portfolio plan at `…/<repo>/plan/`. The workflow passes the repository name to the build
as `NEXT_PUBLIC_BASE_PATH`, because a project site is served from a sub-path rather than
the domain root.

**Vercel, Netlify or Cloudflare Pages**: import the repository and accept the detected
Next.js defaults. They serve from the domain root, so leave `NEXT_PUBLIC_BASE_PATH`
unset. These are the route to a custom domain.

**Anywhere else**, including locally:

```bash
npm run build          # writes out/
npx http-server out    # or any static file server
```

## Portfolio plan (`/plan`)

A second page for the portfolio as a whole: what you hold, what you are looking at and
what you intend to do. It is laid out and styled after the original Portfolio plan
dashboard: the same sections, tables, charts, colors and spacing, in light and dark.

- **Click any value to change it**: name, cost, role, plan, rating and cash read as plain
  text until you click them. Possibles' name, group, sector, AI link, status and note work
  the same way.
- **Point at or tap a ticker** for its note: how it correlates with the rest of the
  portfolio, the holding it moves most like, its share of the portfolio's risk, and, for
  possibles and swaps, what it would do to portfolio volatility. The dot after a ticker
  is green when it diversifies and amber when it adds to what you already own. The same
  pop-up holds the settings without a column of their own (shares, price, sector, AI
  link, amount) and removes the ticker.
- **Plans per holding**: Keep, Sell, *Sell, buy…* or *Considering swap for…* plus a
  ticker. A swap target you have not looked at yet is added to Possibles.
- **Three scenarios**: Today; After planned moves (sells, swaps and possibles marked
  *Buy (planned)*); Full plan (adds every *Considering swap* and every *In full plan*
  name, including one stock per missing sector).
- **"Live prices, … ago."** in the summary line opens the price details and the plan
  controls: refresh, export, import, start over, the ticker list for the feed and the
  optional Twelve Data key.
- The correlation matrix for the picked scenario sits in the collapsed line under the
  reading guide.

Each ticker's pop-up links to its stockanalysis.com page for research. stockanalysis.com
has no public data API, so prices come from:

1. **The build-time feed.** `scripts/fetch-market-data.mjs` writes
   `public/market-data.json` — price and a year of daily closes from Yahoo Finance's
   public chart endpoint — for every ticker in `data/tickers.json`. The Pages workflow
   runs it before each build and rebuilds hourly through the US trading day, so the
   deployed prices are at most about an hour old. Add a ticker to `data/tickers.json` (the
   *Copy ticker list* button gives you the whole list) and push.
2. **Optionally, Twelve Data from the browser**, for tickers you just added: paste a free
   API key into the prices pop-up. The key stays in your browser.

The plan itself is stored in `localStorage`; Export / Import move it between devices.
Fonts are Inter and Source Serif 4, bundled with the site.

## How the code is laid out

```
lib/valuation.ts   the engine — every formula, with no UI in it
lib/guide.ts       the teaching content — walkthrough, glossary, checklists
components/        the eight tabs and the shared inputs
app/page.tsx       worksheet state, persistence, saved companies, export
lib/portfolio.ts   the portfolio plan: holdings, watchlist, scenarios, diversification
lib/fit.ts         correlations, volatility, risk share and the per-ticker fit notes
lib/marketData.ts  loading the price feed, and the optional Twelve Data fallback
components/plan/   the /plan page
scripts/fetch-market-data.mjs   writes public/market-data.json at build time
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
