import type { NextConfig } from 'next'

/**
 * The whole app runs in the browser, so it is built as a static export: `next
 * build` emits plain HTML/CSS/JS into `out/`, which any static host can serve
 * and which needs no Node process in production.
 *
 * NEXT_PUBLIC_BASE_PATH is set by the GitHub Pages workflow, because a project
 * site is served from https://<user>.github.io/<repo>/ rather than the domain
 * root. Hosts that serve from the root (Vercel, Netlify, Cloudflare Pages)
 * leave it unset and the app builds at `/`.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  // No next/image is used today; this keeps the export working if one is added.
  images: { unoptimized: true },
}

export default nextConfig
