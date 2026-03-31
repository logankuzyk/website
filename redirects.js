/**
 * Enable www ↔ apex redirect only in production-like deploys, not Vercel preview/dev.
 * Docker / self-hosted: NODE_ENV=production and no VERCEL_ENV set → enabled.
 */
function shouldEnableCanonicalHostRedirect() {
  if (process.env.VERCEL_ENV === 'production') return true
  if (process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development') {
    return false
  }
  return process.env.NODE_ENV === 'production'
}

/** @returns {object | null} */
function getCanonicalHostRedirect() {
  if (!shouldEnableCanonicalHostRedirect()) return null

  const raw = process.env.NEXT_PUBLIC_SERVER_URL
  if (!raw || typeof raw !== 'string') return null

  let url
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()
  const localhostHosts = new Set(['localhost', '127.0.0.1', '::1'])
  if (localhostHosts.has(host)) return null

  const alternateHost = host.startsWith('www.') ? host.slice(4) : `www.${host}`
  if (!alternateHost) return null

  const canonicalBase = `${url.protocol}//${host}`.replace(/\/$/, '')

  return {
    source: '/:path*',
    has: [{ type: 'host', value: alternateHost }],
    destination: `${canonicalBase}/:path*`,
    permanent: true,
  }
}

const redirects = async () => {
  const internetExplorerRedirect = {
    destination: '/ie-incompatible.html',
    has: [
      {
        type: 'header',
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
  }

  const list = [internetExplorerRedirect]

  const canonicalRedirect = getCanonicalHostRedirect()
  if (canonicalRedirect) {
    list.push(canonicalRedirect)
  }

  return list
}

export default redirects
