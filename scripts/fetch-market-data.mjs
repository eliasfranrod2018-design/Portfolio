/**
 * Writes public/market-data.json: the latest price and a year of daily closes
 * for every ticker in data/tickers.json, from Yahoo Finance's public chart
 * endpoint. The portfolio plan reads it for live values and for the
 * correlations behind its fit notes.
 *
 * The GitHub Pages workflow runs this before each build, and builds on a
 * schedule through the trading day, so the deployed prices stay current
 * without any server. It never fails the build: a ticker that does not load
 * is listed under "failed" and the app falls back to the price you entered.
 *
 *   node scripts/fetch-market-data.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tickers = [...new Set(JSON.parse(readFileSync(join(root, 'data/tickers.json'), 'utf8')).map((t) => String(t).trim().toUpperCase()))].filter(Boolean)

const HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Yahoo spells share classes with a dash: BRK.B is BRK-B. */
const yahooSymbol = (t) => t.replace(/\./g, '-')

async function fetchOne(ticker) {
  let lastError = 'no response'
  for (const host of HOSTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = `${host}/v8/finance/chart/${encodeURIComponent(yahooSymbol(ticker))}?range=1y&interval=1d&includePrePost=false`
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (portfolio-plan market data)' } })
        if (res.status === 429) {
          lastError = 'rate limited'
          await sleep(2000 * (attempt + 1))
          continue
        }
        if (!res.ok) {
          lastError = `HTTP ${res.status}`
          break
        }
        const body = await res.json()
        const r = body?.chart?.result?.[0]
        if (!r) {
          lastError = body?.chart?.error?.description ?? 'empty result'
          break
        }
        return parse(r)
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e)
      }
    }
  }
  throw new Error(lastError)
}

export function parse(r) {
  const meta = r.meta ?? {}
  const ts = r.timestamp ?? []
  const close = r.indicators?.quote?.[0]?.close ?? []
  const dates = []
  const closes = []
  for (let i = 0; i < ts.length; i++) {
    const c = close[i]
    if (typeof c !== 'number' || !(c > 0)) continue
    const d = new Date((ts[i] + (meta.gmtoffset ?? 0)) * 1000).toISOString().slice(0, 10)
    /* The live bar can repeat the last date; keep the newest value. */
    if (dates[dates.length - 1] === d) closes[closes.length - 1] = round(c)
    else {
      dates.push(d)
      closes.push(round(c))
    }
  }
  const price = Number(meta.regularMarketPrice) || closes[closes.length - 1]
  if (!(price > 0)) throw new Error('no price')
  if (dates.length && closes.length) closes[closes.length - 1] = round(price)
  return {
    name: meta.longName ?? meta.shortName ?? undefined,
    price: round(price),
    prevClose: Number(meta.previousClose ?? meta.chartPreviousClose) || (closes.length > 1 ? closes[closes.length - 2] : undefined),
    currency: meta.currency,
    asOf: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
    dates,
    closes,
  }
}

const round = (x) => Math.round(x * 10000) / 10000

async function main() {
  const quotes = {}
  const failed = []
  /* A few at a time, to stay polite to the endpoint. */
  for (let i = 0; i < tickers.length; i += 4) {
    const batch = tickers.slice(i, i + 4)
    const results = await Promise.allSettled(batch.map(fetchOne))
    results.forEach((res, j) => {
      if (res.status === 'fulfilled') quotes[batch[j]] = res.value
      else {
        failed.push(batch[j])
        console.warn(`· ${batch[j]}: ${res.reason?.message ?? res.reason}`)
      }
    })
    await sleep(300)
  }
  const out = { generatedAt: new Date().toISOString(), source: 'Yahoo Finance', failed, quotes }
  mkdirSync(join(root, 'public'), { recursive: true })
  writeFileSync(join(root, 'public/market-data.json'), JSON.stringify(out))
  console.log(`· market data: ${Object.keys(quotes).length} loaded, ${failed.length} failed`)
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  main().catch((e) => {
    /* Never block a deploy on market data. */
    console.warn(`· market data skipped: ${e instanceof Error ? e.message : e}`)
  })
}
