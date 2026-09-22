'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Download, FilePlus2, FolderOpen, Save, Trash2, Wand2 } from 'lucide-react'
import {
  blankWorksheet,
  computeAll,
  exampleWorksheet,
  fmtPct,
  fmtShare,
  type Worksheet,
} from '@/lib/valuation'
import { Button } from '@/components/Ui'
import GuideTab from '@/components/GuideTab'
import BusinessTab from '@/components/BusinessTab'
import InputsTab from '@/components/InputsTab'
import MetricsTab from '@/components/MetricsTab'
import RateTab from '@/components/RateTab'
import DcfTab from '@/components/DcfTab'
import CompsTab from '@/components/CompsTab'
import GlossaryTab from '@/components/GlossaryTab'
import type { TabId } from '@/components/types'

const CURRENT_KEY = 'valuation_current_v1'
const SAVED_KEY = 'valuation_saved_v1'

const TABS: { id: TabId; label: string; step?: string }[] = [
  { id: 'guide', label: 'Walkthrough' },
  { id: 'business', label: 'Business', step: '1' },
  { id: 'inputs', label: 'Inputs', step: '2' },
  { id: 'metrics', label: 'Metrics', step: '3' },
  { id: 'rate', label: 'Rate & WACC', step: '4-5' },
  { id: 'dcf', label: 'DCF', step: '6-7' },
  { id: 'comps', label: 'Comps & verdict', step: '8-9' },
  { id: 'glossary', label: 'Glossary' },
]

interface SavedEntry {
  id: string
  name: string
  savedAt: string
  ws: Worksheet
}

/** Older saved worksheets may miss fields added later — fill them from the defaults. */
function hydrate(raw: unknown): Worksheet {
  const blank = blankWorksheet()
  if (!raw || typeof raw !== 'object') return blank
  const w = raw as Partial<Worksheet>
  return {
    v: 1,
    company: { ...blank.company, ...(w.company ?? {}) },
    risk: { ...blank.risk, ...(w.risk ?? {}) },
    wacc: { ...blank.wacc, ...(w.wacc ?? {}) },
    dcf: { ...blank.dcf, ...(w.dcf ?? {}), rows: w.dcf?.rows?.length ? w.dcf.rows : blank.dcf.rows },
    peers: Array.isArray(w.peers) ? w.peers : [],
    decision: { ...blank.decision, ...(w.decision ?? {}) },
    quality: w.quality ?? {},
    flags: w.flags ?? {},
    notes: w.notes ?? {},
  }
}

function readCurrent(): Worksheet {
  try {
    const cur = window.localStorage.getItem(CURRENT_KEY)
    return cur ? hydrate(JSON.parse(cur)) : blankWorksheet()
  } catch {
    return blankWorksheet()
  }
}

function readSaved(): SavedEntry[] {
  try {
    const list = window.localStorage.getItem(SAVED_KEY)
    return list ? (JSON.parse(list) as SavedEntry[]) : []
  } catch {
    return []
  }
}

/* The workbench reads localStorage as it mounts, so it must not run on the
 * server. This subscribes to nothing and simply reports false on the server
 * and true on the client, which holds the workbench back until hydration. */
const noopSubscribe = () => () => {}

export default function Page() {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
  if (!mounted) return <Shell />
  return <Workbench />
}

function Shell() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <p className="text-zinc-600 text-sm">Loading worksheet…</p>
    </div>
  )
}

function Workbench() {
  const [ws, setWs] = useState<Worksheet>(readCurrent)
  const [saved, setSaved] = useState<SavedEntry[]>(readSaved)
  const [tab, setTab] = useState<TabId>('guide')
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.setItem(CURRENT_KEY, JSON.stringify(ws))
    } catch {
      /* quota or private mode: the worksheet still works, it just will not persist */
    }
  }, [ws])

  const calc = useMemo(() => computeAll(ws), [ws])

  function set<K extends keyof Worksheet>(key: K, part: Partial<Worksheet[K]>) {
    setWs((prev) => ({ ...prev, [key]: { ...(prev[key] as object), ...(part as object) } as Worksheet[K] }))
  }

  function persistSaved(next: SavedEntry[]) {
    setSaved(next)
    try {
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  function saveCurrent() {
    const name = (ws.company.ticker || ws.company.name || '').trim()
    if (!name) {
      alert('Give the company a name or ticker on the Inputs tab first.')
      return
    }
    const entry: SavedEntry = { id: name.toLowerCase(), name, savedAt: new Date().toISOString(), ws }
    persistSaved([entry, ...saved.filter((s) => s.id !== entry.id)])
  }

  function loadSaved(entry: SavedEntry) {
    setWs(hydrate(entry.ws))
    setShowSaved(false)
    setTab('inputs')
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(ws, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(ws.company.ticker || 'valuation').toLowerCase()}-valuation.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const d = calc.decision
  const verdictChip =
    d.verdict === 'buy'
      ? 'bg-green-500/15 text-green-400 border-green-500/30'
      : d.verdict === 'watch'
        ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
        : d.verdict === 'expensive'
          ? 'bg-red-500/15 text-red-400 border-red-500/30'
          : 'bg-zinc-800 text-zinc-400 border-zinc-700'

  const tabProps = { ws, calc, set, setWs, goTo: setTab }

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-10">
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-20">
        <div className="px-4 pt-4 pb-3 max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-white font-bold text-lg">
                {ws.company.name || 'Stock valuation workbench'}
                {ws.company.ticker && <span className="text-zinc-500 font-normal ml-2">{ws.company.ticker}</span>}
              </h1>
              <p className="text-zinc-500 text-xs">
                Quality, required return, intrinsic value and margin of safety — in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => { setWs(blankWorksheet()); setTab('inputs') }}>
                <FilePlus2 size={13} className="inline mr-1" />New
              </Button>
              <Button size="sm" onClick={() => { setWs(exampleWorksheet()); setTab('dcf') }}>
                <Wand2 size={13} className="inline mr-1" />Example
              </Button>
              <Button size="sm" onClick={saveCurrent}>
                <Save size={13} className="inline mr-1" />Save
              </Button>
              <Button size="sm" onClick={() => setShowSaved((s) => !s)}>
                <FolderOpen size={13} className="inline mr-1" />Saved ({saved.length})
              </Button>
              <Button size="sm" onClick={exportJson}>
                <Download size={13} className="inline mr-1" />Export
              </Button>
            </div>
          </div>

          {showSaved && (
            <div className="mt-3 border border-zinc-800 rounded-xl bg-zinc-950 p-2 space-y-1">
              {saved.length === 0 && <p className="text-zinc-600 text-sm px-2 py-1.5">Nothing saved yet.</p>}
              {saved.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadSaved(s)}
                    className="flex-1 text-left px-2 py-1.5 rounded-lg hover:bg-zinc-900 text-sm text-zinc-300 hover:text-white transition-colors"
                  >
                    {s.name}
                    <span className="text-zinc-600 text-xs ml-2">{new Date(s.savedAt).toLocaleDateString()}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => persistSaved(saved.filter((x) => x.id !== s.id))}
                    className="text-zinc-600 hover:text-red-400 p-1.5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
            <Chip label="Price" value={fmtShare(ws.company.price || null)} />
            <Chip label="DCF" value={fmtShare(d.dcfValue)} />
            <Chip label="Fair value" value={fmtShare(d.anchor)} />
            <Chip label={`Max buy (${fmtPct(ws.decision.mos, 0)} MOS)`} value={fmtShare(d.maxBuyPrice)} />
            <span className={`px-2 py-1 rounded-lg border font-semibold ${verdictChip}`}>
              {d.verdict === 'buy'
                ? 'Cheap enough'
                : d.verdict === 'watch'
                  ? 'Fairly valued'
                  : d.verdict === 'expensive'
                    ? 'Expensive'
                    : 'Incomplete'}
              {d.upside !== null && <span className="ml-1.5 font-normal">{fmtPct(d.upside, 0)}</span>}
            </span>
          </div>
        </div>

        <nav className="border-t border-zinc-800 overflow-x-auto">
          <div className="flex gap-1 px-4 py-2 max-w-5xl mx-auto min-w-max">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-xl text-sm whitespace-nowrap transition-colors ${
                  tab === t.id ? 'bg-blue-600/20 text-blue-400 font-medium' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {t.step && <span className="text-[10px] text-zinc-600 mr-1.5">{t.step}</span>}
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <div className="p-4 max-w-5xl mx-auto">
        {tab === 'guide' && <GuideTab goTo={setTab} />}
        {tab === 'business' && <BusinessTab {...tabProps} />}
        {tab === 'inputs' && <InputsTab {...tabProps} />}
        {tab === 'metrics' && <MetricsTab {...tabProps} />}
        {tab === 'rate' && <RateTab {...tabProps} />}
        {tab === 'dcf' && <DcfTab {...tabProps} />}
        {tab === 'comps' && <CompsTab {...tabProps} />}
        {tab === 'glossary' && <GlossaryTab />}
      </div>
    </div>
  )
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
      {label} <span className="text-white font-semibold ml-1">{value}</span>
    </span>
  )
}
