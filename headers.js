/**
 * Uploaded SVGs are served from our own origin (local `staticDir`, or Payload's file route),
 * and an SVG opened directly is a document that can run scripts there. Embedded through
 * `<img>` they can't, so lock down the direct-navigation case: `sandbox` gives the document
 * an opaque origin and disables scripts, and `default-src 'none'` blocks anything it tries
 * to load. `<img>` rendering is unaffected. (Files served from a separate STORAGE_URL
 * origin are already isolated from the site.)
 */
export const svgAssetHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "sandbox; default-src 'none'; style-src 'unsafe-inline'",
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
]

/** Next.js `headers()` rules for every path an `assets` upload can be served from. */
export const getAssetHeaders = () => [
  { source: '/assets/:path*', headers: svgAssetHeaders },
  { source: '/api/assets/file/:path*', headers: svgAssetHeaders },
]
