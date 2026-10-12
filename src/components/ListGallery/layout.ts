export type ListLayout = 'gallery' | 'table'

/**
 * Preference key holding a collection's list layout. Deliberately not a property of Payload's
 * own `collection-<slug>` list preferences: the server rewrites those on every list render
 * (columns, sort, limit) and the list/folder tabs replace them wholesale, so a value kept
 * there either gets dropped or, merged back from the client's copy, reverts the others.
 */
export const listLayoutPreferenceKey = (collectionSlug: string) => `${collectionSlug}-list-layout`
