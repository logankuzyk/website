'use client'

import { usePathname, useRouter } from 'next/navigation'

export function useSafeQueryReplace() {
  const router = useRouter()
  const pathname = usePathname()

  return (mutate: (sp: URLSearchParams) => void, scroll = false) => {
    if (typeof window === 'undefined') return

    const currentUrl = window.location.pathname + window.location.search

    const sp = new URLSearchParams(window.location.search)
    mutate(sp)

    const query = sp.toString()
    const nextUrl = query ? `${pathname}?${query}` : pathname

    if (currentUrl === nextUrl) return

    router.replace(nextUrl, { scroll })
  }
}
