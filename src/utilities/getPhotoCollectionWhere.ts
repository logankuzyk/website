import type { Where } from 'payload'
import type { PhotoCollection } from '@/payload-types'

const BASE_WHERE: Where = {
  mimeType: { contains: 'image' as const },
}

const NO_MATCH_WHERE: Where = {
  id: { in: [] as string[] },
}

type FilterCondition = {
  field?: string | null
  operator?: string | null
  valueTags?: (string | { id: string })[] | null
  valueFolder?: string | { id: string } | null
  valueLocation?: (string | { id: string })[] | null
  valueNumber?: number | null
  valueText?: string | null
}

function conditionToWhere(condition: FilterCondition): Where | null {
  const field = condition.field
  const operator = condition.operator
  if (!field || !operator) return null

  let value: unknown
  if (operator === 'exists') {
    return { [field]: { exists: true } } as Where
  }
  if (field === 'tags' && condition.valueTags) {
    const ids = condition.valueTags.map((t) => (typeof t === 'object' && t ? t.id : t)).filter(Boolean)
    if (ids.length === 0) return null
    value = ids
  } else if (field === 'folder' && condition.valueFolder) {
    value = typeof condition.valueFolder === 'object' ? condition.valueFolder.id : condition.valueFolder
  } else if (field === 'location' && condition.valueLocation) {
    const ids = condition.valueLocation
      .map((l) => (typeof l === 'object' && l ? l.id : l))
      .filter(Boolean)
    if (ids.length === 0) return null
    if (operator === 'equals' && ids.length > 1) {
      return { location: { in: ids } } as Where
    }
    if (operator === 'not_equals' && ids.length > 1) {
      return { location: { not_in: ids } } as Where
    }
    value = ids.length === 1 ? ids[0] : ids
  } else if (condition.valueNumber != null) {
    value = condition.valueNumber
  } else if (condition.valueText != null && condition.valueText !== '') {
    if (operator === 'in' || operator === 'not_in') {
      value = condition.valueText.split(',').map((s) => s.trim()).filter(Boolean)
    } else {
      value = condition.valueText
    }
  } else {
    return null
  }

  return { [field]: { [operator]: value } } as Where
}

/**
 * Returns the where clause for querying photos in a collection.
 * Merges base (mimeType: image) with collection.filter conditions.
 * Empty or invalid filter returns a no-match clause (no photos).
 */
export function getPhotoCollectionWhere(collection: PhotoCollection): Where {
  const filter = collection.filter as FilterCondition[] | null | undefined
  if (!Array.isArray(filter) || filter.length === 0) {
    return NO_MATCH_WHERE
  }

  const conditions = filter
    .map(conditionToWhere)
    .filter((w): w is Where => w !== null)

  if (conditions.length === 0) {
    return NO_MATCH_WHERE
  }

  const filterWhere: Where =
    conditions.length === 1 ? conditions[0]! : { and: conditions }

  return {
    and: [BASE_WHERE, filterWhere],
  } as Where
}
