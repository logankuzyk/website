import type { Location } from '@/payload-types'

/**
 * Builds a comma-separated location string from the deepest location up the hierarchy.
 * e.g. "Victoria, British Columbia, Canada"
 */
export function formatLocation(location: (string | null) | Location | undefined): string | null {
  if (!location || typeof location === 'string') return null

  const parts: string[] = []
  let current: Location | null = location

  while (current && typeof current === 'object' && 'name' in current) {
    if (current.name?.trim()) {
      parts.push(current.name.trim())
    }
    const parent: Location['parent'] = current.parent
    current = parent && typeof parent === 'object' ? parent : null
  }

  return parts.length > 0 ? parts.join(', ') : null
}
