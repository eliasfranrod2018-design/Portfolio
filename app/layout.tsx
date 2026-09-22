import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stock Valuation Workbench',
  description:
    'Work through an equity valuation end to end: business quality, required rate of return, WACC, a discounted cash flow, comps, scenarios and a margin of safety.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#0f0f0f] text-white">{children}</body>
    </html>
  )
}
