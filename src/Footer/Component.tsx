import { getCachedGlobal } from '@/utilities/getGlobals'
import React from 'react'

import type { Footer } from '@/payload-types'

import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { CMSLink } from '@/components/Link'

export async function Footer() {
  const footerData: Footer = await getCachedGlobal('footer', 1)()

  const navItems = footerData?.navItems || []

  return (
    <footer
      className="mt-auto border-t border-border bg-obsidian dark:bg-carbon [--link:var(--text-snow)] [--link-hover:var(--accent-frost)]"
    >
      <div className="container py-8 gap-8 flex flex-col md:flex-row md:justify-end md:items-center text-[var(--text-snow)] text-left">
        <div className="flex flex-col-reverse items-start md:flex-row gap-6 md:items-center">
          <ThemeSelector />
          <nav className="flex flex-col md:flex-row gap-6 md:items-center items-start text-left">
            {navItems.map(({ link }, i) => {
              return <CMSLink key={i} {...link} appearance="link" />
            })}
          </nav>
        </div>
      </div>
    </footer>
  )
}
