'use client'

import { usePathname, useRouter } from 'next/navigation'

export function useSafeQueryReplace() {
  const router = useRouter()
  const pathname = usePathname()

  return (mutate: (params: URLSearchParams) => void, scroll = false) => {
    if (typeof window === 'undefined') return

    const currentUrl = window.location.pathname + window.location.search

    const params = new URLSearchParams(window.location.search)
    mutate(params)

    const query = params.toString()
    const nextUrl = query ? `${pathname}?${query}` : pathname

    if (currentUrl === nextUrl) return

    router.replace(nextUrl, { scroll })
  }
}
