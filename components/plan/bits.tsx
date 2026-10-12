'use client'

import { useEffect, useRef, useState } from 'react'
import type { FitNote } from '@/lib/fit'

export const money = (v: number) =>
  `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`
export const signed = (v: number, f: (x: number) => string) => (v > 0 ? '+' : v < 0 ? '−' : '') + f(Math.abs(v))
export const tone = (v: number) => (v > 0 ? 'pp-pos' : v < 0 ? 'pp-neg' : '')

/** stockanalysis.com's page for a ticker: funds live under /etf/. */
export function researchUrl(ticker: string, sector: string) {
  const t = ticker.toLowerCase().replace('.', '-')
  return sector === 'ETF / fund' ? `https://stockanalysis.com/etf/${t}/` : `https://stockanalysis.com/stocks/${t}/`
}

/** The little note that sits over a ticker: a verdict chip and one or two sentences. */
export function FitLine({ note, prefix }: { note: FitNote; prefix?: string }) {
  return (
    <div className="pp-fit">
      <span className={`pp-chip pp-chip-${note.verdict}`}>
        {prefix ? `${prefix} · ` : ''}
        {note.label}
      </span>
      <span>{note.text}</span>
    </div>
  )
}

/** A compact number input that keeps what you type until you leave the field. */
export function Num({
  value,
  onChange,
  money: isMoney = false,
  width = '4.5rem',
  label,
}: {
  value: number
  onChange: (v: number) => void
  money?: boolean
  width?: string
  label: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const input = (
    <input
      aria-label={label}
      type="number"
      inputMode="decimal"
      step="any"
      value={draft ?? (Number.isFinite(value) ? String(value) : '')}
      onChange={(e) => {
        setDraft(e.target.value)
        const n = parseFloat(e.target.value)
        onChange(Number.isFinite(n) ? n : 0)
      }}
      onBlur={() => setDraft(null)}
      className="pp-in pp-r"
      style={{ width }}
    />
  )
  if (!isMoney) return input
  return (
    <span className="pp-money">
      <span>$</span>
      {input}
    </span>
  )
}

/** A compact text input that commits on blur or Enter (tickers trigger lookups, so not on every key). */
export function Txt({
  value,
  onCommit,
  placeholder,
  width = '4.5rem',
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
      className="pp-in"
      style={{ width }}
    />
  )
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  className = '',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)} className={`pp-sel-in ${className}`}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export const CHAIN_OPTS = [
  { value: 'ai', label: 'AI data center chain' },
  { value: 'other', label: 'Outside the chain' },
] as const

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
    <div role="group" aria-label={label} className="pp-seg">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Width of an element, kept current as it resizes. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** A hover tooltip that stays inside its chart. */
export function useTip() {
  const box = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<{ left?: number; right?: number; y: number; lines: string[] } | null>(null)
  const show = (lines: string[]) => (e: React.MouseEvent) => {
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    const x = e.clientX - r.left
    const flip = x > r.width * 0.6
    setTip({ left: flip ? undefined : x + 12, right: flip ? r.width - x + 12 : undefined, y: Math.max(0, e.clientY - r.top - 10), lines })
  }
  const hide = () => setTip(null)
  const node = tip ? (
    <div className="pp-tip" style={{ left: tip.left, right: tip.right, top: tip.y }}>
      {tip.lines.map((l, i) => (
        <div key={i} className={i === 0 ? 'pp-tk' : ''}>
          {l}
        </div>
      ))}
    </div>
  ) : null
  return { box, show, hide, node }
}
