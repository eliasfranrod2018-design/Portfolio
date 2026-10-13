'use client'

import { useEffect, useRef, useState } from 'react'
import type { FitNote } from '@/lib/fit'

export const money = (v: number) =>
  `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const money0 = (v: number) => `${v < 0 ? '−' : ''}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`
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
  id,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
  id?: string
}) {
  return (
    <div id={id} role="group" aria-label={label} className="pp-seg">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- cells that read as plain text until you click them ---------- */

function caretToEnd(el: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(el)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

/**
 * Text you can click and change in place. It renders exactly like the table's
 * plain text; the browser owns the text while you type, and the span is
 * re-keyed on each new value so React never fights the caret.
 */
export function EditText({
  value,
  onCommit,
  label,
  placeholder = '—',
  upper = false,
  className = '',
}: {
  value: string
  onCommit: (v: string) => void
  label: string
  placeholder?: string
  upper?: boolean
  className?: string
}) {
  const cancel = useRef(false)
  return (
    <span
      key={value}
      role="textbox"
      aria-label={label}
      tabIndex={0}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder}
      className={`pp-edit ${className}`}
      onFocus={(e) => caretToEnd(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          cancel.current = true
          e.currentTarget.blur()
        }
      }}
      onBlur={(e) => {
        const el = e.currentTarget
        let next = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
        if (upper) next = next.toUpperCase()
        if (cancel.current || next === value) {
          cancel.current = false
          el.textContent = value
          return
        }
        onCommit(next)
      }}
    >
      {value}
    </span>
  )
}

/** A number shown formatted (as $1,234.56, say) that turns into its raw value while you edit it. */
export function EditNum({
  value,
  onCommit,
  label,
  format = (v: number) => String(v),
  className = '',
}: {
  value: number
  onCommit: (v: number) => void
  label: string
  format?: (v: number) => string
  className?: string
}) {
  const cancel = useRef(false)
  const shown = Number.isFinite(value) ? format(value) : '—'
  return (
    <span
      key={shown}
      role="textbox"
      aria-label={label}
      tabIndex={0}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      inputMode="decimal"
      className={`pp-edit pp-edit-num ${className}`}
      onFocus={(e) => {
        e.currentTarget.textContent = Number.isFinite(value) ? String(Math.round(value * 1e6) / 1e6) : ''
        caretToEnd(e.currentTarget)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          cancel.current = true
          e.currentTarget.blur()
        }
      }}
      onBlur={(e) => {
        const el = e.currentTarget
        const n = parseFloat((el.textContent ?? '').replace(/[$,\s]/g, ''))
        if (cancel.current || !Number.isFinite(n) || n === value) {
          cancel.current = false
          el.textContent = shown
          return
        }
        onCommit(n)
      }}
    >
      {shown}
    </span>
  )
}

/**
 * A choice that reads as plain text: the label shows (and wraps) like any
 * other cell, and an invisible native select over it opens the browser's own
 * picker, so it works the same with a mouse, a keyboard or a finger.
 */
export function SelText<T extends string>({
  value,
  options,
  onChange,
  label,
  shown,
  className = '',
}: {
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
  /** What to show in place of the option's label, e.g. "Considering swap for". */
  shown?: string
  className?: string
}) {
  const current = options.find((o) => o.value === value)
  return (
    <span className={`pp-seltext ${className}`}>
      <span aria-hidden="true">{shown ?? current?.label ?? value}</span>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  )
}

type PopPos = { left: number; top?: number; bottom?: number }

/**
 * A small panel anchored under (or over) whatever wraps it. It follows its
 * anchor when the page scrolls, closes once the anchor leaves the screen, on
 * a click elsewhere or on Escape, and stays put while you work inside it.
 */
function usePop(width = 340) {
  const ref = useRef<HTMLSpanElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pos, setPos] = useState<PopPos | null>(null)
  const [pinned, setPinned] = useState(false)
  const open = pos !== null

  const measure = (): PopPos | null => {
    const r = ref.current?.getBoundingClientRect()
    if (!r || r.bottom < 0 || r.top > window.innerHeight) return null
    const w = Math.min(width, window.innerWidth - 16)
    const left = Math.max(8, Math.min(r.left - 8, window.innerWidth - w - 8))
    return window.innerHeight - r.bottom > 240 ? { left, top: r.bottom + 6 } : { left, bottom: window.innerHeight - r.top + 6 }
  }
  const hide = () => {
    setPos(null)
    setPinned(false)
  }
  const hoverIn = () => {
    if (timer.current) clearTimeout(timer.current)
    if (!open) setPos(measure())
  }
  const hoverOut = () => {
    if (!pinned) timer.current = setTimeout(() => setPos(null), 150)
  }
  const toggle = () => {
    if (open && pinned) hide()
    else {
      setPos(measure())
      setPinned(true)
    }
  }

  useEffect(() => {
    if (!open) return
    const follow = () => {
      const r = ref.current?.getBoundingClientRect()
      if (!r || r.bottom < 0 || r.top > window.innerHeight) {
        setPos(null)
        setPinned(false)
        return
      }
      setPos((p) => {
        if (!p) return p
        const w = Math.min(width, window.innerWidth - 16)
        const left = Math.max(8, Math.min(r.left - 8, window.innerWidth - w - 8))
        return p.top !== undefined ? { left, top: r.bottom + 6 } : { left, bottom: window.innerHeight - r.top + 6 }
      })
    }
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setPos(null)
        setPinned(false)
      }
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPos(null)
        setPinned(false)
      }
    }
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    window.addEventListener('pointerdown', away)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
      window.removeEventListener('pointerdown', away)
      window.removeEventListener('keydown', esc)
    }
  }, [open, width])

  return [ref, { pos, open, pin: () => setPinned(true), hoverIn, hoverOut, toggle }] as const
}

/**
 * A ticker with a dot for how it fits the portfolio. Point at it (or tap it)
 * and a note opens just under it: how it moves with what you own, whether it
 * would help, and the settings that do not have a column of their own.
 */
export function TickerNote({
  ticker,
  notes,
  extra,
  href,
  children,
}: {
  ticker: string
  notes: { note: FitNote; prefix?: string }[]
  extra?: string[]
  href: string
  /** Settings shown at the foot of the note, such as shares or sector. */
  children?: React.ReactNode
}) {
  const [ref, pop] = usePop()
  const main = notes[0]?.note
  return (
    <span ref={ref} className="pp-tkw" onMouseEnter={pop.hoverIn} onMouseLeave={pop.hoverOut}>
      <button type="button" className="pp-tkbtn" aria-expanded={pop.open} onClick={pop.toggle}>
        {ticker}
        {main && <i className={`pp-dot pp-dot-${main.verdict}`} aria-hidden="true" />}
      </button>
      {pop.pos && (
        <span
          className="pp-note-pop"
          role="dialog"
          aria-label={`${ticker} details`}
          style={{ left: pop.pos.left, top: pop.pos.top, bottom: pop.pos.bottom }}
          onPointerDown={pop.pin}
        >
          <span className="pp-pop-head">{ticker}</span>
          {notes.map(({ note, prefix }, i) => (
            <span key={i} className="pp-pop-line">
              <span className={`pp-chip pp-chip-${note.verdict}`}>{prefix ? `${prefix} · ${note.label}` : note.label}</span>
              <span>{note.text}</span>
            </span>
          ))}
          {extra?.map((x, i) => (
            <span key={`x${i}`} className="pp-pop-extra">{x}</span>
          ))}
          {children && <span className="pp-pop-set">{children}</span>}
          <a className="pp-pop-link" href={href} target="_blank" rel="noreferrer">
            {ticker} on stockanalysis.com ↗
          </a>
        </span>
      )}
    </span>
  )
}

/** A piece of text that opens a panel when clicked, for controls that should stay out of sight. */
export function TextPop({ label, title, children }: { label: string; title?: string; children: React.ReactNode }) {
  const [ref, pop] = usePop(380)
  return (
    <span ref={ref} className="pp-tkw">
      <button type="button" className="pp-textbtn" title={title} aria-expanded={pop.open} onClick={pop.toggle}>
        {label}
      </button>
      {pop.pos && (
        <span
          className="pp-note-pop pp-panel-pop"
          role="dialog"
          aria-label={label}
          style={{ left: pop.pos.left, top: pop.pos.top, bottom: pop.pos.bottom }}
          onPointerDown={pop.pin}
        >
          {children}
        </span>
      )}
    </span>
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
