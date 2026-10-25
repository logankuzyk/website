// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { getAssetHeaders } from '../../headers.js'

describe('asset headers', () => {
  const rules = getAssetHeaders() as { source: string; headers: { key: string; value: string }[] }[]

  it('covers both the static and the Payload file route', () => {
    expect(rules.map((r) => r.source).sort()).toEqual(['/api/assets/file/:path*', '/assets/:path*'])
  })

  it('sandboxes directly-opened SVGs so scripts cannot run on the site origin', () => {
    for (const { headers } of rules) {
      const csp = headers.find((h) => h.key === 'Content-Security-Policy')?.value ?? ''
      expect(csp).toMatch(/(^|;\s*)sandbox(;|$)/)
      expect(csp).toContain("default-src 'none'")
      expect(headers).toContainEqual({ key: 'X-Content-Type-Options', value: 'nosniff' })
    }
  })
})
