import type { Metadata } from 'next'

import React from 'react'

export const metadata: Metadata = {
  title: 'Privacy policy: Photography New Tab',
  description: 'Privacy policy for the Photography New Tab browser extension.',
}

export default function NewTabPrivacyPage() {
  return (
    <div className="container py-28">
      <div className="prose max-w-none">
        <h1>Photography New Tab: privacy policy</h1>
        <p>Last updated: September 11, 2026</p>

        <p>
          Photography New Tab is a browser extension that replaces your new tab page with my
          photography, alongside a clock and your favourite sites.
        </p>

        <h2>Data collection</h2>
        <p>
          The extension collects no personal data. It has no analytics, tracking, advertising,
          accounts or cookies, and nothing about you or your browsing is sold or shared.
        </p>

        <h2>Storage</h2>
        <p>
          Your settings and favourite sites are saved in your browser&apos;s sync storage. If you
          have browser sync turned on, your browser vendor syncs them between your devices under its
          own privacy policy. The list of photos and which photo you last saw are cached in your
          browser&apos;s local storage. None of this is ever sent to me.
        </p>

        <h2>Network requests</h2>
        <p>The extension only makes requests to:</p>
        <ul>
          <li>
            <strong>logankuzyk.com</strong>, to download the list of photos;
          </li>
          <li>
            <strong>media.logankuzyk.com</strong>, to download the photos themselves.
          </li>
        </ul>
        <p>
          Like any website, these servers may keep standard request logs. On Chrome and Edge, icons
          for your favourite sites come from the browser&apos;s own favicon cache, so no third-party
          services are contacted.
        </p>

        <h2>Permissions</h2>
        <ul>
          <li>
            <strong>storage</strong>: saves your settings, favourite sites and the photo cache.
          </li>
          <li>
            <strong>favicon</strong> (Chrome and Edge only): shows icons for your favourite sites
            from the browser&apos;s favicon cache.
          </li>
        </ul>

        <h2>Contact</h2>
        <p>
          Questions or concerns? Open an issue at{' '}
          <a href="https://github.com/logankuzyk/ntp/issues">github.com/logankuzyk/ntp</a>.
        </p>
      </div>
    </div>
  )
}
