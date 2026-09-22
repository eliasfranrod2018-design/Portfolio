'use client'

import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import type { Health } from '@/lib/valuation'

/* ---------------- layout ---------------- */

export function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title?: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-5">
      {(title || right) && (
        <header className="flex items-start justify-between gap-3 mb-3">
          <div>
            {title && <h2 className="text-white font-bold">{title}</h2>}
            {subtitle && <p className="text-zinc-500 text-xs mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

export function SectionTitle({ n, children }: { n?: number; children: React.ReactNode }) {
  return (
    <h2 className="text-white font-bold text-lg flex items-center gap-2">
      {n !== undefined && (
        <span className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-bold grid place-items-center">
          {n}
        </span>
      )}
      {children}
    </h2>
  )
}

/* ---------------- teaching blocks ---------------- */

export function Explainer({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-zinc-800 rounded-xl bg-zinc-950/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
      >
        <Info size={14} className="text-blue-400 shrink-0" />
        <span className="flex-1 font-medium">{title}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-3 pb-3 pt-1 text-sm text-zinc-400 space-y-2 leading-relaxed">{children}</div>}
    </div>
  )
}

export function Formula({ children }: { children: React.ReactNode }) {
  /* Multi-line formulas are aligned by hand, so they scroll rather than wrap. */
  const multiline = typeof children === 'string' && children.includes('\n')
  return (
    <code
      className={`block bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-[13px] text-emerald-300 font-mono ${
        multiline ? 'whitespace-pre overflow-x-auto' : 'whitespace-pre-wrap break-words'
      }`}
    >
      {children}
    </code>
  )
}

export function Definition({
  term,
  textbook,
  plain,
  formula,
  purpose,
}: {
  term: string
  textbook: string
  plain: string
  formula?: string
  purpose: string
}) {
  return (
    <div className="border border-zinc-800 rounded-xl p-3 bg-zinc-950/60 space-y-2">
      <p className="text-white font-semibold text-sm">{term}</p>
      <p className="text-xs text-zinc-400">
        <span className="text-zinc-500 uppercase tracking-wide text-[10px] mr-1.5">Textbook</span>
        {textbook}
      </p>
      <p className="text-xs text-zinc-300">
        <span className="text-zinc-500 uppercase tracking-wide text-[10px] mr-1.5">Plain English</span>
        {plain}
      </p>
      {formula && <Formula>{formula}</Formula>}
      <p className="text-xs text-blue-300/90">
        <span className="text-zinc-500 uppercase tracking-wide text-[10px] mr-1.5">Why it matters</span>
        {purpose}
      </p>
    </div>
  )
}

/* ---------------- indicators ---------------- */

const HEALTH_STYLE: Record<Health, string> = {
  good: 'bg-green-500/15 text-green-400 border-green-500/30',
  ok: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  bad: 'bg-red-500/15 text-red-400 border-red-500/30',
  na: 'bg-zinc-800 text-zinc-500 border-zinc-700',
}

export function HealthPill({ health, children }: { health: Health; children: React.ReactNode }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-lg border text-xs font-semibold ${HEALTH_STYLE[health]}`}>
      {children}
    </span>
  )
}

export function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'good' | 'bad' | 'accent'
}) {
  const toneClass =
    tone === 'good' ? 'text-green-400' : tone === 'bad' ? 'text-red-400' : tone === 'accent' ? 'text-blue-400' : 'text-white'
  return (
    <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2.5">
      <p className="text-zinc-500 text-[11px] uppercase tracking-wide">{label}</p>
      <p className={`font-bold text-lg leading-tight ${toneClass}`}>{value}</p>
      {hint && <p className="text-zinc-500 text-[11px] mt-0.5">{hint}</p>}
    </div>
  )
}

/* ---------------- inputs ---------------- */

function toRaw(value: number, percent: boolean) {
  const v = percent ? value * 100 : value
  if (!Number.isFinite(v)) return ''
  return String(Math.round(v * 1e6) / 1e6)
}

export function NumField({
  label,
  value,
  onChange,
  percent = false,
  suffix,
  hint,
  step,
  compact = false,
}: {
  label?: string
  value: number
  onChange: (v: number) => void
  percent?: boolean
  suffix?: string
  hint?: string
  step?: number
  compact?: boolean
}) {
  /**
   * While the field has focus the draft holds exactly what was typed (so "1.",
   * "-" and "0.0" survive); on blur it clears and the field shows the canonical
   * value again, which is also how programmatic updates get picked up.
   */
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? toRaw(value, percent)

  function handle(next: string) {
    setDraft(next)
    const parsed = parseFloat(next)
    onChange(Number.isFinite(parsed) ? (percent ? parsed / 100 : parsed) : 0)
  }

  return (
    <label className="block">
      {label && <span className="block text-zinc-400 text-xs mb-1">{label}</span>}
      <span className="relative block">
        <input
          type="number"
          inputMode="decimal"
          step={step ?? (percent ? 0.1 : 'any')}
          value={shown}
          onChange={(e) => handle(e.target.value)}
          onBlur={() => setDraft(null)}
          className={`w-full bg-zinc-950 text-white rounded-xl border border-zinc-700 focus:outline-none focus:border-blue-500 transition-colors ${
            compact ? 'px-2 py-1.5 text-sm' : 'px-3 py-2.5'
          } ${percent || suffix ? 'pr-8' : ''}`}
        />
        {(percent || suffix) && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs pointer-events-none">
            {percent ? '%' : suffix}
          </span>
        )}
      </span>
      {hint && <span className="block text-zinc-600 text-[11px] mt-1">{hint}</span>}
    </label>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  compact = false,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  compact?: boolean
}) {
  return (
    <label className="block">
      {label && <span className="block text-zinc-400 text-xs mb-1">{label}</span>}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-zinc-950 text-white rounded-xl border border-zinc-700 focus:outline-none focus:border-blue-500 transition-colors ${
          compact ? 'px-2 py-1.5 text-sm' : 'px-3 py-2.5'
        }`}
      />
    </label>
  )
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <label className="block">
      {label && <span className="block text-zinc-400 text-xs mb-1">{label}</span>}
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-950 text-white rounded-xl border border-zinc-700 focus:outline-none focus:border-blue-500 px-3 py-2.5 text-sm leading-relaxed transition-colors"
      />
    </label>
  )
}

export function Toggle({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="inline-flex bg-zinc-950 border border-zinc-800 rounded-xl p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            value === o.value ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function CheckRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <label className="flex gap-3 items-start cursor-pointer group py-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 accent-blue-600 shrink-0"
      />
      <span className="flex-1">
        <span className={`block text-sm ${checked ? 'text-white' : 'text-zinc-300'}`}>{label}</span>
        {hint && <span className="block text-zinc-600 text-xs mt-0.5">{hint}</span>}
      </span>
    </label>
  )
}

export function Button({
  onClick,
  children,
  variant = 'ghost',
  size = 'md',
}: {
  onClick: () => void
  children: React.ReactNode
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}) {
  const base =
    variant === 'primary'
      ? 'bg-blue-600 hover:bg-blue-500 text-white'
      : variant === 'danger'
        ? 'bg-zinc-800 hover:bg-red-600/20 text-zinc-300 hover:text-red-400'
        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} rounded-xl font-medium transition-colors ${
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'
      }`}
    >
      {children}
    </button>
  )
}
