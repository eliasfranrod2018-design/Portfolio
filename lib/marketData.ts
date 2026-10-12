/**
 * Market data for the plan. Two sources, merged per ticker:
 *
 *  1. market-data.json, written by scripts/fetch-market-data.mjs when the site
 *     is built. The GitHub Pages workflow rebuilds on a schedule through the
 *     trading day, so these prices are at most about an hour old. It covers
 *     every ticker in data/tickers.json.
 *  2. Twelve Data, called from the browser with your own free API key, for
 *     tickers you added that the feed does not carry yet. Results are cached
 *     in localStorage for a few hours to stay inside the free tier.
 */

export interface Series {
  ticker: string
  name?: string
  price: number
  prevClose?: number
  currency?: string
  /** When the price was observed, ISO. */
  asOf: string
  /** Daily closes, oldest first, as yyyy-mm-dd → close. */
  dates: string[]
  closes: number[]
  source: 'feed' | 'twelvedata'
}

export interface Feed {
  generatedAt: string | null
  source: string
  series: Record<string, Series>
  failed: string[]
}

export const EMPTY_FEED: Feed = { generatedAt: null, source: '', series: {}, failed: [] }

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export async function loadFeed(): Promise<Feed> {
  const res = await fetch(`${BASE}/market-data.json`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`market-data.json: HTTP ${res.status}`)
  const raw = (await res.json()) as {
    generatedAt?: string
    source?: string
    failed?: string[]
    quotes?: Record<string, Omit<Series, 'ticker' | 'source'>>
  }
  const series: Record<string, Series> = {}
  for (const [ticker, q] of Object.entries(raw.quotes ?? {})) {
    if (q && Number(q.price) > 0) series[ticker] = { ...q, ticker, source: 'feed' }
  }
  return { generatedAt: raw.generatedAt ?? null, source: raw.source ?? '', series, failed: raw.failed ?? [] }
}

/* ---------------- Twelve Data (optional, from the browser) ---------------- */

const KEY_STORE = 'portfolio_twelvedata_key_v1'
const CACHE_STORE = 'portfolio_twelvedata_cache_v1'
const CACHE_HOURS = 4
/** The free tier allows 8 credits a minute; one ticker costs one credit. */
export const TWELVE_DATA_BATCH = 8

export function readApiKey(): string {
  try {
    return window.localStorage.getItem(KEY_STORE) ?? ''
  } catch {
    return ''
  }
}

export function writeApiKey(key: string) {
  try {
    if (key) window.localStorage.setItem(KEY_STORE, key)
    else window.localStorage.removeItem(KEY_STORE)
  } catch {
    /* private mode: the key works for this visit only */
  }
}

export function readCache(): Record<string, Series> {
  try {
    const raw = JSON.parse(window.localStorage.getItem(CACHE_STORE) ?? '{}') as Record<string, Series>
    const fresh: Record<string, Series> = {}
    const cutoff = Date.now() - CACHE_HOURS * 3600_000
    for (const [t, s] of Object.entries(raw)) if (Date.parse(s.asOf) > cutoff) fresh[t] = s
    return fresh
  } catch {
    return {}
  }
}

function writeCache(next: Record<string, Series>) {
  try {
    window.localStorage.setItem(CACHE_STORE, JSON.stringify(next))
  } catch {
    /* quota: the data still shows, it just is not kept */
  }
}

interface TdSeries {
  status?: string
  message?: string
  meta?: { symbol?: string; currency?: string }
  values?: { datetime: string; close: string }[]
}

/**
 * One year of daily closes for up to TWELVE_DATA_BATCH tickers. Returns what
 * loaded and an error line per ticker that did not.
 */
export async function fetchTwelveData(
  tickers: string[],
  key: string
): Promise<{ loaded: Record<string, Series>; errors: string[] }> {
  const batch = tickers.slice(0, TWELVE_DATA_BATCH)
  const url =
    'https://api.twelvedata.com/time_series?interval=1day&outputsize=260&order=asc' +
    `&symbol=${encodeURIComponent(batch.join(','))}&apikey=${encodeURIComponent(key)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Twelve Data: HTTP ${res.status}`)
  const body = (await res.json()) as TdSeries | Record<string, TdSeries>
  /* One symbol answers with the series itself; several answer keyed by symbol. */
  const bySymbol: Record<string, TdSeries> =
    batch.length === 1 ? { [batch[0]]: body as TdSeries } : (body as Record<string, TdSeries>)
  if (batch.length > 1 && (body as TdSeries).status === 'error') {
    throw new Error(`Twelve Data: ${(body as TdSeries).message ?? 'request refused'}`)
  }

  const loaded: Record<string, Series> = {}
  const errors: string[] = []
  const now = new Date().toISOString()
  for (const t of batch) {
    const s = bySymbol[t]
    if (!s || s.status === 'error' || !s.values?.length) {
      errors.push(`${t}: ${s?.message ?? 'no data'}`)
      continue
    }
    const rows = s.values
      .map((v) => ({ d: v.datetime.slice(0, 10), c: Number(v.close) }))
      .filter((v) => v.c > 0)
      .sort((a, b) => a.d.localeCompare(b.d))
    if (!rows.length) {
      errors.push(`${t}: no prices`)
      continue
    }
    loaded[t] = {
      ticker: t,
      price: rows[rows.length - 1].c,
      prevClose: rows.length > 1 ? rows[rows.length - 2].c : undefined,
      currency: s.meta?.currency,
      asOf: now,
      dates: rows.map((r) => r.d),
      closes: rows.map((r) => r.c),
      source: 'twelvedata',
    }
  }
  writeCache({ ...readCache(), ...loaded })
  return { loaded, errors }
}
