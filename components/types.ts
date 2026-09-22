import type { Calc, Worksheet } from '@/lib/valuation'

export type TabId = 'guide' | 'business' | 'inputs' | 'metrics' | 'rate' | 'dcf' | 'comps' | 'glossary'

export interface TabProps {
  ws: Worksheet
  calc: Calc
  /** Shallow-merge a patch into one section of the worksheet. */
  set: <K extends keyof Worksheet>(key: K, part: Partial<Worksheet[K]>) => void
  /** Full control, for arrays and cross-section updates. */
  setWs: (updater: (prev: Worksheet) => Worksheet) => void
  goTo: (tab: TabId) => void
}
