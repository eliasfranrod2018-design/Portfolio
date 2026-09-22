/**
 * Entry point for the single-file build: mounts the same page component the
 * Next app renders, with no framework around it.
 */
import { createRoot } from 'react-dom/client'
import Page from '@/app/page'

const el = document.getElementById('root')
if (el) createRoot(el).render(<Page />)
