import type { ListViewClientProps, ListViewServerProps, ListViewServerPropsOnly } from 'payload'

import React from 'react'

import type { ListLayout } from './layout'

import { listLayoutPreferenceKey } from './layout'
import { GalleryListViewClient } from './ListView.client'

// What Payload adds for server components on top of a list view's client props. Most of it
// (payload, i18n, the collection config) can't cross to the client view.
const serverOnlyProps = new Set<string>([
  'collectionConfig',
  'data',
  'i18n',
  'limit',
  'listSearchableFields',
  'locale',
  'params',
  'payload',
  'permissions',
  'searchParams',
  'user',
] satisfies (keyof ListViewServerPropsOnly)[])

const getListLayout = async ({
  collectionSlug,
  payload,
  user,
}: Pick<ListViewServerProps, 'collectionSlug' | 'payload' | 'user'>): Promise<ListLayout> => {
  if (!user) return 'table'

  // Same lookup as Payload's own preference reads: access is bypassed, the query is scoped
  // to the current user instead.
  const { docs } = await payload.find({
    collection: 'payload-preferences',
    depth: 0,
    limit: 1,
    pagination: false,
    where: {
      and: [
        { key: { equals: listLayoutPreferenceKey(collectionSlug) } },
        { 'user.relationTo': { equals: user.collection } },
        { 'user.value': { equals: user.id } },
      ],
    },
  })

  return docs[0]?.value === 'gallery' ? 'gallery' : 'table'
}

/**
 * List view for collections registered with `listGallery` in `./config`: Payload's default
 * list view plus a Table/Gallery switch, opened in the layout the user last chose for this
 * collection.
 */
export const GalleryListView = async (props: ListViewServerProps) => {
  const initialLayout = await getListLayout(props)
  const clientProps = Object.fromEntries(
    Object.entries(props).filter(([key]) => !serverOnlyProps.has(key)),
  ) as ListViewClientProps

  return <GalleryListViewClient {...clientProps} initialLayout={initialLayout} />
}
