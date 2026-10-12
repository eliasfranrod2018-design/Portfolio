'use client'

import { useState } from 'react'
import type { FitNote } from '@/lib/fit'

export const money = (v: number) =>
  `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const money0 = (v: number) => `${v < 0 ? '−' : ''}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`
export const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`
export const signed = (v: number, f: (x: number) => string) => (v > 0 ? '+' : v < 0 ? '−' : '') + f(Math.abs(v))
export const tone = (v: number) => (v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-zinc-400')

/** stockanalysis.com's page for a ticker: funds live under /etf/. */
export function researchUrl(ticker: string, sector: string) {
  const t = ticker.toLowerCase().replace('.', '-')
  return sector === 'ETF / fund' ? `https://stockanalysis.com/etf/${t}/` : `https://stockanalysis.com/stocks/${t}/`
}

const VERDICT_STYLE: Record<FitNote['verdict'], string> = {
  helps: 'bg-green-500/15 text-green-400 border-green-500/30',
  neutral: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  overlaps: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  unknown: 'bg-zinc-900 text-zinc-500 border-zinc-800',
}

/** The little note that sits over a ticker: a verdict chip and one or two sentences. */
export function FitLine({ note, prefix }: { note: FitNote; prefix?: string }) {
  return (
    <p className="text-[11px] leading-snug text-zinc-400 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <span className={`px-1.5 py-px rounded-md border text-[10px] font-semibold whitespace-nowrap ${VERDICT_STYLE[note.verdict]}`}>
        {prefix ? `${prefix} · ` : ''}
        {note.label}
      </span>
      <span>{note.text}</span>
    </p>
  )
}

/** A compact number input that keeps what you type until you leave the field. */
export function Num({
  value,
  onChange,
  prefix,
  width = 'w-20',
  step,
  label,
}: {
  value: number
  onChange: (v: number) => void
  prefix?: string
  width?: string
  step?: number
  label: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <span className={`relative inline-block ${width}`}>
      {prefix && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs pointer-events-none">{prefix}</span>}
      <input
        aria-label={label}
        type="number"
        inputMode="decimal"
        step={step ?? 'any'}
        value={draft ?? (Number.isFinite(value) ? String(value) : '')}
        onChange={(e) => {
          setDraft(e.target.value)
          const n = parseFloat(e.target.value)
          onChange(Number.isFinite(n) ? n : 0)
        }}
        onBlur={() => setDraft(null)}
        className={`w-full bg-zinc-950 text-white text-right rounded-lg border border-zinc-700 focus:outline-none focus:border-blue-500 py-1 pr-1.5 text-sm tabular-nums ${prefix ? 'pl-4' : 'pl-1.5'}`}
      />
    </span>
  )
}

/** A compact text input that commits on blur or Enter (used for tickers, which trigger lookups). */
export function Txt({
  value,
  onCommit,
  placeholder,
  width = 'w-20',
  upper = false,
  label,
}: {
  value: string
  onCommit: (v: string) => void
  placeholder?: string
  width?: string
  upper?: boolean
  label: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft !== null && draft !== value) onCommit(upper ? draft.trim().toUpperCase() : draft)
    setDraft(null)
  }
  return (
    <input
      aria-label={label}
      type="text"
      value={draft ?? value}
      placeholder={placeholder}
      onChange={(e) => setDraft(upper ? e.target.value.toUpperCase() : e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className={`${width} bg-zinc-950 text-white rounded-lg border border-zinc-700 focus:outline-none focus:border-blue-500 px-1.5 py-1 text-sm`}
    />
  )
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  width = 'max-w-[9.5rem]',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
  width?: string
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`bg-zinc-950 text-white rounded-lg border border-zinc-700 focus:outline-none focus:border-blue-500 px-1.5 py-1 text-sm ${width}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-xl text-xs border transition-colors ${
            value === o.value
              ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 font-medium'
              : 'text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
