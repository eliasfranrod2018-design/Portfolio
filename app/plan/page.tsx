import type { Metadata } from 'next'
import '@fontsource-variable/inter'
import '@fontsource-variable/source-serif-4/opsz.css'
import './plan.css'
import PlanPage from '@/components/plan/PlanApp'

export const metadata: Metadata = {
  title: 'Portfolio plan',
  description:
    'Your holdings, watchlist and planned swaps with live prices, diversification by scenario, and a note on how each ticker correlates with the rest of the portfolio.',
}

export default function Page() {
  return <PlanPage />
}
