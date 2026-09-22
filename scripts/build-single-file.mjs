/**
 * Bundles the whole app into one self-contained HTML file at dist/index.html:
 * React, the components and the compiled Tailwind CSS, with nothing fetched at
 * runtime. Useful for hosts that serve a single page, for offline use, and for
 * sandboxed embeds where a page cannot start a download (hence the clipboard
 * export mode).
 *
 * The CSS is taken from the Next build so it is exactly the stylesheet the app
 * ships with, rather than a second Tailwind run that could drift from it.
 *
 *   node scripts/build-single-file.mjs
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as esbuild from 'esbuild'

const root = new URL('..', import.meta.url).pathname
const env = { ...process.env, NEXT_PUBLIC_EXPORT_MODE: 'clipboard', NEXT_PUBLIC_BASE_PATH: '' }

console.log('· next build (for the compiled stylesheet)')
execFileSync('npx', ['next', 'build'], { cwd: root, env, stdio: 'inherit' })

const chunks = join(root, 'out/_next/static/chunks')
const cssFile = readdirSync(chunks).find((f) => f.endsWith('.css'))
if (!cssFile) throw new Error('no stylesheet in the Next build output')
const css = readFileSync(join(chunks, cssFile), 'utf8')

console.log('· esbuild (application bundle)')
const bundle = await esbuild.build({
  entryPoints: [join(root, 'scripts/entry.tsx')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  jsx: 'automatic',
  tsconfig: join(root, 'tsconfig.json'),
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.NEXT_PUBLIC_EXPORT_MODE': '"clipboard"',
  },
  write: false,
  logLevel: 'warning',
})
const js = bundle.outputFiles[0].text

const html = `<title>Stock Valuation Workbench</title>
<style>
${css}
</style>
<style>
  /* The host paints its own ground behind the page, so state the palette here.
     This tool is deliberately single-theme: a dark instrument panel. */
  :root { color-scheme: dark; }
  body { margin: 0; background: #0f0f0f; color: #f5f5f5; }
  /* Clear the phone's status bar when the header sticks. */
  header.sticky { top: env(safe-area-inset-top, 0px); }
</style>
<div id="root"></div>
<script>
${js}
</script>
`

mkdirSync(join(root, 'dist'), { recursive: true })
writeFileSync(join(root, 'dist/index.html'), html)
console.log(`· wrote dist/index.html (${(html.length / 1024).toFixed(0)} KB)`)
