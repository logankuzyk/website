'use client'

import React, { useState } from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { Menu, SearchIcon, X } from 'lucide-react'
import { cn } from '@/utilities/ui'

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navItems = data?.navItems || []

  return (
    <>
      {/* Desktop nav - hidden on mobile */}
      <nav className="hidden md:flex gap-6 items-center">
        {navItems.map(({ link }, i) => (
          <CMSLink key={i} {...link} appearance="link" />
        ))}
        <Link
          href="/search"
          className="text-[var(--link)] hover:text-[var(--link-hover)]"
        >
          <span className="sr-only">Search</span>
          <SearchIcon className="w-5" />
        </Link>
      </nav>

      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden p-2 -m-2 text-foreground hover:text-[var(--link-hover)]"
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-nav"
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile nav - slide-down panel */}
      <div
        id="mobile-nav"
        className={cn(
          'md:hidden absolute top-full left-0 right-0 z-30 border-b border-border bg-background',
          mobileMenuOpen ? 'block' : 'hidden',
        )}
      >
        <nav className="container py-4 flex flex-col gap-4 items-start text-left text-lg [&_a]:text-lg">
          {navItems.map(({ link }, i) => (
            <div key={i} onClick={() => setMobileMenuOpen(false)}>
              <CMSLink {...link} appearance="link" className="block" />
            </div>
          ))}
          <Link
            href="/search"
            className="text-[var(--link)] underline underline-offset-4 hover:text-[var(--link-hover)]"
            onClick={() => setMobileMenuOpen(false)}
          >
            Search
          </Link>
        </nav>
      </div>
    </>
  )
}
